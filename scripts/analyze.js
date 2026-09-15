#!/usr/bin/env node

/**
 * Developer DNA Analysis Pipeline
 *
 * Analyzes all GitHub repos for a given user and outputs developer-dna.json.
 * Uses GitHub REST API for metadata + local clones for deep analysis.
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";

const GITHUB_USERNAME = "parthks";
const REPOS_DIR = resolve(process.env.REPOS_DIR || "/Users/parth/Documents/github-repos");
const OUTPUT_PATH = resolve("src/data/developer-dna.json");

// Manual category overrides
const CATEGORY_OVERRIDES = {
  "wedemat-kings": "Web App",
};

// Manually curated descriptions for repos that lack one on GitHub
const DESCRIPTION_OVERRIDES = {
  "orderflow-360": "Business operations management app for purchase orders, invoices, dispatches, and daily summaries.",
  "ArrowsAndAstras": "Browser-based game built with Phaser.js and React, inspired by Indian mythology.",
  "shadibaba": "Matrimonial profile management platform that extracts candidate data from PDFs using AI.",
  "ys-ai-test": "AI model testing tool that runs image-based prompts across multiple LLMs and compares results.",
  "react-router-starter-template": "Cloudflare Workers starter template for full-stack React apps with SSR.",
  "cf-vite-react-template": "Cloudflare Workers starter template for React apps with Vite and Hono.",
  "dumverse": "2D browser RPG game on the AO/Arweave ecosystem with towns, combat, shops, and exploration.",
  "ao-bazarworld": "2D tile-based virtual world for the AO ecosystem with NPCs, tilemaps, and spawn points.",
  "ao-library": "2D tile-based virtual library world for the AO ecosystem with NPCs and chat.",
  "fundars": "Permissionless ecosystem funding platform on AO where users stake AoETH with projects to earn tokens.",
  "SA-escape-velocity": "Puppeteer-based automation bot for the Star Atlas Escape Velocity game on Solana.",
  "vimeo-thumbnail-server": "Serverless API that fetches and caches video thumbnails from Vimeo and YouTube.",
  "wedemat-next": "Data search and exploration dashboard powered by Meilisearch with faceted filtering and pagination.",
  "Yelloskye-D3D": "Mapbox-based geospatial visualization tool for custom raster tilesets with measurement tools.",
  "virtual-event-starter-kit": "Starter kit for hosting virtual events, originally forked from Vercel.",
  "solana-mint-token": "React app for creating and minting SPL tokens on the Solana blockchain.",
  "price-bot": "Cryptocurrency arbitrage bot that monitors token prices across Uniswap and Kyber.",
  "theonlyindianstore": "Hyperlocal e-commerce platform for Indian groceries and essentials.",
  "admin": "Internal admin dashboard.",
  "virtuoso": "Firebase-hosted web app with authentication and Firestore backend.",
  "tindearyo": "Python bot that automates Tinder swiping by matching bios against configurable preferences.",
  "nextjs-netlify-blog-template": "Next.js blogging template for Netlify with tagging, pagination, and MDX content.",
  "nextjs": "Next.js site for browsing publications using Storyblok CMS and MeiliSearch.",
  "Yelloskye-QID": "Quality inspection dashboard with floor plan drawing, PDF reports, and real-time chat for construction projects.",
  "wedemat-react": "Business management system for tracking Indian stock market shareholder portfolios and IEPF workflows.",
  "Yelloskye": "Main Yelloskye portal that routes to sub-apps (QID, DEX, D3D) with Firebase auth.",
  "Yelloskye-QID-old": "Earlier version of the Yelloskye QID quality inspection and issue-tracking dashboard.",
  "wedemat-old-site": "Original WeDemat site with Firebase auth for shareholder address management.",
  "Yelloskye-DEX": "Drone/aerial survey project management platform with pilot registration and client dashboards.",
  "MealShare": "React Native mobile app for sharing and discovering homemade food nearby with map view and messaging.",
  "parthks-dotfiles": "Personal dotfiles configuration.",
  "EduSim-1.0": "Educational simulation game built with Phaser.js for practicing linear algebra through story-driven quests.",
  "dotfiles": "Shell dotfiles — symlinks .bashrc, .vimrc, and SSH config.",
  "Mvents": "iOS app for discovering and tracking events with calendar view, Facebook login, and Firebase backend.",
  "parthks.github.io": "Personal GitHub Pages site.",
  "PokeGoChat": "iOS app for Pokemon Go players to chat, find friends, and share map locations.",
};

// Language colors — chosen for visibility on dark backgrounds and uniqueness per language family
const LANGUAGE_COLORS = {
  // Dynamic / scripting
  JavaScript: "#f7df1e",   // bright yellow
  TypeScript: "#3b82f6",   // blue
  Python: "#38bdf8",       // sky blue
  Lua: "#7c3aed",          // vivid purple
  Ruby: "#ef4444",         // red
  Shell: "#22c55e",        // green
  PHP: "#a78bfa",          // light purple

  // Systems
  "C/C++": "#f97316",      // orange
  C: "#f97316",
  "C++": "#f97316",
  Rust: "#fb923c",         // lighter orange
  Go: "#00ADD8",           // cyan

  // Mobile
  Swift: "#F05138",        // swift orange-red
  Kotlin: "#A97BFF",       // purple
  Dart: "#00B4AB",         // teal

  // Web markup / styling
  HTML: "#e34c26",         // html orange
  CSS: "#a855f7",          // purple
  SCSS: "#ec4899",         // pink
  Vue: "#41b883",          // vue green
  Svelte: "#ff3e00",       // svelte red
  Astro: "#ff5a03",        // astro orange

  // Blockchain
  Solidity: "#AA6746",     // brown
};

// File extension → language mapping for local scanning
const EXT_TO_LANG = {
  ts: "TypeScript", tsx: "TypeScript",
  js: "JavaScript", jsx: "JavaScript", mjs: "JavaScript", cjs: "JavaScript",
  py: "Python",
  lua: "Lua",
  html: "HTML", htm: "HTML",
  css: "CSS",
  scss: "SCSS", sass: "SCSS",
  swift: "Swift",
  sh: "Shell", bash: "Shell", zsh: "Shell",
  rb: "Ruby",
  c: "C/C++", h: "C/C++", cpp: "C/C++", cc: "C/C++", hpp: "C/C++",
  vue: "Vue",
  astro: "Astro",
  go: "Go",
  rs: "Rust",
  sol: "Solidity",
  java: "Java",
  kt: "Kotlin",
  dart: "Dart",
  php: "PHP",
  svelte: "Svelte",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function ghApi(endpoint) {
  try {
    const result = execSync(
      `gh api "${endpoint}" --paginate 2>/dev/null`,
      { maxBuffer: 50 * 1024 * 1024, encoding: "utf-8" }
    );
    return JSON.parse(result);
  } catch {
    return null;
  }
}

function ghApiRaw(endpoint) {
  try {
    return execSync(
      `gh api "${endpoint}" 2>/dev/null`,
      { maxBuffer: 10 * 1024 * 1024, encoding: "utf-8" }
    );
  } catch {
    return null;
  }
}

function readLocalFile(repoDir, filePath) {
  const full = join(repoDir, filePath);
  try {
    return readFileSync(full, "utf-8");
  } catch {
    return null;
  }
}

function localDirExists(repoDir, dirPath) {
  const full = join(repoDir, dirPath);
  try {
    return statSync(full).isDirectory();
  } catch {
    return false;
  }
}

function localFileExists(repoDir, filePath) {
  const full = join(repoDir, filePath);
  return existsSync(full);
}

function listLocalDir(repoDir) {
  try {
    return readdirSync(repoDir);
  } catch {
    return [];
  }
}

function progress(msg) {
  process.stdout.write(`  ${msg}\n`);
}

// ── Step 1: Fetch all repositories ──────────────────────────────────────────

function fetchAllRepos() {
  console.log("\n[Step 1] Fetching all repositories...");
  // Use /user/repos (authenticated endpoint) to include private repos
  // affiliation=owner ensures we only get repos owned by the user (not org repos)
  const repos = ghApi(
    `/user/repos?per_page=100&affiliation=owner&sort=created&direction=asc`
  );
  if (!repos) {
    console.error("Failed to fetch repos");
    process.exit(1);
  }

  const nonFork = repos.filter((r) => !r.fork);
  const privateCount = nonFork.filter((r) => r.private).length;
  const publicCount = nonFork.length - privateCount;
  console.log(`  Found ${repos.length} total repos, ${nonFork.length} non-fork (${publicCount} public, ${privateCount} private)`);
  return nonFork;
}

// ── Step 2: Scan local repos for languages (replaces GitHub API) ────────────

function scanLocalLanguages(repos) {
  console.log("\n[Step 2] Scanning local clones for languages...");
  const repoLanguages = {};

  const EXCLUDE_DIRS = [".git", "node_modules", "dist", "build", ".next", "vendor", "__pycache__", ".venv", "venv"];
  const EXCLUDE_SUFFIXES = [".min.js", ".min.css", ".map", ".lock"];

  function walkDir(dir, depth = 0) {
    if (depth > 10) return [];
    let files = [];
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (EXCLUDE_DIRS.includes(entry.name)) continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          files = files.concat(walkDir(full, depth + 1));
        } else if (entry.isFile()) {
          if (EXCLUDE_SUFFIXES.some((s) => entry.name.endsWith(s))) continue;
          files.push(full);
        }
      }
    } catch { /* permission errors etc */ }
    return files;
  }

  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    if (i % 10 === 0) progress(`${i}/${repos.length}...`);

    const repoDir = join(REPOS_DIR, repo.name);
    const langBytes = {};

    if (!existsSync(repoDir)) {
      repoLanguages[repo.name] = {};
      continue;
    }

    const files = walkDir(repoDir);
    for (const file of files) {
      const ext = file.split(".").pop().toLowerCase();
      const lang = EXT_TO_LANG[ext];
      if (!lang) continue;

      try {
        const size = statSync(file).size;
        langBytes[lang] = (langBytes[lang] || 0) + size;
      } catch { /* ignore */ }
    }

    repoLanguages[repo.name] = langBytes;
  }

  progress(`${repos.length}/${repos.length} done`);
  return repoLanguages;
}

