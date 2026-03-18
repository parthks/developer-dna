# Developer DNA

A data-driven developer portfolio that analyzes all your GitHub repositories and generates a visual profile of who you are as an engineer.

**Live site:** [parth-portfolio-4qr.pages.dev](https://parth-portfolio-4qr.pages.dev)

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
- **Cloudflare Pages** — hosting

## Setup

```bash
npm install
```

### Run the analysis

Requires `gh` CLI authenticated (`gh auth login`):

```bash
node scripts/analyze.js
```

This scans all repos and writes `src/data/developer-dna.json`.

### Development

```bash
npm run dev
```

### Build and deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name parth-portfolio
```

## Customization

Edit `scripts/analyze.js` to configure:

- `GITHUB_USERNAME` — your GitHub username
- `REPOS_DIR` — path to locally cloned repos
- `DESCRIPTION_OVERRIDES` — manually set repo descriptions
- `CATEGORY_OVERRIDES` — force a repo into a specific category
