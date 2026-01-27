
import React from "react";
import { Link } from "react-router-dom";
import Card from "./cards.jsx";

export default function Hero() {
  return (
    <main style={{ background: "var(--background)", minHeight: "100vh" }}>
      <section className="hero-section" style={{ position: 'relative' }}>
        <div className="hero-container" style={{ position: 'relative', zIndex: 2, marginTop: '5.5rem' }}>
          <h1 className="hero-title" style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1.2rem', letterSpacing: '-1px' }}>
            Unlock Your Potential<br />
            <span style={{ color: '#6366f1' }}>with AI-Powered Learning</span>
          </h1>
          <p className="hero-subtitle" style={{ fontSize: '1.25rem', marginBottom: '2.2rem', color: '#64748b' }}>
            Visualize, interact, and master your subjects with mind maps, adaptive quizzes, and real-time insights.<br />
            <span style={{ color: '#6366f1', fontWeight: 600 }}>Study smarter, not harder.</span>
          </p>
          <Link to="/signup" className="shadow__btn hero-cta" style={{ fontSize: '1.15rem', padding: '1rem 2.5rem', background: 'linear-gradient(90deg,#6366f1,#60a5fa)', color: '#fff', borderRadius: '2rem', fontWeight: 700, boxShadow: '0 4px 24px #6366f133', marginBottom: '2.5rem' }}>
            Get Started Free
          </Link>

          <div className="hero-features" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2.5rem', marginTop: '2.5rem' }}>
            <FeatureCard
              icon={<svg width="36" height="36" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#6366f1" opacity="0.15"/><path d="M12 7v5l3 3" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              title="Interactive Mind Maps"
              desc="See connections, not just facts. Build and explore visual topic maps."
            />
            <FeatureCard
              icon={<svg width="36" height="36" fill="none" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="10" rx="5" fill="#60a5fa" opacity="0.15"/><path d="M7 12h10" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/></svg>}
              title="Adaptive Quizzes"
              desc="Test your knowledge with quizzes that adapt to your strengths and weaknesses."
            />
            <FeatureCard
              icon={<svg width="36" height="36" fill="none" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="8" fill="#6366f1" opacity="0.15"/><path d="M12 8v4l3 3" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              title="Real-Time Insights"
              desc="Track your progress and get instant feedback to stay motivated."
            />
          </div>
        </div>
      </section>


      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "3rem 1rem 2rem 1rem", display: "flex", flexWrap: "wrap", gap: "2.5rem", justifyContent: "center" }}>
        <Card
          title="How It Works"
          description="Start by signing up, drop in your PDFs from class, and let our AI generate a quiz and a personalized mind map and track your progress."
          image="/public/how-it-works.svg"
        />
        <Card
          title="Why HydrusLearn?"
          description="We combine adaptive quizzes, visual learning and real-time feedback to help you truly understand, not just memorize."
          image="/public/why-us.svg"
        />
        <Card
          title="Get Started"
          description="Create your free account and unlock a smarter way to study."
          image="/public/get-started.svg"
        >
          <Link to="/signup" className="shadow__btn" style={{ marginTop: 16, display: "inline-block" }}>Sign Up Free</Link>
        </Card>
      </section>



      <section style={{ background: "#6366f1", color: "#fff", padding: "3rem 1rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 12 }}>Ready to transform your learning?</h2>
        <p style={{ fontSize: "1.15rem", marginBottom: 24 }}>Join students using HydrusLearn to master their subjects with confidence.</p>
        <Link to="/signup" className="shadow__btn" style={{ background: "#fff", color: "#6366f1", fontWeight: 700, fontSize: "1.1rem", borderRadius: "2rem", padding: "0.9rem 2.2rem" }}>Get Started</Link>
      </section>



      <footer style={{ textAlign: "center", padding: "2rem 0 1rem 0", color: "#64748b", fontSize: "0.98rem" }}>
        &copy; {new Date().getFullYear()} HydrusLearn. All rights reserved.
      </footer>
    </main>
  );
}


function FeatureCard({ icon, title, desc }) {
  return (
    <div style={{ background: '#fff', borderRadius: '1.2rem', boxShadow: '0 2px 16px #6366f122', padding: '1.5rem 1.7rem', minWidth: 220, maxWidth: 260, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.7rem' }}>
      <div style={{ marginBottom: '0.5rem' }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e293b' }}>{title}</div>
      <div style={{ color: '#64748b', fontSize: '0.98rem' }}>{desc}</div>
    </div>
  );
}

function PricingTier({ name, price, features, highlight }) {
  const lightBg = highlight
    ? 'linear-gradient(100deg,#f1f5ff 60%,#e0e7ff 100%)'
    : 'var(--card, #fff)';
  const darkText = 'var(--foreground, #1e293b)';
  return (
    <div style={{
      background: lightBg,
      color: darkText,
      borderRadius: '1.2rem',
      boxShadow: highlight ? '0 4px 32px #6366f144' : '0 2px 16px #6366f122',
      padding: '2.2rem 2rem',
      minWidth: 240,
      maxWidth: 320,
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1.1rem',
      border: highlight ? '2.5px solid #6366f1' : '1px solid var(--border, #e5e7eb)',
      transform: highlight ? 'scale(1.05)' : 'none',
      zIndex: highlight ? 1 : 0,
      position: 'relative',
    }}>
      <div style={{ fontWeight: 700, fontSize: '1.3rem', marginBottom: 8 }}>{name}</div>
      <div style={{ fontWeight: 800, fontSize: '2.1rem', marginBottom: 8 }}>{price}</div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: 16, textAlign: 'left', color: darkText }}>
        {features.map((f, i) => (
          <li key={i} style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#6366f1', fontWeight: 700 }}>•</span> {f}
          </li>
        ))}
      </ul>
      <button style={{
        background: 'linear-gradient(90deg,#6366f1,#60a5fa)',
        color: '#fff',
        fontWeight: 700,
        fontSize: '1.05rem',
        borderRadius: '2rem',
        padding: '0.7rem 2.2rem',
        border: 'none',
        boxShadow: highlight ? '0 2px 12px #6366f144' : '0 2px 8px #6366f122',
        cursor: 'pointer',
        marginTop: 8,
        transition: 'background 0.2s, color 0.2s',
      }}>Choose {name}</button>
      {highlight && <span style={{ position: 'absolute', top: 18, right: 18, background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: '0.85rem', borderRadius: '1rem', padding: '0.2rem 0.8rem', boxShadow: '0 1px 4px #6366f122' }}>Most Popular</span>}
    </div>
  );
}
