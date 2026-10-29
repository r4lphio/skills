---
name: product-readiness
description: Use when someone wants to take a project from "works for us" toward "sellable" or public, asks for launch prep, a public URL, a waitlist, a landing page, or "what is left before people can sign up". Routes to the single-job skills (domain-provisioning, brand-creation, waitlist-gate, landing-page, seo-aeo-geo, production-provisioning) and runs only the ones the request needs, in dependency order.
---

# Product readiness

An orchestrator. It does none of the work itself. It asks what the owner
wants, reads what the repository already has, runs the single-job skills that
are missing, in order, and ends with one checklist. Each skill also runs
alone. This skill makes "make it sellable" one request, not six.

The stack is fixed: Convex, Clerk, and Vercel, with TanStack Start or Next.js.

## Settings

Settings live in `~/.config/product-readiness/settings.md`. A value in the
project's `docs/HOSTNAME.md` or readiness doc wins over the file. `none` is an
answer.

- `share_mocks`: how to share the plan page. `local`: write the HTML file and
  open it in the browser. A skill or command name: run it on the file and send
  the link it returns. Missing: ask at intake, and offer `local`.
- `sibling_sites`: other sites of the owner that link to a new real product.
  `seo-aeo-geo` uses it. `none`, or a personal test: no cross-links.

## 1. Intake

Ask every question in one message, before any work starts. A question that
comes up mid-run stops the run until the owner answers.

1. Pick the skills from the request:

   | Ask | Skills |
   | --- | --- |
   | "a public URL" | domain-provisioning |
   | "a waitlist" or "gate sign-up" | waitlist-gate (after domain, so origins are real) |
   | "a logo", "favicons", "the brand" | brand-creation |
   | "a landing page", "homepage" | brand-creation (if none), landing-page |
   | "SEO", "show up in ChatGPT", "social previews" | brand-creation (OG image), seo-aeo-geo |
   | "go to production", "real users" | domain-provisioning, production-provisioning |
   | "make it sellable", "launch prep" | all of the above |

2. Read the settings file and the project overrides. Read the "Settings"
   section of each chosen skill. List each key that has no value.
3. Ask the owner, in one message:
   - each missing setting, with the default its skill offers, and whether to
     save the answers in the settings file;
   - the hostname that `hostname_shape` gives, to confirm;
   - whether the project is a real product or a personal test. A real product
     gets the `sibling_sites` cross-links. A personal test gets none, and
     production-provisioning can stop at a written checklist while the
     project stays on its dev deployments;
   - who makes the taste picks (the brand and landing directions): the owner,
     or the agent, with its reasons in the decision log;
   - the CLI logins that only the owner can approve: `clerk auth login`, and
     `vercel login` or `convex login` if they are not logged in. The
     `waitlist-gate` skill shows the Clerk login when the owner approves on a
     phone.
4. Write the answers in `docs/READINESS.md`. Save the settings answers if the
   owner agrees.

Intake is done when each key that the chosen skills read has a value or
`none`, and the owner has answered each question.

## 2. Read the repository (read-only)

Find out what exists, so no finished work is done again:

- Hostname: `docs/HOSTNAME.md`, or `vercel domains ls`.
- Brand: the `brand_record`, `brand/`, `public/favicon.svg`, `og.png`.
- Waitlist: `clerk config pull | jq .auth_access_control.sign_up_mode`
  (`waitlist-gate` shows how to run the Clerk CLI).
- Landing: what the signed-out shell renders.
- SEO: run `seo-aeo-geo/scripts/seo-audit` against the dev server. Record
  the score as the "before" score.
- Production: `clerk deploy status --mode agent` (a read-only JSON report),
  the Convex prod deployment, and the Vercel Production env.

## 3. Plan and confirm

Write the plan as one HTML page at `docs/plans/product-readiness/index.html`
and share it as `share_mocks` says. Screenshot the page before you send it.
The plan lists the skills in order, what each one makes, what the owner must
decide or do by hand (DNS records, the brand pick, legal review, production
keys), and what is skipped because it exists. Stop for the owner's go.

The order that respects dependencies:

1. domain-provisioning (each later step targets the real hostname)
2. brand-creation (landing, OG, and SEO read it)
3. waitlist-gate (before anyone gets the public URL)
4. landing-page
5. seo-aeo-geo
6. production-provisioning (last, because it creates real resources and needs
   consent for each step)

## 4. Run

Invoke each chosen skill in turn. Each skill owns its mocks, its pull request,
and its verification. After the owner merges, start the next skill from the
updated `main` and read the repository state again, because a skill can stop
for an owner's pick.

Keep the checklist in `docs/READINESS.md`. Before each stop for the owner,
write the question and options in `docs/decisions.md`. Add the pick, who made
it, and why after the answer.

## 5. Finish

Write one readiness report, in `docs/READINESS.md` and the last pull request:

- what is live: hostname, brand, waitlist, landing, and the SEO audit score
  before and after;
- what is still manual: legal review of terms and privacy, DNS records
  outside the agent's zone, Vercel Web Analytics (it has no API), the owner's
  own production account (see `waitlist-gate`), and Git auto-deploy if
  deploys ran from the CLI;
- what was skipped, and why;
- totals: elapsed time, agent working time, pull requests, and picks;
- the next decision for the owner.

## Worked example: Called it

Called it is a small decision journal that ran on localhost with a Clerk dev
instance and a Convex dev deployment. The owner sent one prompt: "make it
sellable". The agent read open sign-up, no production instance, no Vercel
project, no brand, and an SEO audit of 5/25 on the dev server. It planned all
six skills in order.

Three questions came up mid-run: the hostname, who makes the picks, and the
Clerk login. The owner chose the default hostname shape and gave the brand
and landing picks to the agent. Then the Clerk login broke. The owner
approved it on another device, so the callback to `127.0.0.1` failed. The
owner pasted the callback URL, and the agent sent it to the CLI with curl.
With the app merge, this wait was about an hour. That is why intake now asks
everything at once.

Each skill opened one pull request:

1. domain-provisioning: one CNAME record, a Vercel project, TLS, and
   `docs/HOSTNAME.md`. Vercel's GitHub app could not see the new private
   repository, so the agent deployed with `vercel deploy --prod`.
2. brand-creation: three mocks, a pick by the agent with its reasons,
   favicons, a manifest, and an OG card. TanStack kept one `theme-color` tag
   per name, so the agent put both tags in the document head.
3. waitlist-gate: waitlist mode on the dev instance and a `/waitlist` page,
   with no test entries.
4. landing-page: three mocks, a pick by the agent, terms, and privacy. Vercel
   Web Analytics has no API, so the owner turned it on in the dashboard.
5. seo-aeo-geo: the live audit went from 13/26 to 28/28, and 11 claim quotes
   were found on the live pages. The owner chose no sibling cross-links.
6. production-provisioning: a Clerk production instance through the Platform
   API clone, the same call `clerk deploy` makes. Then Convex prod,
   the Vercel Production env, five Clerk DNS records, and a signed-in request
   proven end to end with a temporary user, which the agent then deleted.

The run made eight pull requests: the app, the plan, and the six skills. It
took about 1 h 22 min of agent work over 4 h 41 min elapsed. The other
3 h 19 min was waiting for the owner, mostly for merges. The owner's own
production account stayed manual, because waitlist mode keeps the owner out
too.
