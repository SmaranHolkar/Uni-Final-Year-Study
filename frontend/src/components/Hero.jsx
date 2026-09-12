import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import learningPlaygroundImg from "../assets/learningplayground.png";
import uploadDocsImg from "../assets/uploaddocs.png";
import mindsMirrorImg from "../assets/mindsmirror.png";
import mindmapImg from "../assets/mindmap.png";

/* ═══════════════════════════════════════════════════════════════
   SITE CONSTANTS & SEO
   ═══════════════════════════════════════════════════════════════ */
const SITE_NAME = "HydrusLearn Pro";
const LANDING_TITLE = "HydrusLearn Pro — Study Smarter & Ace Your Exams";
const LANDING_DESCRIPTION = "Turn your lecture notes, slides, and PDFs into interactive quizzes, smart flashcards, and mind maps in seconds. Pinpoint your weak spots and study with confidence.";
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
   DATA STRUCTURES (Student-Friendly Copy & Clean Obsidian Styling)
   ═══════════════════════════════════════════════════════════════ */
const featureCards = [
  {
    label: "Upload & Practice",
    badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    title: "Directly from your lectures & notes",
    summary:
      "Drop in your lecture slides, research papers, or syllabus notes. Every question and answer links straight back to the exact passage in your material so you know exactly where it came from.",
    image: uploadDocsImg,
    alt: "Document upload interface with passage citations",
    format: "PDF, Slides, OCR, YouTube",
  },
  {
    label: "Interactive Study Canvas",
    badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    title: "Interactive tools built from your notes",
    summary:
      "Turn heavy chapters into interactive flashcards, matching games, mind maps, and practice quizzes tailored specifically to what you are studying.",
    image: learningPlaygroundImg,
    alt: "Interactive study canvas with study tools",
    format: "Instant Flashcards & Quizzes",
  },
  {
    label: "Mind's Mirror Diagnostics",
    badgeColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    title: "Pinpoint your mistakes before exam day",
    summary:
      "Mind's Mirror looks at why you missed a question — letting you know whether it was a quick recall slip or a concept you need to review before test day.",
    image: mindsMirrorImg,
    alt: "Mind's Mirror error diagnosis interface",
    format: "Personalized Progress Insights",
  },
  {
    label: "Concept Maps",
    badgeColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    title: "See the big picture clearly",
    summary:
      "Automatically connects the dots between complex ideas with interactive concept maps that make big topics easy to navigate and revise.",
    image: mindmapImg,
    alt: "Visual concept mind map",
    format: "Interactive Visual Graphs",
  },
];

const dialecticItems = [
  {
    number: "01",
    title: "Making Cards by Hand",
    subtitle: "Anki & Quizlet",
    description:
      "Spending hours typing out flashcards one by one leaves you tired before you even start revising, and often misses the bigger conceptual picture.",
    verdict: "Too much time spent typing",
  },
  {
    number: "02",
    title: "Generic AI Chatbots",
    subtitle: "ChatGPT & General LLMs",
    description:
      "Chatbots can make things up, give answers that aren't on your exam syllabus, and encourage passive reading instead of active testing.",
    verdict: "Risky & ungrounded answers",
  },
  {
    number: "03",
    title: "HydrusLearn Pro",
    subtitle: "Your AI Study Companion",
    description:
      "Instantly converts your lecture notes and slides into grounded quizzes, concept maps, and smart error diagnostics with direct citations.",
    verdict: "Source-grounded study confidence",
  },
];

