import sanitizeHtmlLib from "sanitize-html";

const ALLOWED_TAGS = [
  "p", "br", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "blockquote", "pre", "code",
  "strong", "em", "a", "img", "hr", "span",
];

const ALLOWED_ATTR = ["href", "src", "alt", "title", "class", "rel", "target"];

/** Storage origins allowed for <img src> inside product descriptions. */
const IMG_SRC_ALLOWLIST = (() => {
  const origins: string[] = [];
  const cdn = process.env.S3_PUBLIC_BASE_URL;
  if (cdn) {
    try {
      origins.push(new URL(cdn).origin);
    } catch {
      // ignore malformed env
    }
  }
  return origins;
})();

/** Extra origins allowed in editor content (placeholder/seed images). */
const EXTRA_IMG_ORIGINS = [
  "https://picsum.photos",
  "https://images.unsplash.com",
  "https://fastly.picsum.photos",
  "https://res.cloudinary.com",
];

function isAllowedImageSrc(src: string): boolean {
  try {
    const origin = new URL(src).origin;
    return IMG_SRC_ALLOWLIST.includes(origin) || EXTRA_IMG_ORIGINS.includes(origin);
  } catch {
    return false;
  }
}

/** Drops <img> tags whose src is not on the allowlist. */
function filterImageSrcs(html: string): string {
  return html.replace(/<img\s+([^>]*?)>/gi, (match, attrs: string) => {
    const src = /src\s*=\s*["']([^"']*)["']/i.exec(attrs)?.[1] ?? "";
    if (src && !isAllowedImageSrc(src)) return "";
    return match;
  });
}

/**
 * Server-side sanitizer built on the `sanitize-html` package (htmlparser2 —
 * pure JS, no DOM/jsdom), so it bundles and runs safely in serverless
 * environments (Vercel functions).
 *
 * Allowlist semantics: only known-safe tags/attributes survive, URL schemes
 * are restricted, and a second render-time pass (sanitizeForRender) provides
 * defense in depth.
 */
export function sanitizeHtml(html: string): string {
  const clean = sanitizeHtmlLib(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { "*": ALLOWED_ATTR },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
  });

  // Force safe anchor defaults on any <a>
  return filterImageSrcs(
    clean.replace(/<a\s+([^>]*?)>/gi, (_match, attrs: string) => {
      let next = attrs;
      if (!/rel=/i.test(next)) next += ' rel="noopener noreferrer nofollow"';
      if (!/target=/i.test(next)) next += ' target="_blank"';
      return `<a ${next}>`;
    }),
  );
}

/** Second pass at render time (defense in depth). */
export function sanitizeForRender(html: string): string {
  return sanitizeHtml(html);
}
