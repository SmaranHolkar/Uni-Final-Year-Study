import React, { useEffect, useRef, useState, useCallback } from "react";
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
  ArrowUpRight,
} from "lucide-react";

/* ═══════════════════════════════════════════
   PARTICLE CANVAS — Bioluminescent abyss
═══════════════════════════════════════════ */
const ParticleCanvas = () => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particles = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w = canvas.offsetWidth;
    let h = canvas.offsetHeight;

    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
    };
    resize();
    window.addEventListener("resize", resize);

    const NUM = 110;
    particles.current = Array.from({ length: NUM }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      alpha: Math.random() * 0.55 + 0.12,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.008 + Math.random() * 0.012,
      color: Math.random() > 0.6 ? "90,125,153" : Math.random() > 0.5 ? "61,102,96" : "74,107,82",
    }));

    // Connection lines
    const drawLines = () => {
      const ps = particles.current;
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const dx = ps[i].x - ps[j].x;
          const dy = ps[i].y - ps[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const a = (1 - dist / 120) * 0.12;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(61,94,122,${a})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(ps[i].x, ps[i].y);
            ctx.lineTo(ps[j].x, ps[j].y);
            ctx.stroke();
          }
        }
      }
    };

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      drawLines();
      particles.current.forEach((p) => {
        p.pulse += p.pulseSpeed;
        const a = p.alpha + Math.sin(p.pulse) * 0.15;
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        glow.addColorStop(0, `rgba(${p.color},${a})`);
        glow.addColorStop(1, `rgba(${p.color},0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${Math.min(a + 0.3, 1)})`;
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
      });
      animRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none", zIndex: 0,
      }}
    />
  );
};

/* ═══════════════════════════════════════════
   SCROLL REVEAL — slide up + fade
═══════════════════════════════════════════ */
const useReveal = (threshold = 0.08) => {
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

const Reveal = ({ children, delay = 0, className = "", dir = "up" }) => {
  const [ref, visible] = useReveal();
  const from = dir === "left" ? "translateX(-40px)" : dir === "right" ? "translateX(40px)" : "translateY(32px)";
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "none" : from,
      transition: `opacity 0.85s cubic-bezier(.16,1,.3,1) ${delay}s, transform 0.85s cubic-bezier(.16,1,.3,1) ${delay}s`,
    }}>
      {children}
    </div>
  );
};

/* ═══════════════════════════════════════════
   SHARED TOKENS
═══════════════════════════════════════════ */
const muted     = { color: "var(--muted-foreground)" };
const fg        = { color: "var(--foreground)" };
const accent    = "var(--primary)";
const accentHex = "#5A7D99";

/* ── Eyebrow dot label ── */
const Eyebrow = ({ children }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
    <span style={{
      width: 7, height: 7, borderRadius: "50%",
      background: "var(--primary)", display: "inline-block", flexShrink: 0,
      boxShadow: "0 0 8px 2px rgba(90,125,153,0.55)",
    }} />
    <span style={{
      fontSize: 11, letterSpacing: "0.16em", fontWeight: 500,
      textTransform: "uppercase", color: "var(--muted-foreground)",
    }}>{children}</span>
  </div>
);

/* ═══════════════════════════════════════════
   SITE CONSTANTS / SEO
═══════════════════════════════════════════ */
const SITE_NAME          = "HydrusLearn";
const LANDING_TITLE      = "HydrusLearn | Turn Your Notes into Quizzes, Mind Maps, and Real Understanding";
const LANDING_DESCRIPTION = "Upload your notes and watch them transform into targeted quizzes and personalised study experiences. HydrusLearn helps you actually understand the material.";
const LANDING_PATH       = "/";

const getBaseUrl = () => typeof window === "undefined" ? "https://hydruslearn.com" : window.location.origin;

const upsertMeta = (nameOrProperty, content, isProperty = false) => {
  if (typeof document === "undefined") return null;
  const attr = isProperty ? "property" : "name";
  let tag = document.head.querySelector(`meta[${attr}="${nameOrProperty}"]`);
  const created = !tag;
  if (!tag) { tag = document.createElement("meta"); tag.setAttribute(attr, nameOrProperty); document.head.appendChild(tag); }
  tag.setAttribute("content", content);
  return { tag, created };
};

