# Developer DNA — Repository Analysis Specification

This document describes exactly what data needs to be extracted from your GitHub repositories to populate each section of the Developer DNA portfolio. It serves as the blueprint for the build-time analysis pipeline.

---

## Overview

The analysis runs at **build time** using the GitHub REST API (and optionally cloning repos for deeper analysis). It processes all public repositories for a given GitHub username and outputs a single JSON file (`developer-dna.json`) that the React app consumes.

**GitHub Username:** `{YOUR_GITHUB_USERNAME}`
**API Base:** `https://api.github.com`
**Auth:** Personal Access Token (optional, raises rate limit from 60 to 5,000 req/hr)

---

## Section 1: Metrics Strip

**What it shows:** 5 headline numbers — total repos, total lines of code, total stars, number of languages, year of first commit.

### Data to extract

| Metric | Source | How to compute |
|--------|--------|----------------|
| Total Repositories | `GET /users/{user}/repos?per_page=100&type=owner` | Count all non-fork repos (paginate if >100) |
| Total Lines of Code | `GET /repos/{user}/{repo}/languages` for each repo | Sum all byte values across all repos, then divide by ~50 (avg bytes per line) for an estimate. For exact counts, clone and run `tokei` or `cloc` |
| Total Stars | Each repo object has `stargazers_count` | Sum across all repos |
| Number of Languages | `GET /repos/{user}/{repo}/languages` for each repo | Collect unique language keys across all repos |
| First Commit Year | `GET /repos/{user}/{repo}/commits?per_page=1&page=last` on the oldest repo by `created_at` | Find the repo with the earliest `created_at`, fetch its oldest commit, extract the year |

### Output shape

```json
{
  "metrics": {
    "totalRepos": 72,
    "totalLinesOfCode": 1200000,
    "totalStars": 1249,
    "languageCount": 6,
    "firstCommitYear": 2018
  }
}
```

---

## Section 2: Language Genome (01)

**What it shows:** A donut chart of language distribution + detailed breakdown per language with repo count and line count.

### Data to extract

For **every** non-fork repository:

1. Call `GET /repos/{user}/{repo}/languages`
   - Returns: `{ "TypeScript": 245000, "JavaScript": 12000, "CSS": 8000 }`
   - These values are in **bytes**, not lines

2. Aggregate across all repos:
   - For each language, sum total bytes across all repos
   - For each language, count how many repos use it
   - Convert bytes to approximate lines: `bytes / 50` (rough average)

3. Rank languages by total bytes descending

4. Take the top N languages (e.g., top 6) and group the rest as "Other"

5. Calculate percentage of total for each language

### Computation

```
For each repo:
  languages = GET /repos/{user}/{repo}/languages
  For each language in languages:
    languageTotals[language].bytes += languages[language]
    languageTotals[language].repoCount += 1
    languageTotals[language].repos.push(repo.name)

Sort languageTotals by bytes descending
Calculate percentages relative to grand total bytes
Convert bytes to estimated lines (bytes / 50)
```

### Output shape

```json
{
  "languageGenome": {
    "totalBytes": 60000000,
    "totalEstimatedLines": 1200000,
    "languages": [
      {
        "name": "TypeScript",
        "bytes": 25200000,
        "estimatedLines": 504000,
        "repoCount": 35,
        "percentage": 42,
        "color": "#3178C6"
      },
      {
        "name": "Python",
        "bytes": 14400000,
        "estimatedLines": 288000,
        "repoCount": 15,
        "percentage": 24,
        "color": "#3572A5"
      }
    ]
  }
}
```

### Language colors

Use GitHub's official language color map: `https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml` — parse and extract the `color` field for each language.

---

## Section 3: Evolution Timeline (02)

**What it shows:** A horizontal timeline showing when each language first appeared in your repositories, with milestone annotations.

### Data to extract

For **every** non-fork repository:

1. Get repo `created_at` date from the repo object
2. Get repo languages from `GET /repos/{user}/{repo}/languages`
3. For each language, track the **earliest repo** that used it

### Computation

