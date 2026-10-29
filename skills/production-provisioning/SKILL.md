---
name: production-provisioning
description: Use when a Convex + Clerk + Vercel project needs real production resources (a Convex prod deployment, a Clerk production instance, production env and deploy keys, first-run jobs, a verified email sender), or when someone asks to "go to prod" or "provision production". Covers the order, what each step touches, and the checks that prove a signed-in request round-trips.
---

# Production provisioning

The backend half of going live. Each step below creates or changes a real
resource. Name the resource and get the owner's consent first. The owner
can consent to the whole step list at once. Record that in the decision
log. A resource outside the list (for example a new DNS name) needs its own
consent. Never run a production command "to check".

Prerequisite: `domain-provisioning` has run, so the hostname and its
manifest (`docs/HOSTNAME.md`) exist. Every origin and URL below comes from
that manifest.

## Settings

Read `~/.config/product-readiness/settings.md` at the start. A value in the
project's `docs/HOSTNAME.md` or readiness doc wins over the file. When a
value is missing, ask the owner once and offer to save the answer. `none` is
an answer.

| Key | What this skill does with it |
| --- | --- |
| `secrets` | How to load each production provider key. Load it into a variable or a `umask 077` temp file, pipe it to the command, then delete the file. Never print a secret or put it in a command argument. `none`: the Clerk keys come from `clerk env pull` (step 1), and the owner pipes each other provider key in. |
| `vercel_team` | Passed as `--scope <team>` to every `vercel` command. `none`: omit `--scope`. |
| `dns_provider` | Picks the `domain-provisioning` DNS path for the Clerk and email records. `manual`: print the records for the owner. |
| `dns_zone` | The zone that gets the Clerk and email records. Record names are relative to it. |
| `dns_token` | How to load the DNS API token (`desec` only). Never print it or put it in a command argument. |
| `email_provider` | `resend`: run step 6. `none`: skip it. |
| `email_domains` | The production sending domain for step 6. |

Below, `clerk` means `pnpm dlx clerk@4` (or `npx clerk@4`), as in
`waitlist-gate`.

## 0. Inventory (read-only)

- Env vars the backend reads: `grep -rhoE 'process\.env\.[A-Z_0-9]+' convex | sort -u`.
  Each needs a production value or an explicit "not in prod". Dev-only
  flags (for example a seed switch) stay unset on prod.
- Clerk: the app ID, the dev instance ID, and whether a production
  instance exists (`clerk deploy status --mode agent`).
- Vercel: `vercel env ls production`. Convex: the prod deployment usually
  exists already, empty.

Write the inventory and the step list into the PR description, then ask
for consent.

## 1. Clerk production instance

```sh
clerk deploy --domain <hostname> --yes < /dev/null
```

Without a terminal, `clerk deploy` does not prompt. With `--domain` it
creates the production instance as a clone of the dev instance, then prints
a JSON status report with a `nextAction` field. The clone keeps the sign-up
mode (see `waitlist-gate`) and the `convex` JWT template with its claims.
The CLI also saves the new instance in its link, so `--instance prod` works
afterwards.

Fallback, when `clerk deploy` fails: make the same Platform API call. The
response holds the secret key, so keep only the instance `id`:

```sh
clerk api --platform -X POST /platform/applications/<app_id>/instances --yes < /dev/null \
  -d '{"domain":"<hostname>","environment_type":"production","clone_instance_id":"<dev_instance_id>"}' \
  | jq '{id, environment_type}'
```

Production gets no shared OAuth credentials, so turn off each social
provider the owner has no OAuth client for. Run it with `--dry-run` first:

```sh
clerk config patch --instance <prod_instance_id> --yes \
  --json '{"connection_oauth_google":{"enabled":false}}' < /dev/null
```

Clerk CLI rules:
- Target the instance by ID. After the fallback, `--instance prod` reads a
  cached link that has no production instance, and fails.
- Run each call as `timeout 90 clerk ... < /dev/null`, so a prompt fails
  fast instead of hanging.
- Pull the keys once, under `umask 077`:
  `clerk env pull --instance <prod_instance_id> --file /tmp/<project>-prod.env`.
  Call the Backend API with curl and a header function, so the key stays
  out of the arguments:
  `hdr() { printf 'Authorization: Bearer %s\n' "$(grep ^CLERK_SECRET_KEY= /tmp/<project>-prod.env | cut -d= -f2-)"; }`,
  then `curl -s https://api.clerk.com/v1/jwt_templates -H @<(hdr)`.

## 2. Convex production

1. Set `CLERK_JWT_ISSUER_DOMAIN` to `https://clerk.<hostname>`. It works
   before the instance is live.
2. Set each other env var from stdin: `<load value> | npx convex env set --prod NAME`.
   Provider keys are the owner's production keys from `secrets`, not dev
   copies. Both `convex env get` and `env list --include-values` print the
   value. Compare hashes instead, with the same command on both sides:
   `npx convex env get --prod NAME | tr -d '\n' | sha256sum` and
   `<load value> | tr -d '\n' | sha256sum`. Copy a multi-line value
   (service account JSON) whole. A `| tail -1` once cut one to `}`, and
   every decrypt on prod failed.
3. Mint a deploy key: `npx convex deployment token create <project>-vercel-prod --prod --save-env /tmp/key.env`.
4. Push the functions: `npx convex deploy -y`.

## 3. Vercel Production

