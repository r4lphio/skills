// Generates every brand asset in public/ from brand/mark.svg and brand/brand.json.
// Run with `pnpm brand:assets` after changing either (Node 24 runs the
// TypeScript directly). Outputs are committed, so the build never depends on
// this script.
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
interface BrandSpec {
  name: string;
  tagline: string;
  description: string;
  /** Second line on the OG card; the meta description stays `description`. */
  ogSubtitle: string;
  url: string;
  themeColor: string;
  background: string;
  /** The surface color at the corner of the OG card gradient. */
  panel: string;
  ink: string;
  ink2: string;
  ink3: string;
  /** The brand accent, used for the short rule under the OG tagline. */
  accent: string;
  /** Font family names as the TTFs in `fonts` declare them. */
  displayFont: string;
  bodyFont: string;
  /** Static TTF paths. The tagline asks for weight 600; resvg picks the nearest weight supplied. */
  fonts: Record<string, string>;
  /** Optional raster art (PNG path) laid under the OG text at low opacity. */
  ogArt?: string;
}

const spec: BrandSpec = JSON.parse(readFileSync(resolve(root, "brand/brand.json"), "utf8"));
const mark = readFileSync(resolve(root, "brand/mark.svg"), "utf8");
const fontFiles = Object.values(spec.fonts).map((file) => resolve(root, file));
const out = resolve(root, "public");

/** Rasterizes an SVG string to a PNG buffer at a given pixel width. */
export function renderPng(svg: string, width: number): Buffer {
  return Buffer.from(
    new Resvg(svg, {
      fitTo: { mode: "width", value: width },
      font: { fontFiles, loadSystemFonts: false },
    })
      .render()
      .asPng(),
  );
}

/**
 * Packs PNG images into one .ico. The ICO container allows PNG-encoded
 * entries (every browser since IE9 reads them), so no BMP conversion.
 */
export function buildIco(pngs: ReadonlyArray<{ size: number; png: Buffer }>): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = header.length + dir.length;
  pngs.forEach(({ size, png }, index) => {
    const entry = index * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, entry);
    dir.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    dir.writeUInt8(0, entry + 2);
    dir.writeUInt8(0, entry + 3);
    dir.writeUInt16LE(1, entry + 4);
    dir.writeUInt16LE(32, entry + 6);
    dir.writeUInt32LE(png.length, entry + 8);
    dir.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, dir, ...pngs.map((p) => p.png)]);
}

/** The 1200 by 630 Open Graph card: mark, tagline, description, hostname. */
export function ogSvg(s: BrandSpec): string {
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  // Tagline wraps by hand: resvg has no text wrapping.
  const [line1, line2] = splitTagline(s.tagline);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="g" cx="0" cy="0" r="1.2"><stop offset="0" stop-color="${s.panel}"/><stop offset=".55" stop-color="${s.background}"/></radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  ${s.ogArt ? `<image href="data:image/png;base64,${readFileSync(resolve(root, s.ogArt)).toString("base64")}" width="1200" height="630" preserveAspectRatio="xMidYMid slice" opacity=".35"/>` : ""}
  <g transform="translate(84 84) scale(1.5)">${mark.replace(/<\?xml[^>]*>|<!--[\s\S]*?-->/g, "").replace(/<svg[^>]*>|<\/svg>/g, "")}</g>
  <text x="84" y="330" font-family="${s.displayFont}" font-weight="600" font-size="72" fill="${s.ink}" letter-spacing="-1.5">${esc(line1)}</text>
  <text x="84" y="408" font-family="${s.displayFont}" font-weight="600" font-size="72" fill="${s.ink}" letter-spacing="-1.5">${esc(line2)}</text>
  <rect x="84" y="436" width="96" height="4" rx="2" fill="${s.accent}"/>
  <text x="84" y="492" font-family="${s.bodyFont}" font-size="28" fill="${s.ink2}">${esc(s.ogSubtitle)}</text>
  <text x="84" y="566" font-family="${s.bodyFont}" font-size="22" fill="${s.ink3}">${esc(s.url)}</text>
</svg>`;
}

/**
 * Splits a tagline into two balanced lines. A sentence end or comma near the
 * middle wins over a space, so clauses stay whole: "Write down the call." /
 * "Grade it later."
 */
export function splitTagline(tagline: string): [string, string] {
  const mid = tagline.length / 2;
  const after = (re: RegExp) => [...tagline.matchAll(re)].map((m) => (m.index ?? 0) + m[0].length);
  const nearest = (points: number[]) =>
    points.reduce<number | null>((best, i) => (best === null || Math.abs(i - mid) < Math.abs(best - mid) ? i : best), null);
  const comma = nearest(after(/[.,] /g));
  const at = comma !== null && Math.abs(comma - mid) <= tagline.length / 4 ? comma : (nearest(after(/\s/g)) ?? 0);
  return [tagline.slice(0, at).trimEnd(), tagline.slice(at)];
}

if (process.argv[1] === import.meta.filename) {
  mkdirSync(out, { recursive: true });
  writeFileSync(resolve(out, "favicon.svg"), mark);
  writeFileSync(resolve(out, "favicon.ico"), buildIco([16, 32, 48].map((size) => ({ size, png: renderPng(mark, size) }))));
  writeFileSync(resolve(out, "apple-touch-icon.png"), renderPng(mark, 180));
  writeFileSync(resolve(out, "icon-192.png"), renderPng(mark, 192));
  writeFileSync(resolve(out, "icon-512.png"), renderPng(mark, 512));
  writeFileSync(resolve(out, "og.png"), renderPng(ogSvg(spec), 1200));
  writeFileSync(
    resolve(out, "site.webmanifest"),
    JSON.stringify(
      {
        name: spec.name,
        short_name: spec.name,
        description: spec.tagline,
        start_url: "/",
        display: "standalone",
        background_color: spec.background,
        theme_color: spec.themeColor,
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      null,
      2,
    ) + "\n",
  );
  console.log("brand assets written to public/");
}