```
For each repo (sorted by created_at ascending):
  languages = GET /repos/{user}/{repo}/languages
  For each language in languages:
    if language not in firstSeen:
      firstSeen[language] = {
        year: repo.created_at.year,
        repo: repo.name,
        date: repo.created_at
      }

Group repos by year:
  For each year:
    newLanguages = languages first seen this year
    repoCount = repos created this year
    topRepoThisYear = repo with most stars created this year
```

### Milestone generation

For each year, generate a milestone annotation:

- **Year X (first year):** "First commit. Started with {languages}."
- **Year where TypeScript appears:** "TypeScript takes over. {context from repo descriptions}."
- **Year where a systems language appears:** "Systems programming. {Rust/Go/C} enters."
- **Most recent year:** "Peak output. {totalRepos} repos. {totalLines} lines."

These can be auto-generated from the data or manually curated. A hybrid approach works: auto-generate defaults, allow manual overrides via a config file.

### Output shape

```json
{
  "evolutionTimeline": {
    "milestones": [
      {
        "year": 2018,
        "newLanguages": ["Python"],
        "repoCount": 3,
        "annotation": "First commit. Started with data scripts and automation.",
        "totalLanguagesKnown": 1
      },
      {
        "year": 2020,
        "newLanguages": ["TypeScript", "JavaScript"],
        "repoCount": 12,
        "annotation": "TypeScript takes over. React enters the stack.",
        "totalLanguagesKnown": 3
      }
    ]
  }
}
```

---

## Section 4: Builder Profile (03)

**What it shows:** Categorization of all repositories by project type (CLI Tools, Web Apps, Libraries, APIs & Infra, etc.) with counts and percentages.

### Data to extract

For **every** non-fork repository, collect:

1. `name` — repo name
2. `description` — repo description
3. `topics` — repo topics/tags (from `GET /repos/{user}/{repo}/topics`)
4. `languages` — primary language
5. Files in root: `GET /repos/{user}/{repo}/contents/` — check for presence of key files

### Classification rules

Classify each repo into a category using these heuristics (in priority order):

| Category | Detection signals |
|----------|-------------------|
| **CLI Tool** | Topics contain `cli`, `terminal`, `command-line`; OR has `bin/` directory; OR package.json has `bin` field; OR description contains "CLI", "command-line", "terminal" |
| **Web App** | Topics contain `webapp`, `website`, `frontend`, `react`, `vue`, `svelte`, `nextjs`; OR has `public/index.html` or `src/App.{jsx,tsx}`; OR description contains "web app", "dashboard", "frontend" |
| **Library / SDK** | Topics contain `library`, `sdk`, `package`, `module`, `npm`, `pip`, `crate`; OR package.json has no `bin` but has `main`/`exports`; OR has `setup.py`/`pyproject.toml` without web framework deps |
| **API / Backend** | Topics contain `api`, `rest`, `graphql`, `backend`, `server`, `microservice`; OR has `Dockerfile` + server framework deps (express, fastify, flask, fastapi, gin) |
| **DevOps / Infra** | Topics contain `devops`, `infrastructure`, `terraform`, `docker`, `kubernetes`, `ci-cd`; OR has `terraform/`, `k8s/`, `.github/workflows/` as primary content |
| **Data / ML** | Topics contain `data`, `machine-learning`, `ml`, `ai`, `pandas`, `pytorch`, `tensorflow`; OR has Jupyter notebooks as primary content |
| **Config / Dotfiles** | Name contains `dotfiles`, `config`, `setup`; OR description contains "dotfiles", "configuration" |
| **Other** | Fallback for anything unclassified |

### Advanced classification (optional)

For better accuracy, Claude can analyze repo contents at build time:

1. Clone the repo (shallow: `git clone --depth 1`)
2. Read `README.md` first 500 chars
3. Read `package.json` / `Cargo.toml` / `pyproject.toml` for dependency analysis
4. Use the combination of dependencies + file structure + description to classify

### Output shape