1. Replace the dev values that `domain-provisioning` set. Pipe each value
   in on stdin, never with `--value`:
   `grep ^NAME= /tmp/<file>.env | cut -d= -f2- | tr -d '\n' | vercel env add NAME production --force`.
   Production gets `CONVEX_DEPLOY_KEY`, the prod Convex URLs, and the
   production Clerk keys. On TanStack Start these are `VITE_CONVEX_URL`,
   `VITE_CONVEX_SITE_URL`, `VITE_CLERK_PUBLISHABLE_KEY` and
   `CLERK_SECRET_KEY`. On Next.js they are `NEXT_PUBLIC_CONVEX_URL`,
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. Delete the
   temp files.
2. Let only a production build deploy Convex. In `vercel.json`:
   `"buildCommand": "if [ \"$VERCEL_ENV\" = production ]; then pnpm exec convex deploy --cmd 'pnpm build'; else pnpm build; fi"`.
   Previews keep dev Clerk and dev Convex. A production deploy pushes the
   local `convex/` folder, so the README and manifest say to deploy only
   from an up-to-date `main`.

## 4. Clerk DNS records

`clerk deploy status --mode agent` lists `pendingDnsRecords`: five CNAMEs
under the hostname (`clerk`, `accounts`, `clkmail`, `clk._domainkey`,
`clk2._domainkey`). Get consent for these names, then write them through
the DNS path for `dns_provider`. A new name can return NXDOMAIN for
minutes, so wait until the zone's own name server serves it. Then run
`clerk api --platform -X POST /platform/applications/<app_id>/domains/<hostname>/dns_check`
and poll `clerk deploy status --mode agent` until DNS, SSL and mail are
complete.

## 5. Deploy and data

Deploy once, after every variable is set: `vercel deploy --prod`, or
`vercel redeploy <latest-production-url>` when Git deploys are on.

A new product starts empty, so seed nothing. In waitlist mode the owner joins
through `/waitlist` or a dashboard invitation. When dev data must move:
- `npx convex export` from dev, then `npx convex import --prod --replace-all --yes`.
  The import keeps document IDs.
- Production Clerk issues a new subject for the same person, so re-key
  ownership once. Production sign-in works only on its own domain, so
  create the owner's user with the Backend API (`POST /v1/users`,
  `skip_password_requirement: true`). A hand-run internal mutation moves
  rows from the dev subject to the prod subject in batches and is safe to
  rerun. A test fails when a table that holds a subject is missing from
  it. The owner sets a password through "Forgot password".
- A provider that stores a webhook per item keeps posting to the old
  deployment. Point each one at the prod `.convex.site` URL.
- Run first-run jobs (backfills, cron bootstraps) with
  `npx convex run --prod <fn>` and record each result in the PR.

## 6. Email sender

Skip when `email_provider` is `none` or the app sends no email. Clerk sends
its own sign-in and waitlist mail through `clkmail`. Otherwise create the
sending domain from `email_domains` once per provider, write its DKIM, SPF
and return-path MX records through the DNS path, verify it, and set the
sender address on Convex prod.

## 7. Verify

- The live page has a `pk_live_` key, and its JS names only the prod
  Convex deployment.
- Signed-in round trip with a temporary user. Keep tokens in `umask 077`
  files and pass headers with `-H @<(fn)`:
  1. Backend API: `POST /v1/users`, then `POST /v1/sign_in_tokens` for it.
  2. `POST https://clerk.<hostname>/v1/client/sign_ins?_is_native=1` with
     `strategy=ticket&ticket=<token>`. Keep the `Authorization` response
     header and the session ID.
  3. `POST https://clerk.<hostname>/v1/client/sessions/<sid>/tokens/convex?_is_native=1`
     returns a JWT with `iss` `https://clerk.<hostname>` and `aud` `convex`.
  4. `POST https://<prod>.convex.cloud/api/query` with
     `{"path":"<module>:<query>","args":{},"format":"json"}` succeeds with
     the JWT and fails without it.
  5. Delete the user and the files.
- In a private window, the sign-in modal has no "Development mode" badge.
- The owner submits an address on `/waitlist`, and the entry shows on the
  production instance's Waitlist page, or in
  `clerk api --instance <prod_instance_id> /waitlist_entries < /dev/null`.
- When `email_provider` is not `none`, an email from the app arrives from the
  verified sender, and its headers pass DKIM and SPF.
- The `seo-aeo-geo` audit passes live, and each manifest row names a
  production resource.

## Maintenance

- A Convex secret lives in dev, prod, and the Default Environment Variables
  (dashboard, Settings) that each new preview copies. Rotate all three, and
  set existing previews with `npx convex env set --deployment preview/<branch> NAME`
  from stdin. A missed preview failed with "Invalid JWT Signature".
- To judge UI on a preview, seed it from dev: `npx convex export --path /tmp/x.zip`,
  then `npx convex import --deployment preview/<branch> --replace-all --yes /tmp/x.zip`,
  and delete the zip. Previews use dev Clerk, so dev subjects match.

## Worked example: Called it

Called it, a decision journal, had a waitlist-mode dev instance, a live
hostname and an empty Convex prod. The owner consented to the steps up
front. The agent used the Platform API clone, which took 10 seconds.
`clerk api --instance prod` then failed on the CLI's cached link, and one
call hung on a prompt. The agent killed it, pulled the keys by instance ID
and used curl. `clerk deploy --domain` saves the link, so it avoids the
first failure. Functions were on prod at 4 minutes. After a separate yes for the five names, the CNAMEs went
in at 4.5 minutes. The name server answered NXDOMAIN for about 2 minutes,
and Clerk verified 8 minutes after the records. Deploy and round trip
followed within a minute: about 14 minutes from start to proof. The app
sends no email, so step 6 was skipped.
