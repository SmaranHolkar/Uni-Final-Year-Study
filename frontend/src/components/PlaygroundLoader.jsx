/**
 * PlaygroundLoader.jsx
 * HydrusLearn SVG logo + sequential step reveal loading screen.
 * Pure CSS — no external animation library.
 */

const STEPS = [
  { icon: '🔍', label: 'Understanding your learning request' },
  { icon: '🎯', label: 'Choosing the best tool format' },
  { icon: '📚', label: 'Planning content and study items' },
  { icon: '✍️', label: 'Writing quiz items & explanations' },
]

// The HydrusLearn logo SVG (constellation + wordmark) adapted for dark bg
function HydrusLearnLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 50" width="180" height="38">
      <defs>
        <path id="pl-star"       d="M 0 -6 L 1.5 -1.5 L 6 0 L 1.5 1.5 L 0 6 L -1.5 1.5 L -6 0 L -1.5 -1.5 Z" />
        <path id="pl-small-star" d="M 0 -4 L 1 -1 L 4 0 L 1 1 L 0 4 L -1 1 L -4 0 L -1 -1 Z" />
      </defs>

      {/* Constellation line — draw-on animation */}
      <g transform="translate(10, -5) scale(0.55)">
        <path
          d="M 30 20 L 20 80 L 65 40 L 60 55 L 70 70 L 100 65"
          fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round"
          strokeDasharray="220" strokeDashoffset="220"
          style={{ animation: 'hl-draw 1.2s ease forwards' }}
        />
        {/* Stars fade in after line draws */}
        {[
          { href: 'pl-star',       x: 30,  y: 20,  delay: '0.6s' },
          { href: 'pl-star',       x: 20,  y: 80,  delay: '0.75s' },
          { href: 'pl-star',       x: 65,  y: 40,  delay: '0.9s' },
          { href: 'pl-small-star', x: 60,  y: 55,  delay: '1.0s' },
          { href: 'pl-small-star', x: 70,  y: 70,  delay: '1.05s' },
          { href: 'pl-star',       x: 100, y: 65,  delay: '1.1s' },
        ].map((s, i) => (
          <use
            key={i}
            href={`#${s.href}`}
            x={s.x} y={s.y}
            fill="var(--primary)"
            style={{ opacity: 0, animation: `hl-pop 0.35s ease ${s.delay} forwards` }}
          />
        ))}
      </g>

      {/* Wordmark — slides in from the right */}
      <text
        x="75" y="34"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="24" fontWeight="600"
        fill="var(--foreground)"
        style={{ opacity: 0, animation: 'hl-fadein 0.5s ease 0.9s forwards' }}
      >
        HydrusLearn
      </text>
    </svg>
  )
}

