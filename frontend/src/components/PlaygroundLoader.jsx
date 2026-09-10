import { Search, Target, BookOpen, PenTool, CheckCircle2, Code2, Sparkles } from 'lucide-react'

const STEPS = [
  { icon: Search, label: 'Understanding your learning request' },
  { icon: Target, label: 'Choosing the optimal tool format' },
  { icon: BookOpen, label: 'Synthesizing concepts and study items' },
  { icon: PenTool, label: 'Generating interactive items & explanations' },
]

// The HydrusLearn logo SVG (constellation + wordmark) adapted for dark bg
function HydrusLearnLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 42" width="160" height="28" aria-hidden="true">
      <defs>
        <path id="pl-star" d="M 0 -5 L 1.2 -1.2 L 5 0 L 1.2 1.2 L 0 5 L -1.2 1.2 L -5 0 L -1.2 -1.2 Z" />
        <path id="pl-small-star" d="M 0 -3.5 L 0.8 -0.8 L 3.5 0 L 0.8 0.8 L 0 3.5 L -0.8 0.8 L -3.5 0 L -0.8 -0.8 Z" />
      </defs>

      <g transform="translate(6, -6) scale(0.5)">
        <path
          d="M 30 20 L 20 80 L 65 40 L 60 55 L 70 70 L 100 65"
          fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round"
          strokeDasharray="220" strokeDashoffset="220"
          style={{ animation: 'hl-draw 1.2s ease forwards' }}
        />
        {[
          { href: 'pl-star', x: 30, y: 20, delay: '0.6s' },
          { href: 'pl-star', x: 20, y: 80, delay: '0.75s' },
          { href: 'pl-star', x: 65, y: 40, delay: '0.9s' },
          { href: 'pl-small-star', x: 60, y: 55, delay: '1.0s' },
          { href: 'pl-small-star', x: 70, y: 70, delay: '1.05s' },
          { href: 'pl-star', x: 100, y: 65, delay: '1.1s' },
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

      <text
        x="68" y="28"
        fontFamily="var(--font-sans), system-ui, -apple-system, sans-serif"
        fontSize="20" fontWeight="600"
        letterSpacing="-0.02em"
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
      border: '1px solid var(--border)',
      background: 'var(--card)',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      marginBottom: '1.5rem',
      boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      animation: 'hl-mount 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
    }}>
      {/* Logo + stage label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <HydrusLearnLogo />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', animation: 'hl-pulse 1.5s ease infinite' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {isBuilding ? 'Compiling' : 'Synthesizing'}
          </span>
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1.25rem',
      }}>
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', color: 'var(--foreground)', letterSpacing: '-0.01em' }}>
            {stage}
          </p>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
            {isBuilding ? 'Generating custom interactive canvas components...' : 'Analyzing study intent and structuring knowledge framework'}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border)', marginBottom: '1.25rem' }} />

      {/* Body */}
      {isBuilding ? (
        <div style={{
          background: '#0e1117',
          borderRadius: '0.5rem',
          border: '1px solid var(--border)',
          padding: '1rem 1.25rem',
          fontFamily: 'var(--font-mono), monospace',
          fontSize: '0.8rem',
          lineHeight: '1.8',
          minHeight: '180px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {[
            { color: '#569cd6', text: '<!DOCTYPE html>', delay: '0s' },
            { color: '#569cd6', text: '<html lang="en">', delay: '0.15s' },
            { color: '#9cdcfe', text: '  <head> … </head>', delay: '0.3s' },
            { color: '#9cdcfe', text: '  <body class="interactive-tool">', delay: '0.45s' },
            { color: '#4ec9b0', text: '    <!-- Initializing reactive tool root -->', delay: '0.6s', blink: true },
            { color: '#dcdcaa', text: '    <div id="tool-root" />', delay: '0.75s' },
          ].map((line, i) => (
            <div key={i} style={{
              color: line.color, display: 'flex', gap: '0.75rem',
              opacity: 0,
              animation: `hl-codeline 0.3s ease ${line.delay} forwards`,
            }}>
              <span style={{ color: '#4b5563', minWidth: '1.2rem', textAlign: 'right', userSelect: 'none' }}>
                {i + 1}
              </span>
              <span style={line.blink ? { animation: 'hl-blink 1s step-end infinite' } : {}}>
                {line.text}
              </span>
            </div>
          ))}
          <div style={{
            width: '8px', height: '1em', marginTop: '0.25rem', marginLeft: '2rem',
            background: 'var(--primary)',
            animation: 'hl-blink 0.9s step-end infinite',
          }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {STEPS.map((step, idx) => {
            const Icon = step.icon
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '0.5rem',
                  background: 'var(--background)',
                  border: '1px solid var(--border)',
                  opacity: 0,
                  animation: `hl-step 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 + idx * 0.4}s forwards`,
                }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '26px', height: '26px', borderRadius: '6px',
                  background: 'rgba(255,255,255,0.04)', color: 'var(--primary)'
                }}>
                  <Icon size={14} />
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--foreground)', flex: 1 }}>
                  {step.label}
                </span>
                <span style={{
                  display: 'inline-block',
                  width: '12px', height: '12px', borderRadius: '50%',
                  border: '2px solid var(--primary)', borderTopColor: 'transparent',
                  animation: `hl-spin 0.85s linear ${0.1 + idx * 0.4}s infinite`,
                  flexShrink: 0,
                  opacity: 0,
                  animationFillMode: 'forwards',
                }} />
              </div>
            )
          })}
        </div>
      )}

      {/* Progress bar */}
      <div style={{
        marginTop: '1.25rem', height: '3px',
        background: 'var(--border)', borderRadius: '999px', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: '999px',
          background: 'var(--primary)',
          animation: isBuilding ? 'hl-bar2 60s linear forwards' : 'hl-bar1 8s linear forwards',
        }} />
      </div>

      <style>{`
        @keyframes hl-mount    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes hl-spin     { to{transform:rotate(360deg)} }
        @keyframes hl-pulse    { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes hl-step     { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes hl-codeline { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
        @keyframes hl-blink    { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes hl-bar1     { from{width:0%} to{width:45%} }
        @keyframes hl-bar2     { from{width:45%} to{width:96%} }
        @keyframes hl-draw     { to{stroke-dashoffset:0} }
        @keyframes hl-pop      { from{opacity:0;transform:scale(0.5)} to{opacity:1;transform:scale(1)} }
        @keyframes hl-fadein   { from{opacity:0} to{opacity:1} }
      `}</style>
    </div>
  )
}
