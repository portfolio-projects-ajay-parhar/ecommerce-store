import slugifyLib from "slugify";

export const slugify = (input: string) =>
  slugifyLib(input, { lower: true, strict: true, trim: true });

/**
 * Ensures a unique slug by appending -2, -3, ... until `exists` returns false.
 */
export async function ensureUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  if (!(await exists(base))) return base;
  let i = 2;
  while (await exists(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}
