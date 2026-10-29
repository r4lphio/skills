// Checks that every quote in claim-receipts.json appears word for word on its
// page. Copy this file to the project's scripts/ folder and add
// `"check:claims": "node scripts/check-claims.ts"` to package.json (Node 24
// runs the TypeScript directly). Run `pnpm check:claims [origin]` from the
// project root. The origin defaults to the `site` in public/claim-receipts.json;
// pass http://localhost:3000 to check the dev server. The receipts are read
// from the origin itself, so a live run checks the deployed copy.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Receipts = { site: string; claims: Array<{ id: string; evidence: Array<{ publicUrl: string; quote: string }> }> };

const local: Receipts = JSON.parse(readFileSync(resolve("public/claim-receipts.json"), "utf8"));
const origin = (process.argv[2] ?? local.site).replace(/\/$/, "");

/** A page's body, or null when it redirects or does not return 200. */
async function get(url: string): Promise<string | null> {
  const response = await fetch(url, { redirect: "manual" });
  return response.status === 200 ? response.text() : null;
}

/** Page text with tags removed, entities decoded, and whitespace collapsed. */
function pageText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

const served = await get(`${origin}/claim-receipts.json`);
if (!served) {
  console.log(`FAIL ${origin}/claim-receipts.json is not served`);
  process.exit(1);
}
const receipts: Receipts = JSON.parse(served);
const site = receipts.site.replace(/\/$/, "");

const pages = new Map<string, string | null>();
let failedClaims = 0;
for (const claim of receipts.claims) {
  let claimOk = true;
  for (const { publicUrl, quote } of claim.evidence) {
    const url = publicUrl.replace(site, origin);
    if (!pages.has(url)) {
      const html = await get(url);
      pages.set(url, html === null ? null : pageText(html));
    }
    const text = pages.get(url);
    const found = text != null && text.includes(quote);
    if (!found) claimOk = false;
    console.log(`${found ? "PASS" : "FAIL"} ${claim.id}: ${url}${text == null ? " (not 200)" : ""}`);
  }
  if (!claimOk) failedClaims++;
}
console.log(`${receipts.claims.length - failedClaims}/${receipts.claims.length} claims have every quote on their page`);
process.exit(failedClaims ? 1 : 0);