const upsertCanonical = (href) => {
  if (typeof document === "undefined") return null;
  let link = document.head.querySelector('link[rel="canonical"]');
  const created = !link;
  if (!link) { link = document.createElement("link"); link.setAttribute("rel", "canonical"); document.head.appendChild(link); }
  link.setAttribute("href", href);
  return { tag: link, created };
};

const faqData = [
  { q: "What file types can I upload?",               a: "You can upload PDFs, plain text, and markdown files right now. Support for Word documents is coming soon." },
  { q: "How are quiz questions generated?",           a: "We generate every question directly from the notes you upload. We don't use generic question banks, so you only get tested on what's actually in your material." },
  { q: "What is the Learning Playground?",            a: "It's a flexible space where you can just type what you want to review. Whether you need flashcards, a quick summary, or practice questions, we'll build the best tool to help you study." },
  { q: "What is Mind's Mirror?",                     a: "It's a tool that helps you understand how you learn. Instead of just giving you a score, it looks at your mistakes to spot patterns, helping you fix the root problem instead of just guessing." },
  { q: "Is my uploaded content private?",             a: "Yes. We process your documents securely. We never share them or use them to train our models." },
  { q: "Does it work for any subject?",               a: "Yes. If a subject can be written down, we can map it out and test you on it. It works great for everything from medicine to the arts." },
  { q: "Is there a free plan?",                       a: "Yes! You can upload up to 5 documents a month and take quizzes completely free. No credit card required." },
  { q: "How is this different from Anki or Quizlet?", a: "With Anki and Quizlet, you have to do the heavy lifting of making the cards. We build everything automatically from your notes, adapt to your weak spots, and actually show you how to improve." },
];

const buildStructuredData = (canonicalUrl) => ([
  // WebSite with SearchAction — enables Google Sitelinks search box
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: canonicalUrl,
    description: LANDING_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${canonicalUrl}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  },
  // Organization — brand entity
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: canonicalUrl,
    logo: `${canonicalUrl}/Hydruslearnfavicon.png`,
    contactPoint: { "@type": "ContactPoint", email: "support@hydruslearn.com", contactType: "customer support" },
    sameAs: [],
  },
  // SoftwareApplication — rich result in search
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "GBP", availability: "https://schema.org/InStock" },
    url: canonicalUrl,
    description: LANDING_DESCRIPTION,
    keywords: "quiz generator, AI study tool, flashcards, PDF to quiz, metacognitive learning, mind maps, HydrusLearn",
    featureList: "PDF upload, AI quiz generation, Learning Playground, Mind's Mirror, Marketplace",
  },
  // FAQPage — enables FAQ rich results directly in Google SERP
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqData.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  },
]);


/* ═══════════════════════════════════════════
   ANIMATED COUNTER
═══════════════════════════════════════════ */
const Counter = ({ to, suffix = "", duration = 1800 }) => {
  const [val, setVal] = useState(0);
  const [ref, visible] = useReveal(0.3);
  const started = useRef(false);
  useEffect(() => {
    if (!visible || started.current) return;
    started.current = true;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(to * ease));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [visible, to, duration]);
  return <span ref={ref}>{val}{suffix}</span>;
};

