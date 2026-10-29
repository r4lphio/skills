---
name: domain-provisioning
description: Use when a project needs a public hostname (for example <project>.labs.example.com), when its hostname changes, or when someone asks what has to change if the domain changes. Covers DNS records, Vercel domain attach, TLS, and the hostname-dependent settings in the repo.
---

# Domain provisioning

Give a project a working hostname in minutes. Write down every place the
hostname is baked in, so a later move to a bought domain is a re-run, not a
hunt.

## Settings

Read `~/.config/product-readiness/settings.md` at the start. A value in the
project's `docs/HOSTNAME.md` or readiness doc wins. When a value is missing,
ask the owner once and offer to save the answer. `none` is an answer.

| Key | Use |
| --- | --- |
| `hostname_shape` | Builds the hostname. Missing: ask, and offer `<project>.<dns_zone>`. |
| `dns_provider` | Picks the DNS path below. Missing: ask, and offer `manual`. |
| `dns_zone` | The zone that holds the records. Record names are relative to it. |
| `dns_token` | How to load the deSEC token (`desec` only). Never print it or put it in a command argument. |
| `vercel_team` | Passed as `--scope <team>` to `vercel`. `none`: personal account, omit `--scope`. |
| `email_provider` | `resend`: run the email hook in step 4. `none`: skip it. |
| `email_domains` | The sending domains for the email hook. |

## DNS paths

Each path writes the same records. Only the method changes.

### desec

The agent writes records by API. Values end with a dot, TXT values are
quoted, and the minimum TTL is 3600. The token goes in on stdin:

```sh
ZONE=<dns_zone>   # DESEC_TOKEN loaded as dns_token says, never echoed
curl -sS -H @- "https://desec.io/api/v1/domains/$ZONE/rrsets/" <<<"Authorization: Token $DESEC_TOKEN"
curl -sS -X PUT -H @- -H "Content-Type: application/json" \
  "https://desec.io/api/v1/domains/$ZONE/rrsets/" \
  --data-raw '[{"subname":"app","type":"CNAME","ttl":3600,"records":["cname.vercel-dns.com."]}]' \
  <<<"Authorization: Token $DESEC_TOKEN"
```

New records are not live at once. Public resolvers and deSEC's own servers
can answer NXDOMAIN for about two minutes. Wait until `ns1.desec.io` serves
the record, then check a public resolver. An early public query caches the
NXDOMAIN.

```sh
until dig +short @ns1.desec.io app.$ZONE CNAME | grep -q .; do sleep 15; done
```

### vercel

The domain uses Vercel DNS, so `dns_zone` is the registered domain. Vercel
DNS cannot host a sub-zone.

```sh
vercel dns add <dns_zone> <subname> CNAME cname.vercel-dns.com --scope <vercel_team>
vercel dns ls <dns_zone> --scope <vercel_team>
```

### manual

The owner adds the records at any DNS host. Print every record as a table,
then stop and wait:

| Name | Type | Value | TTL |
| --- | --- | --- | --- |
| `app.labs.example.com` | CNAME | `cname.vercel-dns.com.` | 3600 |

When the owner says the records are in, verify each one before you continue.
Ask an authoritative server first (`dig +short NS <dns_zone>` names one),
then `dig +short @1.1.1.1 <name> <type>`.

## One-time setup: a delegated zone

Do this once, only when `dns_zone` is a label under a domain whose DNS host
has no API (for example `labs.example.com` under `example.com`).

Why not a wildcard at the parent: a wildcard sends every name to one target.
Clerk production, Resend, and similar services need records with other
targets under the app hostname, so you would edit the parent's DNS for each
project. With a delegated zone, the parent holds only NS records, and every
record under the label is an API call. deSEC accepts any delegated name and
is free. Some hosts reject non-registrable names.

Check: `curl -sS "https://dns.google/resolve?name=<dns_zone>&type=NS"`. If
it lists the zone host's nameservers, the setup is done. If not:

1. Create the zone at deSEC (`POST /api/v1/domains/`,
   `{"name":"<dns_zone>"}`) and add `* CNAME cname.vercel-dns.com.`.
2. Confirm `ns1.desec.io` answers for a name under the zone.
3. Ask the owner to add, at the parent's DNS host (any provider),
   `NS <label> -> ns1.desec.io` and `NS <label> -> ns2.desec.org`, and to
   delete any old wildcard at that label. Verify with public resolvers.

Never move the parent's nameservers or put a CNAME at the apex. If the
parent's host cannot add DS records, leave DNSSEC off for the zone.

## Procedure

### 0. Preconditions

- `vercel whoami` succeeds.
- Name the Vercel project, hostname, DNS zone, and backend deployment
  before you touch anything. Touch production only when the owner asks.

### 1. Create and link the Vercel project

Skip this step when `.vercel/project.json` exists and the project has a
ready deployment.

```sh
vercel link --yes --scope <vercel_team> --project <project>
```

With `--yes`, the CLI creates the project if it does not exist. It writes
`.vercel/project.json` and adds `.env*` to `.gitignore`.

