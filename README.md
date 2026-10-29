# skills

Agent skills I use to take a project from "it works for me" to a public
product. These are mine, built for my stack and my setup. Use them as they
are, or fork them and change them for yours.

I'm Ralph. I build in public at [r4lph.io](https://r4lph.io).

## Product readiness

Give an agent one prompt, such as "make this sellable", and `product-readiness`
runs the steps the project is missing, in order, with one pull request per
step:

| Skill | What it does |
| --- | --- |
| `product-readiness` | Asks what you want, reads what the repository already has, and runs the skills below in dependency order. Ends with one readiness report. |
| `domain-provisioning` | Creates the Vercel project, gives the app a public hostname with TLS, and records every setting that carries the hostname. |
| `brand-creation` | Finds the existing brand or makes a new one: mark, wordmark, palette, type, voice, favicons, icons, and the OG image. You pick from mocked directions. |
| `waitlist-gate` | Puts sign-up behind a Clerk waitlist, and shows how to invite people from it. |
| `landing-page` | Builds the signed-out front page in the brand, with terms, privacy, and analytics. You pick from mocked directions. |
| `seo-aeo-geo` | Adds what search engines and AI assistants read: head tags, JSON-LD, robots, sitemap, `llms.txt`, an audit script, and a claims check. |
| `production-provisioning` | Creates the production resources and proves that a signed-in request works end to end. Asks before each step that creates a real resource. |

You can run any one of them alone.

Last tested on 2026-10-29. A clean agent with only these skills and no
settings file took a fresh app from localhost to production in about 48
minutes, with 8 pull requests. The owner answered 14 setup questions in one
reply, picked the brand and landing directions from local mocks, and added
six DNS records by hand. A signed-in request then worked on production.

### The stack

The skills assume this stack and do not try to cover others:

- [Convex](https://convex.dev) for the backend
- [Clerk](https://clerk.com) for sign-in and the waitlist
- [Vercel](https://vercel.com) for hosting and domains
- TanStack Start or Next.js

The DNS steps work with deSEC, Vercel DNS, or any DNS host where you add the
records by hand.

## Prerequisites

- Node 24 or later, which runs the TypeScript scripts directly, and pnpm
- The Vercel CLI (`vercel`), logged in
- python3 for the audit and hostname scripts, with Pillow for `to-webp`
- `curl`, `jq`, and `dig`

The skills run the Clerk CLI as `pnpm dlx clerk@4` and the Convex CLI as
`npx convex` from the project, so you do not install them.

## Install

Copy or link each folder in `skills/` into your agent's skills directory:

```sh
git clone https://github.com/r4lphio/skills.git
mkdir -p ~/.claude/skills
for skill in skills/skills/*/; do ln -s "$PWD/$skill" ~/.claude/skills/; done
```

Codex reads `~/.agents/skills`, and Cursor reads `~/.cursor/skills`. Link the
same folders there if you use them.

## Settings

The skills read your setup from `~/.config/product-readiness/settings.md`:
your hostname shape, how DNS records get written, your Vercel team, how to
load secrets, how to show you mocks, and which sites of yours
should link to a new product.

You do not need the file to start. When a skill needs a value that is
missing, it asks once and offers to save your answer. To fill it in up
front, copy `settings.example.md` to that path and edit it.

The file holds no secrets. It says where a secret lives and how to load it.

## License

MIT