const specificationRows = [
  {
    feature: "Lecture & Note Uploads",
    core: "Generate quick study tools on the spot from PDFs, slides, text notes, and YouTube videos",
    pro: "Permanent cloud document library with fast search and split-screen PDF reader",
  },
  {
    feature: "Active Recall Quizzes",
    core: "Practice quizzes with instant right/wrong answer feedback",
    pro: "Detailed explanations with exact paragraph citations linking to your lecture slides",
  },
  {
    feature: "Mistake Analysis",
    core: "Standard score summary and answer review after each quiz",
    pro: "Mind's Mirror: categorizes mistakes into concept gaps vs memory slips over time",
  },
  {
    feature: "Interactive Study Tools",
    core: "Create flashcards, matching decks, and mind maps on demand",
    pro: "Link study sessions to focus your revision directly on topics you struggle with",
  },
  {
    feature: "AI Study Coaching",
    core: "Direct answer explanations based on your uploaded text",
    pro: "Socratic step-by-step tutoring that guides you through tricky exam questions",
  },
  {
    feature: "Study Tool Sharing",
    core: "Browse and use helpful study tools created by fellow students",
    pro: "Save, organize, and customize your own study collections across semesters",
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
   1. HERO SECTION — CLEAN EDITORIAL OBSIDIAN CANVAS
   ═══════════════════════════════════════════════════════════════ */
const HeroSection = () => {
  return (
    <header className="relative min-h-[75vh] pt-24 sm:pt-32 pb-20 px-6 sm:px-12 max-w-[1400px] mx-auto flex flex-col justify-center overflow-hidden">
      {/* ── SUBTLE GEOMETRIC ARCHITECTURAL BACKGROUND ── */}
      <div
        className="pointer-events-none absolute right-[5%] top-[12%] -z-10 w-[600px] h-[600px] flex items-center justify-center opacity-40"
        aria-hidden="true"
      >
        <div className="absolute w-[560px] h-[560px] rounded-full border border-[#2e2e33]" />
        <div className="absolute w-[420px] h-[420px] rounded-full border border-[#2e2e33]" />
        <div className="absolute w-[280px] h-[280px] rounded-full border border-[#2e2e33]" />
        <div className="w-[180px] h-[180px] rounded-full bg-[#18181b] border border-[#38383f]" />
      </div>

      {/* ── DISPLAY HEADLINE (Clean Editorial Typography) ── */}
      <div className="max-w-[900px] z-10 pb-8">
        <h1
          className="text-[#f0f0ee] text-4xl sm:text-6xl md:text-7xl font-normal tracking-tight leading-[1.08] select-none"
          style={{ fontFeatureSettings: '"cv01", "ss03"' }}
        >
          <span className="block">Study smarter.</span>
          <span className="block text-[#a1a1aa]">Revise faster.</span>
          <span className="block text-[#f0f0ee]">Ace your exams.</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-[#a1a1aa] max-w-[48ch] leading-relaxed">
          Turn your lecture slides, notes, and textbooks into grounded practice quizzes, concept maps, and mistake diagnostics in seconds.
        </p>

        {/* ── HERO ACTION BUTTONS ── */}
        <div className="flex flex-wrap items-center gap-4 mt-8">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2.5 px-6 py-3 bg-[#f0f0ee] text-[#121214] hover:bg-white font-semibold text-sm transition-colors"
            style={{ borderRadius: "10px" }}
          >
            <span>Start studying for free</span>
            <span>→</span>
          </Link>
          <a
            href="#capabilities"
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#18181b] border border-[#2e2e33] hover:border-[#404047] text-[#f0f0ee] text-sm font-medium transition-colors"
            style={{ borderRadius: "10px" }}
          >
            <span>Explore study tools</span>
          </a>
        </div>
      </div>
    </header>
  );
};

/* ═══════════════════════════════════════════════════════════════
   2. SYSTEM CAPABILITIES — CLEAN SOLID TILES
   ═══════════════════════════════════════════════════════════════ */
const CapabilitiesSection = () => (
  <section id="capabilities" className="py-20 px-6 sm:px-12 max-w-[1400px] mx-auto border-t border-[#2e2e33]">
    <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-14">
      <div>
        <div className="text-xs text-[#a1a1aa] font-mono uppercase tracking-wider mb-3">
          ✦ Study Tools
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal text-[#f0f0ee] tracking-tight leading-tight max-w-[20ch]">
          Everything you need to master tough topics.
        </h2>
      </div>
      <div className="text-base sm:text-lg text-[#a1a1aa] max-w-[36ch] leading-relaxed">
        Turn heavy slide decks and textbooks into interactive, enjoyable study tools in seconds.
      </div>
    </div>

    {/* 2x2 Clean Cards Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {featureCards.map((card) => (
        <div
          key={card.title}
          className="bg-[#18181b] p-7 sm:p-9 border border-[#2e2e33] flex flex-col justify-between space-y-6 transition-colors duration-200 overflow-hidden"
          style={{ borderRadius: "12px" }}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs sm:text-sm font-mono pb-3 border-b border-[#2e2e33]">
              <span className={`px-2.5 py-0.5 rounded-full border ${card.badgeColor}`}>
                {card.label}
              </span>
              <span className="text-[#a1a1aa]">{card.format}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-normal text-[#f0f0ee] tracking-tight leading-snug">
              {card.title}
            </h3>
            <p className="text-sm sm:text-base text-[#a1a1aa] leading-relaxed max-w-[50ch]">
              {card.summary}
            </p>
          </div>

          <div className="border border-[#2e2e33] bg-[#121214] overflow-hidden mt-4 rounded-lg">
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
   3. CRITICAL COMPARISON (Clean Multi-Method Breakdown)
   ═══════════════════════════════════════════════════════════════ */
const ComparisonSection = () => (
  <section className="py-20 px-6 sm:px-12 max-w-[1400px] mx-auto border-t border-[#2e2e33]">
    <div className="mb-14">
      <div className="text-xs text-[#a1a1aa] font-mono uppercase tracking-wider mb-3">
        ✦ Why It Works
      </div>
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal text-[#f0f0ee] tracking-tight leading-tight max-w-[22ch]">
        A better way to study for finals.
      </h2>
    </div>

    {/* 3-Column Comparison with Solid Highlight */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-[#2e2e33] border-y border-[#2e2e33]">
      {dialecticItems.map((item, index) => {
        const isHydrus = index === 2;
        return (
          <div
            key={item.title}
            className={`p-7 sm:p-9 flex flex-col justify-between space-y-6 ${
              isHydrus ? "bg-[#18181b] relative border-l lg:border-l-0 border-[#3b82f6]/40" : "bg-transparent"
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs sm:text-sm font-mono">
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
              <p className="text-sm sm:text-base text-[#a1a1aa] leading-relaxed max-w-[36ch]">
                {item.description}
              </p>
            </div>

            <div className={`pt-4 text-sm font-mono border-t border-[#2e2e33] flex items-center justify-between ${
              isHydrus ? "text-emerald-400 font-medium" : "text-[#a1a1aa]"
            }`}>
              <span>Result:</span>
              <span>{item.verdict}</span>
            </div>
          </div>
        );
      })}
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════════════════
   4. TWO EDITIONS & SPECIFICATION MATRIX (Solid Clean Plan Cards)
   ═══════════════════════════════════════════════════════════════ */
const EditionsSection = () => (
  <section id="compare-editions" className="py-20 px-6 sm:px-12 max-w-[1400px] mx-auto border-t border-[#2e2e33]">
    <div className="mb-14">
      <div className="text-xs text-[#a1a1aa] font-mono uppercase tracking-wider mb-3">
        ✦ Simple Plans
      </div>
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal text-[#f0f0ee] tracking-tight leading-tight max-w-[20ch]">
        Start free, upgrade when you're ready.
      </h2>
    </div>

    {/* Side-by-Side Edition Tiles */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16">
      {/* Core Sandbox */}
      <div
        className="bg-[#18181b] p-7 sm:p-10 border border-[#2e2e33] flex flex-col justify-between space-y-6"
        style={{ borderRadius: "12px" }}
      >
        <div className="space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-[#2e2e33]">
            <h3 className="text-2xl font-normal text-[#f0f0ee]">Hydruslearn Core</h3>
            <span className="text-xs font-mono text-[#a1a1aa] px-2.5 py-1 border border-[#2e2e33] rounded-full">
              Free Forever
            </span>
          </div>
          <p className="text-sm sm:text-base text-[#a1a1aa] leading-relaxed max-w-[44ch]">
            Perfect for quick revision sessions. Paste your notes and generate flashcards, mind maps, and practice quizzes right away.
          </p>

          <ul className="space-y-3 pt-2 text-sm sm:text-base text-[#f0f0ee]">
            <li className="flex items-center gap-3">
              <span className="text-[#a1a1aa] font-mono text-sm">■</span>
              <span>Instant study tool generator from text or prompts</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-[#a1a1aa] font-mono text-sm">■</span>
              <span>Supports PDFs, notes, OCR images &amp; YouTube links</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-[#a1a1aa] font-mono text-sm">■</span>
              <span>Side-by-side document split reader with citations</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-[#a1a1aa] font-mono text-sm">■</span>
              <span>Explore and use community-created study tools</span>
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
        className="bg-[#18181b] p-7 sm:p-10 border border-[#3b82f6]/40 flex flex-col justify-between space-y-6"
        style={{ borderRadius: "12px" }}
      >
        <div className="space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-[#2e2e33]">
            <h3 className="text-2xl font-normal text-[#f0f0ee]">Hydruslearn Pro</h3>
            <span className="text-xs font-mono text-blue-300 bg-blue-500/15 border border-blue-500/30 px-2.5 py-1 font-medium rounded-full">
              ★ Student Favorite
            </span>
          </div>
          <p className="text-sm sm:text-base text-[#cbd5e1] leading-relaxed max-w-[44ch]">
            Your complete study suite. Saves all your documents in one place, tracks your progress over time, and coaches you through difficult concepts.
          </p>

          <ul className="space-y-3 pt-2 text-sm sm:text-base text-[#f0f0ee]">
            <li className="flex items-center gap-3">
              <span className="text-emerald-400 font-mono text-sm">✓</span>
              <span>Unlimited cloud document storage &amp; in-app PDF reader</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-blue-400 font-mono text-sm">✓</span>
              <span>Mind's Mirror: reveals your exact concept gaps</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-amber-400 font-mono text-sm">✓</span>
              <span>Socratic step-by-step tutoring on tough questions</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-emerald-400 font-mono text-sm">✓</span>
              <span>Save quiz history &amp; revision sessions across devices</span>
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

    {/* Architectural Specification Table */}
    <div className="border-t border-b border-[#2e2e33]">
      <div className="py-5 flex items-center justify-between">
        <h3 className="text-xl font-normal text-[#f0f0ee]">
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
            className="grid grid-cols-1 lg:grid-cols-12 py-5 gap-4 items-start"
          >
            <div className="lg:col-span-4 text-sm sm:text-base font-medium text-[#f0f0ee] max-w-[28ch]">
              {row.feature}
            </div>
            <div className="lg:col-span-4 text-sm text-[#a1a1aa] leading-relaxed max-w-[36ch]">
              <span className="text-xs font-mono text-[#a1a1aa] block mb-1 font-medium">
                Core Sandbox
              </span>
              {row.core}
            </div>
            <div className="lg:col-span-4 text-sm text-[#f0f0ee] leading-relaxed max-w-[36ch]">
              <span className="text-xs font-mono text-blue-400 block mb-1 font-semibold">
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
   5. INQUIRIES (FAQ) (Clean Editorial Accordion)
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
          <p className="text-sm sm:text-base text-[#a1a1aa] leading-relaxed max-w-[32ch]">
            Quick answers about uploading notes, privacy, and how it helps you study.
          </p>
        </div>

        <div className="lg:col-span-8 divide-y divide-[#2e2e33] border-y border-[#2e2e33]">
          {inquiries.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="py-5">
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
                  <p className="pt-3 pb-2 text-sm sm:text-base text-[#a1a1aa] leading-relaxed font-normal max-w-[58ch]">
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
   6. EPILOGUE & FOOTER (Clean Solid Finish)
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
        <p className="text-sm sm:text-base text-[#a1a1aa] leading-relaxed">
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
        <ComparisonSection />
        <EditionsSection />
        <InquiriesSection />
        <EpilogueSection />
      </main>
      <FooterSection />
    </div>
  );
}