```json
{
  "builderProfile": {
    "categories": [
      {
        "name": "CLI Tools",
        "icon": "terminal",
        "count": 18,
        "percentage": 25,
        "color": "#34D399",
        "repos": ["cloud-deploy-cli", "api-bench", "git-clean", ...]
      },
      {
        "name": "Web Apps",
        "icon": "globe",
        "count": 15,
        "percentage": 21,
        "color": "#3B82F6",
        "repos": ["design-tokens-ui", "portfolio", ...]
      }
    ]
  }
}
```

---

## Section 5: Code Signature (04)

**What it shows:** Engineering patterns and habits — avg repo size, test coverage rate, top frameworks, commit style.

### Data to extract

#### Average Repo Size
- Source: Language byte totals per repo (already collected for Language Genome)
- Compute: `totalEstimatedLines / totalRepos`

#### Repos with Tests
For each repo, check for test files/directories:

```
testIndicators = [
  "test/", "tests/", "__tests__/", "spec/",
  "*_test.go", "*_test.rs", "test_*.py",
  "jest.config.*", "pytest.ini", ".rspec",
  "vitest.config.*", "cypress/", "playwright/"
]

Call GET /repos/{user}/{repo}/contents/
Check if any test indicator exists in the root listing
OR check if package.json has "test" script that isn't "echo Error"
```

- Compute: `(repos with tests / total repos) * 100`

#### Top Frameworks
For each repo, detect frameworks from dependency files:

| File | Parse for |
|------|-----------|
| `package.json` | `dependencies` + `devDependencies` keys: react, vue, svelte, next, express, fastify, nestjs, tailwindcss, vite |
| `requirements.txt` / `pyproject.toml` | flask, django, fastapi, pandas, pytorch, tensorflow |
| `Cargo.toml` | actix-web, axum, tokio, serde, clap |
| `go.mod` | gin, echo, fiber, cobra |
| `Gemfile` | rails, sinatra |

- Aggregate: Count how many repos use each framework
- Return top 3-5 by frequency

#### Commit Style
For a sample of repos (e.g., top 10 by stars):

```
GET /repos/{user}/{repo}/commits?per_page=50

Analyze commit messages:
- Check if they follow Conventional Commits: /^(feat|fix|chore|docs|style|refactor|test|ci|build|perf)(\(.+\))?: .+/
- Check if they're capitalized sentence style
- Check average message length
- Check if they reference issues (#123)

Classify as:
- "Conventional" if >60% match conventional format
- "Descriptive" if avg length > 50 chars
- "Brief" if avg length < 20 chars
```

### Output shape

```json
{
  "codeSignature": {
    "avgRepoSize": 16700,
    "reposWithTests": {
      "count": 56,
      "total": 72,
      "percentage": 78
    },
    "topFrameworks": [
      { "name": "React", "repoCount": 18, "color": "#61DAFB" },
      { "name": "Express", "repoCount": 12, "color": "#000000" },
      { "name": "FastAPI", "repoCount": 7, "color": "#009688" }
    ],
    "commitStyle": {
      "type": "Conventional",
      "description": "feat: / fix: / chore: prefixed",
      "sampleSize": 500,
      "conventionalPercentage": 73
    }
  }
}
```

---

## Section 6: Highlights (05)

**What it shows:** 3 standout repositories — most starred, largest codebase, most forked.

### Data to extract

All data is already available from previous steps:

| Highlight | How to find |
|-----------|-------------|
| **Most Starred** | Sort all repos by `stargazers_count` descending, take first |
| **Largest Codebase** | Sort all repos by total language bytes descending, take first |
| **Most Forked** | Sort all repos by `forks_count` descending, take first |

For each highlighted repo, include:
- `name`
- `description`
- `stargazers_count`
- `forks_count`
- Primary language
- Estimated lines of code (from language bytes)

### Output shape

```json
{
  "highlights": [
    {
      "badge": "Most Starred",
      "badgeColor": "#34D399",
      "name": "cloud-deploy-cli",
      "description": "Deploy containerized apps to any cloud with one command.",
      "stars": 342,
      "forks": 48,
      "language": "TypeScript",
      "estimatedLines": 22400
    }
  ]
}
```

---

