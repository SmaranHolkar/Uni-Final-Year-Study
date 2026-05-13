import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import learningPlaygroundImg from "../assets/learningplayground.png";
import uploadDocsImg from "../assets/uploaddocs.png";
import mindsMirrorImg from "../assets/mindsmirror.png";
import {
  ArrowRight,
  Upload,
  ChevronDown,
  FlaskConical,
  Microscope,
  ClipboardList,
  Store,
} from "lucide-react";

/* DOT GRID BACKGROUND — Space/Isomorphic style */
// Handles DotGrid logic.
const DotGrid = () => (
  <div style={{
    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
    zIndex: 0, pointerEvents: "none",
    backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.2) 1.5px, transparent 1.5px)",
    backgroundSize: "36px 36px",
    opacity: 1,
  }} />
);

/*             SCROLL REVEAL                */
const useReveal = (threshold = 0.1) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
};

const Reveal = ({ children, delay = 0, className = "" }) => {
  const [ref, visible] = useReveal();
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(28px)",
      transition: `opacity 0.75s cubic-bezier(.16,1,.3,1) ${delay}s, transform 0.75s cubic-bezier(.16,1,.3,1) ${delay}s`,
    }}>
      {children}
    </div>
  );
};

/* SHARED TOKENS*/
const rule        = { borderTop: "1px solid var(--border)" };
const muted       = { color: "var(--muted-foreground)" };
const fg          = { color: "var(--foreground)" };
const accent      = "var(--primary)";
const accentDim   = "transparent";

const SITE_NAME = "HydrusLearn";
const LANDING_TITLE = "HydrusLearn | Turn Your Notes into Quizzes, Mind Maps, and Real Understanding";
const LANDING_DESCRIPTION = "Upload your notes and watch them transform into targeted quizzes and personalised study experiences. HydrusLearn helps you actually understand the material.";
const LANDING_PATH = "/";

const getBaseUrl = () => {
  if (typeof window === "undefined") return "https://hydruslearn.com";
  return window.location.origin;
};

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

const buildStructuredData = (canonicalUrl) => ([
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: canonicalUrl,
    description: LANDING_DESCRIPTION,
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    url: canonicalUrl,
    description: LANDING_DESCRIPTION,
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqData.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  },
]);

/*  HERO  */
// Handles Hero logic.
const Hero = () => {
  const [on, setOn] = useState(false);
  useEffect(() => { setTimeout(() => setOn(true), 100); }, []);
  const anim = (d = 0) => ({
    opacity: on ? 1 : 0,
    transform: on ? "none" : "translateY(24px)",
    transition: `opacity 0.9s cubic-bezier(.16,1,.3,1) ${d}s, transform 0.9s cubic-bezier(.16,1,.3,1) ${d}s`,
  });

  return (
    <header className="relative z-10 flex flex-col justify-center" style={{ minHeight: "calc(100svh - 74px)", marginTop: "74px" }}>
      <div className="max-w-4xl mx-auto px-6 md:px-12 w-full py-6">

        {/* ── Top label ── */}
        <div style={anim(0)} className="pb-4 flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[.18em] font-medium" style={muted}>
            Study tool — 2026
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[.18em] font-medium" style={muted}>
            Early access
          </span>
        </div>

        {/* ── Main content ── */}
        <div>
            {/* Version badge — Space/Isomorphic style */}
            <div style={anim(0.02)} className="mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest"
                style={{ background: accentDim, border: `1px solid var(--border)`, color: accent }}>
                <span className="w-1.5 h-1.5" style={{ background: accent }} />
                Beta · March 2026
              </span>
            </div>

            <h1 className="font-black leading-[0.95] tracking-tight mb-5"
              style={{ ...anim(0.05), fontSize: "clamp(2.6rem, 5vw, 4.5rem)", color: "var(--foreground)" }}>
              Stop Memorising.<br />
              <span style={{ color: accent }}>Start understanding.</span>
            </h1>

            <p className="text-[15px] leading-relaxed mb-6 max-w-xl" style={{ ...anim(0.12), ...muted }}>
              Upload your notes and watch them transform into quizzes and deep study support. HydrusLearn figures out what you're missing and helps you actually understand the material — not just cram it.
            </p>

            <div className="flex flex-wrap items-center gap-4" style={anim(0.18)}>
              <Link to="/signup"
                className="group inline-flex items-center gap-2 px-6 py-3 font-mono font-bold text-[14px] transition-all duration-200 uppercase tracking-widest"
                style={{ background: accent, color: "var(--primary-foreground)", border: "1px solid var(--primary)" }}
                aria-label="Start learning for free with HydrusLearn"
                onMouseEnter={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--primary)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--primary)"; e.currentTarget.style.color = "var(--primary-foreground)"; }}>
                Start free
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a href="#how-it-works"
                className="inline-flex items-center gap-1.5 text-[14px] font-medium transition-colors duration-150"
                style={muted}
                onMouseEnter={e => e.currentTarget.style.color = "var(--foreground)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--muted-foreground)"}>
                See how it works
              </a>
            </div>

        </div>

        {/* ── Bottom rule + scroll nudge ── */}
        <div style={{ ...rule, ...anim(0.22) }} className="pt-4 pb-2 flex items-center justify-between">
          <div className="flex flex-wrap gap-8">
            {["No credit card needed", "Any subject", "Free to start"].map(t => (
              <span key={t} className="font-mono text-[11px]" style={muted}>{t}</span>
            ))}
          </div>
          <a href="#how-it-works" className="flex items-center gap-1.5 font-mono text-[11px] transition-colors"
            style={muted}
            onMouseEnter={e => e.currentTarget.style.color = "var(--foreground)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--muted-foreground)"}>
            Scroll <ChevronDown size={12} />
          </a>
        </div>
      </div>
    </header>
  );
};