/* ═══════════════════════════════════════════
   HERO
═══════════════════════════════════════════ */
const Hero = () => {
  const [on, setOn] = useState(false);
  useEffect(() => { setTimeout(() => setOn(true), 80); }, []);
  const anim = (d = 0) => ({
    opacity: on ? 1 : 0,
    transform: on ? "none" : "translateY(28px)",
    transition: `opacity 1s cubic-bezier(.16,1,.3,1) ${d}s, transform 1s cubic-bezier(.16,1,.3,1) ${d}s`,
  });

  return (
    <header style={{
      position: "relative", minHeight: "100vh",
      display: "flex", flexDirection: "column", justifyContent: "center",
      overflow: "hidden", paddingTop: 80,
    }}>
      <ParticleCanvas />

      {/* radial glow behind text */}
      <div style={{
        position: "absolute", top: "40%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 700, height: 500,
        background: "radial-gradient(ellipse, rgba(61,102,96,0.18) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 1,
      }} />

      <div style={{ position: "relative", zIndex: 2, maxWidth: 860, margin: "0 auto", padding: "0 32px", width: "100%" }}>
        {/* eyebrow */}
        <div style={anim(0)}>
          <Eyebrow>Study Tool · 2026 · Early Access</Eyebrow>
        </div>

        {/* headline */}
        <h1 style={{
          ...anim(0.08),
          fontSize: "clamp(3rem, 7vw, 5.5rem)",
          lineHeight: 1.0,
          letterSpacing: "-0.03em",
          fontFamily: "var(--font-serif)",
          fontWeight: 400,
          color: "var(--foreground)",
          marginBottom: 28,
          maxWidth: 820,
        }}>
          Stop Memorising.<br />
          <span style={{
            background: "linear-gradient(90deg, #5A7D99 0%, #8eb8d4 50%, #5A9990 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            Start Understanding.
          </span>
        </h1>

        {/* sub */}
        <p style={{
          ...anim(0.16), ...muted,
          fontSize: 17, lineHeight: 1.7, maxWidth: 520, marginBottom: 40,
        }}>
          Upload your notes and watch them transform into quizzes and deep study support. HydrusLearn figures out what you're missing — not just what you can cram.
        </p>

        {/* CTAs */}
        <div style={{ ...anim(0.24), display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 64 }}>
          <Link to="/signup"
            id="hero-cta-primary"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "14px 28px", borderRadius: 6,
              background: "linear-gradient(90deg, #3D6660 0%, #5A7D99 100%)",
              color: "#fff", fontWeight: 500, fontSize: 13,
              letterSpacing: "0.12em", textTransform: "uppercase",
              border: "none", cursor: "pointer", textDecoration: "none",
              transition: "opacity 0.2s, transform 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "none"; }}
            aria-label="Start learning for free with HydrusLearn"
          >
            Start free <ArrowUpRight size={15} />
          </Link>
          <a href="#how-it-works"
            id="hero-cta-secondary"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "14px 24px", borderRadius: 6,
              background: "transparent", color: "var(--foreground)",
              fontWeight: 500, fontSize: 13, letterSpacing: "0.12em",
              textTransform: "uppercase", textDecoration: "none",
              border: "1px solid var(--border)",
              transition: "border-color 0.2s, transform 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = accentHex; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none"; }}
          >
            See how it works <ChevronDown size={14} />
          </a>
        </div>

        {/* stat strip */}
        <div style={{
          ...anim(0.32),
          display: "flex", flexWrap: "wrap", gap: "36px 48px",
          borderTop: "1px solid var(--border)", paddingTop: 28,
        }}>
          {[
            { n: 5, suf: " tools",    label: "in one system" },
            { n: 100, suf: "%",       label: "from your own notes" },
            { n: 0, suf: " card",     label: "required to start" },
          ].map(({ n, suf, label }) => (
            <div key={label}>
              <div style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontFamily: "var(--font-serif)", color: "var(--foreground)", lineHeight: 1, letterSpacing: "-0.02em" }}>
                <Counter to={n} suffix={suf} />
              </div>
              <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", ...muted, marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
};

/* ═══════════════════════════════════════════
   HOW IT WORKS
═══════════════════════════════════════════ */
const tools = [
  { n: "01", icon: Upload,        title: "Upload PDF",          body: "Drop in your PDF notes and we'll process them in seconds.", image: uploadDocsImg, alt: "Upload PDF notes to start a study session" },
  { n: "02", icon: ClipboardList, title: "Quiz",                body: "Get targeted quiz questions from your own material so you can spot knowledge gaps fast." },
  { n: "03", icon: FlaskConical,  title: "Learning Playground", body: "Practice in the way that works best for you — flashcards, study guides, and quick Q&A in one place.", image: learningPlaygroundImg, alt: "Learning Playground with flexible study tools" },
  { n: "04", icon: Microscope,    title: "Mind's Mirror",       body: "Get a metacognitive breakdown of your mistakes so you can improve how you think, not just what you remember.", image: mindsMirrorImg, alt: "Mind's Mirror metacognitive analysis view" },
  { n: "05", icon: Store,         title: "Marketplace",         body: "Discover and reuse tools shared by other learners, then fork what works and make it your own." },
];

const FeatureRow = ({ feat, i }) => {
  const [hovered, setHovered] = useState(false);
  const isEven = i % 2 === 0;

  return (
    <Reveal delay={0.05} dir={isEven ? "left" : "right"}>
      <div style={{
        display: "flex", flexDirection: "column", gap: 40,
        alignItems: "center",
      }}
        className={`md:flex-row${!isEven ? " md:flex-row-reverse" : ""}`}
      >
        {/* text side */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <span style={{
              fontSize: 11, letterSpacing: "0.2em", fontWeight: 500,
              color: accentHex, textTransform: "uppercase",
            }}>{feat.n}</span>
            <div style={{
              width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid var(--border)", borderRadius: 6,
              transition: "border-color 0.2s, background 0.2s",
              background: hovered ? "rgba(61,102,96,0.15)" : "transparent",
              borderColor: hovered ? accentHex : "var(--border)",
            }}>
              <feat.icon size={16} style={{ color: accentHex }} />
            </div>
          </div>
          <h3 style={{
            fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", fontFamily: "var(--font-serif)",
            fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.1,
            color: "var(--foreground)", marginBottom: 16,
          }}>{feat.title}</h3>
          <p style={{ fontSize: 15, lineHeight: 1.7, ...muted, maxWidth: 440 }}>{feat.body}</p>
        </div>

        {/* visual side */}
        <div style={{ flex: 1, width: "100%" }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {feat.image ? (
            <div style={{ position: "relative", overflow: "hidden", borderRadius: 16 }}>
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1, borderRadius: 16,
                boxShadow: hovered ? `inset 0 0 0 1px ${accentHex}` : "inset 0 0 0 1px var(--border)",
                transition: "box-shadow 0.4s",
              }} />
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: `radial-gradient(ellipse at 50% 0%, rgba(61,102,96,${hovered ? 0.18 : 0.06}) 0%, transparent 70%)`,
                transition: "background 0.5s", zIndex: 1,
              }} />
              <img
                src={feat.image} alt={feat.alt || feat.title}
                style={{
                  width: "100%", height: "auto", display: "block",
                  transform: hovered ? "scale(1.015) translateY(-2px)" : "scale(1)",
                  transition: "transform 0.5s cubic-bezier(.16,1,.3,1)",
                  filter: hovered ? "brightness(1.05)" : "brightness(0.95) saturate(0.9)",
                }}
              />
            </div>
          ) : (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              minHeight: 280, borderRadius: 16, border: "1px solid var(--border)",
              background: "var(--surface)", position: "relative", overflow: "hidden",
              transition: "border-color 0.3s",
              borderColor: hovered ? accentHex : "var(--border)",
            }}>
              <div style={{
                position: "absolute", inset: 0,
                background: `radial-gradient(ellipse at 50% 50%, rgba(61,102,96,${hovered ? 0.2 : 0.06}) 0%, transparent 65%)`,
                transition: "background 0.5s",
              }} />
              <feat.icon
                size={120}
                style={{
                  color: "var(--border)", opacity: hovered ? 0.45 : 0.22,
                  transform: hovered ? "scale(1.06) translateY(-4px)" : "scale(1)",
                  transition: "transform 0.5s cubic-bezier(.16,1,.3,1), opacity 0.4s",
                  position: "relative",
                }}
              />
            </div>
          )}
        </div>
      </div>
    </Reveal>
  );
};

