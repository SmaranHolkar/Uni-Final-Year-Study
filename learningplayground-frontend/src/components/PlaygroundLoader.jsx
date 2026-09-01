import React from 'react'
import { Search, PositionAlign as Target, OpenBook as BookOpen, Flash as Zap, Compass } from 'iconoir-react'

const STEPS = [
  { icon: Search, label: 'Analyzing topic and study requirements' },
  { icon: Target, label: 'Structuring interactive curriculum and questions' },
  { icon: BookOpen, label: 'Compiling flashcard & active recall dataset' },
  { icon: Zap, label: 'Rendering tool onto interactive canvas' },
]

export default function PlaygroundLoader({ stage, phase }) {
  const isBuilding = phase === 'building'

  return (
    <div className="w-full max-w-lg mx-auto rounded-xl p-6 bg-slate-900 border border-slate-700/80 shadow-lg text-slate-100 animate-fade-in relative">
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-3.5 mb-4 border-b border-slate-800">
        <Compass className="w-4 h-4 text-blue-400 flex-shrink-0" />
        <h3 className="text-sm font-semibold text-white">
          {stage || 'Creating Study Tool...'}
        </h3>
      </div>

      <p className="text-xs text-slate-400 mb-5 leading-relaxed">
        {isBuilding
          ? 'Building the interactive interface and configuring runtime components...'
          : 'Synthesizing key definitions, active recall challenges, and exercises...'}
      </p>

      {/* Progress Steps */}
      <div className="space-y-3">
        {STEPS.map((step, idx) => {
          const Icon = step.icon
          const isDone = isBuilding || idx === 0
          const isCurrent = !isBuilding && idx === 1

          return (
            <div
              key={idx}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                isDone
                  ? 'bg-slate-800/60 border-slate-700/60 text-slate-200'
                  : isCurrent
                  ? 'bg-blue-950/40 border-blue-800/60 text-blue-200'
                  : 'bg-slate-900/40 border-slate-800/40 text-slate-500'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                  isDone
                    ? 'bg-slate-700 text-slate-200'
                    : isCurrent
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-medium">{step.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
