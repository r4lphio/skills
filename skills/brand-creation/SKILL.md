---
name: brand-creation
description: Use when a project needs a visual identity or its assets (mark, wordmark, palette, type, favicons, OG image), when someone asks for a logo or brand for a product, or when a project's brand is undefined before a landing page or SEO work. Covers identifying an existing brand first and creating one only if none exists.
---

# Brand creation

Find the project's brand if it has one. Create it if it does not. Then make
the assets from one SVG source. Phase 2 starts only after Phase 1 has an
answer.

A run ends with a full brand, never a single image:

1. Mark: a hand-made SVG, 64 by 64 viewBox, clear at 16 px.
2. Wordmark: the product name in the display font.
3. Palette tokens, light and dark, in the app's CSS. Each color has one meaning.
4. Type pairing: display and body fonts, served by the site.
5. Voice and taglines: a primary tagline, a support line, words to use and avoid.
6. Assets: favicons, icons, `site.webmanifest`, `og.png`, `theme-color` tags.
7. The brand applied in the app bar and the sign-in modal.
8. The brand record, `<project>-brand`. The landing and SEO skills read it.

## Settings

Read `~/.config/product-readiness/settings.md` first. A value in the
project's `docs/HOSTNAME.md` or readiness doc wins. If a key is missing, ask
the owner once and offer to save the answer. `none` is an answer.

- `share_mocks`: `local` writes each direction to
  `docs/plans/brand/<letter>-<name>.html` and opens it; screenshot each one
  and show the screenshots. A skill or command name publishes each file and
  returns links. Missing: ask, and offer `local`.
- `raster_art`: `none` skips "Raster art"; the run still makes every
  deliverable, with an SVG mark. A skill or command name: see "Raster art".
  Missing: ask, and offer `none`.
- `brand_record`: `project` writes a `<project>-brand` skill in the
  project's skills folder (for example `.claude/skills/<project>-brand/`). A
  path writes `<path>/<project>-brand/`. Missing: ask, and offer `project`.
- `avoid_brands`: the new brand takes no mark, palette, or type pairing from
  these. `none`: no check.

## Phase 1: identify

Read before you propose:

- The brand record where `brand_record` points, or brand tokens in the repo
  (`@theme` in the CSS, a `brand/` folder, a `tokens` file).
- What the UI already does: the palette, what each color means, the font,
  any placeholder mark, the sign-in and landing copy.
- `public/` for favicons and OG images already shipped.

The outcome is **brand exists** (go to Phase 3), **proto-brand** (palette
and type exist, mark and voice do not; refine, do not replace), or **no
brand** (create it). Say which and why.

## Phase 2: create

Mock two or three directions through `share_mocks` and stop for the owner's
pick. Each direction shows:

- The mark as inline SVG at hero size, app bar (26 px), and favicon 32 and
  16. Draw marks as SVG by hand; image models give raster only. If a
  `raster_art` concept wins, vectorize it (`vtracer` or `potrace`) and clean
  the paths.
- The wordmark and type pairing, with the fonts loaded.
- The palette. Keep the project's colors and their meanings.
- An OG card with the tagline, so voice and look are judged together.

Screenshot each mock at 16 px before you show it. A dot disappears, an N
reads as an M. After the pick, write the brand record: mark, palette, type,
voice, taglines, the pick and why, and where the source files are.

## Phase 3: assets

1. Fonts: static TTFs of each weight in `brand/fonts/`, with the OFL
   license. resvg does not pick weights from a variable font. Download with
   a timeout. If the loop hangs after it writes the files, check each header
   (`file brand/fonts/*.ttf` says "TrueType") and move on. The site serves
   the same fonts itself (Fontsource), so no request goes to Google.
2. Inputs: commit `brand/mark.svg` and `brand/brand.json` with `name`,
   `tagline`, `description`, `ogSubtitle`, `url`, `themeColor`,
   `background`, `panel`, `ink`, `ink2`, `ink3`, `accent`, `displayFont`,
   `bodyFont`, `fonts` (TTF paths), and optional `ogArt`.
3. Generate: copy `scripts/brand-assets.ts` to the project's `scripts/`, add
   `@resvg/resvg-js` as a dev dependency and a `brand:assets` script
   (`node scripts/brand-assets.ts`; Node 24 runs TypeScript). It writes
   `public/favicon.svg`, `favicon.ico`, `apple-touch-icon.png`,
   `icon-192.png`, `icon-512.png`, `site.webmanifest`, and `og.png`. Look at
   `og.png`, then commit the outputs. The build never runs the script.
4. Head: link the favicons and manifest, and set the OG and Twitter image.
   Add a light and a dark `theme-color` tag, each with a `media` query.
   TanStack Start's `head()` keeps one meta per name and drops one, so
   render both tags in the document head. In Next.js, use the `viewport`
   export's `themeColor` array.
5. Apply: mark and wordmark in the app bar, palette on the Clerk modal. Type
   the appearance object with
   `satisfies ComponentProps<typeof ClerkProvider>["appearance"]`, so a
   color key Clerk no longer reads fails the build.

Use SVG for shapes and WebP for raster art on pages (`scripts/to-webp` from
the PNG master). Keep PNG for OG and Twitter cards, apple-touch, and ICO.

## Raster art

Only when `raster_art` names a skill or command. It owns install, hardware,
and generation. Use it for concept boards, hero and section art, and an OG
texture. This skill adds the brand rules:

- The prompt carries the palette hex values and their meanings, mood words
  from the brand record, "no text, no letters, no logos", and the crop. One
  prompt per subject. Vary seeds, not words.
- Curate against this brand only. Show survivors as a mock before you
  commit them.
- Masters stay PNG in `brand/art/`; pages ship WebP. For an OG texture, set
  `ogArt` to the PNG; the script lays it under the text at 35% opacity.
- Record the prompt file, seed, model, and master path in the brand record.

## Verify

- Open the site: tab favicon, app bar, sign-in modal, browser bar in light
  and dark.
- Fetch `/og.png` and `/site.webmanifest` on the live hostname, and paste
  the URL into a card validator.
- The script splits the tagline at the sentence end or comma nearest the
  middle. It does not measure width, so look at `og.png` after a change.

## Example: Called it

Called it is a decision journal: log a call with a confidence, grade it
later. The agent found neutral UI-kit tokens, green for a hit, red for a
miss, and no mark: no brand, with one color meaning to keep. It mocked
"Ledger" (paper, ink, a red pencil circle around a check), "Diagonal", and
"Stamp". At 16 px Diagonal's dot vanished and Stamp read as a chat app, so
Ledger won. Red stayed for the pencil and "Wrong" only. Buttons became ink,
because a red button read as a warning. Two things broke: the font download
hung (step 1) and the light `theme-color` tag vanished (step 4).
