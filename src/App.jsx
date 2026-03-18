import { motion } from "motion/react";
import dna from "./data/developer-dna.json";

// ─── Data transforms ────────────────────────────────────────────────

function formatLines(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const LANGUAGE_COLORS = Object.fromEntries(
  dna.languageGenome.languages.map((l) => [l.name, l.color])
);

// Timeline: pick a color gradient from emerald→sky→violet based on position
const TIMELINE_COLORS = ["#34d399", "#34d399", "#60a5fa", "#818cf8", "#3b82f6", "#a78bfa", "#8b5cf6", "#6366f1", "#3b82f6"];

const TIMELINE = dna.evolutionTimeline.milestones.map((m, i) => {
  const dotColor = TIMELINE_COLORS[i % TIMELINE_COLORS.length];
  return {
    year: m.year,
    dotColor,
    glowColor: dotColor + "60",
    annotation: m.annotation,
    tags: m.newLanguages.map((lang) => ({
      label: `+ ${lang}`,
      color: LANGUAGE_COLORS[lang] || "#8b8b8b",
      border: true,
    })),
  };
});

// ─── Icons (inline SVGs) ────────────────────────────────────────────
function CategoryIcon({ name, className, style }) {
  const icons = {
    terminal: <path d="M4 17l6-5-6-5M12 19h8" />,
    globe: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>,
    package: <><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></>,
    server: <><rect width="20" height="8" x="2" y="2" rx="2" /><rect width="20" height="8" x="2" y="14" rx="2" /><line x1="6" x2="6.01" y1="6" y2="6" /><line x1="6" x2="6.01" y1="18" y2="18" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>,
    "gamepad-2": <><line x1="6" x2="10" y1="11" y2="11" /><line x1="8" x2="8" y1="9" y2="13" /><line x1="15" x2="15.01" y1="12" y2="12" /><line x1="18" x2="18.01" y1="10" y2="10" /><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1.11 0 2.08-.402 2.592-1.382L9 15h6l1.408 2.618C16.92 18.598 17.89 19 19 19a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" /></>,
    cloud: <><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" /></>,
    brain: <><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" /><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" /></>,
    smartphone: <><rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><line x1="12" x2="12.01" y1="18" y2="18" /></>,
    bot: <><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></>,
    flask: <><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" /><path d="M8.5 2h7" /><path d="M7 16.5h10" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
    box: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></>,
  };
  return (
    <svg className={className} style={style} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name] || icons.box}
    </svg>
  );
}

// ─── Shared Components ──────────────────────────────────────────────
function SectionHeader({ number, label, labelColor, title, desc }) {
  return (
    <motion.div
      className="mb-12"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <span className="font-mono text-[11px] font-medium tracking-[0.15em]" style={{ color: labelColor }}>
        {number} — {label}
      </span>
      <h2 className="font-mono text-2xl sm:text-[32px] font-bold text-text-primary mt-2 tracking-tight">{title}</h2>
      <p className="font-body text-sm font-light text-text-muted mt-2">{desc}</p>
    </motion.div>
  );
}

function GradientDivider() {
  return <div className="max-w-6xl mx-auto"><div className="h-px bg-gradient-to-r from-transparent via-border-subtle to-transparent" /></div>;
}

// ─── Treemap Layout ─────────────────────────────────────────────────
function computeTreemap(items) {
  const sorted = [...items].sort((a, b) => b.layoutPercentage - a.layoutPercentage);
  const total = sorted.reduce((s, d) => s + d.layoutPercentage, 0);
  const rects = [];

  function partition(items, x, y, w, h, total) {
    if (items.length === 0) return;
    if (items.length === 1) {
      rects.push({ ...items[0], x, y, w, h });
      return;
    }
    let bestSplit = 1;
    let bestDiff = Infinity;
    let runningSum = 0;
    for (let i = 0; i < items.length - 1; i++) {
      runningSum += items[i].layoutPercentage;
      const diff = Math.abs(runningSum / total - 0.5);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestSplit = i + 1;
      }
    }
    const left = items.slice(0, bestSplit);
    const right = items.slice(bestSplit);
    const leftTotal = left.reduce((s, d) => s + d.layoutPercentage, 0);
    const ratio = leftTotal / total;
    if (w >= h) {
      partition(left, x, y, w * ratio, h, leftTotal);
      partition(right, x + w * ratio, y, w * (1 - ratio), h, total - leftTotal);
    } else {
      partition(left, x, y, w, h * ratio, leftTotal);
      partition(right, x, y + h * ratio, w, h * (1 - ratio), total - leftTotal);
    }
  }

  partition(sorted, 0, 0, 100, 100, total);
  return rects;
}

