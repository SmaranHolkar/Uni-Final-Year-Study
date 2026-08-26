import React from 'react'
import { Search, Target, BookOpen, Zap, Terminal, Cpu } from 'lucide-react'

const STEPS = [
  { icon: Search, label: 'Parsing specification & source vector space' },
  { icon: Target, label: 'Synthesizing pedagogical interaction model' },
  { icon: BookOpen, label: 'Compiling curriculum AST & active recall dataset' },
  { icon: Zap, label: 'Mounting sandboxed HTML5 runtime into canvas' },
]

export default function PlaygroundLoader({ stage, phase }) {
  const isBuilding = phase === 'building'

  return (
    <div className="w-full max-w-xl mx-auto rounded-[8px] p-5 sm:p-6 bg-[#011d1c] border border-[rgba(0,130,124,0.3)] shadow-2xl shadow-black/50 animate-fade-in relative overflow-hidden">
      {/* Header Telemetry Bar */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[rgba(0,130,124,0.2)]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#CBFFFC]" />
          <span className="font-mono text-xs uppercase tracking-widest text-[#edfffe] font-semibold">
            COMPILER HUD // RUNTIME SYNTHESIS
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#707777]">
          <Cpu className="w-3.5 h-3.5 text-[#00827C]" />
          <span>AST ENGINE</span>
        </div>
      </div>

      {/* Active Stage Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-[#00827C] animate-ping" />
          <h3 className="font-mono text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
            {stage || 'Initializing Sandbox Compiler...'}
          </h3>
        </div>
        <p className="font-mono text-[11px] text-[#bbc7c6]">
          {isBuilding
            ? 'Compiling sandbox HTML5/JS runtime and mounting components...'
            : 'Evaluating token embeddings and generating question matrices...'}
        </p>
      </div>

      {/* Compiler Code Stream or Pipeline Steps */}
      {isBuilding ? (
        <div className="bg-[#012624] rounded-[6px] border border-[rgba(0,130,124,0.25)] p-3.5 font-mono text-xs text-[#edfffe] leading-relaxed shadow-inner min-h-[140px] relative overflow-hidden">
          <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-[rgba(0,130,124,0.2)] text-[10px] text-[#707777]">
            <span className="flex items-center gap-1.5 text-[#CBFFFC]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00827C] animate-pulse" />
              EMBED_STREAM &gt; ACTIVE
            </span>
            <span>MEM: 32MB // VIRTUAL DOM</span>
          </div>
          {[
            { color: '#569cd6', text: '<!DOCTYPE html>', delay: '0s' },
            { color: '#569cd6', text: '<html lang="en">', delay: '0.15s' },
            { color: '#9cdcfe', text: '  <head> … <style>/* Auros Dark Shell */</style> </head>', delay: '0.3s' },
            { color: '#9cdcfe', text: '  <body>', delay: '0.45s' },
            { color: '#4ec9b0', text: '    <!-- Compiling interactive cognitive state machine -->', delay: '0.6s', blink: true },
            { color: '#dcdcaa', text: '    <div id="learning-canvas-root" />', delay: '0.75s' },
          ].map((line, i) => (
            <div
              key={i}
              style={{
                color: line.color,
                display: 'flex',
                gap: '0.75rem',
                opacity: 0,
                animation: `hl-codeline 0.35s ease ${line.delay} forwards`,
              }}
            >
              <span className="text-[#555] min-w-[1.2rem] text-right select-none font-mono text-[10px]">{i + 1}</span>
              <span className={line.blink ? 'animate-pulse font-semibold' : ''}>{line.text}</span>
            </div>
          ))}
          <div className="w-2 h-3.5 bg-[#00827C] mt-1 ml-7 animate-pulse" />
        </div>
      ) : (
        <div className="space-y-2">
          {STEPS.map((step, idx) => {
            const IconComp = step.icon
            return (
              <div
                key={idx}
                className="flex items-center gap-2.5 p-2 px-3 rounded-[6px] bg-[#012624] border border-[rgba(0,130,124,0.22)] text-xs text-[#edfffe] transition-all"
                style={{
                  opacity: 0,
                  animation: `hl-step 0.4s cubic-bezier(0.22,1,0.36,1) ${0.1 + idx * 0.4}s forwards`,
                }}
              >
                <IconComp className="w-3.5 h-3.5 text-[#CBFFFC] flex-shrink-0" />
                <span className="flex-1 font-mono text-[11px] text-[#bbc7c6]">{step.label}</span>
                <span
                  className="w-3 h-3 rounded-full border-2 border-[#00827C] border-t-transparent animate-spin flex-shrink-0"
                  style={{
                    opacity: 0,
                    animation: `hl-spin 0.85s linear ${0.1 + idx * 0.4}s infinite`,
                    animationFillMode: 'forwards',
                  }}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Progress Telemetry Bar */}
      <div className="mt-4 h-1.5 w-full bg-[#012624] rounded-[3px] overflow-hidden border border-[rgba(0,130,124,0.2)]">
        <div
          className="h-full rounded-[3px] bg-gradient-to-r from-[#00827C] via-[#CBFFFC] to-[#FAD1FF]"
          style={{
            animation: isBuilding ? 'hl-bar2 60s linear forwards' : 'hl-bar1 8s ease-out forwards',
          }}
        />
      </div>

      <style>{`
        @keyframes hl-step     { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes hl-codeline { from{opacity:0;transform:translateX(-4px)} to{opacity:1;transform:translateX(0)} }
        @keyframes hl-spin     { to{transform:rotate(360deg)} }
        @keyframes hl-bar1     { from{width:0%} to{width:45%} }
        @keyframes hl-bar2     { from{width:45%} to{width:98%} }
      `}</style>
    </div>
  )
}
