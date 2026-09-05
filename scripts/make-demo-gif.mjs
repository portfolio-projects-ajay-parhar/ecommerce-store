/**
 * Builds docs/screenshots/demo.gif from the numbered screenshots in
 * docs/screenshots/ (01-home.png …). Frames are center-top cropped to a
 * uniform 1280×860 viewport, downscaled 2× (box average), quantized, and
 * encoded as an animated GIF.
 *
 * Usage: node scripts/make-demo-gif.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import gifencPkg from "gifenc";
const { GIFEncoder, quantize, applyPalette } = gifencPkg;

const FRAMES = [
  "01-home",
  "02-products",
  "03-product-detail",
  "04-cart",
  "05-checkout-address",
  "07-orders-pending",
  "09-razorpay-modal",
  "13-razorpay-card-form",
  "14-razorpay-card-filled",
  "16-razorpay-otp",
  "18-success-page",
  "19-order-paid",
  "20-orders-paid",
  "21-admin-dashboard",
  "22-admin-orders",
];

const CROP_W = 1280;
const CROP_H = 860;
const SCALE = 2; // 1280→640 wide
const DELAY_MS = 1300;
const DIR = join(process.cwd(), "docs", "screenshots");

/** Box-average downscale by integer factor. */
function downscale(rgba, w, h, factor) {
  const nw = Math.floor(w / factor);
  const nh = Math.floor(h / factor);
  const out = Buffer.alloc(nw * nh * 4);
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let dy = 0; dy < factor; dy++) {
        for (let dx = 0; dx < factor; dx++) {
          const i = ((y * factor + dy) * w + (x * factor + dx)) * 4;
          r += rgba[i];
          g += rgba[i + 1];
          b += rgba[i + 2];
          a += rgba[i + 3];
        }
      }
      const n = factor * factor;
      const o = (y * nw + x) * 4;
      out[o] = r / n;
      out[o + 1] = g / n;
      out[o + 2] = b / n;
      out[o + 3] = a / n;
    }
  }
  return { data: out, width: nw, height: nh };
}

const gif = GIFEncoder();
for (const name of FRAMES) {
  const file = join(DIR, `${name}.png`);
  if (!existsSync(file)) {
    console.warn(`skip ${name}.png (missing)`);
    continue;
  }
  const png = PNG.sync.read(readFileSync(file));
  // Crop to the viewport area (top-left), then downscale.
  const cw = Math.min(CROP_W, png.width);
  const ch = Math.min(CROP_H, png.height);
  const cropped = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    png.data.copy(
      cropped,
      y * cw * 4,
      y * png.width * 4,
      y * png.width * 4 + cw * 4,
    );
  }
  const small = downscale(cropped, cw, ch, SCALE);
  const palette = quantize(small.data, 256);
  const index = applyPalette(small.data, palette);
  gif.writeFrame(index, small.width, small.height, {
    palette,
    delay: DELAY_MS,
  });
  console.log(`frame ${name} → ${small.width}×${small.height}`);
}
gif.finish();
writeFileSync(join(DIR, "demo.gif"), gif.bytes());
console.log("wrote docs/screenshots/demo.gif");
