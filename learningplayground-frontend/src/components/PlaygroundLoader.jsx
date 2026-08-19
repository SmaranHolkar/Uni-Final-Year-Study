import React from 'react'
import Vela from './Vela'

const STEPS = [
  { icon: '🔍', label: 'Analyzing request & domain blueprint' },
  { icon: '🎯', label: 'Selecting optimal pedagogical tool format' },
  { icon: '📚', label: 'Structuring curriculum items & active recall data' },
  { icon: '⚡', label: 'Compiling interactive HTML5 sandbox runtime' },
]

export default function PlaygroundLoader({ stage, phase }) {
  const isBuilding = phase === 'building'

  return (
    <div className="w-full max-w-xl mx-auto rounded-3xl p-6 sm:p-8 bg-[#1A1E24] border border-[#282E38] shadow-2xl shadow-black/50 animate-fade-in relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#5A7D99]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#3D6660]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Vela Mascot Active Loader */}
      <div className="flex flex-col items-center justify-center mb-6 text-center">
        <Vela size={76} loading={true} className="mb-3 drop-shadow-[0_0_15px_rgba(90,125,153,0.35)]" />
        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
          {stage || 'Preparing your study workspace...'}
        </h3>
        <p className="text-xs text-[#8E8E93] mt-1">
          {isBuilding
            ? 'Vela is writing and compiling your interactive HTML tool...'
            : 'Vela is analyzing context and planning high-yield learning content'}
        </p>
      </div>

      <div className="h-px bg-[#282E38] mb-5 w-full" />

      {/* Progress Steps or Code Building Stream */}
      {isBuilding ? (
        <div className="bg-[#131519] rounded-2xl border border-[#282E38] p-4 font-mono text-xs text-[#CDD1D6] leading-relaxed shadow-inner min-h-[160px] relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#282E38] text-[11px] text-[#8E8E93]">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Interactive Tool Compiler Active</span>
          </div>
          {[
            { color: '#569cd6', text: '<!DOCTYPE html>', delay: '0s' },
            { color: '#569cd6', text: '<html lang="en">', delay: '0.15s' },
            { color: '#9cdcfe', text: '  <head> … </head>', delay: '0.3s' },
            { color: '#9cdcfe', text: '  <body>', delay: '0.45s' },
            { color: '#4ec9b0', text: '    <!-- ✨ Assembling interactive widgets -->', delay: '0.6s', blink: true },
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
              <span className="text-[#555] min-w-[1.2rem] text-right select-none">{i + 1}</span>
              <span className={line.blink ? 'animate-pulse' : ''}>{line.text}</span>
            </div>
          ))}
          <div className="w-2 h-4 bg-[#5A7D99] mt-1 ml-7 animate-pulse" />
        </div>
      ) : (
        <div className="space-y-2.5">
          {STEPS.map((step, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-2.5 px-3.5 rounded-xl bg-[#131519] border border-[#282E38]/80 text-xs text-[#ECECF1] transition-all"
              style={{
                opacity: 0,
                animation: `hl-step 0.4s cubic-bezier(0.22,1,0.36,1) ${0.1 + idx * 0.4}s forwards`,
              }}
            >
              <span className="text-base">{step.icon}</span>
              <span className="flex-1 font-medium text-[11px] sm:text-xs text-[#CDD1D6]">{step.label}</span>
              <span
                className="w-3.5 h-3.5 rounded-full border-2 border-[#5A7D99] border-t-transparent animate-spin flex-shrink-0"
                style={{
                  opacity: 0,
                  animation: `hl-spin 0.85s linear ${0.1 + idx * 0.4}s infinite`,
                  animationFillMode: 'forwards',
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Sleek Progress Indicator Bar */}
      <div className="mt-6 h-1.5 w-full bg-[#131519] rounded-full overflow-hidden border border-[#282E38]/60">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#5A7D99] via-[#3D6660] to-[#5A7D99] shadow-sm shadow-[#5A7D99]/40"
          style={{
            animation: isBuilding ? 'hl-bar2 60s linear forwards' : 'hl-bar1 8s ease-out forwards',
          }}
        />
      </div>

      <style>{`
        @keyframes hl-step     { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes hl-codeline { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
        @keyframes hl-spin     { to{transform:rotate(360deg)} }
        @keyframes hl-bar1     { from{width:0%} to{width:45%} }
        @keyframes hl-bar2     { from{width:45%} to{width:98%} }
      `}</style>
    </div>
  )
}
