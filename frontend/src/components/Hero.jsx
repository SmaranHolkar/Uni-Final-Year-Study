import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Vela from "./Vela";
import learningPlaygroundImg from "../assets/learningplayground.png";
import uploadDocsImg from "../assets/uploaddocs.png";
import mindsMirrorImg from "../assets/mindsmirror.png";
import mindmapImg from "../assets/mindmap.png";

/* ═══════════════════════════════════════════════════════════════
   SITE CONSTANTS & SEO
   ═══════════════════════════════════════════════════════════════ */
const SITE_NAME = "HydrusLearn Pro";
const LANDING_TITLE = "HydrusLearn Pro — Your Notes. Your Mistakes. Your Learning System.";
const LANDING_DESCRIPTION = "Turn lecture slides, PDFs, and notes into grounded practice quizzes, concept maps, and mistake diagnostics with exact citations.";
const LANDING_PATH = "/";

const getBaseUrl = () =>
  typeof window === "undefined" ? "https://hydruslearn.com" : window.location.origin;

const upsertMeta = (nameOrProperty, content, isProperty = false) => {
  if (typeof document === "undefined") return null;
  const attr = isProperty ? "property" : "name";
  let tag = document.head.querySelector(`meta[${attr}="${nameOrProperty}"]`);
  const created = !tag;
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, nameOrProperty);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
  return { tag, created };
};

const upsertCanonical = (href) => {
  if (typeof document === "undefined") return null;
  let link = document.head.querySelector('link[rel="canonical"]');
  const created = !link;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
  return { tag: link, created };
};

/* ═══════════════════════════════════════════════════════════════
   DATA STRUCTURES (Scannable, High-Signal Student Content)
   ═══════════════════════════════════════════════════════════════ */
const featureCards = [
  {
    label: "Upload & Practice",
    badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    title: "Directly from your lectures & notes",
    summary:
      "Drop in slides, papers, or notes. Every question and answer links directly back to the exact passage so you know where it came from.",
    image: uploadDocsImg,
    alt: "Document upload interface with passage citations",
    format: "PDF, Slides, OCR, YouTube",
  },
  {
    label: "Interactive Study Canvas",
    badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    title: "Interactive tools built from your notes",
    summary:
      "Turn dense chapters into active recall flashcards, matching games, and practice quizzes tailored specifically to your syllabus.",
    image: learningPlaygroundImg,
    alt: "Interactive study canvas with study tools",
    format: "Instant Flashcards & Quizzes",
  },
  {
    label: "Mind's Mirror Diagnostics",
    badgeColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    title: "Pinpoint your mistakes before exam day",
    summary:
      "Mind's Mirror analyzes why you missed a question — categorizing errors into simple recall slips vs deep concept gaps.",
    image: mindsMirrorImg,
    alt: "Mind's Mirror error diagnosis interface",
    format: "Personalized Progress Insights",
  },
  {
    label: "Concept Maps",
    badgeColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    title: "See the big picture clearly",
    summary:
      "Automatically connects the dots between complex ideas into interactive concept maps that make revision intuitive.",
    image: mindmapImg,
    alt: "Visual concept mind map",
    format: "Interactive Visual Graphs",
  },
];

const velaExamples = [
  {
    id: "cs",
    tabLabel: "Computer Science",
    prompt: "Make me an interactive simulation to practice CPU scheduling algorithms (FIFO vs Round Robin).",
    toolTitle: "OS Kernel: CPU Scheduling Sandbox",
    badge: "Interactive Node Canvas",
    accent: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    stats: "12 Canvas Nodes • Real-time Quantum Engine • Grounded to OS Lecture 4",
    highlightNode: {
      title: "Round Robin Quantum Engine",
      state: "Process P2 Active (Burst Remaining: 4ms)",
      metric: "Time Slice: 2ms • Context Switch Overhead: 0.4ms",
      diagnostic: "Why did P1 preempt? Quantum expired; shifted to tail of Ready Queue.",
    },
  },
  {
    id: "med",
    tabLabel: "Biochemistry",
    prompt: "Build me an active-recall matching tool for the 10 steps of Glycolysis with enzyme regulators.",
    toolTitle: "Biochemistry: Glycolysis Cascade Matcher",
    badge: "Active Recall Matrix",
    accent: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    stats: "10 Reaction Steps • Phosphorylation Tracker • Grounded to Chapter 14",
    highlightNode: {
      title: "Phosphofructokinase-1 (PFK-1)",
      state: "Rate-Limiting Step 3: Fructose-6-P → Fructose-1,6-BP",
      metric: "Allosteric Inhibitor: ATP • Activator: AMP & F-2,6-BP",
      diagnostic: "Active Recall Test: High cellular ATP slows glycolysis at Step 3 to conserve glucose.",
    },
  },
  {
    id: "law",
    tabLabel: "Law & Case Studies",
    prompt: "Create a concept tree linking Tort Law duty of care cases to the Caparo three-stage test.",
    toolTitle: "Law: Duty of Care Case Law Graph",
    badge: "Visual Precedent Tree",
    accent: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    stats: "8 Key Precedents • Multi-tier Test Branching • Grounded to Syllabus Notes",
    highlightNode: {
      title: "Caparo v Dickman (1990)",
      state: "Core Test: Foreseeability + Proximity + Fair/Just/Reasonable",
      metric: "Precedent Status: Modern application qualified by Robinson (2018)",
      diagnostic: "Application Rule: Robinson clarifies Caparo applies primarily to novel duty categories.",
    },
  },
];

