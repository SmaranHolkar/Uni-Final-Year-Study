import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import learningPlaygroundImg from "../assets/learningplayground.png";
import mindMapImg from "../assets/mindmap.png";
import uploadDocsImg from "../assets/uploaddocs.png";
import mindsMirrorImg from "../assets/mindsmirror.png";
import dashboardImg from "../assets/dashboard.png";
import {
  ArrowRight,
  Sparkles,
  Upload,
  Network,
  Brain,
  BarChart3,
  BookOpen,
  Zap,
  ChevronDown,
  FlaskConical,
  Microscope,
  ClipboardList,
} from "lucide-react";

/* DOT GRID BACKGROUND — Nothing.tech style */
// Handles DotGrid logic.
const DotGrid = () => (
  <div style={{
    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
    zIndex: 0, pointerEvents: "none",
    backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1px)",
    backgroundSize: "28px 28px",
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
const accentDim   = "color-mix(in oklch, var(--primary) 12%, transparent)";
const accentBorder = "color-mix(in oklch, var(--primary) 35%, transparent)";

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
    <section className="relative z-10 flex flex-col justify-center" style={{ minHeight: "calc(100svh - 74px)", marginTop: "74px" }}>
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
            {/* Version badge — Nothing.tech style */}
            <div style={anim(0.02)} className="mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-[11px]"
                style={{ background: accentDim, border: `1px solid ${accentBorder}`, color: accent }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
                Beta · March 2026
              </span>
            </div>

            <h1 className="font-black leading-[0.95] tracking-tight mb-5"
              style={{ ...anim(0.05), fontSize: "clamp(2.6rem, 5vw, 4.5rem)", color: "var(--foreground)" }}>
              Memorising is over.<br />
              <span style={{ color: accent }}>Start understanding.</span>
            </h1>

            <p className="text-[15px] leading-relaxed mb-6 max-w-xl" style={{ ...anim(0.12), ...muted }}>
              Upload any study material. HydrusLearn builds quizzes and mind maps from your actual content, drills you where you're weak, and reflects how you actually think — so you stop rereading and start understanding.
            </p>

            <div className="flex flex-wrap items-center gap-4" style={anim(0.18)}>
              <Link to="/signup"
                className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-[14px] transition-all duration-200"
                style={{ background: accent, color: "var(--primary-foreground)" }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; e.currentTarget.style.boxShadow = "0 0 36px -4px color-mix(in oklch, var(--primary) 55%, transparent)"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.boxShadow = "none"; }}>
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
    </section>
  );
};