function TreemapChart() {
  const categories = dna.builderProfile.categories;
  const layoutItems = categories.map((c) => ({ ...c, layoutPercentage: Math.max(c.percentage, 5) }));
  const rects = computeTreemap(layoutItems);
  const GAP = 3;

  return (
    <div className="relative w-full h-[360px] sm:h-[480px]">
      {rects.map((rect, i) => {
        const isLarge = rect.percentage >= 10;
        const isMedium = rect.percentage >= 10;
        return (
          <motion.div
            key={rect.name}
            className="absolute rounded-xl flex flex-col items-center justify-center text-center overflow-hidden"
            style={{
              left: `calc(${rect.x}% + ${GAP}px)`,
              top: `calc(${rect.y}% + ${GAP}px)`,
              width: `calc(${rect.w}% - ${GAP * 2}px)`,
              height: `calc(${rect.h}% - ${GAP * 2}px)`,
              backgroundColor: `${rect.color}15`,
              border: `1px solid ${rect.color}30`,
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08, duration: 0.5 }}
            viewport={{ once: true }}
          >
            {isLarge && (
              <div
                className="hidden sm:flex w-11 h-11 rounded-xl items-center justify-center mb-3"
                style={{ backgroundColor: `${rect.color}20` }}
              >
                <CategoryIcon name={rect.icon} style={{ color: rect.color }} />
              </div>
            )}
            <span className={`font-body font-semibold text-text-primary leading-tight px-1 ${isLarge ? "text-[11px] sm:text-[15px]" : "text-[9px] sm:text-[10px]"}`}>
              {rect.name}
            </span>
            <span
              className={`font-mono font-bold tracking-tight ${isLarge ? "text-xl sm:text-4xl mt-0.5 sm:mt-1" : "text-sm sm:text-base"}`}
              style={{ color: rect.color }}
            >
              {rect.percentage}%
            </span>
            <span className={`font-mono text-text-muted ${isLarge ? "text-[9px] sm:text-[11px] sm:mt-1" : "text-[8px] sm:text-[9px]"}`}>{rect.count} {rect.count === 1 ? "repo" : "repos"}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Donut Chart (SVG) ──────────────────────────────────────────────
function DonutChart() {
  const languages = dna.languageGenome.languages;
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 105;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative w-[280px] h-[280px] shrink-0">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--color-border-subtle)" strokeWidth={strokeWidth} />
        {languages.map((lang, i) => {
          const dashLength = (lang.percentage / 100) * circumference;
          const gap = circumference - dashLength + 4;
          const currentOffset = offset;
          offset += dashLength + 4;
          return (
            <motion.circle
              key={lang.name}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={lang.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${gap}`}
              strokeDashoffset={-currentOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              viewport={{ once: true }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-4xl font-bold text-text-primary tracking-tight">
          {formatLines(dna.languageGenome.totalEstimatedLines)}
        </span>
        <span className="font-body text-xs font-light text-text-muted mt-1">total lines</span>
      </div>
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────────────
export default function App() {
  const { metrics } = dna;
  const languages = dna.languageGenome.languages;
  const categories = dna.builderProfile.categories;
  const { codeSignature } = dna;
  const { highlights, allRepos } = dna;

  return (
    <div className="min-h-screen bg-void">
      {/* ─── Nav ─── */}
      <nav className="fixed top-0 w-full z-50 border-b border-border-subtle/50 backdrop-blur-xl bg-void/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 sm:h-16 flex items-center justify-between">
          <a href="#" className="font-mono text-lg font-bold tracking-tight">
            parth<span className="text-emerald">.</span>
          </a>
          <div className="flex items-center gap-3 sm:gap-8">
            {["DNA", "Stack", "Projects"].map((link) => (
              <a key={link} href={`#${link.toLowerCase()}`} className="hidden sm:block font-body text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer">
                {link}
              </a>
            ))}
            <a href="https://github.com/parthks" target="_blank" rel="noopener noreferrer" className="font-body text-[12px] sm:text-[13px] font-semibold px-4 sm:px-5 py-2 rounded-full border border-border-subtle text-text-primary hover:bg-surface-hover transition-all cursor-pointer">
              GitHub
            </a>
            <a href="https://mail.google.com/mail/?view=cm&to=parth@1human.in" target="_blank" rel="noopener noreferrer" className="font-body text-[12px] sm:text-[13px] font-semibold px-4 sm:px-5 py-2 rounded-full bg-gradient-to-r from-emerald to-sky text-white hover:shadow-lg hover:shadow-emerald/20 transition-all cursor-pointer">
              Get in Touch
            </a>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <header className="relative pt-24 pb-16 sm:pt-36 sm:pb-24 px-4 sm:px-8 overflow-hidden">
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full blur-[150px] pointer-events-none bg-gradient-to-r from-emerald/10 to-sky/10" />
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-border-subtle bg-surface/50 mb-10">
              <span className="relative flex h-[7px] w-[7px]">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald opacity-75" />
                <span className="relative inline-flex rounded-full h-[7px] w-[7px] bg-emerald" />
              </span>
              <span className="font-mono text-[11px] text-text-secondary">
                Analysis generated from {metrics.totalRepos} repositories
              </span>
            </div>

            <h1 className="font-mono text-5xl sm:text-7xl md:text-[80px] font-bold tracking-[-3px] leading-none bg-gradient-to-r from-white via-emerald to-sky bg-clip-text text-transparent">
              Developer DNA
            </h1>

            <p className="mt-6 sm:mt-8 font-body text-base sm:text-lg font-light text-text-secondary leading-relaxed max-w-xl mx-auto">
              A data-driven profile of who I am as an engineer —
              <br />derived from every line of code I've shipped.
            </p>
          </motion.div>
        </div>
      </header>

      {/* ─── Metrics Strip ─── */}
      <motion.section
        className="border-y border-border-subtle bg-deep"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-8 sm:gap-0">
          {[
            { value: metrics.totalRepos, label: "Repositories" },
            { value: formatLines(metrics.totalLinesOfCode), label: "Lines of Code" },
            { value: metrics.languageCount, label: "Languages" },
            { value: metrics.firstCommitYear, label: "First Commit" },
          ].map((m, i, arr) => (
            <div key={m.label} className="flex items-center gap-6 sm:gap-12">
              <div className="text-center w-full sm:w-auto">
                <div className={`font-mono text-3xl sm:text-[44px] font-bold tracking-tight ${m.highlight ? "text-emerald" : "text-text-primary"}`}>
                  {m.value}
                </div>
                <div className="font-body text-[11px] font-normal text-text-muted mt-1 tracking-wide">{m.label}</div>
              </div>
              {i < arr.length - 1 && <div className="hidden sm:block w-px h-12 bg-border-subtle" />}
            </div>
          ))}
        </div>
      </motion.section>

      {/* ─── 01: Language Genome ─── */}
      <section id="dna" className="py-12 sm:py-20 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <SectionHeader number="01" label="LANGUAGE GENOME" labelColor="#34d399" title="What languages define me" desc={`Distribution across all ${metrics.totalRepos} repositories by lines of code written.`} />

          <div className="flex flex-col items-center sm:flex-row sm:items-start gap-10 sm:gap-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <DonutChart />
            </motion.div>

            <div className="flex-1 space-y-5">
              {languages.map((lang, i) => (
                <motion.div
                  key={lang.name}
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lang.color }} />
                      <span className="font-body text-[15px] font-semibold text-text-primary">{lang.name}</span>
                    </div>
                    <span className="font-mono text-[11px] text-text-muted">
                      {lang.repoCount} repos  ·  {formatLines(lang.estimatedLines)} lines
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border-subtle overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: lang.color }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${lang.percentage}%` }}
                      transition={{ delay: i * 0.1 + 0.3, duration: 0.8, ease: "easeOut" }}
                      viewport={{ once: true }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <GradientDivider />

      {/* ─── 02: Evolution Timeline ─── */}
      <section className="py-12 sm:py-20 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <SectionHeader number="02" label="EVOLUTION TIMELINE" labelColor="#3b82f6" title="How my stack grew" desc="The journey from first commit to full-stack polyglot, year by year." />

          <div className="relative overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="absolute top-[10px] left-0 right-0 h-[2px] bg-gradient-to-r from-emerald to-sky" />

            <div className={`relative grid gap-4`} style={{ gridTemplateColumns: `repeat(${TIMELINE.length}, minmax(140px, 1fr))` }}>
              {TIMELINE.map((item, i) => (
                <motion.div
                  key={item.year}
                  className="pt-0"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.12, duration: 0.5 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div
                      className="w-[14px] h-[14px] rounded-full shrink-0"
                      style={{ backgroundColor: item.dotColor, boxShadow: `0 0 12px ${item.glowColor}` }}
                    />
                    <span className="font-mono text-xl font-bold text-text-primary">{item.year}</span>
                  </div>

                  <p className="font-body text-xs font-light text-text-muted leading-relaxed whitespace-pre-line mb-4">
                    {item.annotation}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <span
                        key={tag.label}
                        className="font-mono text-[10px] font-medium px-2.5 py-1 rounded-md whitespace-nowrap"
                        style={{
                          color: tag.color,
                          backgroundColor: `${tag.color}15`,
                          border: tag.border ? `1px solid ${tag.color}30` : "none",
                        }}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <GradientDivider />

      {/* ─── 03: Builder Profile ─── */}
      <section id="stack" className="py-12 sm:py-20 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <SectionHeader number="03" label="BUILDER PROFILE" labelColor="#3b82f6" title="What I specialize in" desc="Categorization of all repositories by project type and purpose." />

          <TreemapChart />
        </div>
      </section>

      <GradientDivider />

      {/* ─── 04: Code Signature ─── */}
      <section className="py-12 sm:py-20 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <SectionHeader number="04" label="CODE SIGNATURE" labelColor="#8b5cf6" title="How I write code" desc="Patterns, preferences, and engineering habits extracted from commit history." />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Total Commits */}
            <motion.div className="bg-surface rounded-2xl border border-border-subtle p-7 flex flex-col gap-4" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <span className="font-mono text-[10px] font-medium text-text-muted tracking-wider">TOTAL COMMITS</span>
              <span className="font-mono text-4xl font-bold text-emerald tracking-tight">{codeSignature.totalCommits.toLocaleString()}</span>
              <span className="font-body text-xs font-light text-text-muted">{codeSignature.avgCommitsPerRepo} avg per repo</span>
            </motion.div>

            {/* Avg Lines per Commit */}
            <motion.div className="bg-surface rounded-2xl border border-border-subtle p-7 flex flex-col gap-4" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} viewport={{ once: true }}>
              <span className="font-mono text-[10px] font-medium text-text-muted tracking-wider">AVG. LINES / COMMIT</span>
              <span className="font-mono text-4xl font-bold text-text-primary tracking-tight">{codeSignature.avgLinesPerCommit.toLocaleString()}</span>
              <span className="font-body text-xs font-light text-text-muted">lines added per commit</span>
            </motion.div>

            {/* Frameworks */}
            <motion.div className="bg-surface rounded-2xl border border-border-subtle p-7 flex flex-col gap-4" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} viewport={{ once: true }}>
              <span className="font-mono text-[10px] font-medium text-text-muted tracking-wider">TOP FRAMEWORKS</span>
              <div className="flex flex-wrap gap-2">
                {codeSignature.topFrameworks.slice(0, 3).map((fw) => (
                  <span key={fw.name} className="font-mono text-[11px] font-medium px-3 py-1.5 rounded-md" style={{ color: fw.color, backgroundColor: `${fw.color}15` }}>
                    {fw.name}
                  </span>
                ))}
              </div>
              <span className="font-body text-xs font-light text-text-muted">most frequently used</span>
            </motion.div>

            {/* Most Active Year */}
            <motion.div className="bg-surface rounded-2xl border border-border-subtle p-7 flex flex-col gap-4" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} viewport={{ once: true }}>
              <span className="font-mono text-[10px] font-medium text-text-muted tracking-wider">MOST ACTIVE YEAR</span>
              <span className="font-mono text-4xl font-bold text-text-primary tracking-tight">{codeSignature.mostActiveYear?.year}</span>
              <span className="font-mono text-xs text-text-muted">{codeSignature.mostActiveYear?.commits.toLocaleString()} commits</span>
            </motion.div>
          </div>
        </div>
      </section>

      <GradientDivider />

      {/* ─── 05: Highlights ─── */}
      <section className="py-12 sm:py-20 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <SectionHeader number="05" label="HIGHLIGHTS" labelColor="#f59e0b" title="Standout repositories" desc="The projects that define my engineering range — ranked by impact." />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {highlights.map((hl, i) => (
              <motion.a
                key={hl.name}
                href={`https://github.com/${dna.username}/${hl.name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-surface rounded-2xl border p-7 flex flex-col gap-4 hover:bg-surface-hover transition-all cursor-pointer"
                style={{ borderColor: `${hl.badgeColor}30` }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
              >
                <span
                  className="font-mono text-[10px] font-semibold px-2.5 py-1 rounded-md self-start"
                  style={{ color: hl.badgeColor, backgroundColor: `${hl.badgeColor}15` }}
                >
                  {hl.badge}
                </span>
                <h3 className="font-mono text-base font-semibold text-text-primary group-hover:text-emerald transition-colors">
                  {hl.name}
                </h3>
                <p className="font-body text-[13px] font-light text-text-muted leading-relaxed">
                  {hl.description || "—"}
                </p>
                <div className="flex items-center gap-4 mt-auto">
                  <span className="font-mono text-[11px]" style={{ color: LANGUAGE_COLORS[hl.language] || "#8b8b8b" }}>{hl.language}</span>
                  <span className="font-mono text-[11px] text-text-muted">{formatLines(hl.estimatedLines)} lines</span>
                  {hl.type && <span className="font-mono text-[11px] text-text-muted">{hl.type}</span>}
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      <GradientDivider />

      {/* ─── 06: All Repositories ─── */}
      <section id="projects" className="py-12 sm:py-20 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-2">
            <div>
              <span className="font-mono text-[11px] font-medium text-emerald tracking-[0.15em]">06 — ALL REPOSITORIES</span>
              <h2 className="font-mono text-2xl sm:text-[32px] font-bold text-text-primary mt-2 tracking-tight">Full project index</h2>
            </div>
            <span className="font-mono text-[11px] text-text-muted">Sorted by newest · {allRepos.length} repos</span>
          </div>

          <div className="overflow-x-auto -mx-4 sm:mx-0">
          <motion.div
            className="bg-surface rounded-2xl border border-border-subtle overflow-hidden min-w-[700px] sm:min-w-0"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {/* Table header */}
            <div className="flex px-6 py-3.5 bg-deep border-b border-border-subtle">
              {[
                { label: "REPOSITORY", width: "flex-[2]" },
                { label: "LANGUAGE", width: "flex-1" },
                { label: "TYPE", width: "flex-1" },
                { label: "VISIBILITY", width: "w-20" },
                { label: "CREATED", width: "w-24" },
                { label: "LINES", width: "w-20" },
              ].map((col) => (
                <span key={col.label} className={`font-mono text-[10px] font-semibold text-text-muted tracking-wider ${col.width}`}>
                  {col.label}
                </span>
              ))}
            </div>

            {/* Table rows */}
            {allRepos.map((repo, i) => (
              <motion.a
                key={repo.name}
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-6 py-4 border-b border-border-subtle hover:bg-surface-hover transition-colors cursor-pointer group"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: Math.min(i, 10) * 0.03 }}
                viewport={{ once: true }}
              >
                <div className="flex-[2] min-w-0">
                  <span className="font-mono text-[13px] font-medium text-text-primary group-hover:text-emerald transition-colors">{repo.name}</span>
                  {repo.description && <p className="font-body text-[11px] text-text-muted mt-0.5 leading-relaxed">{repo.description}</p>}
                </div>
                <span className="font-body text-[13px] flex-1" style={{ color: repo.languageColor }}>{repo.language}</span>
                <span className="font-body text-[13px] text-text-muted flex-1">{repo.type}</span>
                <span className={`font-mono text-[11px] font-medium w-20 ${repo.isPrivate ? "text-amber" : "text-emerald"}`}>{repo.isPrivate ? "Private" : "Public"}</span>
                <span className="font-mono text-[13px] text-text-muted w-24">{new Date(repo.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                <span className="font-mono text-[13px] text-text-muted w-20">{formatLines(repo.estimatedLines)}</span>
              </motion.a>
            ))}
          </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border-subtle/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10 sm:py-12 flex flex-col sm:flex-row items-center sm:justify-between gap-6">
          <div className="text-center sm:text-left">
            <span className="font-mono text-lg font-bold">parth<span className="text-emerald">.</span></span>
            <p className="font-body text-xs font-light text-text-muted mt-1">Developer DNA — auto-generated from GitHub data</p>
          </div>
          <div className="flex items-center flex-wrap justify-center gap-5 sm:gap-7">
            {[
              { label: "GitHub", href: "https://github.com/parthks" },
              { label: "LinkedIn", href: "https://linkedin.com/in/parth-yo-shah" },
              { label: "X", href: "https://x.com/parth_yoo" },
              { label: "Instagram", href: "https://instagram.com/wer1human" },
              { label: "Email", href: "https://mail.google.com/mail/?view=cm&to=parth@1human.in" },
            ].map((link) => (
              <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="font-body text-[13px] font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