const HowItWorks = () => (
  <section id="how-it-works" style={{ padding: "120px 32px", maxWidth: 1100, margin: "0 auto" }}>
    <Reveal>
      <div style={{ marginBottom: 80 }}>
        <Eyebrow>How it works</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}
          className="md:grid-cols-[auto_1fr]"
        >
          <h2 style={{
            fontSize: "clamp(2.4rem, 5vw, 4rem)", fontFamily: "var(--font-serif)",
            fontWeight: 400, letterSpacing: "-0.025em", lineHeight: 1.05,
            color: "var(--foreground)", margin: 0,
          }}>Five tools.<br />One system.</h2>
          <p style={{
            fontSize: 15, lineHeight: 1.75, ...muted, maxWidth: 440,
            display: "flex", alignItems: "flex-end", paddingBottom: 4,
          }}>
            One flow: upload your PDF, take a quiz, practise in the Learning Playground, reflect with Mind's Mirror, and explore the Marketplace.
          </p>
        </div>
      </div>
    </Reveal>

    <div style={{ display: "flex", flexDirection: "column", gap: 100 }}>
      {tools.map((feat, i) => <FeatureRow key={feat.n} feat={feat} i={i} />)}
    </div>
  </section>
);

/* ═══════════════════════════════════════════
   FAQ
═══════════════════════════════════════════ */
const FAQRow = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: "1px solid var(--border)" }}>
      <button
        style={{
          width: "100%", display: "flex", alignItems: "flex-start",
          justifyContent: "space-between", gap: 20, padding: "22px 0",
          textAlign: "left", background: "none", border: "none", cursor: "pointer",
        }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4, color: "var(--foreground)", letterSpacing: "0.01em" }}>{q}</span>
        <div style={{
          width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          transition: "border-color 0.2s, background 0.2s",
          background: open ? "rgba(61,102,96,0.15)" : "transparent",
          borderColor: open ? accentHex : "var(--border)",
        }}>
          <ChevronDown size={14} style={{
            color: "var(--muted-foreground)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.3s cubic-bezier(.16,1,.3,1)",
          }} />
        </div>
      </button>
      <div style={{
        maxHeight: open ? 240 : 0, overflow: "hidden",
        transition: "max-height 0.4s cubic-bezier(.16,1,.3,1)",
      }}>
        <p style={{ fontSize: 14, lineHeight: 1.7, paddingBottom: 22, ...muted }}>{a}</p>
      </div>
    </div>
  );
};