/* ═══════════════════════════════════════════
   HOW IT WORKS
═══════════════════════════════════════════ */
// Handles HowItWorks logic.
const HowItWorks = () => {
  const steps = [
    { n: "01", icon: Upload,        title: "Upload anything",       body: "PDF, notes, a paste of text. Any subject. HydrusLearn reads your content in seconds and builds a structured model of the material.", image: uploadDocsImg },
    { n: "02", icon: ClipboardList,  title: "Get targeted quizzes",  body: "Questions come from your exact material — not a generic bank. The system identifies gaps and drills you on the concepts you've misunderstood." },
    { n: "03", icon: Network,        title: "Explore the mind map",  body: "Every concept is extracted and linked into an interactive mind map. See how ideas connect, click any node to expand sub-topics at a glance.", image: mindMapImg },
    { n: "04", icon: Microscope,     title: "Mind's Mirror",         body: "Your metacognitive analysis. HydrusLearn shows you not just what you got wrong — but how you think, where your reasoning patterns break, and what to do about it.", image: mindsMirrorImg },
  ];

  const extras = [
    { n: "05", icon: FlaskConical, title: "Learning Playground", body: "Describe what you want to revise in plain English and the AI picks the best tool for the job — flashcards, study guides, Q&A sets, and more. No image generation yet, but every text-based format is on the table.", image: learningPlaygroundImg },
    { n: "06", icon: BarChart3,    title: "Per-topic progress",  body: "See your performance at concept level — not just a session score. Know exactly which chapters you've nailed and which need another pass.", image: dashboardImg },
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
            Upload your material once. HydrusLearn gives you quizzes, a mind map, a learning playground, and Mind's Mirror — all built from your actual content.
          </p>
        </div>
      </Reveal>

      {/* Core 4-step flow */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px mb-px"
        style={{ background: "var(--border)", outline: "1px solid var(--border)", borderRadius: "16px 16px 0 0", overflow: "hidden" }}>
        {steps.map((step, i) => (
          <Reveal key={step.n} delay={i * 0.07}>
            <div className="p-8 md:p-10 h-full transition-colors duration-300"
              style={{ background: "var(--background)" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--card)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--background)"}>
              <div className="flex items-start justify-between mb-8">
                <span className="inline-block font-mono text-[13px] tracking-widest font-bold px-2 py-0.5 rounded" style={{ color: accent, opacity: 0.9, background: accentDim, border: `1px solid ${accentBorder}` }}>{step.n}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: accentDim, border: `1px solid ${accentBorder}` }}>
                  <step.icon size={15} style={{ color: accent }} />
                </div>
              </div>
              <h3 className="text-[17px] font-bold mb-3 tracking-tight" style={fg}>{step.title}</h3>
              <p className="text-[14px] leading-relaxed" style={muted}>{step.body}</p>
              {step.image && (
                <div className="mt-6 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                  <img src={step.image} alt={step.title} className="w-full h-auto block" style={{ opacity: 0.9 }} />
                </div>
              )}
            </div>
          </Reveal>
        ))}
      </div>

      {/* Also included — supplementary features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px"
        style={{ background: "var(--border)", outline: "1px solid var(--border)", borderRadius: "0 0 16px 16px", overflow: "hidden" }}>
        {extras.map((feat, i) => (
          <Reveal key={feat.title} delay={0.28 + i * 0.07}>
            <div className="p-8 md:p-10 h-full transition-colors duration-300"
              style={{ background: "var(--background)" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--card)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--background)"}>
              <div className="flex items-start justify-between mb-8">
                <span className="inline-block font-mono text-[13px] tracking-widest font-bold px-2 py-0.5 rounded" style={{ color: accent, opacity: 0.9, background: accentDim, border: `1px solid ${accentBorder}` }}>{feat.n}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: accentDim, border: `1px solid ${accentBorder}` }}>
                  <feat.icon size={15} style={{ color: accent }} />
                </div>
              </div>
              <h3 className="text-[17px] font-bold mb-3 tracking-tight" style={fg}>{feat.title}</h3>
              <p className="text-[14px] leading-relaxed" style={muted}>{feat.body}</p>
              {feat.image && (
                <div className="mt-6 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                  <img src={feat.image} alt={feat.title} className="w-full h-auto block" style={{ opacity: 0.9 }} />
                </div>
              )}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

/*                  FAQ                 */
const faqData = [
  { q: "What file types can I upload?",                a: "PDFs are fully supported right now. Plain text and markdown also work. Word doc import is on the roadmap." },
  { q: "How are quiz questions generated?",            a: "Every question is produced from your uploaded material by our AI — not sourced from an external bank. If your notes don't cover a topic, you won't be asked about it." },
  { q: "What is the Learning Playground?",             a: "The Learning Playground lets you create revision tools from plain-English prompts. Just describe what you need — flashcards, a Q&A set, a concept breakdown, or anything else — and the AI picks the most appropriate format and builds it for you. No image generation yet, but all text-based tools are supported." },
  { q: "What is Mind's Mirror?",                      a: "Mind's Mirror is your metacognitive analysis. It goes beyond quiz scores to show you how you think — identifying patterns in your mistakes and reasoning so you can address root causes, not just symptoms." },
  { q: "Is my uploaded content private?",              a: "Yes. Your documents are processed securely and are never used to train our models or shared with any third party." },
  { q: "Does it work for any subject?",                a: "Yes — arts, sciences, law, medicine, social sciences, engineering. If a subject can be written down and structured, HydrusLearn can map it." },
  { q: "Is there a free plan?",                        a: "Yes. The free plan includes 5 uploads per month and 10 quiz questions per session. No credit card required to sign up." },
  { q: "How is this different from Anki or Quizlet?",  a: "Anki and Quizlet require you to create the cards yourself. HydrusLearn generates everything from your uploaded material, maps the concept structure, adapts to where you're actually weak — and then reflects your thinking back to you via Mind's Mirror." },
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
      <div className="relative rounded-2xl overflow-hidden px-10 md:px-20 py-20"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.3)",
        }}>

        {/* Subtle radial accent */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 20% 50%, color-mix(in oklch, var(--primary) 8%, transparent) 0%, transparent 60%)` }} />

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
                Join the students using HydrusLearn to turn passive revision into real, lasting understanding. Free to start — no card needed.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 shrink-0">
            <Link to="/signup"
              className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl font-bold text-[15px] transition-all duration-200"
              style={{ background: accent, color: "var(--primary-foreground)", whiteSpace: "nowrap" }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; e.currentTarget.style.boxShadow = "0 0 40px -6px color-mix(in oklch, var(--primary) 60%, transparent)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.boxShadow = "none"; }}>
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
  return (
    <div className="relative min-h-screen" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <DotGrid />
      <Hero />
      <HowItWorks />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}