/* ═══════════════════════════════════════════
   HOW IT WORKS
═══════════════════════════════════════════ */
// Handles HowItWorks logic.
const HowItWorks = () => {
  const tools = [
    { n: "01", icon: Upload,        title: "Upload PDF",          body: "Drop in your PDF notes and we'll process them in seconds.", image: uploadDocsImg, alt: "Upload PDF notes to start a study session" },
    { n: "02", icon: ClipboardList, title: "Quiz",                body: "Get targeted quiz questions from your own material so you can spot knowledge gaps fast." },
    { n: "03", icon: FlaskConical,  title: "Learning Playground", body: "Practice in the way that works best for you — flashcards, study guides, and quick Q&A in one place.", image: learningPlaygroundImg, alt: "Learning Playground with flexible study tools" },
    { n: "04", icon: Microscope,    title: "Mind's Mirror",       body: "Get a metacognitive breakdown of your mistakes so you can improve how you think, not just what you remember.", image: mindsMirrorImg, alt: "Mind's Mirror metacognitive analysis view" },
    { n: "05", icon: Store,         title: "Marketplace",         body: "Discover and reuse tools shared by other learners, then fork what works and make it your own." },
  ];

  return (
    <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-8 pb-32">
      {/* Section header */}
      <Reveal>
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 md:gap-20 items-end mb-20" style={rule}>
          <div className="pt-8">
            <p className="font-mono text-[11px] uppercase tracking-[.18em] font-semibold mb-3" style={{ color: accent, opacity: 0.75 }}>
              How it works
            </p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.02]" style={fg}>
              Five tools.<br />One system.
            </h2>
          </div>
          <p className="pb-1 text-[15px] leading-relaxed max-w-lg" style={muted}>
            One flow: upload your PDF, take a quiz, practise in the Learning Playground, reflect with Mind's Mirror, and explore the Marketplace.
          </p>
        </div>
      </Reveal>

      {/* Floating Spatial Features Flow */}
      <div className="flex flex-col gap-32 mb-10 mt-10 relative z-20">
        {tools.map((feat, i) => (
          <Reveal key={feat.n} delay={0.1}>
            <div className={`flex flex-col md:flex-row items-center gap-12 md:gap-24 ${i % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}>
              
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-6">
                  <span className="font-mono text-xl font-bold tracking-widest" style={{ color: accent }}>{feat.n}</span>
                  <div className="w-10 h-10 flex items-center justify-center"
                    style={{ background: 'transparent', border: `1px solid var(--border)` }}>
                    <feat.icon size={18} style={{ color: accent }} />
                  </div>
                </div>
                <h3 className="text-3xl md:text-4xl font-bold mb-5 tracking-tight" style={fg}>{feat.title}</h3>
                <p className="text-[16px] leading-relaxed max-w-xl" style={{ color: "var(--muted-foreground)" }}>{feat.body}</p>
              </div>

              <div className="flex-1 w-full">
                {feat.image ? (
                  <div className="relative group">
                    {/* Floating space glow */}
                    <div className="absolute inset-0 bg-[var(--primary)] blur-[80px] opacity-10 group-hover:opacity-30 transition-opacity duration-700 pointer-events-none" />
                    <img src={feat.image} alt={feat.alt || feat.title} 
                      className="relative w-full h-auto transform transition-all duration-700 hover:-translate-y-2 hover:scale-[1.01]" 
                      style={{ 
                        border: "1px solid var(--border)", 
                        boxShadow: "0 20px 40px -10px rgba(0,0,0,0.8), 0 0 30px rgba(0, 229, 255, 0.15)" 
                      }} 
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[300px] relative group">
                    <div className="absolute inset-0 bg-[var(--primary)] blur-[80px] opacity-5 group-hover:opacity-15 transition-opacity duration-700 pointer-events-none" />
                    <feat.icon size={140} style={{ color: "var(--border)", opacity: 0.3 }} className="relative transform transition-all duration-700 hover:-translate-y-2 hover:scale-105" />
                  </div>
                )}
              </div>

            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

/*                  FAQ                 */
const faqData = [
  { q: "What file types can I upload?",                a: "You can upload PDFs, plain text, and markdown files right now. Support for Word documents is coming soon." },
  { q: "How are quiz questions generated?",            a: "We generate every question directly from the notes you upload. We don't use generic question banks, so you only get tested on what's actually in your material." },
  { q: "What is the Learning Playground?",             a: "It's a flexible space where you can just type what you want to review. Whether you need flashcards, a quick summary, or practice questions, we'll build the best tool to help you study." },
  { q: "What is Mind's Mirror?",                      a: "It's a tool that helps you understand how you learn. Instead of just giving you a score, it looks at your mistakes to spot patterns, helping you fix the root problem instead of just guessing." },
  { q: "Is my uploaded content private?",              a: "Yes. We process your documents securely. We never share them or use them to train our models." },
  { q: "Does it work for any subject?",                a: "Yes. If a subject can be written down, we can map it out and test you on it. It works great for everything from medicine to the arts." },
  { q: "Is there a free plan?",                        a: "Yes! You can upload up to 5 documents a month and take quizzes completely free. No credit card required." },
  { q: "How is this different from Anki or Quizlet?",  a: "With Anki and Quizlet, you have to do the heavy lifting of making the cards. We build everything automatically from your notes, adapt to your weak spots, and actually show you how to improve." },
];

// Handles FAQRow logic.
const FAQRow = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <button className="w-full flex items-start justify-between gap-6 py-6 text-left"
        onClick={() => setOpen(o => !o)}>
        <span className="text-[14px] font-semibold leading-snug" style={fg}>{q}</span>
        <ChevronDown size={15} className="mt-0.5 shrink-0 transition-transform duration-200"
          style={{ color: "var(--muted-foreground)", transform: open ? "rotate(180deg)" : "rotate(0deg)" }} />
      </button>
      <div style={{
        maxHeight: open ? "300px" : "0",
        overflow: "hidden",
        transition: "max-height 0.35s cubic-bezier(.16,1,.3,1)",
      }}>
        <p className="text-[14px] leading-relaxed pb-6" style={muted}>{a}</p>
      </div>
    </div>
  );
};

// Handles FAQ logic.
const FAQ = () => (
  <section id="faq" className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-8 pb-32">
    <Reveal>
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 md:gap-20 items-start" style={rule}>
        <div className="pt-8">
          <p className="font-mono text-[11px] uppercase tracking-[.18em] font-semibold mb-3" style={{ color: accent, opacity: 0.75 }}>
            FAQ
          </p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.02]" style={fg}>
            Questions.
          </h2>
        </div>

        <div className="pt-8">
          {faqData.map(item => <FAQRow key={item.q} {...item} />)}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />
        </div>
      </div>
    </Reveal>
  </section>
);

/* ═══════════════════════════════════════════
   FINAL CTA
═══════════════════════════════════════════ */
// Handles FinalCTA logic.
const FinalCTA = () => (
  <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-32">
    <Reveal>
      <div className="relative overflow-hidden px-10 md:px-20 py-20"
        style={{
          background: "var(--background)",
          border: "1px solid var(--border)",
        }}>

        {/* Subtle solid overlay without gradients */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'color-mix(in srgb, var(--background) 92%, var(--primary))' }}
        />

        <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-10 items-center">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[.18em] font-semibold mb-5" style={{ color: accent, opacity: 0.75 }}>
              Get started
            </p>
            <h2 className="text-4xl md:text-[56px] font-black tracking-tight leading-[1.0] mb-5" style={fg}>
              Stop rereading.<br />
              <span style={{ color: accent }}>Start understanding.</span>
            </h2>
            <div className="space-y-4">
              <p className="text-[15px] leading-relaxed max-w-lg" style={muted}>
                Join other students who are turning passive reading into real understanding. It's free to start, and you don't need a credit card.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 shrink-0">
            <Link to="/signup"
              className="inline-flex items-center justify-center gap-2 px-7 py-4 font-mono font-bold text-[15px] transition-all duration-200 uppercase tracking-widest"
              style={{ background: accent, color: "var(--primary-foreground)", border: "1px solid var(--primary)", whiteSpace: "nowrap" }}
              onMouseEnter={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--primary)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--primary)"; e.currentTarget.style.color = "var(--primary-foreground)"; }}>
              Start for free <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </Reveal>
  </section>
);

/* ═══════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════ */
// Handles Footer logic.
const Footer = () => (
  <footer className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-10" style={rule}>
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
      <div>
        <div className="flex items-center gap-2 font-bold text-[14px] tracking-tight mb-1" style={fg}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 50" width="160" height="34">
          <defs>
            <path id="ft-star" d="M 0 -6 L 1.5 -1.5 L 6 0 L 1.5 1.5 L 0 6 L -1.5 1.5 L -6 0 L -1.5 -1.5 Z" fill="currentColor"/>
            <path id="ft-small-star" d="M 0 -4 L 1 -1 L 4 0 L 1 1 L 0 4 L -1 1 L -4 0 L -1 -1 Z" fill="currentColor"/>
          </defs>
          <g transform="translate(10, -5) scale(0.55)">
            <path d="M 30 20 L 20 80 L 65 40 L 60 55 L 70 70 L 100 65" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            <use href="#ft-star" x="30" y="20"/>
            <use href="#ft-star" x="20" y="80"/>
            <use href="#ft-star" x="65" y="40"/>
            <use href="#ft-small-star" x="60" y="55"/>
            <use href="#ft-small-star" x="70" y="70"/>
            <use href="#ft-star" x="100" y="65"/>
          </g>
          <text x="75" y="34" fontFamily="system-ui, -apple-system, sans-serif" fontSize="24" fontWeight="600" fill="currentColor">HydrusLearn</text>
        </svg>
        </div>
        <p className="text-[11px] font-mono" style={{ color: "var(--muted-foreground)", opacity: 0.45 }}>Turn notes into understanding.</p>
      </div>

      <div className="flex flex-wrap gap-8 font-mono text-[11px]" style={{ color: "var(--muted-foreground)", opacity: 0.45 }}>
        <Link to="/privacy" className="hover:opacity-75 transition-opacity">Privacy</Link>
        <Link to="/terms" className="hover:opacity-75 transition-opacity">Terms</Link>
        {["Twitter", "GitHub", "Discord"].map(l => (
          <a key={l} href="#" className="hover:opacity-75 transition-opacity">{l}</a>
        ))}
      </div>

      <p className="font-mono text-[11px]" style={{ color: "var(--muted-foreground)", opacity: 0.3 }}>
        © {new Date().getFullYear()} HydrusLearn
      </p>
    </div>
  </footer>
);

/* ═══════════════════════════════════════════
   PAGE ROOT
═══════════════════════════════════════════ */
// Handles LandingPage logic.
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

    let scriptTag = document.getElementById("landing-seo-schema");
    if (!scriptTag) {
      scriptTag = document.createElement("script");
      scriptTag.type = "application/ld+json";
      scriptTag.id = "landing-seo-schema";
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(buildStructuredData(canonicalUrl));

    return () => {
      document.title = previousTitle;
      managedTags.forEach((entry) => {
        if (entry?.created && entry.tag?.parentNode) {
          entry.tag.parentNode.removeChild(entry.tag);
        }
      });
      if (scriptTag?.parentNode) {
        scriptTag.parentNode.removeChild(scriptTag);
      }
    };
  }, []);

  return (
    <div className="relative min-h-screen" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <DotGrid />
      <main>
        <Hero />
        <HowItWorks />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