export default function PlaygroundLoader({ stage, phase }) {
  const isBuilding = phase === 'building'

  return (
    <div style={{
      border: '2px solid var(--primary)',
      background: 'var(--card)',
      borderRadius: '1rem',
      padding: '1.75rem',
      marginBottom: '1.5rem',
      boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      animation: 'hl-mount 0.45s cubic-bezier(0.22,1,0.36,1) both',
    }}>

      {/* ── Logo + stage label ── */}
      <div style={{ marginBottom: '0.6rem' }}>
        <HydrusLearnLogo />
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1.4rem',
      }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: 'var(--foreground)' }}>
            {stage}
          </p>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>
            {isBuilding ? 'Writing your interactive HTML tool…' : 'Analysing your request and planning content'}
          </p>
        </div>

        {/* Bouncing dots */}
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              display: 'block', width: 7, height: 7, borderRadius: '50%',
              background: 'var(--primary)',
              animation: `hl-bounce 1.3s ease-in-out ${i * 0.18}s infinite`,
            }} />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border)', marginBottom: '1.25rem' }} />

      {/* ── Body ── */}
      {isBuilding ? (
        /* Building phase — code scaffold */
        <div style={{
          background: 'oklch(0.11 0.02 240)',
          borderRadius: '0.75rem',
          border: '1px solid var(--border)',
          padding: '1.1rem 1.4rem',
          fontFamily: 'monospace',
          fontSize: '0.82rem',
          lineHeight: '2',
          minHeight: '190px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {[
            { color: '#569cd6', text: '<!DOCTYPE html>',               delay: '0s' },
            { color: '#569cd6', text: '<html lang="en">',              delay: '0.2s' },
            { color: '#9cdcfe', text: '  <head> … </head>',            delay: '0.4s' },
            { color: '#9cdcfe', text: '  <body>',                      delay: '0.6s' },
            { color: '#4ec9b0', text: '    <!-- ✨ generating... -->',  delay: '0.8s', blink: true },
            { color: '#dcdcaa', text: '    <div id="tool-root" />',    delay: '1.0s' },
          ].map((line, i) => (
            <div key={i} style={{
              color: line.color, display: 'flex', gap: '0.75rem',
              opacity: 0,
              animation: `hl-codeline 0.4s ease ${line.delay} forwards`,
            }}>
              <span style={{ color: '#444', minWidth: '1.2rem', textAlign: 'right', userSelect: 'none' }}>
                {i + 1}
              </span>
              <span style={line.blink ? { animation: 'hl-blink 1s step-end infinite' } : {}}>
                {line.text}
              </span>
            </div>
          ))}
          {/* Blinking cursor */}
          <div style={{
            width: 9, height: '1em', marginTop: '0.3rem', marginLeft: '2rem',
            background: 'var(--primary)',
            animation: 'hl-blink 0.9s step-end infinite',
          }} />
        </div>

      ) : (
        /* Planning phase — steps appear ONE BY ONE */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {STEPS.map((step, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.65rem 1rem',
                borderRadius: '0.6rem',
                background: 'var(--background)',
                border: '1px solid var(--border)',
                /* Start invisible, slide in AFTER the previous one has appeared.
                   Each step gets a larger delay so they appear sequentially. */
                opacity: 0,
                animation: `hl-step 0.45s cubic-bezier(0.22,1,0.36,1) ${0.15 + idx * 0.55}s forwards`,
              }}
            >
              <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{step.icon}</span>
              <span style={{ fontSize: '0.88rem', color: 'var(--foreground)', flex: 1 }}>
                {step.label}
              </span>
              {/* Spinner, also delayed to match its card */}
              <span style={{
                display: 'inline-block',
                width: 13, height: 13, borderRadius: '50%',
                border: '2px solid var(--primary)', borderTopColor: 'transparent',
                animation: `hl-spin 0.85s linear ${0.15 + idx * 0.55}s infinite`,
                flexShrink: 0,
                opacity: 0,
                /* Spinner fades in with the card */
                animationFillMode: 'forwards',
              }} />
            </div>
          ))}
        </div>
      )}

      {/* ── Progress bar ── */}
      <div style={{
        marginTop: '1.4rem', height: '4px',
        background: 'var(--muted)', borderRadius: '999px', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: '999px',
          background: 'linear-gradient(90deg, var(--primary), oklch(0.72 0.15 220))',
          boxShadow: '0 0 6px var(--primary)',
          animation: isBuilding ? 'hl-bar2 90s linear forwards' : 'hl-bar1 9s linear forwards',
        }} />
      </div>

      <style>{`
        @keyframes hl-mount    { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes hl-spin     { to{transform:rotate(360deg)} }
        @keyframes hl-bounce   { 0%,100%{transform:translateY(0);opacity:.4} 50%{transform:translateY(-5px);opacity:1} }
        @keyframes hl-step     { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes hl-codeline { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        @keyframes hl-blink    { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes hl-bar1     { from{width:0%} to{width:40%} }
        @keyframes hl-bar2     { from{width:40%} to{width:96%} }
        @keyframes hl-draw     { to{stroke-dashoffset:0} }
        @keyframes hl-pop      { from{opacity:0;transform:scale(0.4)} to{opacity:1;transform:scale(1)} }
        @keyframes hl-fadein   { from{opacity:0} to{opacity:1} }
      `}</style>
    </div>
  )
}