const FAQ = () => (
  <section id="faq" style={{
    padding: "120px 32px",
    borderTop: "1px solid var(--border)",
    borderBottom: "1px solid var(--border)",
    background: "var(--surface)",
  }}>
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <Reveal>
        <div style={{ display: "grid", gap: 60, marginBottom: 0 }}
          className="md:grid-cols-[280px_1fr]"
        >
          <div>
            <Eyebrow>FAQ</Eyebrow>
            <h2 style={{
              fontSize: "clamp(2rem, 4vw, 3rem)", fontFamily: "var(--font-serif)",
              fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.05,
              color: "var(--foreground)", margin: 0,
            }}>Questions.</h2>
          </div>

          <div>
            {faqData.map(item => <FAQRow key={item.q} {...item} />)}
            <div style={{ borderTop: "1px solid var(--border)" }} />
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

/* ═══════════════════════════════════════════
   ANIMATED BORDER GLOW — CTA
═══════════════════════════════════════════ */
const GlowBorder = () => {
  const ref = useRef(null);
  useEffect(() => {
    let angle = 0;
    const tick = () => {
      angle = (angle + 0.6) % 360;
      if (ref.current) {
        ref.current.style.background =
          `conic-gradient(from ${angle}deg, #3D6660, #5A7D99, #4A6B52, #3D5E7A, #3D6660)`;
      }
      requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div ref={ref} style={{
      position: "absolute", inset: -2, borderRadius: 20, zIndex: 0,
    }} />
  );
};

/* ═══════════════════════════════════════════
   FINAL CTA
═══════════════════════════════════════════ */
const FinalCTA = () => (
  <section style={{ padding: "140px 32px" }}>
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <Reveal>
        <div style={{ position: "relative", borderRadius: 20, isolation: "isolate" }}>
          <GlowBorder />
          <div style={{
            position: "relative", zIndex: 1, borderRadius: 18,
            background: "var(--surface)", padding: "clamp(40px, 6vw, 80px)",
            overflow: "hidden",
          }}>
            {/* inner glow */}
            <div style={{
              position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)",
              width: 500, height: 300,
              background: "radial-gradient(ellipse, rgba(61,102,96,0.22) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />

            <div style={{ position: "relative", display: "grid", gap: "clamp(32px, 5vw, 60px)", alignItems: "center" }}
              className="md:grid-cols-[1fr_auto]"
            >
              <div>
                <Eyebrow>Get started</Eyebrow>
                <h2 style={{
                  fontSize: "clamp(2rem, 5vw, 3.8rem)", fontFamily: "var(--font-serif)",
                  fontWeight: 400, letterSpacing: "-0.025em", lineHeight: 1.05,
                  color: "var(--foreground)", marginBottom: 20,
                }}>
                  Stop rereading.<br />
                  <span style={{
                    background: "linear-gradient(90deg, #5A7D99 0%, #8eb8d4 50%, #5A9990 100%)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                  }}>Start understanding.</span>
                </h2>
                <p style={{ fontSize: 15, lineHeight: 1.7, ...muted, maxWidth: 480 }}>
                  Join other students who are turning passive reading into real understanding. Free to start — no credit card required.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, flexShrink: 0 }}>
                <Link to="/signup"
                  id="cta-signup-btn"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
                    padding: "15px 32px", borderRadius: 6,
                    background: "linear-gradient(90deg, #3D6660 0%, #5A7D99 100%)",
                    color: "#fff", fontWeight: 500, fontSize: 13,
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    textDecoration: "none", transition: "opacity 0.2s, transform 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "none"; }}
                >
                  Start for free <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

/* ═══════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════ */
const Footer = () => (
  <footer style={{
    borderTop: "1px solid var(--border)",
    padding: "40px 32px",
    maxWidth: 1100, margin: "0 auto",
  }}>
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 24 }}>
      <div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 50" width="160" height="34">
          <defs>
            <path id="ft-star" d="M 0 -6 L 1.5 -1.5 L 6 0 L 1.5 1.5 L 0 6 L -1.5 1.5 L -6 0 L -1.5 -1.5 Z" fill="currentColor"/>
            <path id="ft-small-star" d="M 0 -4 L 1 -1 L 4 0 L 1 1 L 0 4 L -1 1 L -4 0 L -1 -1 Z" fill="currentColor"/>
          </defs>
          <g transform="translate(10, -5) scale(0.55)">
            <path d="M 30 20 L 20 80 L 65 40 L 60 55 L 70 70 L 100 65" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            <use href="#ft-star" x="30" y="20"/><use href="#ft-star" x="20" y="80"/>
            <use href="#ft-star" x="65" y="40"/><use href="#ft-small-star" x="60" y="55"/>
            <use href="#ft-small-star" x="70" y="70"/><use href="#ft-star" x="100" y="65"/>
          </g>
          <text x="75" y="34" fontFamily="DM Serif Display, serif" fontSize="24" fontWeight="400" fill="currentColor">HydrusLearn</text>
        </svg>
        <p style={{ fontSize: 11, color: "var(--muted-foreground)", opacity: 0.4, marginTop: 4 }}>Turn notes into understanding.</p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 28px", fontSize: 11, color: "var(--muted-foreground)", opacity: 0.4 }}>
        <Link to="/privacy" style={{ color: "inherit", textDecoration: "none" }}>Privacy</Link>
        <Link to="/terms" style={{ color: "inherit", textDecoration: "none" }}>Terms</Link>
        {["Twitter", "GitHub", "Discord"].map(l => <a key={l} href="#" style={{ color: "inherit", textDecoration: "none" }}>{l}</a>)}
      </div>

      <p style={{ fontSize: 11, color: "var(--muted-foreground)", opacity: 0.28 }}>
        © {new Date().getFullYear()} HydrusLearn
      </p>
    </div>
  </footer>
);

/* ═══════════════════════════════════════════
   PAGE ROOT
═══════════════════════════════════════════ */
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
        if (entry?.created && entry.tag?.parentNode) entry.tag.parentNode.removeChild(entry.tag);
      });
      if (scriptTag?.parentNode) scriptTag.parentNode.removeChild(scriptTag);
    };
  }, []);

  return (
    <div style={{ background: "var(--background)", color: "var(--foreground)", minHeight: "100vh" }}>
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