const dialecticItems = [
  {
    number: "01",
    title: "Manual Flashcards",
    subtitle: "Anki & Quizlet",
    description:
      "Typing out flashcards one by one is exhausting and misses the broader conceptual connections between lecture topics.",
    verdict: "Hours spent typing instead of studying",
    verdictColor: "text-[#a1a1aa]",
  },
  {
    number: "02",
    title: "Generic AI Chatbots",
    subtitle: "ChatGPT & General LLMs",
    description:
      "Chatbots can hallucinate, ignore syllabus boundaries, and encourage passive reading instead of verified active recall.",
    verdict: "Unverified, out-of-syllabus answers",
    verdictColor: "text-[#a1a1aa]",
  },
  {
    number: "03",
    title: "HydrusLearn Pro",
    subtitle: "Your AI Study Companion",
    description:
      "Converts your lecture notes into grounded quizzes, concept maps, and smart error diagnostics with direct paragraph citations.",
    verdict: "Source-grounded revision confidence",
    verdictColor: "text-emerald-400",
  },
];

const specificationRows = [
  {
    feature: "Document Library & Uploads",
    core: "Instant on-the-spot tool generation from PDFs, slides, text & YouTube",
    pro: "Permanent cloud library with fast search & split-screen citation reader",
  },
  {
    feature: "Active Recall Quizzing",
    core: "Practice quizzes with instant right/wrong answer feedback",
    pro: "Detailed explanations with exact paragraph citations linking to slides",
  },
  {
    feature: "Mistake Diagnostics",
    core: "Standard score summary & correct answer review",
    pro: "Mind's Mirror: separates memory slips from deep concept gaps over time",
  },
  {
    feature: "Interactive Study Studio (Vela)",
    core: "Generate single interactive study tools on demand",
    pro: "Personalized revision queues, spaced repetition & Socratic tutoring",
  },
];

const inquiries = [
  {
    question: "How does HydrusLearn help me study faster than traditional flashcards?",
    answer:
      "Instead of spending hours manually typing out flashcards, you simply drop in your lecture slides, notes, or PDFs. HydrusLearn turns them into interactive quizzes and flashcards in seconds, with direct citations linking back to your source material so you can start testing your knowledge immediately.",
  },
  {
    question: "What is the difference between Hydruslearn Core and Hydruslearn Pro?",
    answer:
      "Hydruslearn Core is completely free for quick, single-session study tools. Hydruslearn Pro is built for students who want a permanent study hub: it saves your notes in the cloud, diagnoses your weak spots with Mind's Mirror, and provides step-by-step guided tutoring.",
  },
  {
    question: "How does Mind's Mirror help me improve my grades?",
    answer:
      "Most quiz tools only tell you if you got a question right or wrong. Mind's Mirror goes deeper: it analyzes whether a mistake was just a quick memory slip or a deeper concept you misunderstood, so you know exactly what to review before test day.",
  },
  {
    question: "What file formats and notes can I upload?",
    answer:
      "You can upload PDF lecture slides, textbook chapters, Word documents, Markdown notes, photos of handwritten notes via OCR, and YouTube lecture links.",
  },
  {
    question: "Is my coursework and study data private?",
    answer:
      "Yes, completely. All your uploaded files, notes, and quiz results are private to your account, stored securely with encryption, and never used to train public language models.",
  },
];

/* ═══════════════════════════════════════════════════════════════
   1. HERO SECTION — DISTINCT VALUE PROPOSITION
   ═══════════════════════════════════════════════════════════════ */