// ── Step 3: Fetch topics for each repo ──────────────────────────────────────

function fetchTopics(repos) {
  console.log("\n[Step 3] Fetching topics for each repo...");
  const repoTopics = {};
  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    if (i % 10 === 0) progress(`${i}/${repos.length}...`);
    const raw = ghApiRaw(`/repos/${GITHUB_USERNAME}/${repo.name}/topics`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        repoTopics[repo.name] = parsed.names || [];
      } catch {
        repoTopics[repo.name] = [];
      }
    } else {
      repoTopics[repo.name] = [];
    }
  }
  progress(`${repos.length}/${repos.length} done`);
  return repoTopics;
}

// ── Step 4: Local analysis (classification, tests, frameworks) ──────────────

function analyzeLocal(repos, repoLanguages, repoTopics) {
  console.log("\n[Step 4] Analyzing local clones...");

  const results = {};

  for (const repo of repos) {
    const repoDir = join(REPOS_DIR, repo.name);
    const hasLocalClone = existsSync(repoDir);
    const rootFiles = hasLocalClone ? listLocalDir(repoDir) : [];
    const topics = repoTopics[repo.name] || [];
    const desc = (repo.description || "").toLowerCase();
    const name = repo.name.toLowerCase();

    // Read package.json if present
    let packageJson = null;
    if (hasLocalClone) {
      const raw = readLocalFile(repoDir, "package.json");
      if (raw) {
        try { packageJson = JSON.parse(raw); } catch { /* ignore */ }
      }
    }

    // Read requirements.txt
    const requirementsTxt = hasLocalClone ? readLocalFile(repoDir, "requirements.txt") : null;

    // Read pyproject.toml
    const pyprojectToml = hasLocalClone ? readLocalFile(repoDir, "pyproject.toml") : null;

    // Read Cargo.toml
    const cargoToml = hasLocalClone ? readLocalFile(repoDir, "Cargo.toml") : null;

    // Read go.mod
    const goMod = hasLocalClone ? readLocalFile(repoDir, "go.mod") : null;

    // Read Gemfile
    const gemfile = hasLocalClone ? readLocalFile(repoDir, "Gemfile") : null;

    // ── Test detection ──
    const testIndicators = [
      "test", "tests", "__tests__", "spec",
      "jest.config.js", "jest.config.ts", "jest.config.mjs",
      "pytest.ini", ".rspec",
      "vitest.config.js", "vitest.config.ts", "vitest.config.mjs",
      "cypress", "playwright",
    ];
    let hasTests = rootFiles.some((f) =>
      testIndicators.some((t) => f.toLowerCase() === t.toLowerCase())
    );
    if (!hasTests && packageJson?.scripts?.test) {
      const testScript = packageJson.scripts.test;
      if (testScript && !testScript.includes("echo") && !testScript.includes("no test")) {
        hasTests = true;
      }
    }

    // ── Framework detection ──
    const frameworks = new Set();
    if (packageJson) {
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      const depKeys = Object.keys(allDeps || {});
      const frameworkMap = {
        react: "React",
        "react-dom": "React",
        vue: "Vue",
        svelte: "Svelte",
        next: "Next.js",
        "react-router": "React Router",
        express: "Express",
        fastify: "Fastify",
        nestjs: "NestJS",
        "@nestjs/core": "NestJS",
        tailwindcss: "Tailwind CSS",
        vite: "Vite",
        three: "Three.js",
        "socket.io": "Socket.io",
        prisma: "Prisma",
        "@prisma/client": "Prisma",
        supabase: "Supabase",
        "@supabase/supabase-js": "Supabase",
        firebase: "Firebase",
        ethers: "Ethers.js",
        web3: "Web3.js",
        hardhat: "Hardhat",
        "@solana/web3.js": "Solana Web3",
      };
      for (const dep of depKeys) {
        if (frameworkMap[dep]) frameworks.add(frameworkMap[dep]);
      }
    }
    if (requirementsTxt) {
      const pyDeps = requirementsTxt.toLowerCase();
      if (pyDeps.includes("flask")) frameworks.add("Flask");
      if (pyDeps.includes("django")) frameworks.add("Django");
      if (pyDeps.includes("fastapi")) frameworks.add("FastAPI");
      if (pyDeps.includes("pandas")) frameworks.add("Pandas");
      if (pyDeps.includes("pytorch") || pyDeps.includes("torch")) frameworks.add("PyTorch");
      if (pyDeps.includes("tensorflow")) frameworks.add("TensorFlow");
    }
    if (pyprojectToml) {
      const pyToml = pyprojectToml.toLowerCase();
      if (pyToml.includes("flask")) frameworks.add("Flask");
      if (pyToml.includes("django")) frameworks.add("Django");
      if (pyToml.includes("fastapi")) frameworks.add("FastAPI");
    }

    // ── Classification ──
    // Order matters: more specific categories first, broader ones later.
    let category = "Scripts & Experiments";

    // Check for manual override first
    if (CATEGORY_OVERRIDES[repo.name]) {
      category = CATEGORY_OVERRIDES[repo.name];
      results[repo.name] = { hasTests, frameworks: [...frameworks], category, packageJson: !!packageJson };
      continue;
    }

    const primaryLang = repo.language || "";
    const hasWeb3Deps = frameworks.has("Ethers.js") || frameworks.has("Web3.js") || frameworks.has("Hardhat") || frameworks.has("Solana Web3");
    const hasWeb3Signal =
      topics.some((t) =>
        ["blockchain", "web3", "solana", "ethereum", "nft", "defi", "arweave", "ao", "crypto"].includes(t)
      ) ||
      hasWeb3Deps ||
      /blockchain|web3|solana|ethereum|nft|token|mint|dex|arweave|ao |defi|crypto|permaweb/.test(desc) ||
      /solana|nft|token|dex|arweave|ao-|web3|crypto|fundars|ruc_nft|yelloskye/i.test(name);

    // 1. Blockchain / Web3 — check FIRST so Solana/Arweave React apps don't get swallowed by "Web App"
    if (hasWeb3Signal) {
      category = "Blockchain / Web3";
    }
    // 2. Game
    else if (
      topics.some((t) => ["game", "gaming", "gamedev"].includes(t)) ||
      /game|gaming|play|tron/i.test(desc) ||
      /game|dumverse/i.test(name)
    ) {
      category = "Game";
    }
    // 3. Mobile App
    else if (
      topics.some((t) => ["ios", "android", "mobile", "swift", "kotlin", "react-native", "flutter"].includes(t)) ||
      (hasLocalClone && (
        localFileExists(repoDir, "Info.plist") ||
        localDirExists(repoDir, "ios") ||
        localDirExists(repoDir, "android") ||
        localFileExists(repoDir, "AppDelegate.swift") ||
        // Check for .xcodeproj
        rootFiles.some((f) => f.endsWith(".xcodeproj") || f.endsWith(".xcworkspace"))
      )) ||
      (["Swift", "Kotlin", "Dart"].includes(primaryLang) && !frameworks.has("Vapor")) ||
      /ios|android|mobile app/i.test(desc)
    ) {
      category = "Mobile App";
    }
    // 4. CLI Tool
    else if (
      topics.some((t) => ["cli", "terminal", "command-line"].includes(t)) ||
      (hasLocalClone && localDirExists(repoDir, "bin")) ||
      packageJson?.bin ||
      /cli|command.line|terminal tool/.test(desc)
    ) {
      category = "CLI Tool";
    }
    // 5. Config / Dotfiles
    else if (
      /dotfiles|config/.test(name) ||
      /dotfiles|configuration/.test(desc)
    ) {
      category = "Config / Dotfiles";
    }
    // 6. Library / SDK
    else if (
      topics.some((t) =>
        ["library", "sdk", "package", "module", "npm", "pip", "crate"].includes(t)
      ) ||
      (packageJson && !packageJson.bin && (packageJson.main || packageJson.exports) && !frameworks.has("React")) ||
      (hasLocalClone && localFileExists(repoDir, "setup.py")) ||
      /library|sdk|package|module/.test(desc)
    ) {
      category = "Library / SDK";
    }
    // 7. API / Backend
    else if (
      topics.some((t) =>
        ["api", "rest", "graphql", "backend", "server", "microservice"].includes(t)
      ) ||
      frameworks.has("Express") || frameworks.has("Fastify") || frameworks.has("NestJS") ||
      frameworks.has("Flask") || frameworks.has("Django") || frameworks.has("FastAPI") ||
      /api|backend|server|microservice/.test(desc)
    ) {
      category = "API / Backend";
    }
    // 8. DevOps / Infra
    else if (
      topics.some((t) =>
        ["devops", "infrastructure", "terraform", "docker", "kubernetes", "ci-cd"].includes(t)
      ) ||
      (hasLocalClone && (localDirExists(repoDir, "terraform") || localDirExists(repoDir, "k8s"))) ||
      /devops|infrastructure|deploy|docker/.test(desc)
    ) {
      category = "DevOps / Infra";
    }
    // 9. Data / ML
    else if (
      topics.some((t) =>
        ["data", "machine-learning", "ml", "ai", "pandas", "pytorch", "tensorflow"].includes(t)
      ) ||
      frameworks.has("Pandas") || frameworks.has("PyTorch") || frameworks.has("TensorFlow") ||
      /machine.learning|data.science|ml |ai |neural|model/.test(desc)
    ) {
      category = "Data / ML";
    }
    // 10. Scraper / Automation
    else if (
      /scraper?|scrap|crawl|download|automat|bot/i.test(desc) ||
      /scraper?|download|bot/i.test(name) ||
      (hasLocalClone && rootFiles.some((f) => /^(scrape|crawl|download|bot)/i.test(f)))
    ) {
      category = "Scraper / Automation";
    }
    // 11. Web App — broadest web check last
    else if (
      topics.some((t) =>
        ["webapp", "website", "frontend", "react", "vue", "svelte", "nextjs", "web-app"].includes(t)
      ) ||
      (hasLocalClone && (
        localFileExists(repoDir, "public/index.html") ||
        localFileExists(repoDir, "src/App.jsx") ||
        localFileExists(repoDir, "src/App.tsx") ||
        localFileExists(repoDir, "index.html") ||
        localFileExists(repoDir, "src/main.jsx") ||
        localFileExists(repoDir, "src/main.tsx") ||
        localFileExists(repoDir, "pages/index.js") ||
        localFileExists(repoDir, "pages/index.tsx") ||
        localFileExists(repoDir, "app/page.tsx") ||
        localFileExists(repoDir, "app/page.jsx")
      )) ||
      /web.?app|dashboard|frontend|website|landing|portfolio/.test(desc) ||
      frameworks.has("React") || frameworks.has("Vue") || frameworks.has("Svelte") || frameworks.has("Next.js")
    ) {
      category = "Web App";
    }

    results[repo.name] = {
      hasTests,
      frameworks: [...frameworks],
      category,
      packageJson: !!packageJson,
    };
  }

  return results;
}

