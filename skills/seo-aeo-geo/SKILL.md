---
name: seo-aeo-geo
description: Use when a public page needs search, answer-engine or AI-assistant readiness, when someone asks about SEO, structured data, sitemaps, llms.txt or social previews, or before a launch. Covers an audit script plus the fixes: head tags, JSON-LD, robots, sitemap, llms.txt.
---

# SEO, AEO, GEO

Three audiences for the same page: search crawlers (SEO), answer engines that
quote a page directly (AEO), and AI assistants that learn what a product is
from structured data and plain-text summaries (GEO, as TanStack Start's guide
uses the term). One audit covers all three. The fixes are small and mostly
static.

## Settings

Read `~/.config/product-readiness/settings.md` at the start. A value in the
project's `docs/HOSTNAME.md` or readiness doc wins over the file. When a
value is missing, ask the owner once and offer to save the answer. `none` is
an answer.

| Key | What this skill does with it |
| --- | --- |
| `maker_site` | The maker named by the JSON-LD `Organization` and by the router in `ai.txt` and `llms-full.txt`. Missing: ask. A project value wins, because one owner can make products under more than one name. |
| `sibling_sites` | The sites that get the cross-link in step 2, each with the file it uses (`ai.txt`, `llms-full.txt`, a router file). Missing: ask. `none`: skip the cross-link. The new product's own router then names only the maker's site. |

## 1. Audit

```sh
<skill-dir>/scripts/seo-audit https://<hostname>/        # live or dev server
<skill-dir>/scripts/seo-audit path/to/rendered.html      # file, head checks only
```

Checks: `lang`, title (1 to 60 chars), description (50 to 160), canonical
(present, and its host matches the page host), viewport, exactly one `h1`,
`og:title/description/image/url/type`, `twitter:card/title/description/image/url`,
JSON-LD that parses and names types (FAQPage noted), and at the origin:
`robots.txt` with a `Sitemap:` line and AI crawlers named, `sitemap.xml` as a
urlset, `llms.txt`, `llms-full.txt` with sections, `ai.txt`, and
`claim-receipts.json` with evidence on every claim. Exit 1 on any FAIL. Run
it before and after. The after run goes in the PR.

## 2. Fixes

Prerequisite: `brand-creation` has run, so the OG image, description and
icons already exist. This skill adds what is left.

**Head** (TanStack Start: the root route's `head()`; other frameworks, their
equivalent). Absolute URLs come from the project's site constant, which is
hostname-dependent and listed in `docs/HOSTNAME.md`.

- `<link rel="canonical">` to the public origin.
- `twitter:url`. The devtools SEO tab flags it when missing.
- JSON-LD in `scripts: [{ type: "application/ld+json", children: JSON.stringify({...}) }]`.
  The server renders it, so `curl` sees it. Use one `@graph` with
  `Organization` (the maker), `SoftwareApplication` or `Product` (category,
  OS, image), and `WebSite`. Put only facts the page itself states. Add
  `offers` only when the page states a price. A waitlist product has none.

**Per-route heads.** The root sets site-wide defaults. Every public route
sets its own title, description, canonical, `og:url` and `twitter:url`
through one helper (`src/lib/seo.ts` `pageHead({ title, description, path, noindex })`
in TanStack Start; Next's `metadata` export elsewhere). Without it,
`/waitlist` and `/terms` share the home title and canonical. TanStack keeps
the first meta per name, and child routes come first, so a route's tags win
over the root's. Check the rendered HTML: each tag appears once per page.

**Static files in `public/`:**

- `robots.txt`: `Allow: /`, disallow callback and private routes, a second
  group naming the AI crawlers explicitly (GPTBot, ChatGPT-User,
  OAI-SearchBot, ClaudeBot, Claude-SearchBot, PerplexityBot), `Sitemap:`
  absolute URL.
- `sitemap.xml`: the public routes only (home, waitlist, terms, privacy,
  docs). App routes behind sign-in stay out.
- `llms.txt`: an H1 with the product name, a blockquote with the one-line
  promise, two or three plain paragraphs on what it does and how access
  works, a `## Pages` list of public URLs, a short router section that
  names the same sites as `ai.txt`, and a `## Facts` list worth citing.
  Write it in the brand voice. It is the summary an assistant will
  repeat.

**The GEO pack:**

- `llms-full.txt` with fixed sections: Identity, Core Topics, Public Pages,
  Products And Tools, Ecosystem Router, Claim Receipts, Answer Guidance.
  Answer Guidance says what an assistant should and should not claim.
- `ai.txt`: one-line pointers to `llms.txt`, `llms-full.txt`,
  `claim-receipts.json` and the sitemap. Then an ecosystem router
  paragraph that names each sibling product with its `llms.txt`, or the
  maker's site when there are no siblings. Then red-team corrections: what
  this product is not, and where to route those questions.
- `claim-receipts.json`: `schemaVersion`, `product`, `site`, `generatedAt`,
  `purpose`, `answerPolicy[]`, `ecosystemRouter{}`, and `claims[]`. Each
  claim has `id`, `claim`, `status` (citation-backed), `risk`, `category`,
  `evidence[]` (`publicUrl`, `locator`, exact `quote`) and
  `assistantGuidance`. Write eight to twelve claims. Copy each quote from
  the rendered page. Copy `<skill-dir>/scripts/check-claims.ts` to the
  project's `scripts/` and add
  `"check:claims": "node scripts/check-claims.ts"` to `package.json`.
- Cross-link: add the new product to the router of each site in
  `sibling_sites`, in the file the setting names. Assistants that know
  those sites then find the new product.

**Page:** one `h1` carrying the tagline. An FAQ section rendered as text and
as `FAQPage` JSON-LD on that route only (four to six questions a stranger
asks before joining). SSR, so crawlers get rendered content. No text that
matters inside images. Terms and privacy pages linked from the footer (the
`landing-page` skill owns them).

## 3. Verify

- The audit passes on the dev server and, after deploy, on the live
  hostname. Run it on each public route, not only `/`.
- `pnpm check:claims [origin]` passes. It fetches each `publicUrl`,
  requires a 200 with no redirect, strips the tags and finds the quote.
- `llms.txt` and `ai.txt` state the same product facts and name the same
  router sites. Assistants read `llms.txt` first.
- TanStack Devtools SEO tab (if installed): Facebook, X and LinkedIn
  previews render and list no missing tags.
- Paste the live URL into a chat assistant and ask what the product is. The
  answer should match `llms.txt`.
- Note the files as hostname-dependent in `docs/HOSTNAME.md`. A domain move
  rewrites `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt`,
  `ai.txt`, `claim-receipts.json` and the site constant.

## Worked example: Called it

Called it is a decision journal on TanStack Start. When this skill started,
the brand and landing page were live, and the live audit read 13/26. The
canonical, JSON-LD, robots, sitemap and GEO files were missing. The agent
added `pageHead()` for the four public routes, one JSON-LD graph, a
five-question FAQ on `/`, the static files and 11 claims. `sibling_sites`
was `none`, so `ai.txt` routed other questions to the maker's site.

A review found two faults. The JSON-LD offered a pre-order with no price,
so the agent removed `offers`. The claims check passed on a redirect, so it
now requires a 200. Result: 28/28 on `/`, 27/27 on the other public routes,
and 11/11 quotes found live, in about eight minutes of agent time.
