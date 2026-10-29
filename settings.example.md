# Product readiness settings

The product readiness skills read this file from
`~/.config/product-readiness/settings.md`. Copy this example there and fill in
your values, or leave the file out. When a value is missing, the skill that
needs it asks once and offers to save your answer here.

A project can override any value in its own `docs/HOSTNAME.md` or readiness
doc. The project value wins. See "Project overrides" at the end.

Write `none` for a setting you do not use. `none` is an answer, so the skill
does not ask again.

## Hostname and DNS

- hostname_shape: `<project>.labs.example.com`
- dns_provider: `desec`, `vercel`, or `manual`
  - `desec`: the agent writes records through the deSEC API.
  - `vercel`: the domain uses Vercel DNS, and the agent writes records with the Vercel CLI.
  - `manual`: the agent prints each record, and you add it at your DNS host.
- dns_zone: `labs.example.com`
- dns_token: how the agent gets the DNS API token, for example
  `environment variable DESEC_TOKEN`. Never the token itself.

## Accounts

- secrets: how the agent loads a secret, for example
  `environment variables` or
  `1Password: op read "op://<vault>/<item>/<field>" | <command>`. Pipe the
  output or capture it in a variable (`KEY="$(op read ...)"`). A bare
  `op read` prints the secret. Never write a secret itself here.
- vercel_team: `<team-slug>`

## Email

- email_provider: `resend` or `none`
- email_domains: production `mail.<zone>`, dev and preview `mail-dev.<zone>`

## Brand and pages

- share_mocks: `local` (write HTML files and open them in the browser), or the
  name of a skill or command that publishes a page and returns a link.
- raster_art: `none`, or the name of a skill or command that generates images
  locally.
- brand_record: `project` (a `<project>-brand` skill in the project repository),
  or a path to a skills repository.
- avoid_brands: brands a new product must not reuse, or `none`.

## Search and answer engines

- maker_site: your own site, which `ai.txt` and the JSON-LD `Organization` name
  as the maker, for example `https://example.com`. A project can override it.
- sibling_sites: other sites you own that should link to a new product, with
  the file each one uses (`ai.txt`, `llms-full.txt`, a router file), or `none`.

## Project overrides

To override a value for one project, add this section to the project's
`docs/HOSTNAME.md` with the same `key: value` lines:

```markdown
## Settings overrides

- maker_site: `https://other-brand.example.com`
- email_provider: `none`
```