// ── Step 5: Sample commit messages ──────────────────────────────────────────

function analyzeCommitStats(repos) {
  console.log("\n[Step 5] Analyzing commit stats from local repos...");
  let totalCommits = 0;
  let totalInsertions = 0;
  const commitsByYear = {};
  const commitsByRepo = {};

  for (const repo of repos) {
    const repoDir = join(REPOS_DIR, repo.name);
    if (!existsSync(repoDir)) continue;

    try {
      // Count commits by this user
      const logOutput = execSync(
        `cd "${repoDir}" && git log --author="${GITHUB_USERNAME}" --format="%aI" 2>/dev/null`,
        { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
      ).trim();

      if (!logOutput) continue;
      const dates = logOutput.split("\n").filter(Boolean);
      const repoCommitCount = dates.length;
      totalCommits += repoCommitCount;
      commitsByRepo[repo.name] = repoCommitCount;

      for (const dateStr of dates) {
        const year = new Date(dateStr).getFullYear();
        commitsByYear[year] = (commitsByYear[year] || 0) + 1;
      }

      // Get insertions (lines added) via shortstat
      const statOutput = execSync(
        `cd "${repoDir}" && git log --author="${GITHUB_USERNAME}" --shortstat --format="" 2>/dev/null`,
        { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
      ).trim();

      for (const line of statOutput.split("\n")) {
        const insertMatch = line.match(/(\d+) insertion/);
        if (insertMatch) totalInsertions += parseInt(insertMatch[1], 10);
      }
    } catch { /* ignore repos with issues */ }
  }

  const repoCount = Object.keys(commitsByRepo).length;
  const avgCommitsPerRepo = repoCount > 0 ? Math.round(totalCommits / repoCount) : 0;
  const avgLinesPerCommit = totalCommits > 0 ? Math.round(totalInsertions / totalCommits) : 0;

  // Most active year
  const mostActiveYear = Object.entries(commitsByYear)
    .sort((a, b) => b[1] - a[1])[0];

  progress(`${totalCommits} total commits across ${repoCount} repos`);
  progress(`Avg ${avgCommitsPerRepo} commits/repo, ${avgLinesPerCommit} lines/commit`);
  if (mostActiveYear) progress(`Most active year: ${mostActiveYear[0]} (${mostActiveYear[1]} commits)`);

  return {
    totalCommits,
    avgCommitsPerRepo,
    avgLinesPerCommit,
    mostActiveYear: mostActiveYear ? { year: parseInt(mostActiveYear[0], 10), commits: mostActiveYear[1] } : null,
    commitsByYear,
  };
}

// ── Step 6: Fetch oldest commit year ────────────────────────────────────────

function findFirstCommitYear(repos) {
  console.log("\n[Step 6] Finding first commit year...");
  // repos are sorted by created_at ascending, so first is oldest
  const oldest = repos[0];
  if (!oldest) return new Date().getFullYear();

  // Try to get the very first commit of the oldest repo
  const repoDir = join(REPOS_DIR, oldest.name);
  if (existsSync(repoDir)) {
    try {
      const firstCommitDate = execSync(
        `cd "${repoDir}" && git log --reverse --format="%aI" | head -1`,
        { encoding: "utf-8" }
      ).trim();
      if (firstCommitDate) {
        const year = new Date(firstCommitDate).getFullYear();
        progress(`Oldest commit: ${firstCommitDate} in ${oldest.name}`);
        return year;
      }
    } catch { /* fall through */ }
  }

  // Fallback: use created_at
  const year = new Date(oldest.created_at).getFullYear();
  progress(`Using created_at: ${oldest.created_at} for ${oldest.name}`);
  return year;
}

// Also check ALL repos for the true first commit
function findTrueFirstCommitYear(repos) {
  console.log("  Scanning all local repos for earliest commit...");
  let earliestDate = null;
  let earliestRepo = null;

  for (const repo of repos) {
    const repoDir = join(REPOS_DIR, repo.name);
    if (!existsSync(repoDir)) continue;
    try {
      const firstDate = execSync(
        `cd "${repoDir}" && git log --reverse --format="%aI" 2>/dev/null | head -1`,
        { encoding: "utf-8" }
      ).trim();
      if (firstDate) {
        const d = new Date(firstDate);
        if (!earliestDate || d < earliestDate) {
          earliestDate = d;
          earliestRepo = repo.name;
        }
      }
    } catch { /* ignore */ }
  }

  if (earliestDate) {
    progress(`True earliest commit: ${earliestDate.toISOString()} in ${earliestRepo}`);
    return earliestDate.getFullYear();
  }
  return new Date().getFullYear();
}

// ── Compute all sections ────────────────────────────────────────────────────

function computeAll(repos, repoLanguages, repoTopics, localAnalysis, commitStats) {
  console.log("\n[Step 7] Computing all metrics...");

  // ── Section 1: Metrics Strip ──
  const totalRepos = repos.length;
  let totalBytes = 0;
  let totalStars = 0;
  const allLanguages = new Set();

  for (const repo of repos) {
    totalStars += repo.stargazers_count || 0;
    const langs = repoLanguages[repo.name] || {};
    for (const [lang, bytes] of Object.entries(langs)) {
      totalBytes += bytes;
      allLanguages.add(lang);
    }
  }

  const totalLinesOfCode = Math.round(totalBytes / 50);
  const firstCommitYear = findTrueFirstCommitYear(repos);

  const metrics = {
    totalRepos,
    totalLinesOfCode,
    totalStars,
    languageCount: allLanguages.size,
    firstCommitYear,
  };

  progress(`Metrics: ${totalRepos} repos, ~${totalLinesOfCode.toLocaleString()} LoC, ${totalStars} stars, ${allLanguages.size} languages, since ${firstCommitYear}`);

  // ── Section 2: Language Genome ──
  const langTotals = {};
  for (const repo of repos) {
    const langs = repoLanguages[repo.name] || {};
    for (const [lang, bytes] of Object.entries(langs)) {
      if (!langTotals[lang]) {
        langTotals[lang] = { bytes: 0, repoCount: 0, repos: [] };
      }
      langTotals[lang].bytes += bytes;
      langTotals[lang].repoCount += 1;
      langTotals[lang].repos.push(repo.name);
    }
  }

  const sortedLangs = Object.entries(langTotals)
    .sort((a, b) => b[1].bytes - a[1].bytes);

  const topLangs = sortedLangs.slice(0, 8);
  const otherBytes = sortedLangs.slice(8).reduce((sum, [, v]) => sum + v.bytes, 0);
  const otherRepoCount = new Set(sortedLangs.slice(8).flatMap(([, v]) => v.repos)).size;

  const languageGenome = {
    totalBytes,
    totalEstimatedLines: totalLinesOfCode,
    languages: topLangs.map(([name, data]) => ({
      name,
      bytes: data.bytes,
      estimatedLines: Math.round(data.bytes / 50),
      repoCount: data.repoCount,
      percentage: Math.round((data.bytes / totalBytes) * 100),
      color: LANGUAGE_COLORS[name] || "#8b8b8b",
    })),
  };

  if (otherBytes > 0) {
    languageGenome.languages.push({
      name: "Other",
      bytes: otherBytes,
      estimatedLines: Math.round(otherBytes / 50),
      repoCount: otherRepoCount,
      percentage: Math.round((otherBytes / totalBytes) * 100),
      color: "#8b8b8b",
    });
  }

  // ── Section 3: Evolution Timeline ──
  const reposByYear = {};
  const firstSeen = {};

  const sortedRepos = [...repos].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

  for (const repo of sortedRepos) {
    const year = new Date(repo.created_at).getFullYear();
    if (!reposByYear[year]) reposByYear[year] = [];
    reposByYear[year].push(repo);

    const langs = repoLanguages[repo.name] || {};
    for (const lang of Object.keys(langs)) {
      if (!firstSeen[lang]) {
        firstSeen[lang] = { year, repo: repo.name, date: repo.created_at };
      }
    }
  }

  // Only show "significant" programming languages in the timeline — skip markup/styling
  const MINOR_LANGS = new Set(["HTML", "CSS", "SCSS", "Markdown", "Shell", "Astro", "Vue"]);

  const years = Object.keys(reposByYear).map(Number).sort();
  let totalLangsKnown = 0;

  const milestones = years.map((year) => {
    const yearRepos = reposByYear[year];
    const allNewLangs = Object.entries(firstSeen)
      .filter(([, v]) => v.year === year)
      .map(([k]) => k);
    const newLangs = allNewLangs.filter((l) => !MINOR_LANGS.has(l));
    totalLangsKnown += allNewLangs.length;

    const topRepo = [...yearRepos].sort(
      (a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0)
    )[0];

    // Get categories of repos created this year
    const yearCategories = yearRepos.map((r) => localAnalysis[r.name]?.category).filter(Boolean);
    const hasWeb3 = yearCategories.includes("Blockchain / Web3");
    const hasGame = yearCategories.includes("Game");

    // Auto-generate annotation with richer context
    let annotation;
    if (year === years[0]) {
      annotation = `First commit. Started with ${newLangs.join(", ") || "code"}.`;
    } else if (year === years[years.length - 1]) {
      const lines = newLangs.length > 0
        ? [`${newLangs.join(", ")} added.`]
        : [];
      lines.push(`${yearRepos.length} new repos.`);
      annotation = lines.join(" ");
    } else if (newLangs.includes("TypeScript")) {
      annotation = `TypeScript enters the stack.${hasWeb3 ? " Web3 exploration begins." : ""}`;
    } else if (newLangs.includes("Lua")) {
      annotation = `Lua enters via AO/Arweave smart contracts. ${yearRepos.length} repos.`;
    } else if (newLangs.some((l) => ["Rust", "Go", "C/C++"].includes(l))) {
      const sysLang = newLangs.find((l) => ["Rust", "Go", "C/C++"].includes(l));
      annotation = `${sysLang} appears.${yearRepos.length > 1 ? ` ${yearRepos.length} repos.` : ""}`;
    } else if (hasWeb3 && newLangs.length === 0) {
      annotation = `Deeper into Web3. ${yearRepos.length} repos.${topRepo ? ` Top: ${topRepo.name}.` : ""}`;
    } else if (hasGame) {
      annotation = `${yearRepos.length} new repos.${topRepo ? ` Built ${topRepo.name}.` : ""}`;
    } else if (newLangs.length > 0) {
      annotation = `${newLangs.join(", ")} added. ${yearRepos.length} repos.`;
    } else {
      annotation = `${yearRepos.length} new repos.${topRepo ? ` Top: ${topRepo.name}.` : ""}`;
    }

    return {
      year,
      newLanguages: newLangs,
      repoCount: yearRepos.length,
      annotation,
      totalLanguagesKnown: totalLangsKnown,
      topRepo: topRepo?.name || null,
    };
  });

  const evolutionTimeline = { milestones };

  // ── Section 4: Builder Profile ──
  const categoryMap = {};
  for (const repo of repos) {
    const cat = localAnalysis[repo.name]?.category || "Other";
    if (!categoryMap[cat]) categoryMap[cat] = { repos: [], count: 0 };
    categoryMap[cat].repos.push(repo.name);
    categoryMap[cat].count += 1;
  }

  const categoryIcons = {
    "CLI Tool": "terminal",
    "Web App": "globe",
    "Mobile App": "smartphone",
    "Library / SDK": "package",
    "API / Backend": "server",
    "Game": "gamepad-2",
    "Blockchain / Web3": "link",
    "Scraper / Automation": "bot",
    "DevOps / Infra": "cloud",
    "Data / ML": "brain",
    "Config / Dotfiles": "settings",
    "Scripts & Experiments": "flask",
  };

  const categoryColors = {
    "CLI Tool": "#34D399",
    "Web App": "#3B82F6",
    "Mobile App": "#F97316",
    "Library / SDK": "#A78BFA",
    "API / Backend": "#F59E0B",
    "Game": "#EC4899",
    "Blockchain / Web3": "#8B5CF6",
    "Scraper / Automation": "#06B6D4",
    "DevOps / Infra": "#6366F1",
    "Data / ML": "#14B8A6",
    "Config / Dotfiles": "#6B7280",
    "Scripts & Experiments": "#9CA3AF",
  };

  const builderProfile = {
    categories: Object.entries(categoryMap)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, data]) => ({
        name,
        icon: categoryIcons[name] || "box",
        count: data.count,
        percentage: Math.round((data.count / totalRepos) * 100),
        color: categoryColors[name] || "#9CA3AF",
        repos: data.repos,
      })),
  };

  // ── Section 5: Code Signature ──
  const avgRepoSize = Math.round(totalLinesOfCode / totalRepos);

  const reposWithTestsCount = repos.filter(
    (r) => localAnalysis[r.name]?.hasTests
  ).length;

  // Aggregate frameworks
  const frameworkCounts = {};
  for (const repo of repos) {
    const fws = localAnalysis[repo.name]?.frameworks || [];
    for (const fw of fws) {
      frameworkCounts[fw] = (frameworkCounts[fw] || 0) + 1;
    }
  }

  const frameworkColors = {
    React: "#61DAFB",
    Vue: "#41B883",
    Svelte: "#FF3E00",
    "Next.js": "#000000",
    "React Router": "#CA4245",
    Express: "#000000",
    Fastify: "#000000",
    NestJS: "#E0234E",
    "Tailwind CSS": "#06B6D4",
    Vite: "#646CFF",
    "Three.js": "#000000",
    "Socket.io": "#010101",
    Prisma: "#2D3748",
    Supabase: "#3ECF8E",
    Firebase: "#FFCA28",
    "Ethers.js": "#2535A0",
    "Web3.js": "#F16822",
    Hardhat: "#FFF100",
    "Solana Web3": "#9945FF",
    Flask: "#000000",
    Django: "#092E20",
    FastAPI: "#009688",
    Pandas: "#150458",
  };

  const topFrameworks = Object.entries(frameworkCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({
      name,
      repoCount: count,
      color: frameworkColors[name] || "#666666",
    }));

  const codeSignature = {
    avgRepoSize,
    totalCommits: commitStats.totalCommits,
    avgCommitsPerRepo: commitStats.avgCommitsPerRepo,
    avgLinesPerCommit: commitStats.avgLinesPerCommit,
    mostActiveYear: commitStats.mostActiveYear,
    topFrameworks,
  };

  // ── Section 6: Highlights ──
  // Curated highlights: Largest Web3, Biggest Web App, Game Dev

  function makeHighlight(badge, badgeColor, repo) {
    const bytes = Object.values(repoLanguages[repo.name] || {}).reduce((s, v) => s + v, 0);
    return {
      badge,
      badgeColor,
      name: repo.name,
      description: DESCRIPTION_OVERRIDES[repo.name] || repo.description || "",
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      language: repo.language || "Unknown",
      estimatedLines: Math.round(bytes / 50),
      type: localAnalysis[repo.name]?.category || "Other",
    };
  }

  function findLargestInCategory(category) {
    return [...repos]
      .filter((r) => localAnalysis[r.name]?.category === category)
      .sort((a, b) => {
        const aBytes = Object.values(repoLanguages[a.name] || {}).reduce((s, v) => s + v, 0);
        const bBytes = Object.values(repoLanguages[b.name] || {}).reduce((s, v) => s + v, 0);
        return bBytes - aBytes;
      })[0];
  }

  const web3Repo = findLargestInCategory("Blockchain / Web3");
  const webAppRepo = findLargestInCategory("Web App");
  const gameRepo = findLargestInCategory("Game");

  const highlights = [
    web3Repo && makeHighlight("Largest Web3 Project", "#8B5CF6", web3Repo),
    webAppRepo && makeHighlight("Biggest Web App", "#3B82F6", webAppRepo),
    gameRepo && makeHighlight("Game Dev", "#EC4899", gameRepo),
  ].filter(Boolean);

  // ── Section 7: All Repos ──
  const allRepos = repos
    .map((repo) => {
      const bytes = Object.values(repoLanguages[repo.name] || {}).reduce(
        (s, v) => s + v,
        0
      );
      return {
        name: repo.name,
        language: repo.language || "Unknown",
        languageColor: LANGUAGE_COLORS[repo.language] || "#8b8b8b",
        type: localAnalysis[repo.name]?.category || "Other",
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        estimatedLines: Math.round(bytes / 50),
        url: repo.html_url,
        createdAt: repo.created_at,
        updatedAt: repo.pushed_at,
        description: DESCRIPTION_OVERRIDES[repo.name] || repo.description || "",
        isPrivate: repo.private,
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    generatedAt: new Date().toISOString(),
    username: GITHUB_USERNAME,
    metrics,
    languageGenome,
    evolutionTimeline,
    builderProfile,
    codeSignature,
    highlights,
    allRepos,
  };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║        Developer DNA Analysis Pipeline       ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`\nUser: ${GITHUB_USERNAME}`);
  console.log(`Repos dir: ${REPOS_DIR}`);
  console.log(`Output: ${OUTPUT_PATH}`);

  const repos = fetchAllRepos();
  const repoLanguages = scanLocalLanguages(repos);
  const repoTopics = fetchTopics(repos);
  const localAnalysis = analyzeLocal(repos, repoLanguages, repoTopics);
  const commitStats = analyzeCommitStats(repos);

  const dna = computeAll(repos, repoLanguages, repoTopics, localAnalysis, commitStats);

  writeFileSync(OUTPUT_PATH, JSON.stringify(dna, null, 2));
  console.log(`\n✓ Written to ${OUTPUT_PATH}`);
  console.log(`  File size: ${(readFileSync(OUTPUT_PATH).length / 1024).toFixed(1)} KB`);
  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