const HeroSection = () => {
  return (
    <header className="relative min-h-[75vh] pt-24 sm:pt-32 pb-16 px-6 sm:px-12 max-w-[1400px] mx-auto flex flex-col justify-center overflow-hidden">
      {/* ── SUBTLE GEOMETRIC ARCHITECTURAL BACKGROUND ── */}
      <div
        className="pointer-events-none absolute right-[4%] top-[12%] -z-10 w-[560px] h-[560px] flex items-center justify-center opacity-35"
        aria-hidden="true"
      >
        <div className="absolute w-[540px] h-[540px] rounded-full border border-[#2e2e33]" />
        <div className="absolute w-[390px] h-[390px] rounded-full border border-[#2e2e33]" />
        <div className="absolute w-[240px] h-[240px] rounded-full border border-[#2e2e33]" />
        <div className="w-[140px] h-[140px] rounded-full bg-[#18181b] border border-[#38383f]" />
      </div>

      {/* ── DISPLAY HEADLINE (Unique Positioning) ── */}
      <div className="max-w-[950px] z-10 pb-4">
        <h1
          className="text-[#f0f0ee] text-4xl sm:text-6xl md:text-7xl font-normal tracking-tight leading-[1.06] select-none"
          style={{ fontFeatureSettings: '"cv01", "ss03"' }}
        >
          <span className="block">Your notes. Your mistakes.</span>
          <span className="block text-[#a1a1aa]">Your learning system.</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-[#d4d4d8] max-w-[50ch] leading-relaxed">
          Drop in your lecture slides, papers, and notes. HydrusLearn constructs grounded practice quizzes, concept maps, and smart error diagnostics with exact citations.
        </p>

        {/* ── HERO ACTION BUTTONS ── */}
        <div className="flex flex-wrap items-center gap-4 mt-8">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#f0f0ee] text-[#121214] hover:bg-white font-semibold text-sm transition-colors"
            style={{ borderRadius: "10px" }}
          >
            <span>Start studying for free</span>
            <span>→</span>
          </Link>
          <a
            href="#vela-showcase"
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#18181b] border border-[#2e2e33] hover:border-[#404047] text-[#f0f0ee] text-sm font-medium transition-colors"
            style={{ borderRadius: "10px" }}
          >
            <span>See Vela in action</span>
          </a>
        </div>
      </div>
    </header>
  );
};

/* ═══════════════════════════════════════════════════════════════
   2. SYSTEM CAPABILITIES — CLEAN SOLID TILES (Short Copy)
   ═══════════════════════════════════════════════════════════════ */
const CapabilitiesSection = () => (
  <section id="capabilities" className="py-20 px-6 sm:px-12 max-w-[1400px] mx-auto border-t border-[#2e2e33]">
    <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-12">
      <div>
        <div className="text-xs text-[#a1a1aa] font-mono uppercase tracking-wider mb-2">
          ✦ Core Capabilities
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal text-[#f0f0ee] tracking-tight leading-tight max-w-[20ch]">
          Everything you need to master tough topics.
        </h2>
      </div>
      <div className="text-sm sm:text-base text-[#a1a1aa] max-w-[36ch] leading-relaxed">
        Turn heavy slide decks and textbooks into interactive, enjoyable study tools in seconds.
      </div>
    </div>

    {/* 2x2 Clean Cards Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {featureCards.map((card) => (
        <div
          key={card.title}
          className="bg-[#18181b] p-6 sm:p-8 border border-[#2e2e33] flex flex-col justify-between space-y-5 overflow-hidden"
          style={{ borderRadius: "12px" }}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono pb-2.5 border-b border-[#2e2e33]">
              <span className={`px-2.5 py-0.5 rounded-full border ${card.badgeColor}`}>
                {card.label}
              </span>
              <span className="text-[#a1a1aa]">{card.format}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-normal text-[#f0f0ee] tracking-tight leading-snug">
              {card.title}
            </h3>
            <p className="text-sm sm:text-base text-[#a1a1aa] leading-relaxed max-w-[48ch]">
              {card.summary}
            </p>
          </div>

          <div className="border border-[#2e2e33] bg-[#121214] overflow-hidden mt-3 rounded-lg">
            <img
              src={card.image}
              alt={card.alt}
              className="w-full h-auto block opacity-95"
            />
          </div>
        </div>
      ))}
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════════════════
   3. VELA STUDIO SCROLL SHOWCASE — PINNED CAMERA & EXPANDING TOOL ENGINE
   ═══════════════════════════════════════════════════════════════ */
const VelaScrollShowcase = () => {
  const containerRef = React.useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [simStep, setSimStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalScrollable = rect.height - window.innerHeight;
      if (totalScrollable <= 0) return;
      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / totalScrollable));
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Simulation step timer
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setSimStep((prev) => (prev + 1) % 4);
    }, 2600);
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Derived progress transitions
  // 0.0 -> 0.35 : Vela centered and big, intro title visible
  // 0.35 -> 0.70 : Vela shrinks and docks to top-left, demo container expands
  // 0.70 -> 1.0 : Full interactive video/demo simulation running
  const shrinkFactor = Math.min(1, Math.max(0, (scrollProgress - 0.12) / 0.45));
  const demoReveal = Math.min(1, Math.max(0, (scrollProgress - 0.22) / 0.4));
  const introFade = Math.max(0, 1 - scrollProgress * 3.2);

  const current = velaExamples[activeTab];

  // Dynamic simulation state messages per step
  const simStates = [
    {
      action: "Process P1 running (0ms - 2ms)",
      quantum: "Quantum remaining: 0ms (Expired)",
      event: "Clock interrupt triggered. Context-switch in progress.",
      answer: "P1 quantum expired; saving CPU registers to PCB.",
      statusColor: "text-amber-400",
    },
    {
      action: "Context Switch: P1 -> P2",
      quantum: "Context switch overhead: 0.4ms",
      event: "Loading P2 memory registers from PCB.",
      answer: "P1 pushed to Ready Queue tail; P2 dispatched to CPU.",
      statusColor: "text-blue-400",
    },
    {
      action: "Process P2 running (2.4ms - 4.4ms)",
      quantum: "Quantum remaining: 2.0ms -> 0ms",
      event: "Process P2 executing active burst slice.",
      answer: "P2 completes 2ms slice; preempted for Process P3.",
      statusColor: "text-emerald-400",
    },
    {
      action: "Active Recall Verification Passed",
      quantum: "Round Robin fairness verified • Zero starvation",
      event: "All 3 processes scheduled with 100% citation grounding.",
      answer: "Mastery +10 pts • Concept gaps resolved.",
      statusColor: "text-emerald-400 font-bold",
    },
  ];

  const currentSim = simStates[simStep];

  return (
    <div
      id="vela-showcase"
      ref={containerRef}
      className="relative w-full border-t border-[#2e2e33]"
      style={{ height: "230vh" }}
    >
      {/* ── STICKY VIEWPORT CONTAINER (Pins while scrolling) ── */}
      <div className="sticky top-0 h-screen w-full flex flex-col justify-center items-center overflow-hidden px-4 sm:px-8 bg-[#121214]">
        
        {/* Subtle Background Radial Matrix */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-25">
          <div className="w-[800px] h-[800px] rounded-full border border-[#2e2e33]/60" />
          <div className="w-[500px] h-[500px] rounded-full border border-[#2e2e33]/40" />
        </div>

        {/* ── PHASE 1: BIG VELA MASCOT (Shrinks & moves to top-left as you scroll) ── */}
        <div
          className="absolute z-30 transition-transform duration-75 ease-out flex items-center gap-4 pointer-events-none sm:pointer-events-auto"
          style={{
            transform: `translate(${
              (1 - shrinkFactor) * 0 + shrinkFactor * (typeof window !== "undefined" && window.innerWidth < 640 ? -120 : -320)
            }px, ${
              (1 - shrinkFactor) * (typeof window !== "undefined" && window.innerWidth < 640 ? -110 : -140) + shrinkFactor * -260
            }px) scale(${1.8 - shrinkFactor * 1.15})`,
          }}
        >
          <div className="p-3 rounded-2xl bg-[#18181b]/90 border border-[#2e2e33] backdrop-blur-md shadow-2xl">
            <Vela size={shrinkFactor > 0.6 ? 48 : 80} color="#60a5fa" loading={shrinkFactor > 0.4} />
          </div>
          {shrinkFactor > 0.5 && (
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-[#f0f0ee] flex items-center gap-1.5">
                <span>Vela Engine</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  Live Compiler
                </span>
              </div>
              <div className="text-[11px] text-[#a1a1aa]">Autonomous Study Architect</div>
            </div>
          )}
        </div>

        {/* ── INTRO TITLE (Visible at top of scroll, fades as you scroll down) ── */}
        <div
          className="absolute top-[52%] sm:top-[50%] z-20 text-center max-w-xl transition-opacity duration-150 pointer-events-none px-4"
          style={{
            opacity: introFade,
            transform: `translateY(${(1 - introFade) * -20}px)`,
          }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs font-mono text-blue-300 mb-3">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span>Meet Vela</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-normal text-[#f0f0ee] tracking-tight">
            Tell Vela what to build.
          </h2>
          <p className="text-sm sm:text-base text-[#a1a1aa] mt-2">
            Scroll down to watch Vela compile live interactive revision sandboxes.
          </p>
          <div className="mt-4 text-xs font-mono text-blue-400 flex items-center justify-center gap-1 animate-bounce">
            <span>↓ Scroll to build tool</span>
          </div>
        </div>

        {/* ── PHASE 2 & 3: REVEALED INTERACTIVE TOOL SIMULATION STAGE ── */}
        <div
          className="relative z-20 w-full max-w-[1050px] transition-all duration-150 ease-out"
          style={{
            opacity: demoReveal,
            transform: `translateY(${(1 - demoReveal) * 40}px) scale(${0.92 + demoReveal * 0.08})`,
            pointerEvents: demoReveal > 0.4 ? "auto" : "none",
          }}
        >
          {/* Outer Compiler Window */}
          <div
            className="bg-[#18181b] border border-[#2e2e33] overflow-hidden shadow-2xl"
            style={{ borderRadius: "14px" }}
          >
            {/* Window Titlebar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-[#2e2e33] bg-[#141417]">
              <div className="flex items-center gap-2 pl-0 sm:pl-36">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                <span className="text-xs font-mono text-[#a1a1aa] ml-2 truncate">
                  vela-studio://synthesize/{current.id}
                </span>
              </div>

              {/* Subject Selectors */}
              <div className="flex items-center gap-1.5">
                {velaExamples.map((ex, idx) => (
                  <button
                    key={ex.id}
                    onClick={() => {
                      setActiveTab(idx);
                      setSimStep(0);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      activeTab === idx
                        ? "bg-[#27272a] text-[#f0f0ee] border border-[#3f3f46]"
                        : "text-[#a1a1aa] hover:text-[#f0f0ee]"
                    }`}
                  >
                    {ex.tabLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* Stage Body */}
            <div className="p-5 sm:p-7 space-y-5">
              {/* User Prompt Bar */}
              <div className="p-3.5 rounded-xl bg-[#131519] border border-[#2e2e33] flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="text-sm">💬</span>
                  <p className="text-xs sm:text-sm text-[#f0f0ee] font-mono truncate">
                    <span className="text-blue-400">Student: </span>"{current.prompt}"
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex-shrink-0 hidden sm:inline-block">
                  ✓ Compiled in 1.4s
                </span>
              </div>

              {/* LIVE SIMULATED TOOL VIEWPORT (Simulates Interactive Video/Tool Playing) */}
              <div className="p-5 rounded-xl bg-[#101318] border border-[#2e2e33] space-y-4 relative overflow-hidden">
                {/* Header of Active Tool */}
                <div className="flex items-center justify-between pb-3 border-b border-[#222834]">
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-[#f0f0ee] flex items-center gap-2">
                      <span>{current.toolTitle}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    </h3>
                    <p className="text-xs text-[#a1a1aa] mt-0.5 font-mono">{current.stats}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono border ${current.accent}`}>
                    {current.badge}
                  </span>
                </div>

                {/* Simulated Interactive Timeline & Process Queue */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-[#a1a1aa]">
                    <span>Interactive Execution Timeline (Time Slice: 2ms)</span>
                    <span className={currentSim.statusColor}>Step {simStep + 1} of 4</span>
                  </div>

                  {/* Visual Process Gantt Bar */}
                  <div className="h-9 w-full bg-[#161d2b] rounded-lg border border-[#243042] flex overflow-hidden p-1 gap-1">
                    <div
                      className={`h-full rounded transition-all duration-500 flex items-center justify-center font-mono text-xs font-bold ${
                        simStep === 0
                          ? "w-1/3 bg-blue-500 text-white shadow-lg"
                          : "w-1/3 bg-blue-500/40 text-blue-200"
                      }`}
                    >
                      P1 [2ms]
                    </div>
                    <div
                      className={`h-full rounded transition-all duration-500 flex items-center justify-center font-mono text-xs font-bold ${
                        simStep === 1
                          ? "w-1/12 bg-amber-500 text-slate-950 animate-pulse"
                          : "w-1/12 bg-slate-700/40 text-slate-400 text-[10px]"
                      }`}
                    >
                      SW
                    </div>
                    <div
                      className={`h-full rounded transition-all duration-500 flex items-center justify-center font-mono text-xs font-bold ${
                        simStep === 2
                          ? "w-1/3 bg-emerald-500 text-slate-950 shadow-lg"
                          : "w-1/3 bg-emerald-500/40 text-emerald-200"
                      }`}
                    >
                      P2 [2ms]
                    </div>
                    <div
                      className={`h-full rounded transition-all duration-500 flex items-center justify-center font-mono text-xs font-bold ${
                        simStep === 3
                          ? "flex-1 bg-indigo-500 text-white shadow-lg"
                          : "flex-1 bg-indigo-500/40 text-indigo-200"
                      }`}
                    >
                      P3 [1ms]
                    </div>
                  </div>
                </div>

                {/* Socratic Question & Verification Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono pt-1">
                  <div className="p-3 rounded-lg bg-[#151b26] border border-[#243042] space-y-1">
                    <div className="text-blue-300 uppercase text-[10px] font-semibold">Active State</div>
                    <div className="text-[#f0f0ee]">{currentSim.action}</div>
                    <div className="text-[#a1a1aa] text-[11px]">{currentSim.event}</div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#151b26] border border-[#243042] space-y-1">
                    <div className="text-emerald-400 uppercase text-[10px] font-semibold">Socratic Diagnostic</div>
                    <div className="text-[#d4d4d8] leading-relaxed">{currentSim.answer}</div>
                  </div>
                </div>
              </div>

              {/* Bottom Control & CTA Bar */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#2e2e33]">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSimStep((prev) => (prev + 1) % 4)}
                    className="px-3 py-1.5 rounded-lg bg-[#27272a] hover:bg-[#333338] text-xs font-mono text-[#f0f0ee] border border-[#3f3f46] transition-colors"
                  >
                    ▶ Step Simulation ({simStep + 1}/4)
                  </button>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="text-xs text-[#a1a1aa] hover:text-[#f0f0ee] font-mono transition-colors"
                  >
                    {isPlaying ? "⏸ Pause auto-play" : "▶ Resume auto-play"}
                  </button>
                </div>

                <a
                  href="http://localhost:5174"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#f0f0ee] text-[#121214] hover:bg-white text-xs font-semibold rounded-lg transition-colors self-start sm:self-auto shadow-sm"
                >
                  <span>Launch Free Playground</span>
                  <span>→</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   4. CRITICAL COMPARISON (Scannable Multi-Method Contrast)
   ═══════════════════════════════════════════════════════════════ */
const ComparisonSection = () => (
  <section className="py-20 px-6 sm:px-12 max-w-[1400px] mx-auto border-t border-[#2e2e33]">
    <div className="mb-12">
      <div className="text-xs text-[#a1a1aa] font-mono uppercase tracking-wider mb-2">
        ✦ Why It Works
      </div>
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal text-[#f0f0ee] tracking-tight leading-tight max-w-[22ch]">
        A better way to study for finals.
      </h2>
    </div>

    {/* 3-Column Comparison */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-[#2e2e33] border-y border-[#2e2e33]">
      {dialecticItems.map((item, index) => {
        const isHydrus = index === 2;
        return (
          <div
            key={item.title}
            className={`p-6 sm:p-8 flex flex-col justify-between space-y-6 ${
              isHydrus ? "bg-[#18181b] relative border-l lg:border-l-0 border-[#3b82f6]/40" : "bg-transparent"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className={isHydrus ? "text-blue-400 font-semibold" : "text-[#a1a1aa]"}>
                  Method {item.number} • {item.subtitle}
                </span>
                {isHydrus && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-blue-500/15 text-blue-300 border border-blue-500/30">
                    Recommended
                  </span>
                )}
              </div>
              <h3 className="text-xl sm:text-2xl font-normal text-[#f0f0ee] tracking-tight">
                {item.title}
              </h3>
              <p className="text-sm text-[#a1a1aa] leading-relaxed max-w-[36ch]">
                {item.description}
              </p>
            </div>

            <div className={`pt-3.5 text-xs sm:text-sm font-mono border-t border-[#2e2e33] flex items-center justify-between ${item.verdictColor}`}>
              <span>Result:</span>
              <span className="text-right">{item.verdict}</span>
            </div>
          </div>
        );
      })}
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════════════════
   5. TWO EDITIONS & SCANNABLE SPECIFICATION MATRIX
   ═══════════════════════════════════════════════════════════════ */
const EditionsSection = () => (
  <section id="compare-editions" className="py-20 px-6 sm:px-12 max-w-[1400px] mx-auto border-t border-[#2e2e33]">
    <div className="mb-12">
      <div className="text-xs text-[#a1a1aa] font-mono uppercase tracking-wider mb-2">
        ✦ Simple Plans
      </div>
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal text-[#f0f0ee] tracking-tight leading-tight max-w-[20ch]">
        Start free, upgrade when you're ready.
      </h2>
    </div>

    {/* Side-by-Side Edition Tiles */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-14">
      {/* Core Sandbox */}
      <div
        className="bg-[#18181b] p-6 sm:p-8 border border-[#2e2e33] flex flex-col justify-between space-y-6"
        style={{ borderRadius: "12px" }}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#2e2e33]">
            <h3 className="text-2xl font-normal text-[#f0f0ee]">Hydruslearn Core</h3>
            <span className="text-xs font-mono text-[#a1a1aa] px-2.5 py-1 border border-[#2e2e33] rounded-full">
              Free Forever
            </span>
          </div>
          <p className="text-sm text-[#a1a1aa] leading-relaxed max-w-[44ch]">
            Instant study tool generator. Drop in notes and build flashcards, mind maps, and practice quizzes on the spot.
          </p>

          <ul className="space-y-2.5 pt-1 text-sm text-[#f0f0ee]">
            <li className="flex items-center gap-2.5">
              <span className="text-[#a1a1aa] font-mono text-xs">■</span>
              <span>Instant tool generator from text, PDFs, or YouTube links</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="text-[#a1a1aa] font-mono text-xs">■</span>
              <span>Side-by-side document reader with citations</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="text-[#a1a1aa] font-mono text-xs">■</span>
              <span>Access to community study tool marketplace</span>
            </li>
          </ul>
        </div>

        <a
          href="http://localhost:5174"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-between px-5 py-3 border border-[#2e2e33] text-[#f0f0ee] hover:bg-[#282830] text-sm transition-colors font-medium"
          style={{ borderRadius: "10px" }}
        >
          <span>Open Free Sandbox</span>
          <span>→</span>
        </a>
      </div>

      {/* Pro Platform */}
      <div
        className="bg-[#18181b] p-6 sm:p-8 border border-[#3b82f6]/40 flex flex-col justify-between space-y-6"
        style={{ borderRadius: "12px" }}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#2e2e33]">
            <h3 className="text-2xl font-normal text-[#f0f0ee]">Hydruslearn Pro</h3>
            <span className="text-xs font-mono text-blue-300 bg-blue-500/15 border border-blue-500/30 px-2.5 py-1 font-medium rounded-full">
              ★ Student Favorite
            </span>
          </div>
          <p className="text-sm text-[#cbd5e1] leading-relaxed max-w-[44ch]">
            Your persistent study hub. Saves your document library, diagnoses weak spots with Mind's Mirror, and guides you with Socratic tutoring.
          </p>

          <ul className="space-y-2.5 pt-1 text-sm text-[#f0f0ee]">
            <li className="flex items-center gap-2.5">
              <span className="text-emerald-400 font-mono text-xs">✓</span>
              <span>Unlimited cloud document library &amp; citation split viewer</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="text-blue-400 font-mono text-xs">✓</span>
              <span>Mind's Mirror: separates recall slips from concept gaps</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="text-emerald-400 font-mono text-xs">✓</span>
              <span>Socratic step-by-step guidance &amp; spaced repetition history</span>
            </li>
          </ul>
        </div>

        <Link
          to="/signup"
          className="inline-flex items-center justify-between px-5 py-3 bg-[#f0f0ee] text-[#121214] hover:bg-white font-semibold text-sm transition-colors"
          style={{ borderRadius: "10px" }}
        >
          <span>Get Started Free with Pro</span>
          <span>→</span>
        </Link>
      </div>
    </div>

    {/* Architectural Specification Table (Scannable 4-Row Matrix) */}
    <div className="border-t border-b border-[#2e2e33]">
      <div className="py-4 flex items-center justify-between">
        <h3 className="text-lg font-normal text-[#f0f0ee]">
          Feature Breakdown
        </h3>
        <span className="text-xs font-mono text-[#a1a1aa]">
          Side-by-Side Comparison
        </span>
      </div>

      <div className="divide-y divide-[#2e2e33]">
        {specificationRows.map((row) => (
          <div
            key={row.feature}
            className="grid grid-cols-1 lg:grid-cols-12 py-4 gap-3 items-start"
          >
            <div className="lg:col-span-4 text-sm font-medium text-[#f0f0ee] max-w-[28ch]">
              {row.feature}
            </div>
            <div className="lg:col-span-4 text-xs sm:text-sm text-[#a1a1aa] leading-relaxed max-w-[36ch]">
              <span className="text-xs font-mono text-[#a1a1aa] block mb-0.5 font-medium">
                Core Sandbox
              </span>
              {row.core}
            </div>
            <div className="lg:col-span-4 text-xs sm:text-sm text-[#f0f0ee] leading-relaxed max-w-[36ch]">
              <span className="text-xs font-mono text-blue-400 block mb-0.5 font-semibold">
                Pro Platform
              </span>
              {row.pro}
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════════════════
   6. INQUIRIES (FAQ) (Clean Editorial Accordion)
   ═══════════════════════════════════════════════════════════════ */
const InquiriesSection = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (i) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <section id="faq" className="py-20 px-6 sm:px-12 max-w-[1400px] mx-auto border-t border-[#2e2e33]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs text-[#a1a1aa] font-mono uppercase tracking-wider">
            ✦ Got Questions?
          </div>
          <h2 className="text-3xl sm:text-4xl font-normal text-[#f0f0ee] tracking-tight leading-tight max-w-[18ch]">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-[#a1a1aa] leading-relaxed max-w-[32ch]">
            Quick answers about uploading notes, privacy, and how it helps you study.
          </p>
        </div>

        <div className="lg:col-span-8 divide-y divide-[#2e2e33] border-y border-[#2e2e33]">
          {inquiries.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="py-4">
                <button
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between text-left group py-1"
                >
                  <span className="text-base sm:text-lg text-[#f0f0ee] group-hover:text-white transition-colors font-normal max-w-[48ch]">
                    {item.question}
                  </span>
                  <span className="text-[#a1a1aa] text-lg font-mono flex-shrink-0 pl-4">
                    {isOpen ? "—" : "+"}
                  </span>
                </button>

                {isOpen && (
                  <p className="pt-2.5 pb-1 text-sm text-[#a1a1aa] leading-relaxed font-normal max-w-[58ch]">
                    {item.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════
   7. EPILOGUE & FOOTER (Clean Solid Finish)
   ═══════════════════════════════════════════════════════════════ */
const EpilogueSection = () => (
  <section className="py-20 px-6 sm:px-12 max-w-[1400px] mx-auto border-t border-[#2e2e33]">
    <div
      className="bg-[#18181b] p-8 sm:p-12 border border-[#2e2e33] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden"
      style={{ borderRadius: "12px" }}
    >
      <div className="space-y-2 max-w-[50ch]">
        <div className="text-xs text-[#a1a1aa] font-mono uppercase tracking-wider">
          ✦ Ready to Study?
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal text-[#f0f0ee] tracking-tight leading-tight">
          Make your next study session your best one.
        </h2>
        <p className="text-sm text-[#a1a1aa] leading-relaxed">
          Drop in your lecture notes and see how easy revision can be.
        </p>
      </div>

      <Link
        to="/signup"
        id="cta-epilogue-signup"
        className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-[#f0f0ee] text-[#121214] hover:bg-white text-sm font-semibold transition-colors flex-shrink-0"
        style={{ borderRadius: "10px" }}
      >
        <span>Start studying for free</span>
        <span>→</span>
      </Link>
    </div>
  </section>
);

const FooterSection = () => (
  <footer className="py-14 px-6 sm:px-12 max-w-[1400px] mx-auto text-xs text-[#a1a1aa] font-mono border-t border-[#2e2e33]">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-[#2e2e33]">
      <div className="space-y-1">
        <div className="text-[#f0f0ee] font-medium text-sm">HydrusLearn Pro</div>
        <div>Your personal AI study companion.</div>
      </div>

      <div className="flex items-center gap-6">
        <Link to="/privacy" className="hover:text-[#f0f0ee] transition-colors">
          Privacy Policy
        </Link>
        <Link to="/terms" className="hover:text-[#f0f0ee] transition-colors">
          Terms of Service
        </Link>
        <a
          href="http://localhost:5174"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#f0f0ee] transition-colors"
        >
          Core Sandbox →
        </a>
      </div>
    </div>

    <div className="pt-6 flex items-center justify-between text-xs">
      <div>© {new Date().getFullYear()} HydrusLearn Pro. All rights reserved.</div>
      <div>London, UK</div>
    </div>
  </footer>
);

/* ═══════════════════════════════════════════════════════════════
   ROOT LANDING COMPONENT (Obsidian Dark Canvas #121214)
   ═══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = LANDING_TITLE;
    const canonicalUrl = `${getBaseUrl()}${LANDING_PATH}`;
    const managedTags = [];
    managedTags.push(upsertMeta("description", LANDING_DESCRIPTION));
    managedTags.push(upsertMeta("robots", "index, follow"));
    managedTags.push(upsertMeta("og:title", LANDING_TITLE, true));
    managedTags.push(upsertMeta("og:description", LANDING_DESCRIPTION, true));
    managedTags.push(upsertMeta("og:type", "website", true));
    managedTags.push(upsertMeta("og:url", canonicalUrl, true));
    managedTags.push(upsertMeta("twitter:card", "summary_large_image"));
    managedTags.push(upsertMeta("twitter:title", LANDING_TITLE));
    managedTags.push(upsertMeta("twitter:description", LANDING_DESCRIPTION));
    managedTags.push(upsertCanonical(canonicalUrl));
    return () => {
      document.title = previousTitle;
      managedTags.forEach((entry) => {
        if (entry?.created && entry.tag?.parentNode) {
          entry.tag.parentNode.removeChild(entry.tag);
        }
      });
    };
  }, []);

  return (
    <div
      className="min-h-screen text-[#f0f0ee] selection:bg-[#f0f0ee] selection:text-[#121214] antialiased relative overflow-x-hidden"
      style={{ backgroundColor: "#121214" }}
    >
      <main>
        <HeroSection />
        <CapabilitiesSection />
        <VelaScrollShowcase />
        <ComparisonSection />
        <EditionsSection />
        <InquiriesSection />
        <EpilogueSection />
      </main>
      <FooterSection />
    </div>
  );
}
