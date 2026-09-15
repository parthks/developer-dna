# Developer DNA

A data-driven developer portfolio that analyzes all your GitHub repositories and generates a visual profile of who you are as an engineer.

**Live site:** [developer.parthshah.ai](https://developer.parthshah.ai) · [parth-portfolio-4qr.pages.dev](https://parth-portfolio-4qr.pages.dev)

## What it does

A build-time analysis script scans every repo (public + private) via the GitHub API and local clones, then outputs a single JSON file that powers a React app with:

- **Metrics Strip** — total repos, lines of code, languages, first commit year
- **Language Genome** — donut chart + breakdown of language distribution by lines of code
- **Evolution Timeline** — when each language first appeared in your repositories
- **Builder Profile** — treemap categorization of repos by type (Web App, Blockchain/Web3, Game, Mobile, etc.)
- **Code Signature** — total commits, avg lines per commit, top frameworks, most active year
- **Highlights** — curated standout projects across categories
- **Full Project Index** — sortable table of all repos with descriptions, language, type, and line counts

## Stack

- **React 19** + **Vite** — frontend
- **Tailwind CSS v4** — styling
- **Motion** (Framer Motion) — animations
- **GitHub CLI (`gh`)** — API access for repo metadata and topics
- **Node.js** — build-time analysis script
- **Cloudflare Pages** — hosting (project `parth-portfolio`)

## Automated weekly refresh

This site self-updates. A cron job on the host runs every **Sunday at 04:30** (server local time):

```
30 4 * * 0 /root/developer-dna/scripts/weekly-update.sh >> /root/developer-dna/logs/cron.log 2>&1
```

`scripts/weekly-update.sh` runs the full pipeline end to end:

1. `scripts/sync-repos.sh` — clone/fast-forward every non-fork repo into `$REPOS_DIR`
2. `node scripts/analyze.js` — regenerate `src/data/developer-dna.json`
3. **Sanity check** — the new JSON must have a plausible repo count and LOC, or the previous data is restored and the deploy is skipped
4. `npm run build` + `wrangler pages deploy` — publish to Cloudflare Pages

Logs land in `logs/cron.log`. Run it by hand any time with `./scripts/weekly-update.sh`.

## Setup

```bash
npm install
```

Requirements on the host:

- `gh` CLI authenticated with `repo` scope (`gh auth login`) — needed to list private repos
- SSH access to GitHub (clones use `git@github.com:`)
- `.env` in the project root (gitignored):

```
CLOUDFLARE_API_TOKEN=...   # needs Cloudflare Pages: Edit
CLOUDFLARE_ACCOUNT_ID=bd567a499191f6093d246402a0401ecd
```

### Run the pipeline manually

```bash
./scripts/sync-repos.sh                                  # clone/update all repos
REPOS_DIR=/root/github-repos node scripts/analyze.js     # regenerate the data
npm run build
./node_modules/.bin/wrangler pages deploy dist --project-name parth-portfolio
```

### Development

```bash
npm run dev
```

## Configuration

`REPOS_DIR` (env var) sets where local clones live — defaults to `/Users/parth/Documents/github-repos`, and the host scripts set it to `/root/github-repos`.

Edit `scripts/analyze.js` to configure:

- `GITHUB_USERNAME` — your GitHub username
- `DESCRIPTION_OVERRIDES` — manually set repo descriptions for repos without one on GitHub
- `CATEGORY_OVERRIDES` — force a repo into a specific category
