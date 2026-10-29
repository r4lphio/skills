---
name: waitlist-gate
description: Use when a project needs sign-up put behind a waitlist, when someone asks to gate access before a public launch, or when listing or inviting waitlist entries, the owner's first account included. Clerk only.
---

# Waitlist gate

Close open sign-up in Clerk and send new people to a waitlist. Existing
accounts keep signing in. A public hostname should not go live without this
gate.

## Settings

Read `~/.config/product-readiness/settings.md` at the start. A value in the
project's `docs/HOSTNAME.md` or readiness doc wins. When a value is missing,
ask the owner once and offer to save the answer. `none` is an answer.

- `secrets`: how to load the Clerk secret key into `CLERK_SECRET_KEY` for
  the Backend API calls in step 4. Never print it or put it in a command
  argument. `none`: pull the key with `clerk env pull` (step 4).

## The Clerk CLI

The CLI is the npm package `clerk`. Run it as `pnpm dlx clerk@4` or
`npx clerk@4`. Below, `clerk` means that command. Without a terminal it runs
in agent mode and prints JSON. Pass `--yes` to each change and `< /dev/null`
to each call, so that a prompt cannot hang the shell.

Log in. `clerk auth login` prints an OAuth URL and waits 15 minutes for a
callback on `http://127.0.0.1:<port>/callback`:

```sh
BROWSER=echo clerk auth login > /tmp/clerk-login.log 2>&1 &
grep -oE 'https://clerk\.clerk\.com/oauth/authorize[^ ]+' /tmp/clerk-login.log | head -1
```

Send the URL to the owner. If the owner approves on another device, such as
a phone, the last page fails, because `127.0.0.1` is then the phone. Ask the
owner to paste the full address of that failed page. Send it to the waiting
CLI from the agent's machine:

```sh
curl -s -o /dev/null -w '%{http_code}\n' '<pasted callback URL>'   # 200: the CLI has the code
clerk whoami                                                        # "linked" names the app
```

If `linked` is `null`, run `clerk link`. A login claims an app made with
keyless dev keys and writes its keys to `.env.local`.

## 1. Flip the mode

The gate is an instance setting, not code:
`auth_access_control.sign_up_mode` is `public`, `restricted` (invite only),
or `waitlist`. `clerk config schema --keys auth_access_control` shows it.

```sh
clerk config pull > /tmp/clerk-config.json            # keep the whole file out of context
jq .auth_access_control.sign_up_mode /tmp/clerk-config.json
clerk config patch --dry-run --json '{"auth_access_control":{"sign_up_mode":"waitlist"}}'
clerk config patch --yes --json '{"auth_access_control":{"sign_up_mode":"waitlist"}}'
```

`--instance dev`, `prod`, or an instance ID picks the instance. Name the
instance before you change it. The dev instance often serves the live site
until production exists. If `--instance prod` fails with `instance_not_found`,
the CLI's link was made before the production instance existed. Use the
production instance ID from `clerk api --platform /platform/applications/<app-id>`.

What changes: new sign-ups become waitlist entries and get a "Waitlist
confirmation" email. Invited people get a "Waitlist invitation" email with a
sign-up link. `<SignIn />` keeps working for existing accounts.

## 2. Wire the front end

- Give `ClerkProvider` `waitlistUrl="/waitlist"`. The sign-in modal then
  shows "Want early access? Join waitlist" and links to your page.
- Add a `/waitlist` route that renders `<Waitlist signInUrl="..." />` from
  `@clerk/tanstack-react-start` or `@clerk/nextjs`, with its own page title.
  If the signed-out shell swallows child routes, render the form in the shell
  when the location is `/waitlist`.
- Give the signed-out page two doors: sign-in and "Request access". Make
  "Request access" a plain link with button styles. A Base UI `Button` that
  renders a link logs an error, and `nativeButton={false}` gives the link
  `role="button"`.
- Theme Clerk with `appearance.variables` from the project's tokens, and add
  `satisfies ComponentProps<typeof ClerkProvider>["appearance"]`. Clerk
  silently ignores old names such as `colorText`. The type check catches them.

## 3. Verify

- Load `/` and `/waitlist` signed out, in an incognito browser context, and
  screenshot both. The "Development mode" badge shows on a dev instance only.
- `clerk config pull | jq .auth_access_control.sign_up_mode` reads `waitlist`.
- Create no test entries. Each entry sends an email and lands on the owner's
  list. For a live test, the owner submits an address they control.

## 4. List and invite

The Waitlist page of the Clerk dashboard invites one entry at a time. From
the CLI, pass the instance ID. On production, use the production instance
ID (step 1), because the CLI's link may still point at dev:

```sh
clerk api --instance <instance-id> /waitlist_entries < /dev/null   # save to a file when large
clerk api --instance <instance-id> -X POST /waitlist_entries/<entry-id>/invite --yes < /dev/null
```

If the CLI fails or hangs, call the Backend API. Load the key as `secrets`
says. With `secrets: none`, pull it into a private temp file:

```sh
umask 077
clerk env pull --instance <instance-id> --file /tmp/clerk.env < /dev/null
export CLERK_SECRET_KEY="$(grep '^CLERK_SECRET_KEY=' /tmp/clerk.env | cut -d= -f2-)"
auth() { printf 'Authorization: Bearer %s\nContent-Type: application/json\n' "$CLERK_SECRET_KEY"; }
API=https://api.clerk.com/v1

curl -s -H @<(auth) "$API/waitlist_entries?status=pending&limit=100" \
  | jq '.total_count, [.data[] | {id, email_address, created_at}]'
curl -s -X POST -H @<(auth) "$API/waitlist_entries/<entry-id>/invite" -d '{}' | jq '{id, status}'
curl -s -X POST -H @<(auth) "$API/invitations" -d '{"email_address":"owner@example.com"}' | jq '{id, status}'
rm -f /tmp/clerk.env
```

`-H @<(auth)` keeps the key out of the process list. Each invite sends an
email, so confirm each address with the owner first.

The owner of a new product needs an invite too. Waitlist mode closes sign-up
for everyone, and dev users do not exist on the production instance. Invite
the owner's address, or the owner's waitlist entry, once production is in
waitlist mode.