Set the app's env vars for Production and Preview from the dev values. Copy
each app variable in `.env.local`, but not `CONVEX_DEPLOYMENT` or
`VERCEL_*`. On TanStack Start these are `VITE_CONVEX_URL`,
`VITE_CONVEX_SITE_URL`, `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
On Next.js they are `NEXT_PUBLIC_CONVEX_URL`,
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. Pipe each value
in on stdin, never as an argument or with `--value`:

```sh
grep '^NAME=' .env.local | cut -d= -f2- | tr -d '\n' \
  | vercel env add NAME production,preview --scope <vercel_team>
```

`production-provisioning` later replaces the Production values. Then deploy
with `vercel deploy --prod --scope <vercel_team>`. Vercel's GitHub app may
not see a new private repository, so Git pushes do not deploy until the
owner grants the app access.

### 2. Write the app record

Write `<subname> CNAME cname.vercel-dns.com.` through the DNS path, even when
a wildcard would match. A wildcard never matches a name that exists in the
zone. When a service adds `clerk.app`, `app` becomes an empty non-terminal,
the wildcard stops matching it, and the site goes NXDOMAIN.

Every new name under the hostname (Clerk, email) is a separate record. Name
each one to the owner before you write it.

### 3. Attach the hostname

```sh
vercel domains add <hostname> <project> --scope <vercel_team>
vercel api /v6/domains/<hostname>/config   # expect "configuredBy": "CNAME"
vercel certs issue <hostname>              # only if HTTPS still fails after a few minutes
curl -sS -o /dev/null -w '%{http_code}\n' https://<hostname>/
```

- Vercel CLI 59 needs the project name as the second argument. CLI 50.x
  took one argument. Check `--help` if it fails.
- Add only the full hostname. Never add the zone name itself, because
  Vercel then attaches it as an alias. If that happens, remove it with
  `vercel alias rm <name> -y`, not `vercel domains remove`.
- If `vercel_team` does not own the parent domain, Vercel asks for a
  verification TXT record. Write it through the DNS path.
- The certificate can lag DNS. `vercel certs issue` finishes it in seconds.

### 4. Hooks: everything that carries the hostname

From the repo root, run `<skill-dir>/scripts/hostname-hooks .`. It prints
each env var or provider that carries a URL, where the code reads it, and
whether the update is programmable or a dashboard step. It does not see
hostnames in static files, so also grep the repo for the old host.

| Hook | Programmable half | Manual half |
| --- | --- | --- |
| App URL env var (`APP_URL`, `SITE_URL`, `PUBLIC_URL`) | `npx convex env set APP_URL https://<hostname>`. Never `convex env list`, because it prints secrets. | none |
| Site URL in files (brand config, OG image, `robots.txt`, `sitemap.xml`, `llms.txt`) | edit each, then regenerate assets built from them | none |
| Clerk | dev accepts any origin. The production domain and its records belong to `production-provisioning`. | none |
| WorkOS AuthKit | `WORKOS_REDIRECT_URI` | redirect URI in the dashboard |
| OAuth redirect URIs (Google, GitHub, Stripe) | the redirect env var | allowlist the exact URL first, or the env change breaks sign-in |
| Webhook URLs | usually the backend URL (`CONVEX_SITE_URL`); confirm and leave alone | dashboard if they carry the hostname |
| Email (`email_provider: resend`) | create `email_domains` in Resend once, then write their DKIM, SPF, and MX records through the DNS path | none |

Write the result to `docs/HOSTNAME.md` (template below) and open a PR. To
move to a bought domain, re-run steps 2 to 4 with the new name.

### 5. Verify

- `https://<hostname>/` returns 200 with a valid certificate.
- Sign-in works on the new origin in the owner's browser.
- Every programmable hook is applied. Every manual hook is listed with its
  exact value.

## Worked example: Called it

Called it was a decision journal on Convex, Clerk, and TanStack Start. The
agent read `dns_provider: desec` and zone `labs.example.com`. The zone and
its delegation existed, so it skipped the one-time setup.

The agent ran `vercel link` to create the `called-it` project and set the
four app env vars for Production and Preview from the dev Convex and dev
Clerk values. The Vercel Git connect failed, because the GitHub app could
not see the new private repository. The agent deployed with
`vercel deploy --prod`. It wrote
`called-it CNAME cname.vercel-dns.com.` by API. `vercel domains add` with
one argument failed on CLI 59, so the agent added `called-it` as the
project. HTTPS returned 200 within two minutes of the start.

The detector found one hook, Clerk, which needed nothing on dev. Later,
`production-provisioning` added five Clerk records under the hostname, and
they answered NXDOMAIN for about two minutes. The agent waited until
`ns1.desec.io` served them, then verified.

## docs/HOSTNAME.md template

```markdown
# Hostname

Current: https://<hostname>  (attached <date>, record in <dns_provider> zone <dns_zone>)

| Setting | Where | Value | Who updates it |
| --- | --- | --- | --- |
| DNS record | <dns_provider> zone <dns_zone> | `<subname> CNAME cname.vercel-dns.com.` | skill |
| Domain | Vercel project <project> | <hostname> | skill |
| APP_URL | Convex <deployment> env | https://<hostname> | skill |
| GOOGLE_REDIRECT_URI | Convex env + Google allowlist | https://<hostname>/oauth-return | owner, then skill |
| Site URL | `brand/brand.json`, `public/sitemap.xml` | https://<hostname> | skill |

To move: write the new record, `vercel domains add <new-host> <project>`, then update every row.
```
