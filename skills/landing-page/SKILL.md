---
name: landing-page
description: Use when a product needs a public marketing page, when the signed-out front door is a bare sign-in prompt, or when someone asks for a homepage, hero, or launch page. Covers the mock-first choice of direction, the build in the project's brand, and wiring the call to action to the waitlist or sign-up.
---

# Landing page

The page a stranger sees first. It says what the product does in one line,
offers two doors (request access or sign in), and shows enough of the
product to be believed. It uses the project's own brand. The deliverable
includes terms and privacy pages and analytics.

## Settings

Read `~/.config/product-readiness/settings.md` first. A value in the
project's `docs/HOSTNAME.md` or readiness doc wins. If a key is missing, ask
the owner once and offer to save the answer. `none` is an answer.

- `share_mocks`: `local` writes each direction to
  `docs/plans/landing/<letter>-<name>.html` and opens it; screenshot each
  one and show the screenshots. A skill or command name publishes each file
  and returns links. Missing: ask, and offer `local`.
- `brand_record`: where the `<project>-brand` record is. `project` means a
  skill in the project's skills folder; a path means
  `<path>/<project>-brand/`. Missing: ask, and offer `project`.

## Before starting

- Read the brand record. If there is none, run `brand-creation` first. A
  landing page without a brand is rework.
- Know the doors: open sign-up, invite only, or a waitlist
  (`waitlist-gate`). The primary CTA is the one a stranger can use.
- Find where the app splits signed-in and signed-out. If a signed-out shell
  in the root wraps every route, it swallows child routes such as
  `/waitlist` and `/terms`. Mount the landing on `/` instead.

## 1. Mock first

Mock two or three directions through `share_mocks` and stop for the owner's
pick. Keep the nav, feature row, footer, and CTA the same in each, so the
choice is about what carries the page:

- **Product first**: headline, support line, two buttons, a product frame
  cut at the fold.
- **The number**: one card that demonstrates the core idea.
- **The story**: copy-led, the founder's reason, then three steps.

Load the brand fonts in the mock. Use the tagline as the headline. Label
every number as a sample.

## 2. Build

- One component (`src/components/Landing.tsx` or the framework's
  equivalent). Its comment names the direction and the no-real-data rule.
- Server-render it for signed-out visitors, so crawlers get the page and
  signed-in people never see it flash. In TanStack Start with Clerk, the
  middleware settles `useAuth()` on the server, so the index route can
  return `isSignedIn ? <App /> : <Landing />`. In Next.js, read `auth()` in
  the server component.
- Build product frames from the app's tokens with fixed numbers, not
  screenshots of a real account.
- Headline in the brand's display font. Use a color accent only where the
  brand gives it a meaning.
- CTA to the waitlist or sign-up route. Secondary to the sign-in modal.
- Check 390 px and 1280 px. Use no animation that repaints all the time.
- Terms and privacy pages, linked from the footer and listed in the
  sitemap. Write them in plain language from what the product does: what it
  collects, which providers handle it, what never leaves. Name every
  provider the page loads, fonts included; self-host fonts so none load from
  Google. The owner reviews both pages before launch.
- Analytics in the root (`@vercel/analytics`), named in the privacy page.
  Vercel has no API to turn on Web Analytics. Ask the owner to turn it on in
  the Vercel dashboard, and list it as a follow-up until then. Until then
  the script's request returns 404 and the page still works.
- Leave the rest of the head to `brand-creation` (OG, description) and
  `seo-aeo-geo` (per-route heads, structured data, FAQ).

## 3. Verify

- Load the page signed out (an incognito browser context or the preview
  browser). Screenshot above and below the fold. The dev server's devtools
  button is not part of the page.
- Signed-in people still land on the app.
- Both doors work: the CTA reaches the waitlist form, and sign-in opens the
  modal.
- `/`, `/terms`, and `/privacy` return 200.
- Update the project's readiness checklist.

## Example: Called it

Called it is a decision journal with a waitlist. The agent read the brand
record: red marks a miss and nothing else. It mocked all three directions.
"The number" won: a sample card says "At 90 percent sure, you were right 6
in 10", which explains calibration before any reading. Eyebrows and step
numbers moved from red to muted ink, so red appears once, on the miss.
Review found the privacy page did not name Google Fonts, so the fonts moved
onto the site. Web Analytics stayed off until the owner turned it on in the
dashboard. The owner read the legal pages and accepted them as written.
