# Portfolio Website Brainstorm

**Date:** 2026-03-18
**Status:** Ready for planning

## What We're Building

A minimal, clean personal portfolio website that automatically showcases all of Parth's public GitHub repositories. The site has two sections: a hero/intro area and a project grid pulled live from the GitHub API.

## Why This Approach

- **React + Vite + Tailwind** — User's preferred stack. Fast dev experience, modern tooling, utility-first CSS for the minimal aesthetic.
- **Build-time GitHub fetch** — Repos are fetched from the GitHub REST API during the build step and baked into the static output. No runtime API calls, no rate-limit concerns, instant page loads for visitors.
- **Minimal & clean design** — Lots of whitespace, simple typography, understated elegance. No unnecessary sections or features.
- **Static deployment** — Output is plain static files deployable to Vercel, Netlify, GitHub Pages, or any CDN.

## Key Decisions

1. **Stack:** React + Vite + Tailwind CSS
2. **Data source:** GitHub REST API, fetched at build time (no API key needed for public repos)
3. **Sections:** Hero (brief intro) + Projects grid only — keep it minimal
4. **Design:** Minimal & clean — whitespace-heavy, simple typography
5. **Purpose:** Professional online presence (not job-hunting focused)
6. **Project display:** Show repo name, description, primary language, star count, and link to GitHub
7. **Deployment:** Static site, host anywhere

## Open Questions

- What is your GitHub username? (needed to fetch repos)
- Do you want to filter out forked repos or show everything?
- Any preference on sorting? (stars, recently updated, recently created)
- Do you have a custom domain or will you use a platform subdomain (e.g., vercel.app)?
- Any specific color palette or font preferences, or should we pick something clean and neutral?