## Section 7: All Repositories (06)

**What it shows:** A sortable table of all repositories with name, language, type, stars, and estimated lines.

### Data to extract

For each non-fork repo, compile:

| Field | Source |
|-------|--------|
| `name` | Repo object `name` |
| `language` | Repo object `language` (primary language) |
| `type` | From Builder Profile classification |
| `stars` | Repo object `stargazers_count` |
| `estimatedLines` | From Language Genome per-repo byte totals |
| `url` | Repo object `html_url` |
| `updatedAt` | Repo object `pushed_at` |

Sort by stars descending by default.

### Output shape

```json
{
  "allRepos": [
    {
      "name": "cloud-deploy-cli",
      "language": "TypeScript",
      "languageColor": "#3178C6",
      "type": "CLI Tool",
      "stars": 342,
      "forks": 48,
      "estimatedLines": 22400,
      "url": "https://github.com/user/cloud-deploy-cli",
      "updatedAt": "2025-02-15T10:30:00Z"
    }
  ]
}
```

---

## Analysis Pipeline — Step by Step

### Step 1: Fetch all repositories

```
GET /users/{user}/repos?per_page=100&type=owner&sort=created&direction=asc
Paginate through all pages.
Filter out forks (where repo.fork === true).
Store the full repo objects.
```

### Step 2: Fetch languages for each repository

```
For each repo:
  GET /repos/{user}/{repo}/languages
  Store the language breakdown (bytes per language).
```

**Rate limit note:** With 72 repos, this is 72 API calls. Well within the 5,000/hr authenticated limit. Without auth, batch in groups of 50 with a 60s pause.

### Step 3: Fetch topics for each repository

```
For each repo:
  GET /repos/{user}/{repo}/topics
  (Requires header: Accept: application/vnd.github.mercy-preview+json)
  Store topics array.
```

### Step 4: Fetch root contents for classification

```
For each repo:
  GET /repos/{user}/{repo}/contents/
  Store file/directory names for test detection and project classification.
```

### Step 5: Sample commit messages

```
For top 10 repos by stars:
  GET /repos/{user}/{repo}/commits?per_page=50
  Store commit messages for commit style analysis.
```

### Step 6: Compute all derived metrics

Run all computations described in each section above.

### Step 7: Write output

Write `developer-dna.json` to `src/data/` (or `public/`).

---

## Total API Calls Estimate

| Step | Calls | Notes |
|------|-------|-------|
| Fetch repos | 1-2 | Paginated, 100 per page |
| Fetch languages | 72 | One per repo |
| Fetch topics | 72 | One per repo |
| Fetch root contents | 72 | One per repo |
| Fetch commits (sample) | 10 | Top 10 repos only |
| **Total** | **~228** | Well within 5,000/hr auth limit |

---

## Implementation Options

### Option A: Build-time script (recommended)

Create a Node.js script (`scripts/analyze.js`) that:
1. Runs all API calls
2. Computes all metrics
3. Writes `src/data/developer-dna.json`
4. This file is imported by the React app at build time

Run with: `node scripts/analyze.js && vite build`

### Option B: GitHub Action

A scheduled GitHub Action (e.g., weekly) that:
1. Runs the analysis script
2. Commits the updated `developer-dna.json`
3. Triggers a site rebuild/deploy

This keeps the data fresh without manual rebuilds.

### Option C: Serverless function

An API route (Vercel/Netlify function) that runs the analysis on demand and caches the result for 24 hours. More complex but always fresh.

---

## Config File

Allow manual overrides via `dna.config.json`:

```json
{
  "username": "your-github-username",
  "excludeRepos": ["old-project", "test-repo"],
  "excludeForks": true,
  "timelineOverrides": {
    "2020": {
      "annotation": "TypeScript takes over. Built my first React app."
    }
  },
  "categoryOverrides": {
    "my-special-repo": "CLI Tool"
  },
  "highlightOverrides": {
    "featured": "cloud-deploy-cli"
  }
}
```

This lets you exclude repos, override auto-generated timeline annotations, force-classify repos, and pin a featured project.
