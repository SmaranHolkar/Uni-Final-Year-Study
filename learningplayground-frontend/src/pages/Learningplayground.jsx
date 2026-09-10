import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { ReactFlow, Background, Controls, MiniMap, useNodesState, ReactFlowProvider, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Link, useLocation } from 'react-router-dom'
import {
  Send,
  LightBulb as Lightbulb,
  GraphUp as TrendingUp,
  WarningCircle as AlertCircle,
  X,
  Bookmark,
  Expand as Maximize2,
  Compress as Minimize2,
  Wrench,
  Trash as Trash2,
  Plus,
  Search,
  SidebarExpand as PanelLeft,
  SidebarCollapse as PanelLeftClose,
  LayoutRight as PanelRight,
  LayoutLeft as PanelRightClose,
  ChatBubble as MessageSquare,
  Play,
  ShareAndroid as Share2,
  Globe,
  Check,
  Flash as Zap,
  Attachment as Paperclip,
  Page as FileText,
  Upload,
  LogOut,
  Clock,
  VideoCamera as Video,
  Microphone as Mic,
  MicrophoneMute as MicOff,
  MediaImage as Image,
  Camera,
  EditPencil as Edit3,
  FloppyDisk as Save,
  OpenBook as BookOpen,
  BookStack as Layers,
  FireFlame as Flame,
  Restart as RotateCcw,
  CheckCircle as CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  GitFork,
  OpenNewWindow as ExternalLink,
  Eye,
  Label as Tag,
  Download,
  Printer,
  Copy,
  Shuffle,
  SoundHigh as Volume2,
  Timer,
  Package,
  Brain,
  CheckSquare,
  Compass,
  Weight as Scale,
  PageEdit as SquarePen,
  Folder,
  Pin,
  Voice as AudioLines,
  MoreHoriz as MoreHorizontal,
  Activity,
  PositionAlign as Target,
  Minus,
  Filter,
  Refresh as RefreshCw,
} from 'iconoir-react'
import { useAuth } from '../AuthContext'
import Vela from '../components/Vela'
import PlaygroundLoader from '../components/PlaygroundLoader'
import CitationSplitViewer from '../components/CitationSplitViewer'
import { morphToolToHtml } from '../utils/toolMorpher'

const defaultSuggestions = [
  {
    id: 1,
    icon: Lightbulb,
    title: 'Create a study plan',
    prompt: 'Help me create a structured study plan for my upcoming exams.',
    tag: 'Planning',
  },
  {
    id: 2,
    icon: TrendingUp,
    title: 'Practice flashcards',
    prompt: 'Generate practice flashcards on concepts I recently studied.',
    tag: 'Active Recall',
  },
  {
    id: 3,
    icon: AlertCircle,
    title: 'Explain a concept',
    prompt: 'Explain a complex academic concept in simple intuitive terms.',
    tag: 'Deep Dive',
  },
]

const API_BASE = import.meta.env.DEV ? 'http://localhost:5000' : (import.meta.env.VITE_API_URL || 'http://localhost:5000')

// Helper to safely unwrap HTML string from tool object regardless of nesting
function extractToolHtml(toolObj) {
  if (!toolObj) return ''
  if (typeof toolObj === 'string') return toolObj
  if (typeof toolObj.html === 'string' && toolObj.html.trim()) return toolObj.html
  if (typeof toolObj.app?.html === 'string' && toolObj.app.html.trim()) return toolObj.app.html
  if (toolObj.generated_tool) return extractToolHtml(toolObj.generated_tool)
  return ''
}

// Canonical archetype resolver that inspects explicit toolType, title, descriptions, items, and HTML structures
function resolveCanonicalToolType(rawType, toolObj = null) {
  const clean = String(rawType || '').toLowerCase().trim()
  if (/quiz|mcq|assessment|test|multiple-choice|multiple choice|questions/i.test(clean)) return 'quiz'
  if (/true-false|true\/false|boolean/i.test(clean)) return 'true-false'
  if (/match/i.test(clean)) return 'matching'
  if (/timeline|order|chronol|sequence/i.test(clean)) return 'timeline'
  if (/crossword/i.test(clean)) return 'crossword'
  if (/wordsearch|word-search|word search|search/i.test(clean)) return 'wordsearch'
  if (/cloze|blurt|fill/i.test(clean)) return 'cloze'
  if (/feynman|grader/i.test(clean)) return 'feynman'
  if (/flashcard|cards|deck/i.test(clean)) return 'flashcards'

  if (toolObj) {
    const rawObj = toolObj.generated_tool || toolObj
    const checkStrings = [
      rawObj.toolType,
      rawObj.tool_type,
      rawObj.type,
      rawObj.category,
      rawObj.ui,
      rawObj.render,
      rawObj.data?.toolType,
      rawObj.data?.tool_type,
      rawObj.data?.type,
      rawObj.title,
      rawObj.description,
      toolObj.title,
      toolObj.description,
      toolObj.toolType,
      toolObj.tool_type,
    ].filter(Boolean).map(s => String(s).toLowerCase())

    for (const str of checkStrings) {
      if (/quiz|mcq|assessment|test|multiple-choice|multiple choice/i.test(str)) return 'quiz'
      if (/true-false|true\/false|boolean/i.test(str)) return 'true-false'
      if (/match/i.test(str)) return 'matching'
      if (/timeline|order|chronol|sequence/i.test(str)) return 'timeline'
      if (/crossword/i.test(str)) return 'crossword'
      if (/wordsearch|word-search|word search/i.test(str)) return 'wordsearch'
      if (/cloze|blurt|fill/i.test(str)) return 'cloze'
      if (/feynman|grader/i.test(str)) return 'feynman'
    }

    // Inspect items structure
    const rawItems = Array.isArray(rawObj.items) && rawObj.items.length > 0
      ? rawObj.items
      : (Array.isArray(rawObj?.data?.items) ? rawObj.data.items : [])
    if (rawItems.length > 0) {
      const first = rawItems[0] || {}
      if (first.choices || first.options || (first.answer && ['A', 'B', 'C', 'D'].includes(String(first.answer).toUpperCase()))) return 'quiz'
      if (first.left || first.right) return 'matching'
      if (first.position || (first.text && (first.detail || first.explanation))) return 'timeline'
      if (first.clue && first.word) return 'crossword'
      if (first.sentence && (first.answer || first.target)) return 'cloze'
      if (first.isTrue !== undefined) return 'true-false'
    }

    // Inspect HTML signatures
    const html = extractToolHtml(toolObj)
    if (html) {
      if (html.includes('choice-btn') || html.includes('q-card') || html.includes('Timed Assessment') || html.includes('q-counter') || html.includes('choices-box') || html.includes('id="q-text"')) return 'quiz'
      if (html.includes('match-card') || html.includes('matching-grid') || html.includes('Interactive Matching') || html.includes('match-container') || html.includes('left-col')) return 'matching'
      if (html.includes('timeline-track') || html.includes('timeline-slot') || html.includes('Chronological Sequence') || html.includes('timeline-card')) return 'timeline'
      if (html.includes('cw-grid') || html.includes('cw-cell') || html.includes('Academic Crossword') || html.includes('crossword-box')) return 'crossword'
      if (html.includes('ws-grid') || html.includes('ws-cell') || html.includes('Academic Word Search') || html.includes('wordsearch-grid')) return 'wordsearch'
      if (html.includes('cloze-card') || html.includes('occlusion-mask') || html.includes('Cloze Blurting') || html.includes('cloze-input')) return 'cloze'
      if (html.includes('feynman-box') || html.includes('Feynman Rubric')) return 'feynman'
    }
  }

  return 'flashcards'
}

// User-friendly display names for tool archetypes
function formatToolTypeName(rawType, toolObj = null) {
  const canonical = resolveCanonicalToolType(rawType, toolObj)
  switch (canonical) {
    case 'quiz': return 'Quiz'
    case 'matching': return 'Matching'
    case 'timeline': return 'Timeline'
    case 'crossword': return 'Crossword'
    case 'wordsearch': return 'Word Search'
    case 'true-false': return 'True/False'
    case 'cloze': return 'Cloze'
    case 'feynman': return 'Rubric'
    case 'flashcards': return 'Flashcards'
    default: return 'Tool'
  }
}

// Helper to safely extract tool metadata (title, description, items, toolType)
function extractToolMetadata(toolObj) {
  if (!toolObj) return { title: 'Interactive Learning Tool', description: '', items: [], toolType: 'tool' }
  const target = toolObj.generated_tool || toolObj
  
  let items = Array.isArray(target.items) && target.items.length > 0
    ? target.items
    : (Array.isArray(target?.data?.items) && target.data.items.length > 0
      ? target.data.items
      : (Array.isArray(toolObj.items) && toolObj.items.length > 0 ? toolObj.items : []))

  // If items is empty or items lack rich fields, parse from the embedded HTML DATA script
  const html = extractToolHtml(toolObj)
  if (html) {
    try {
      const dataMatch = html.match(/(?:const|let|var)\s+DATA\s*=\s*(\[[\s\S]*?\]);/) ||
                        html.match(/(?:const|let|var)\s+ORIGINAL\s*=\s*(\[[\s\S]*?\]);/) ||
                        html.match(/(?:const|let|var)\s+PAIRS\s*=\s*(\[[\s\S]*?\]);/) ||
                        html.match(/(?:const|let|var)\s+RAW\s*=\s*(\[[\s\S]*?\]);/)
      if (dataMatch && dataMatch[1]) {
        const parsed = JSON.parse(dataMatch[1])
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0] || {}
          const itemFirst = items[0] || {}
          const hasRicherData = 
            (first.choices && !itemFirst.choices) ||
            (first.left && !itemFirst.left) ||
            (first.position && !itemFirst.position) ||
            (first.word && !itemFirst.word) ||
            (first.sentence && !itemFirst.sentence) ||
            (first.isTrue !== undefined && itemFirst.isTrue === undefined)

          if (items.length === 0 || hasRicherData) {
            items = parsed
          }
        }
      }
      if (html.includes('cw-grid') || html.includes('ws-grid')) {
        const layoutMatch = html.match(/(?:const|let|var)\s+LAYOUT\s*=\s*(\{[\s\S]*?\});/)
        if (layoutMatch && layoutMatch[1]) {
          const parsedLayout = JSON.parse(layoutMatch[1])
          if (Array.isArray(parsedLayout?.words) && parsedLayout.words.length > 0) {
            if (items.length === 0 || !items[0]?.word) {
              items = parsedLayout.words
            }
          }
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  const rawToolType = target.toolType || target.tool_type || target.type || toolObj.toolType || toolObj.tool_type || toolObj.type || 'tool'
  const canonicalType = resolveCanonicalToolType(rawToolType, toolObj)

  return {
    title: target.title || toolObj.title || 'Interactive Learning Tool',
    description: target.description || toolObj.description || '',
    items,
    toolType: canonicalType,
  }
}

function WelcomeNode({ data }) {
  return (
    <div className="canvas-node canvas-node-welcome" style={{ width: 'min(32rem, 88vw)' }}>
      <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 mb-2">
        <Compass className="w-4 h-4" />
        <span>Study Playground</span>
      </div>
      <h2 className="text-xl font-semibold text-white leading-snug">
        Build revision tools and organize your active recall workspace.
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">
        Generate flashcards, interactive quizzes, formulas, and checklists or brainstorm directly with your study assistant.
      </p>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
        {data.quickActions.map((action) => (
          <button
            key={action.id}
            onClick={() => data.onSelectSuggestion(action.prompt)}
            className="nodrag rounded-lg border border-slate-700 bg-slate-800/90 p-3 text-left text-xs text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-700/80 hover:text-white"
          >
            <div className="mb-1.5 flex items-center gap-2 text-white font-medium">
              <action.icon className="w-4 h-4 text-blue-400" />
              <span>{action.title}</span>
            </div>
            <span className="line-clamp-2 text-slate-400 text-[11px] leading-normal">{action.prompt}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ThreadNode({ data }) {
  return (
    <div className={`canvas-node canvas-node-thread ${data.role === 'assistant' ? 'canvas-node-thread-assistant' : 'canvas-node-thread-user'}`} style={{ width: 'min(24rem, 78vw)' }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#9fb0c5]">
          {data.role === 'assistant' ? <Vela size={18} /> : <MessageSquare className="w-4 h-4 text-[#f8fafc]" />}
          <span>{data.role === 'assistant' ? 'Canvas note' : 'Prompt note'}</span>
        </div>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-[#94a3b8]">{data.indexLabel}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6 text-white">{data.content}</p>
      {data.attachedTool && (
        <button
          onClick={() => data.onOpenTool(data.attachedTool)}
          className="nodrag mt-4 inline-flex items-center gap-2 rounded-lg border border-[#2563eb] bg-[#1d4ed8] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#2563eb]"
        >
          <Wrench className="w-3.5 h-3.5" />
          Open tool on canvas
        </button>
      )}
    </div>
  )
}

function ToolNode({ data }) {
  const [nodeWidth, setNodeWidth] = useState(820)
  const [nodeHeight, setNodeHeight] = useState(580)
  const [isResizing, setIsResizing] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const resizeRef = useRef({ startX: 0, startY: 0, startW: 820, startH: 580 })
  const exportMenuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false)
      }
    }
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showExportMenu])

  const handleResizeStart = (e) => {
    e.stopPropagation()
    e.preventDefault()
    setIsResizing(true)
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: nodeWidth,
      startH: nodeHeight,
    }

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - resizeRef.current.startX
      const deltaY = moveEvent.clientY - resizeRef.current.startY
      const nextW = Math.max(500, Math.min(1400, resizeRef.current.startW + deltaX))
      const nextH = Math.max(380, Math.min(920, resizeRef.current.startH + deltaY))
      setNodeWidth(nextW)
      setNodeHeight(nextH)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const setSizePreset = (w, h) => {
    setNodeWidth(w)
    setNodeHeight(h)
  }

  return (
    <div
      className="canvas-tool-node relative select-none"
      style={{ width: `${nodeWidth}px` }}
    >
      {/* Node Header */}
      <div className="canvas-node-drag-handle flex flex-wrap items-center justify-between gap-2.5 border-b border-[#18283e] px-3.5 py-2.5 bg-[#0e1626]">
        <div className="min-w-0 flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[#7dd3fc]">
            <Layers className="w-3.5 h-3.5 text-[#5A7D99]" />
            <span className="hidden sm:inline">Workspace</span>
          </div>
          <div className="h-3 w-px bg-[#282E38]" />
          <h3 className="truncate text-xs sm:text-sm font-semibold text-white max-w-[150px] sm:max-w-[240px]">
            {data.title}
          </h3>
          {data.toolType && (
            <span className="rounded-[4px] border border-[#282E38] bg-[#131519] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8fb7ff]">
              {data.toolType}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 nodrag">
          {/* Action buttons attached to the interactive tool box */}
          {data.hasTool && (
            <div className="flex items-center gap-1.5 rounded-[6px] border border-[#1b2b40] bg-[#09111d]/92 px-2 py-1 shadow-md">
              {data.onEdit && (
                <button
                  onClick={data.onEdit}
                  className="nodrag rounded-[4px] border border-[#223247] bg-[#101b2d] px-2.5 py-1 text-[11px] font-semibold text-[#e2e8f0] transition-colors hover:bg-[#16263d] hover:text-white flex items-center gap-1.5"
                  title={`Edit ${formatToolTypeName(data.toolType)} questions, items, and content in canvas`}
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#5A7D99]" />
                  <span>Edit {formatToolTypeName(data.toolType)}</span>
                </button>
              )}
              {data.onViewCitation && (
                <button
                  onClick={data.onViewCitation}
                  className="nodrag rounded-[4px] border border-blue-500/30 bg-blue-500/15 px-2.5 py-1 text-[11px] font-semibold text-blue-300 transition-colors hover:bg-blue-500 hover:text-white flex items-center gap-1.5 shadow-sm"
                  title="Open Grounded Document Split-Viewer & Source Citations"
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span>Citations</span>
                </button>
              )}
              {data.onSave && (
                <button
                  onClick={data.onSave}
                  className="nodrag rounded-[4px] border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 transition-colors hover:bg-emerald-500 hover:text-white"
                  title="Save this tool to your personal Saved Tools library"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </span>
                </button>
              )}
              {data.onShare && (
                <button
                  onClick={data.onShare}
                  className="nodrag rounded-[4px] border border-[#223247] bg-[#101b2d] px-2.5 py-1 text-[11px] font-semibold text-[#e2e8f0] transition-colors hover:bg-[#16263d] hover:text-white"
                  title="Share with another student or copy direct link"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-[#5A7D99]" />
                    <span>Share</span>
                  </span>
                </button>
              )}
              {(data.onExportMarkdown || data.onPrintSheet) && (
                <div className="relative nodrag" ref={exportMenuRef}>
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="nodrag rounded-[4px] border border-[#223247] bg-[#101b2d] px-2.5 py-1 text-[11px] font-semibold text-[#e2e8f0] transition-colors hover:bg-[#16263d] hover:text-white"
                    title="Export or print study materials"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5 text-[#5A7D99]" />
                      <span>Export</span>
                    </span>
                  </button>

                  {showExportMenu && (
                    <div className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-[6px] border border-[#1e2d45] bg-[#21262E] p-1.5 shadow-2xl nodrag">
                      {data.onExportMarkdown && (
                        <button
                          onClick={() => {
                            setShowExportMenu(false)
                            data.onExportMarkdown()
                          }}
                          className="w-full rounded-[4px] px-3 py-2 text-left text-xs font-semibold text-white transition-colors hover:bg-[#1a253c] flex items-center gap-2"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#5A7D99]" />
                          <span>Download Markdown</span>
                        </button>
                      )}
                      {data.onPrintSheet && (
                        <button
                          onClick={() => {
                            setShowExportMenu(false)
                            data.onPrintSheet()
                          }}
                          className="mt-1 w-full rounded-[4px] px-3 py-2 text-left text-xs font-semibold text-white transition-colors hover:bg-[#1a253c] flex items-center gap-2"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#5A7D99]" />
                          <span>Print / PDF Cheat Sheet</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              {data.onPublish && (
                <button
                  onClick={data.onPublish}
                  className="nodrag rounded-[4px] border border-[#3b82f6]/40 bg-[#3b82f6]/15 px-2.5 py-1 text-[11px] font-semibold text-[#93c5fd] transition-colors hover:bg-[#3b82f6] hover:text-white"
                  title="Publish this tool to the Community Marketplace"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Publish</span>
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Quick Size Presets */}
          <div className="hidden sm:flex items-center gap-1 bg-[#131519] border border-[#282E38] rounded-lg p-0.5 nodrag">
            <button
              onClick={() => setSizePreset(620, 480)}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${nodeWidth <= 680 ? 'bg-[#21262E] text-white' : 'text-[#8493a8] hover:text-white'}`}
              title="Compact Size (620px)"
            >
              S
            </button>
            <button
              onClick={() => setSizePreset(840, 580)}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${nodeWidth > 680 && nodeWidth <= 960 ? 'bg-[#21262E] text-white' : 'text-[#8493a8] hover:text-white'}`}
              title="Standard Size (840px)"
            >
              M
            </button>
            <button
              onClick={() => setSizePreset(1140, 700)}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${nodeWidth > 960 ? 'bg-[#21262E] text-white' : 'text-[#8493a8] hover:text-white'}`}
              title="Wide Size (1140px)"
            >
              L
            </button>
          </div>

          {/* Fullscreen Maximize */}
          {data.onExpand && data.hasTool && (
            <button
              onClick={data.onExpand}
              className="nodrag rounded-lg border border-[#282E38] bg-[#131519] p-1.5 text-[#cbd5e1] transition-colors hover:bg-[#21262E] hover:text-white flex items-center gap-1 text-[11px]"
              title="Fullscreen Mode (Maximize)"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#5A7D99]" />
              <span className="hidden md:inline font-medium">Fullscreen</span>
            </button>
          )}

          {/* Close */}
          {data.onClose && data.hasTool && (
            <button
              onClick={data.onClose}
              className="nodrag rounded-lg border border-red-900/40 bg-red-950/20 p-1.5 text-red-400 transition-colors hover:bg-red-900/40 hover:text-white"
              title="Close tool"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Surface Area */}
      <div className="canvas-tool-surface relative" style={{ height: `${nodeHeight}px` }}>
        {/* Invisible overlay while resizing to prevent iframe absorbing pointer events */}
        {isResizing && <div className="absolute inset-0 z-30 cursor-se-resize bg-transparent" />}

        {data.loading ? (
          <div className="flex h-full items-center justify-center p-6">
            <PlaygroundLoader stage={data.stage} phase={data.phase} />
          </div>
        ) : data.html ? (
          <div className="p-3.5 h-full">
            <iframe
              srcDoc={data.html}
              title="Interactive Tool Sandbox"
              className="nodrag h-full w-full rounded-[18px] border-none bg-white shadow-[0_20px_50px_rgba(15,23,42,0.24)]"
              allow="microphone"
              sandbox="allow-scripts allow-modals allow-forms"
            />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div className="w-full max-w-[420px] rounded-xl border border-dashed border-slate-700 bg-slate-900/80 p-6 flex flex-col items-center">
              <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 mb-3">
                <Wrench className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-semibold text-white mb-1">Interactive Study Tool Drop-Zone</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mb-4">
                Ask your assistant in the chat or pick a quick starter below to generate an interactive tool here.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => data.onSelectSuggestion?.('Create interactive flashcards on my topics')}
                  className="nodrag px-3 py-1.5 text-[11px] font-medium rounded-lg bg-[#141b29] hover:bg-[#1f2a3f] text-[#cbd5e1] hover:text-white border border-[#282E38] transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Flashcards</span>
                </button>
                <button
                  onClick={() => data.onSelectSuggestion?.('Build a 10-question practice quiz with active recall')}
                  className="nodrag px-3 py-1.5 text-[11px] font-medium rounded-lg bg-[#141b29] hover:bg-[#1f2a3f] text-[#cbd5e1] hover:text-white border border-[#282E38] transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                  <span>Practice Quiz</span>
                </button>
                <button
                  onClick={() => data.onSelectSuggestion?.('Generate a concept breakdown diagram')}
                  className="nodrag px-3 py-1.5 text-[11px] font-medium rounded-lg bg-[#141b29] hover:bg-[#1f2a3f] text-[#cbd5e1] hover:text-white border border-[#282E38] transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Brain className="w-3.5 h-3.5 text-purple-400" />
                  <span>Mind Map</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Bottom-Right Corner Resize Handle */}
      <div
        onMouseDown={handleResizeStart}
        className="nodrag absolute bottom-1 right-1 z-20 flex h-6 w-6 cursor-se-resize items-center justify-center rounded-br-2xl text-[#64748b] hover:text-white transition-colors group"
        title="Drag corner to resize tool window"
      >
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" className="opacity-60 group-hover:opacity-100">
          <path d="M14 2 L2 14" strokeLinecap="round" />
          <path d="M14 7 L7 14" strokeLinecap="round" />
          <path d="M14 12 L12 14" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}

function StickyNoteNode({ data, id }) {
  const [title, setTitle] = useState(data.title || '')
  const [content, setContent] = useState(data.content || '')
  const [color, setColor] = useState(data.color || 'yellow')
  const [isPinned, setIsPinned] = useState(Boolean(data.isPinned))
  const [width, setWidth] = useState(data.width || 260)
  const [height, setHeight] = useState(data.height || 220)
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef({ startX: 0, startY: 0, startW: 260, startH: 220 })

  const colors = [
    { id: 'yellow', label: 'Amber Yellow', bg: '#eab308' },
    { id: 'cyan', label: 'Ice Cyan', bg: '#38bdf8' },
    { id: 'green', label: 'Emerald Green', bg: '#34d399' },
    { id: 'purple', label: 'Lavender Purple', bg: '#c084fc' },
    { id: 'rose', label: 'Rose Pink', bg: '#fb7185' },
  ]

  const handleTitleChange = (e) => {
    const val = e.target.value
    setTitle(val)
    data.onUpdate?.(id, { title: val, content, color, isPinned, width, height })
  }

  const handleContentChange = (e) => {
    const val = e.target.value
    setContent(val)
    data.onUpdate?.(id, { title, content: val, color, isPinned, width, height })
  }

  const handleColorChange = (newColor) => {
    setColor(newColor)
    data.onUpdate?.(id, { title, content, color: newColor, isPinned, width, height })
  }

  const handlePinToggle = () => {
    const newPinned = !isPinned
    setIsPinned(newPinned)
    data.onUpdate?.(id, { title, content, color, isPinned: newPinned, width, height })
  }

  const handleResizeStart = (e) => {
    e.stopPropagation()
    e.preventDefault()
    setIsResizing(true)
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: width,
      startH: height,
    }

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - resizeRef.current.startX
      const deltaY = moveEvent.clientY - resizeRef.current.startY
      const nextW = Math.max(200, Math.min(650, resizeRef.current.startW + deltaX))
      const nextH = Math.max(160, Math.min(650, resizeRef.current.startH + deltaY))
      setWidth(nextW)
      setHeight(nextH)
    }

    const handleMouseUp = (upEvent) => {
      setIsResizing(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      const deltaX = upEvent.clientX - resizeRef.current.startX
      const deltaY = upEvent.clientY - resizeRef.current.startY
      const finalW = Math.max(200, Math.min(650, resizeRef.current.startW + deltaX))
      const finalH = Math.max(160, Math.min(650, resizeRef.current.startH + deltaY))
      data.onUpdate?.(id, { title, content, color, isPinned, width: finalW, height: finalH })
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div
      className={`canvas-sticky-note canvas-sticky-${color} select-none`}
      style={{ width: `${width}px`, minHeight: `${height}px` }}
    >
      {/* Header / Drag handle */}
      <div className="canvas-sticky-header canvas-node-drag-handle flex items-center justify-between gap-2 px-3 py-2 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-1.5 nodrag">
          {colors.map((c) => (
            <button
              key={c.id}
              onClick={() => handleColorChange(c.id)}
              className={`w-3 h-3 rounded-full transition-transform ${color === c.id ? 'scale-125 ring-2 ring-white/60' : 'opacity-60 hover:opacity-100 hover:scale-110'}`}
              style={{ backgroundColor: c.bg }}
              title={c.label}
            />
          ))}
        </div>

        <div className="flex items-center gap-1 nodrag">
          <button
            onClick={handlePinToggle}
            className={`p-1 rounded-md transition-colors ${isPinned ? 'text-amber-400 bg-amber-400/20' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
            title={isPinned ? 'Unpin note' : 'Pin note'}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => data.onDelete?.(id)}
            className="p-1 rounded-md text-white/50 hover:text-red-400 hover:bg-red-500/20 transition-colors"
            title="Delete sticky note"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2 flex flex-col" style={{ minHeight: `${height - 38}px` }}>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Note title..."
          className="w-full bg-transparent font-bold text-xs text-white placeholder-white/40 focus:outline-none border-b border-white/10 pb-1"
        />
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="Formulas, key takeaways, mnemonics..."
          className="w-full flex-1 min-h-[90px] resize-none bg-transparent text-xs text-white/90 placeholder-white/35 focus:outline-none leading-relaxed"
        />
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleResizeStart}
        className="nodrag absolute bottom-1 right-1 z-20 flex h-4 w-4 cursor-se-resize items-center justify-center text-white/40 hover:text-white"
        title="Resize note"
      >
        <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 6 L6 14" strokeLinecap="round" />
          <path d="M14 11 L11 14" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}

function PinNode({ data, id }) {
  const [title, setTitle] = useState(data.title || '')
  const [content, setContent] = useState(data.content || '')
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard?.writeText(content || title)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="canvas-pin-node select-none p-3.5 w-64">
      <div className="canvas-node-drag-handle flex items-center justify-between gap-2 border-b border-[#282E38] pb-2 mb-2 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
          <Pin className="w-3.5 h-3.5" />
          <span>Formula Pin</span>
        </div>
        <div className="flex items-center gap-1 nodrag">
          <button
            onClick={handleCopy}
            className="p-1 text-[#8493a8] hover:text-white rounded transition-colors"
            title="Copy formula/text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => data.onDelete?.(id)}
            className="p-1 text-[#8493a8] hover:text-red-400 rounded transition-colors"
            title="Delete pin"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <input
          type="text"
          value={title}
          onChange={(e) => {
            const val = e.target.value
            setTitle(val)
            data.onUpdate?.(id, { title: val, content })
          }}
          placeholder="Concept / Formula name..."
          className="w-full bg-slate-900/90 border border-slate-700/80 rounded-md px-2.5 py-1.5 font-semibold text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
        />
        <div className="rounded-md bg-slate-900 border border-slate-700/90 p-2.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/30">
          <textarea
            value={content}
            onChange={(e) => {
              const val = e.target.value
              setContent(val)
              data.onUpdate?.(id, { title, content: val })
            }}
            placeholder="e.g. E = mc² or PV = nRT"
            className="w-full resize-none font-mono text-xs text-sky-300 placeholder-slate-500 bg-transparent focus:outline-none min-h-[56px] leading-relaxed"
          />
        </div>
      </div>
    </div>
  )
}

function ChecklistNode({ data, id }) {
  const [title, setTitle] = useState(data.title || 'Study Checklist')
  const [items, setItems] = useState(Array.isArray(data.items) && data.items.length > 0 ? data.items : [
    { id: '1', text: 'Review core concepts', done: false },
    { id: '2', text: 'Practice 10 flashcards', done: false },
  ])

  const toggleItem = (itemId) => {
    const updated = items.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it))
    setItems(updated)
    data.onUpdate?.(id, { title, items: updated })
  }

  const updateItemText = (itemId, text) => {
    const updated = items.map((it) => (it.id === itemId ? { ...it, text } : it))
    setItems(updated)
    data.onUpdate?.(id, { title, items: updated })
  }

  const addItem = () => {
    const newItem = { id: String(Date.now()), text: 'New task / milestone', done: false }
    const updated = [...items, newItem]
    setItems(updated)
    data.onUpdate?.(id, { title, items: updated })
  }

  const deleteItem = (itemId) => {
    const updated = items.filter((it) => it.id !== itemId)
    setItems(updated)
    data.onUpdate?.(id, { title, items: updated })
  }

  const completedCount = items.filter((i) => i.done).length

  return (
    <div className="canvas-checklist-node select-none p-3.5 w-72">
      <div className="canvas-node-drag-handle flex items-center justify-between gap-2 border-b border-[#223247] pb-2 mb-2.5 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#60a5fa]">
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Checklist</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 font-mono">
            {completedCount}/{items.length}
          </span>
        </div>
        <div className="flex items-center gap-1 nodrag">
          <button
            onClick={addItem}
            className="p-1 text-[#8493a8] hover:text-white rounded transition-colors"
            title="Add task"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => data.onDelete?.(id)}
            className="p-1 text-[#8493a8] hover:text-red-400 rounded transition-colors"
            title="Delete checklist"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => {
          const val = e.target.value
          setTitle(val)
          data.onUpdate?.(id, { title: val, items })
        }}
        placeholder="Milestone title..."
        className="w-full bg-transparent font-bold text-xs text-white placeholder-[#64748b] focus:outline-none mb-2 pb-1 border-b border-white/5"
      />

      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-2 group">
            <button
              onClick={() => toggleItem(it.id)}
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${it.done ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-[#475569] hover:border-blue-400'}`}
            >
              {it.done && <Check className="w-3 h-3 stroke-[3]" />}
            </button>
            <input
              type="text"
              value={it.text}
              onChange={(e) => updateItemText(it.id, e.target.value)}
              className={`w-full bg-transparent text-xs focus:outline-none ${it.done ? 'line-through text-[#64748b]' : 'text-[#cbd5e1]'}`}
            />
            <button
              onClick={() => deleteItem(it.id)}
              className="opacity-0 group-hover:opacity-100 text-[#64748b] hover:text-red-400 transition-opacity p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function PdfViewerNode({ data, id }) {
  const [nodeWidth, setNodeWidth] = useState(data.width || 880)
  const [nodeHeight, setNodeHeight] = useState(data.height || 640)
  const [isResizing, setIsResizing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [paragraphs, setParagraphs] = useState(Array.isArray(data.paragraphs) ? data.paragraphs : [])
  const [selectedText, setSelectedText] = useState('')
  const [selectedParaId, setSelectedParaId] = useState(null)
  const [tooltipPos, setTooltipPos] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [viewerTab, setViewerTab] = useState(data.fileUrl ? 'pdf' : 'pages')
  const [localFileUrl, setLocalFileUrl] = useState(data.fileUrl || null)
  const [activePage, setActivePage] = useState(1)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [pageTheme, setPageTheme] = useState('paper') // 'paper' | 'sepia' | 'dark'
  const [isLoadingDoc, setIsLoadingDoc] = useState(false)
  const [showOutline, setShowOutline] = useState(false)
  const [activeRecallMode, setActiveRecallMode] = useState(false)
  const [revealedClozeIds, setRevealedClozeIds] = useState({})
  const [userHighlights, setUserHighlights] = useState(Array.isArray(data.highlights) ? data.highlights : [])
  const [userMarginNotes, setUserMarginNotes] = useState(Array.isArray(data.marginNotes) ? data.marginNotes : [])
  const [activeHighlightColor, setActiveHighlightColor] = useState('yellow') // 'yellow' | 'green' | 'blue' | 'purple' | 'coral'
  const [activeMarginInputParaId, setActiveMarginInputParaId] = useState(null)
  const [marginInputText, setMarginInputText] = useState('')
  const [speechStatus, setSpeechStatus] = useState('stopped') // 'stopped' | 'playing' | 'paused'
  const [speechRate, setSpeechRate] = useState(1.0)
  const [readingParagraphId, setReadingParagraphId] = useState(null)

  const resizeRef = useRef({ startX: 0, startY: 0, startW: 880, startH: 640 })
  const containerRef = useRef(null)
  const fileInputRef = useRef(null)
  const speechUtteranceRef = useRef(null)

  useEffect(() => {
    if (data.fileUrl) {
      setLocalFileUrl(data.fileUrl)
      setViewerTab('pdf')
    }
  }, [data.fileUrl])

  useEffect(() => {
    if (Array.isArray(data.paragraphs) && data.paragraphs.length > 0) {
      setParagraphs(data.paragraphs)
      return
    }

    const docTitle = data.title || 'Study Document'
    let isMounted = true

    const fetchDoc = async () => {
      setIsLoadingDoc(true)
      try {
        const token = data.authToken || localStorage.getItem('token') || (() => {
          try {
            const key = Object.keys(localStorage).find((k) => k.includes('auth-token'))
            return key ? JSON.parse(localStorage.getItem(key))?.access_token : null
          } catch {
            return null
          }
        })()

        if (token) {
          const res = await fetch(`${data.apiBase || 'http://localhost:5000'}/api/document-paragraphs?title=${encodeURIComponent(docTitle)}`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
          })
          if (res.ok) {
            const resData = await res.json()
            if (isMounted && resData.paragraphs && resData.paragraphs.length > 0) {
              setParagraphs(resData.paragraphs)
              if (resData.fileUrl && !localFileUrl) {
                setLocalFileUrl(resData.fileUrl)
                data.onUpdate?.(id, { fileUrl: resData.fileUrl })
              }
              setIsLoadingDoc(false)
              return
            }
          }
        }
      } catch {}

      if (isMounted) {
        setIsLoadingDoc(false)
        const cleanTitle = (docTitle || 'Course Document').replace(/\+/g, ' ')
        setParagraphs([
          {
            id: 1,
            paragraphIndex: 1,
            pageNumber: 1,
            heading: '1. Executive Overview & Core Mechanisms',
            text: `Document Source: "${cleanTitle}". This document provides syllabus-aligned theoretical frameworks, core pathways, mathematical models, and critical exam definitions. Review the active recall prompts and highlighted terminology across all subsequent sections.`,
          },
          {
            id: 2,
            paragraphIndex: 2,
            pageNumber: 1,
            heading: '2. Foundational Principles & Thresholds',
            text: `Core mechanisms operate under specific regulatory thresholds and rate-limiting steps. Ensure clarity on input constraints, intermediary states, and observable outputs during exam evaluations.`,
          },
          {
            id: 3,
            paragraphIndex: 3,
            pageNumber: 2,
            heading: '3. Applied Case Studies & Methodologies',
            text: `Real-world applications require sequential analysis: initial state validation, constraint checking, iterative transformation, and boundary verification. Compare and contrast alternative operational models.`,
          },
          {
            id: 4,
            paragraphIndex: 4,
            pageNumber: 2,
            heading: '4. Exam Takeaways & Active Recall Summary',
            text: `Critical review checklist: Memorize primary definitions, master the standard sequence of operations, identify common distractor traps, and verify all formula derivations before tackling practice quizzes.`,
          },
        ])
      }
    }
    fetchDoc()
    return () => {
      isMounted = false
      if (window.speechSynthesis) window.speechSynthesis.cancel()
    }
  }, [data.title, data.authToken, data.apiBase, data.paragraphs])

  const handleResizeStart = (e) => {
    e.stopPropagation()
    e.preventDefault()
    setIsResizing(true)
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: nodeWidth,
      startH: nodeHeight,
    }

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - resizeRef.current.startX
      const deltaY = moveEvent.clientY - resizeRef.current.startY
      const nextW = Math.max(540, Math.min(1400, resizeRef.current.startW + deltaX))
      const nextH = Math.max(440, Math.min(1000, resizeRef.current.startH + deltaY))
      setNodeWidth(nextW)
      setNodeHeight(nextH)
      data.onUpdate?.(id, { width: nextW, height: nextH })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleTextSelection = (paraId = null) => {
    const selection = window.getSelection()
    const text = selection ? selection.toString().trim() : ''
    if (text && text.length > 2) {
      setSelectedText(text)
      setSelectedParaId(paraId)
      try {
        const rect = selection.getRangeAt(0).getBoundingClientRect()
        if (containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect()
          setTooltipPos({
            top: Math.max(10, rect.top - containerRect.top - 54),
            left: Math.max(10, Math.min(nodeWidth - 360, rect.left - containerRect.left + rect.width / 2 - 160)),
          })
        }
      } catch {}
    } else {
      setSelectedText('')
      setSelectedParaId(null)
      setTooltipPos(null)
    }
  }

  const handleApplyHighlight = (colorToUse = activeHighlightColor) => {
    if (!selectedText) return
    const newHighlight = {
      id: `hl_${Date.now()}`,
      paragraphId: selectedParaId,
      text: selectedText,
      color: colorToUse,
      pageNumber: activePage,
      createdAt: Date.now(),
    }
    const updated = [...userHighlights, newHighlight]
    setUserHighlights(updated)
    data.onUpdate?.(id, { highlights: updated })
    setSelectedText('')
    setTooltipPos(null)
  }

  const handleRemoveHighlight = (hlId) => {
    const updated = userHighlights.filter((h) => h.id !== hlId)
    setUserHighlights(updated)
    data.onUpdate?.(id, { highlights: updated })
  }

  const handleAddMarginNote = (paraId) => {
    if (!marginInputText.trim()) return
    const newNote = {
      id: `mn_${Date.now()}`,
      paragraphId: paraId,
      text: marginInputText.trim(),
      createdAt: Date.now(),
    }
    const updated = [...userMarginNotes, newNote]
    setUserMarginNotes(updated)
    data.onUpdate?.(id, { marginNotes: updated })
    setMarginInputText('')
    setActiveMarginInputParaId(null)
  }

  const handleDeleteMarginNote = (noteId) => {
    const updated = userMarginNotes.filter((n) => n.id !== noteId)
    setUserMarginNotes(updated)
    data.onUpdate?.(id, { marginNotes: updated })
  }

  // Text-To-Speech controls
  const handleStartReadAloud = (startPara = null) => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in this browser.')
      return
    }
    window.speechSynthesis.cancel()

    const activeItems = (pages.find((p) => p.pageNumber === activePage)?.items || paragraphs)
    const textToSpeak = startPara ? startPara.text : activeItems.map((p) => `${p.heading || ''}. ${p.text}`).join(' ')

    if (!textToSpeak.trim()) return

    const utter = new SpeechSynthesisUtterance(textToSpeak)
    utter.rate = speechRate
    utter.pitch = 1.0

    if (startPara) {
      setReadingParagraphId(startPara.id)
    }

    utter.onend = () => {
      setSpeechStatus('stopped')
      setReadingParagraphId(null)
    }

    utter.onerror = () => {
      setSpeechStatus('stopped')
      setReadingParagraphId(null)
    }

    speechUtteranceRef.current = utter
    window.speechSynthesis.speak(utter)
    setSpeechStatus('playing')
  }

  const handlePauseResumeReadAloud = () => {
    if (!('speechSynthesis' in window)) return
    if (speechStatus === 'playing') {
      window.speechSynthesis.pause()
      setSpeechStatus('paused')
    } else if (speechStatus === 'paused') {
      window.speechSynthesis.resume()
      setSpeechStatus('playing')
    }
  }

  const handleStopReadAloud = () => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    setSpeechStatus('stopped')
    setReadingParagraphId(null)
  }

  const handleLocalPdfChoose = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const blobUrl = URL.createObjectURL(file)
      setLocalFileUrl(blobUrl)
      setViewerTab('pdf')
      data.onUpdate?.(id, { fileUrl: blobUrl, title: file.name.replace(/\.[^/.]+$/, '') })
    }
  }

  // Group paragraphs into virtual A4 pages
  const pages = useMemo(() => {
    const grouped = {}
    paragraphs.forEach((p, idx) => {
      const pageNum = p.pageNumber || Math.floor(idx / 3) + 1
      if (!grouped[pageNum]) grouped[pageNum] = []
      grouped[pageNum].push(p)
    })
    const pageKeys = Object.keys(grouped).map(Number).sort((a, b) => a - b)
    if (pageKeys.length === 0) {
      return [{ pageNumber: 1, items: [] }]
    }
    return pageKeys.map((k) => ({ pageNumber: k, items: grouped[k] }))
  }, [paragraphs])

  const totalPages = Math.max(1, pages.length)
  const displayDocTitle = (data.title || 'PDF Document').replace(/\+/g, ' ')

  const matchesSearch = (text) => {
    if (!searchQuery.trim()) return true
    return (text || '').toLowerCase().includes(searchQuery.toLowerCase())
  }

  // Color mapping helper
  const getHighlightColorStyle = (color) => {
    switch (color) {
      case 'green':
        return 'bg-emerald-400/30 text-emerald-900 dark:text-emerald-200 border-b-2 border-emerald-500'
      case 'blue':
        return 'bg-blue-400/30 text-blue-900 dark:text-blue-200 border-b-2 border-blue-500'
      case 'purple':
        return 'bg-purple-400/30 text-purple-900 dark:text-purple-200 border-b-2 border-purple-500'
      case 'coral':
        return 'bg-rose-400/30 text-rose-900 dark:text-rose-200 border-b-2 border-rose-500'
      case 'yellow':
      default:
        return 'bg-amber-300/40 text-amber-950 dark:text-amber-200 border-b-2 border-amber-400'
    }
  }

  // Theme styling for paper sheets
  const getPageThemeClasses = () => {
    if (pageTheme === 'sepia') {
      return {
        bg: 'bg-[#fbf0d9]',
        text: 'text-[#2b1f14]',
        subtext: 'text-[#705843]',
        border: 'border-[#ebd7b2]',
        heading: 'text-[#3c2a1a]',
        rule: 'border-[#ebd7b2]',
        badge: 'bg-[#ebd7b2]/70 text-[#4a3520]',
        cardBg: 'bg-[#f4e6c9]/90 border-[#ebd7b2]',
      }
    }
    if (pageTheme === 'dark') {
      return {
        bg: 'bg-[#121824]',
        text: 'text-slate-200',
        subtext: 'text-slate-400',
        border: 'border-[#243042]',
        heading: 'text-white',
        rule: 'border-[#243042]',
        badge: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
        cardBg: 'bg-[#1a2333]/90 border-[#243042]',
      }
    }
    // Default crisp white paper
    return {
      bg: 'bg-white',
      text: 'text-slate-800',
      subtext: 'text-slate-500',
      border: 'border-slate-200',
      heading: 'text-slate-900',
      rule: 'border-slate-200',
      badge: 'bg-slate-100 text-slate-700 border border-slate-300',
      cardBg: 'bg-slate-50/90 border-slate-200',
    }
  }

  const themeStyle = getPageThemeClasses()

  // Render text with interactive highlights and cloze occlusion
  const renderInteractiveText = (item) => {
    const rawText = item.text || ''
    const itemHighlights = userHighlights.filter((h) => h.paragraphId === item.id || rawText.includes(h.text))

    if (!activeRecallMode && itemHighlights.length === 0) {
      return (
        <span onMouseUp={() => handleTextSelection(item.id)}>
          {rawText}
        </span>
      )
    }

    // Build regex / segments for highlights or cloze terms
    const termsToOccludeOrHighlight = []

    itemHighlights.forEach((hl) => {
      if (hl.text && rawText.includes(hl.text)) {
        termsToOccludeOrHighlight.push({
          text: hl.text,
          type: 'highlight',
          color: hl.color || 'yellow',
          id: hl.id,
        })
      }
    })

    if (activeRecallMode) {
      // Find key academic patterns (capitalized multi-word concepts, bracketed items, numbers)
      const regexPatterns = [/\b[A-Z][a-zA-Z0-9_\-]{3,}(?:\s+[A-Z][a-zA-Z0-9_\-]+)?\b/g, /\([A-Za-z0-9_\s\.,\-%+=><]{2,}\)/g]
      regexPatterns.forEach((rx) => {
        let match
        while ((match = rx.exec(rawText)) !== null) {
          const matchStr = match[0]
          if (matchStr.length > 3 && !termsToOccludeOrHighlight.some((t) => t.text.includes(matchStr))) {
            termsToOccludeOrHighlight.push({
              text: matchStr,
              type: 'cloze',
              id: `cloze_${item.id}_${match.index}`,
            })
          }
        }
      })
    }

    if (termsToOccludeOrHighlight.length === 0) {
      return (
        <span onMouseUp={() => handleTextSelection(item.id)}>
          {rawText}
        </span>
      )
    }

    // Escape regex characters
    const escaped = termsToOccludeOrHighlight
      .map((t) => t.text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'))
      .filter(Boolean)
      .join('|')

    if (!escaped) {
      return (
        <span onMouseUp={() => handleTextSelection(item.id)}>
          {rawText}
        </span>
      )
    }

    const splitRegex = new RegExp(`(${escaped})`, 'gi')
    const parts = rawText.split(splitRegex)

    return (
      <span onMouseUp={() => handleTextSelection(item.id)}>
        {parts.map((part, idx) => {
          const matchedItem = termsToOccludeOrHighlight.find((t) => t.text.toLowerCase() === part.toLowerCase())

          if (!matchedItem) {
            return <span key={idx}>{part}</span>
          }

          // Active Recall Cloze mode rendering
          if (activeRecallMode) {
            const clozeKey = `${item.id}_${idx}`
            const isRevealed = Boolean(revealedClozeIds[clozeKey])

            return (
              <span
                key={idx}
                onClick={(e) => {
                  e.stopPropagation()
                  setRevealedClozeIds((prev) => ({ ...prev, [clozeKey]: !prev[clozeKey] }))
                }}
                className={`inline-block px-1.5 py-0.2 mx-0.5 rounded cursor-pointer transition-all ${
                  isRevealed
                    ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-400/40 shadow-sm'
                    : 'bg-blue-600/30 hover:bg-blue-600/40 text-transparent filter blur-[4.5px] select-none hover:blur-[2px] border border-blue-400/30'
                }`}
                title={isRevealed ? 'Click to hide term' : 'Click to reveal & test recall'}
              >
                {part}
              </span>
            )
          }

          // Normal Highlight mode rendering
          return (
            <span
              key={idx}
              className={`px-1 py-0.2 mx-0.5 rounded font-medium cursor-pointer transition-all hover:ring-2 hover:ring-blue-400/60 ${getHighlightColorStyle(matchedItem.color)}`}
              onClick={(e) => {
                e.stopPropagation()
                if (window.confirm(`Remove highlight: "${part}"?`)) {
                  handleRemoveHighlight(matchedItem.id)
                }
              }}
              title="Click to remove or edit highlight"
            >
              {part}
            </span>
          )
        })}
      </span>
    )
  }

  return (
    <div
      className="canvas-pdf-viewer-node relative select-none rounded-2xl border border-[#223247] bg-[#090d15] shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden"
      style={{ width: `${nodeWidth}px` }}
      ref={containerRef}
    >
      {/* Top Application Bar & Drag Handle */}
      <div className="canvas-node-drag-handle flex flex-wrap items-center justify-between gap-2.5 border-b border-[#1b2636] px-3.5 py-2.5 bg-[#0d1422]">
        <div className="min-w-0 flex items-center gap-2">
          <button
            onClick={() => setShowOutline((prev) => !prev)}
            className={`p-1.5 rounded-lg border transition-colors ${showOutline ? 'bg-blue-600 text-white border-blue-500' : 'bg-[#131b28] text-slate-300 border-[#243042] hover:text-white'}`}
            title="Toggle Table of Contents & Outline Sidebar"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[#60a5fa] font-bold">
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            <span>PDF Study Reader</span>
          </div>
          <div className="h-3.5 w-px bg-[#283548]" />
          <h3 className="truncate text-xs sm:text-sm font-semibold text-white max-w-[160px] sm:max-w-[240px]" title={displayDocTitle}>
            {displayDocTitle}
          </h3>
          <span className="rounded-full border border-blue-500/30 bg-blue-500/15 px-2 py-0.5 text-[10px] font-mono text-blue-300">
            {totalPages} {totalPages === 1 ? 'page' : 'pages'}
          </span>
        </div>

        {/* View Switchers & Document Actions */}
        <div className="flex items-center gap-1.5 nodrag">
          {/* Active Recall / Cloze Mode Toggle */}
          <button
            onClick={() => setActiveRecallMode((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
              activeRecallMode
                ? 'bg-purple-600 text-white border border-purple-400 shadow-purple-500/30 animate-pulse'
                : 'bg-[#131b28] text-slate-300 border border-[#243042] hover:bg-purple-600/20 hover:text-purple-300 hover:border-purple-500/40'
            }`}
            title="Active Recall Cloze Blurring Mode: Blurs key terms so you can test yourself!"
          >
            <Brain className="w-3 h-3 text-purple-300" />
            <span>{activeRecallMode ? 'Active Recall: ON' : 'Cloze Blurting'}</span>
          </button>

          {/* Switch between Authentic Page Sheets and Native Browser PDF Embed */}
          <div className="flex items-center bg-[#131b28] border border-[#243042] rounded-lg p-0.5 text-[10px] font-medium">
            <button
              onClick={() => setViewerTab('pages')}
              className={`px-2 py-0.5 rounded transition-all ${viewerTab === 'pages' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              title="Interactive Document Pages (with highlights, margin notes, active recall)"
            >
              Interactive Pages
            </button>
            <button
              onClick={() => {
                setViewerTab('pdf')
                if (!localFileUrl) fileInputRef.current?.click()
              }}
              className={`px-2 py-0.5 rounded transition-all ${viewerTab === 'pdf' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              title="Native Browser PDF Viewer"
            >
              Native PDF
            </button>
          </div>

          {/* Reading Tone / Theme (Paper vs Sepia vs Dark) */}
          {viewerTab === 'pages' && (
            <div className="hidden sm:flex items-center gap-0.5 bg-[#131b28] border border-[#243042] rounded-lg p-0.5 text-[10px]">
              <button
                onClick={() => setPageTheme('paper')}
                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${pageTheme === 'paper' ? 'border-blue-400 bg-white text-slate-900 font-bold' : 'border-transparent text-slate-400 hover:text-white'}`}
                title="Crisp White Paper"
              >
                W
              </button>
              <button
                onClick={() => setPageTheme('sepia')}
                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${pageTheme === 'sepia' ? 'border-amber-400 bg-[#fbf0d9] text-[#2b1f14] font-bold' : 'border-transparent text-slate-400 hover:text-white'}`}
                title="Warm Book Sepia"
              >
                S
              </button>
              <button
                onClick={() => setPageTheme('dark')}
                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${pageTheme === 'dark' ? 'border-blue-400 bg-slate-800 text-white font-bold' : 'border-transparent text-slate-400 hover:text-white'}`}
                title="Dark Academic Mode"
              >
                D
              </button>
            </div>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in PDF..."
              className="bg-[#131b28] border border-[#243042] rounded-lg pl-7 pr-2 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-24 sm:w-32 transition-all"
            />
          </div>

          {/* Pick local PDF */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleLocalPdfChoose}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-[#243042] bg-[#131b28] px-2 py-1 text-[10px] text-slate-300 hover:bg-[#1e293b] hover:text-white transition-colors"
            title="Upload or replace PDF file"
          >
            <Upload className="w-3 h-3 inline mr-1 text-blue-400" />
            <span className="hidden md:inline">Open PDF</span>
          </button>

          {/* Close */}
          {data.onDelete && (
            <button
              onClick={() => data.onDelete(id)}
              className="nodrag rounded-lg border border-red-900/40 bg-red-950/20 p-1.5 text-red-400 transition-colors hover:bg-red-900/40 hover:text-white"
              title="Close PDF Viewer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Reader Secondary Toolbar (Page Navigation, Highlighters, Read-Aloud TTS & Zoom) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1b2636] px-4 py-1.5 bg-[#0a0f19] text-xs text-slate-300 select-none">
        <div className="flex items-center gap-2">
          {viewerTab === 'pages' && (
            <>
              <button
                disabled={activePage <= 1}
                onClick={() => setActivePage((p) => Math.max(1, p - 1))}
                className="rounded p-1 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
                title="Previous Page"
              >
                ◀
              </button>
              <span className="text-[11px] font-mono text-slate-400">
                Page <strong className="text-white">{activePage}</strong> / {totalPages}
              </span>
              <button
                disabled={activePage >= totalPages}
                onClick={() => setActivePage((p) => Math.min(totalPages, p + 1))}
                className="rounded p-1 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
                title="Next Page"
              >
                ▶
              </button>

              <div className="h-3.5 w-px bg-[#243042] mx-1" />

              {/* Text-to-Speech Toolbar */}
              <div className="flex items-center gap-1 bg-[#131b28] border border-[#243042] rounded-md px-1.5 py-0.5 text-[10px]">
                {speechStatus === 'stopped' ? (
                  <button
                    onClick={() => handleStartReadAloud()}
                    className="flex items-center gap-1 text-blue-300 hover:text-white font-medium"
                    title="Read Aloud (Text to Speech)"
                  >
                    <Volume2 className="w-3 h-3 text-blue-400" />
                    <span>Read Aloud</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handlePauseResumeReadAloud}
                      className="px-1 text-amber-300 hover:text-white font-bold"
                      title={speechStatus === 'playing' ? 'Pause Speech' : 'Resume Speech'}
                    >
                      {speechStatus === 'playing' ? '❚❚' : '▶'}
                    </button>
                    <button
                      onClick={handleStopReadAloud}
                      className="px-1 text-red-400 hover:text-white font-bold"
                      title="Stop Speech"
                    >
                      ■
                    </button>
                  </>
                )}

                <button
                  onClick={() => setSpeechRate((r) => (r === 1.0 ? 1.25 : r === 1.25 ? 1.5 : 1.0))}
                  className="font-mono text-[9px] text-slate-400 hover:text-white ml-1 px-1 rounded bg-[#0c121e]"
                  title="Speech Speed"
                >
                  {speechRate}x
                </button>
              </div>

              {/* Highlighter Color Palette Picker */}
              <div className="hidden md:flex items-center gap-1 bg-[#131b28] border border-[#243042] rounded-md px-1.5 py-0.5 text-[10px]">
                <span className="text-slate-400 text-[9px] font-mono mr-0.5">Pen:</span>
                {[
                  { color: 'yellow', hex: '#fde047', label: 'Yellow (Core Concept)' },
                  { color: 'green', hex: '#86efac', label: 'Green (Definition)' },
                  { color: 'blue', hex: '#93c5fd', label: 'Blue (Formula / Logic)' },
                  { color: 'purple', hex: '#d8b4fe', label: 'Purple (Exam Trap)' },
                  { color: 'coral', hex: '#fda4af', label: 'Coral (Warning)' },
                ].map((c) => (
                  <button
                    key={c.color}
                    onClick={() => setActiveHighlightColor(c.color)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-3.5 h-3.5 rounded-full transition-transform ${activeHighlightColor === c.color ? 'scale-125 ring-2 ring-white shadow-sm' : 'opacity-70 hover:opacity-100'}`}
                    title={c.label}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-[#131b28] border border-[#243042] rounded-md px-1.5 py-0.5 text-[10px]">
            <button
              onClick={() => setZoomLevel((z) => Math.max(75, z - 15))}
              className="text-slate-400 hover:text-white px-1"
              title="Zoom out"
            >
              -
            </button>
            <span className="font-mono text-slate-300 w-8 text-center">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(150, z + 15))}
              className="text-slate-400 hover:text-white px-1"
              title="Zoom in"
            >
              +
            </button>
          </div>

          {/* Quick preset sizes */}
          <div className="hidden sm:flex items-center gap-0.5 bg-[#131b28] border border-[#243042] rounded-md p-0.5 text-[10px]">
            <button
              onClick={() => { setNodeWidth(680); setNodeHeight(540); data.onUpdate?.(id, { width: 680, height: 540 }) }}
              className={`px-1.5 py-0.2 rounded ${nodeWidth <= 720 ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              S
            </button>
            <button
              onClick={() => { setNodeWidth(880); setNodeHeight(660); data.onUpdate?.(id, { width: 880, height: 660 }) }}
              className={`px-1.5 py-0.2 rounded ${nodeWidth > 720 && nodeWidth <= 1000 ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              M
            </button>
            <button
              onClick={() => { setNodeWidth(1140); setNodeHeight(780); data.onUpdate?.(id, { width: 1140, height: 780 }) }}
              className={`px-1.5 py-0.2 rounded ${nodeWidth > 1000 ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              L
            </button>
          </div>
        </div>
      </div>

      {/* Main Container with Optional Outline Sidebar */}
      <div className="flex-1 flex overflow-hidden relative" style={{ height: `${nodeHeight}px` }}>
        {/* Left Table of Contents / Outline Drawer */}
        {showOutline && viewerTab === 'pages' && (
          <aside className="w-56 bg-[#0c121e] border-r border-[#1e2a3c] p-3 overflow-y-auto flex flex-col flex-shrink-0 animate-fade-in text-xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1e2a3c]">
              <span className="font-bold text-white uppercase text-[10px] tracking-wider flex items-center gap-1">
                <Layers className="w-3 h-3 text-blue-400" />
                <span>Contents</span>
              </span>
              <button
                onClick={() => setShowOutline(false)}
                className="text-slate-400 hover:text-white p-0.5"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5">
              {paragraphs.map((p, idx) => {
                const pageNum = p.pageNumber || Math.floor(idx / 3) + 1
                return (
                  <button
                    key={p.id || idx}
                    onClick={() => setActivePage(pageNum)}
                    className={`w-full text-left p-2 rounded-lg text-[11px] transition-all flex flex-col gap-0.5 ${
                      activePage === pageNum
                        ? 'bg-blue-600/20 border border-blue-500/40 text-blue-200 font-semibold'
                        : 'text-slate-400 hover:bg-[#151f30] hover:text-white'
                    }`}
                  >
                    <span className="line-clamp-1">{p.heading || `Section ${idx + 1}`}</span>
                    <span className="text-[9px] text-slate-500 font-mono">Page {pageNum}</span>
                  </button>
                )
              })}
            </div>
          </aside>
        )}

        {/* Main Document Reading Canvas */}
        <div
          className="relative overflow-y-auto p-4 sm:p-6 space-y-8 select-text scrollbar-thin bg-[#080c14] flex-1 flex flex-col items-center"
        >
          {/* Floating Highlight Micro-Actions Tooltip */}
          {selectedText && tooltipPos && (
            <div
              className="absolute z-50 flex items-center gap-1.5 rounded-xl border border-blue-500/50 bg-[#0c1424] px-2.5 py-1.5 shadow-2xl backdrop-blur-xl animate-fade-in nodrag"
              style={{ top: `${tooltipPos.top}px`, left: `${tooltipPos.left}px` }}
            >
              {/* Highlight Swatches */}
              <div className="flex items-center gap-1 border-r border-[#243042] pr-1.5 mr-0.5">
                {[
                  { color: 'yellow', hex: '#fde047' },
                  { color: 'green', hex: '#86efac' },
                  { color: 'blue', hex: '#93c5fd' },
                  { color: 'purple', hex: '#d8b4fe' },
                  { color: 'coral', hex: '#fda4af' },
                ].map((c) => (
                  <button
                    key={c.color}
                    onClick={() => handleApplyHighlight(c.color)}
                    style={{ backgroundColor: c.hex }}
                    className="w-3.5 h-3.5 rounded-full hover:scale-125 transition-transform"
                    title={`Highlight in ${c.color}`}
                  />
                ))}
              </div>

              <button
                onClick={() => {
                  data.onGenerateFromHighlight?.(selectedText, 'flashcard', { title: displayDocTitle, pageNumber: activePage, paragraphIndex: selectedParaId })
                  setSelectedText('')
                  setTooltipPos(null)
                }}
                className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500 hover:text-white transition-colors"
                title="Create active recall flashcard from selection"
              >
                <Zap className="w-3 h-3" />
                <span>Make Card</span>
              </button>
              <button
                onClick={() => {
                  data.onGenerateFromHighlight?.(selectedText, 'quiz', { title: displayDocTitle, pageNumber: activePage, paragraphIndex: selectedParaId })
                  setSelectedText('')
                  setTooltipPos(null)
                }}
                className="inline-flex items-center gap-1 rounded-md bg-blue-500/20 px-2 py-1 text-[11px] font-semibold text-blue-300 hover:bg-blue-500 hover:text-white transition-colors"
                title="Generate practice quiz question testing this concept"
              >
                <CheckSquare className="w-3 h-3" />
                <span>Quiz</span>
              </button>
              <button
                onClick={() => {
                  data.onGenerateFromHighlight?.(selectedText, 'pin', { title: displayDocTitle, pageNumber: activePage, paragraphIndex: selectedParaId })
                  setSelectedText('')
                  setTooltipPos(null)
                }}
                className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                title="Pin quote / formula to canvas"
              >
                <Pin className="w-3 h-3" />
                <span>Pin</span>
              </button>
              <button
                onClick={() => {
                  data.onGenerateFromHighlight?.(selectedText, 'explain', { title: displayDocTitle, pageNumber: activePage, paragraphIndex: selectedParaId })
                  setSelectedText('')
                  setTooltipPos(null)
                }}
                className="inline-flex items-center gap-1 rounded-md bg-purple-500/20 px-2 py-1 text-[11px] font-semibold text-purple-300 hover:bg-purple-500 hover:text-white transition-colors"
                title="Ask AI Study Assistant to explain concept"
              >
                <Brain className="w-3 h-3" />
                <span>Explain</span>
              </button>
            </div>
          )}

          {/* NATIVE PDF EMBED MODE */}
          {viewerTab === 'pdf' ? (
            localFileUrl ? (
              <div className="w-full h-full min-h-[480px] rounded-xl overflow-hidden bg-[#1a2333] border border-slate-800 shadow-2xl flex flex-col">
                <iframe
                  src={`${localFileUrl}#view=FitH&toolbar=1&navpanes=1`}
                  title={displayDocTitle}
                  className="w-full flex-1 border-none rounded-xl"
                  style={{ minHeight: `${nodeHeight - 70}px` }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 w-full min-h-[380px] rounded-2xl border-2 border-dashed border-[#243042] bg-[#0c121e]">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-blue-400 mb-3">
                  <FileText className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Open PDF Document</h4>
                <p className="text-xs text-slate-400 max-w-sm mb-4">
                  Upload your course PDF or lecture slides to view in full fidelity with native annotation controls.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/25 transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Select PDF File</span>
                </button>
              </div>
            )
          ) : (
            /* AUTHENTIC INTERACTIVE A4 PAPER SHEETS MODE */
            <div
              className="w-full flex flex-col items-center space-y-6 transition-transform duration-200 origin-top"
              style={{ transform: `scale(${zoomLevel / 100})` }}
            >
              {pages
                .filter((pg) => pg.pageNumber === activePage || searchQuery.trim().length > 0)
                .map((pg) => {
                  const visibleItems = pg.items.filter((item) => matchesSearch(item.text || item.heading))
                  if (searchQuery.trim() && visibleItems.length === 0) return null

                  return (
                    <div
                      key={pg.pageNumber}
                      className={`w-full max-w-[740px] min-h-[580px] rounded-xl shadow-2xl p-6 sm:p-10 border transition-all ${themeStyle.bg} ${themeStyle.border} ${themeStyle.text}`}
                    >
                      {/* Header Sheet Banner */}
                      <div className={`flex items-center justify-between pb-3 mb-5 border-b text-[11px] font-mono tracking-wider ${themeStyle.rule} ${themeStyle.subtext}`}>
                        <span className="truncate max-w-[280px] uppercase font-semibold">
                          {displayDocTitle}
                        </span>
                        <div className="flex items-center gap-3">
                          {activeRecallMode && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 font-sans font-bold border border-purple-400/40">
                              🧠 Cloze Recall Active
                            </span>
                          )}
                          <span className="font-bold">
                            PAGE {pg.pageNumber} OF {totalPages}
                          </span>
                        </div>
                      </div>

                      {/* Page Content Body */}
                      <div className="space-y-6">
                        {visibleItems.length === 0 ? (
                          <div className="py-12 text-center text-xs opacity-60">
                            No text on this page matches "{searchQuery}".
                          </div>
                        ) : (
                          visibleItems.map((item, idx) => {
                            const isReadingThis = readingParagraphId === item.id
                            const paraMarginNotes = userMarginNotes.filter((mn) => mn.paragraphId === item.id)

                            return (
                              <div
                                key={item.id || idx}
                                className={`group/item relative rounded-xl p-3 -mx-3 transition-all ${
                                  isReadingThis ? 'bg-blue-500/10 ring-2 ring-blue-500/40' : 'hover:bg-slate-500/5'
                                }`}
                              >
                                {item.heading && (
                                  <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <h4 className={`text-sm sm:text-base font-bold font-serif tracking-tight ${themeStyle.heading}`}>
                                      {item.heading}
                                    </h4>
                                    <button
                                      onClick={() => handleStartReadAloud(item)}
                                      className="opacity-0 group-hover/item:opacity-100 text-slate-400 hover:text-blue-500 p-1 text-[10px] transition-opacity"
                                      title="Read this section aloud"
                                    >
                                      <Volume2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}

                                <div className="flex items-start justify-between gap-3">
                                  <p className="text-xs sm:text-[13px] leading-relaxed font-sans text-justify selection:bg-blue-200 selection:text-blue-900 flex-1">
                                    {renderInteractiveText(item)}
                                  </p>

                                  <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity nodrag flex-shrink-0">
                                    {/* Add Margin Note Button */}
                                    <button
                                      onClick={() => setActiveMarginInputParaId(activeMarginInputParaId === item.id ? null : item.id)}
                                      className="text-slate-400 hover:text-purple-600 p-1 text-[10px] rounded transition-colors"
                                      title="Add Margin Annotation / Mnemonic"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Copy Excerpt Button */}
                                    <button
                                      onClick={() => {
                                        navigator.clipboard?.writeText(item.text)
                                        setCopiedId(item.id || idx)
                                        setTimeout(() => setCopiedId(null), 2000)
                                      }}
                                      className="text-slate-400 hover:text-blue-600 p-1 text-[10px] rounded transition-colors"
                                      title="Copy excerpt"
                                    >
                                      {copiedId === (item.id || idx) ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </div>

                                {/* Margin Notes Tray for this paragraph */}
                                {(paraMarginNotes.length > 0 || activeMarginInputParaId === item.id) && (
                                  <div className="mt-3 pt-2.5 border-t border-dashed border-slate-300/40 space-y-2">
                                    {paraMarginNotes.map((mn) => (
                                      <div
                                        key={mn.id}
                                        className={`p-2.5 rounded-lg text-xs flex items-start justify-between gap-2 shadow-sm border ${themeStyle.cardBg}`}
                                      >
                                        <div className="flex items-start gap-2 flex-1">
                                          <Pin className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                                          <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-200">
                                            {mn.text}
                                          </p>
                                        </div>
                                        <button
                                          onClick={() => handleDeleteMarginNote(mn.id)}
                                          className="text-slate-400 hover:text-red-400 p-0.5"
                                          title="Delete note"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ))}

                                    {activeMarginInputParaId === item.id && (
                                      <div className="flex items-center gap-2 pt-1 animate-fade-in">
                                        <input
                                          type="text"
                                          value={marginInputText}
                                          onChange={(e) => setMarginInputText(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleAddMarginNote(item.id)
                                          }}
                                          placeholder="Write a margin note, synthesis, or mnemonic..."
                                          className="flex-1 bg-white dark:bg-[#1a2333] border border-slate-300 dark:border-[#283548] rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                                          autoFocus
                                        />
                                        <button
                                          onClick={() => handleAddMarginNote(item.id)}
                                          className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={() => { setActiveMarginInputParaId(null); setMarginInputText('') }}
                                          className="text-xs text-slate-400 hover:text-white px-1"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>

                      {/* Running Footer Rule */}
                      <div className={`mt-8 pt-4 border-t flex items-center justify-between text-[10px] font-mono opacity-60 ${themeStyle.rule}`}>
                        <span>HydrusLearn Verified Syllabus Chunk</span>
                        <span>§ Section {pg.pageNumber}.1</span>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>

      {/* Resize Corner Handle */}
      <div
        onMouseDown={handleResizeStart}
        className="nodrag absolute bottom-1 right-1 z-20 flex h-6 w-6 cursor-se-resize items-center justify-center rounded-br-2xl text-[#64748b] hover:text-white transition-colors group"
        title="Drag corner to resize PDF viewer"
      >
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" className="opacity-60 group-hover:opacity-100">
          <path d="M14 2 L2 14" strokeLinecap="round" />
          <path d="M14 7 L7 14" strokeLinecap="round" />
          <path d="M14 12 L12 14" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}

function CanvasPageHeaderNode({ data }) {
  const categories = data.categories || ['all', 'flashcards', 'quiz', 'feynman', 'cloze', 'scenario', 'notes']
  const accentColor = data.accent || 'blue'

  const getAccentBadge = () => {
    if (accentColor === 'purple') return 'text-purple-400 bg-purple-500/15 border-purple-500/30'
    if (accentColor === 'emerald') return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
    return 'text-blue-400 bg-blue-500/15 border-blue-500/30'
  }

  return (
    <div className="select-none rounded-2xl border border-slate-800/90 bg-[#0d1322]/95 backdrop-blur-xl shadow-2xl p-3.5 min-w-[540px] max-w-[680px]">
      {/* Top Header / Drag Handle */}
      <div className="canvas-node-drag-handle flex items-center justify-between gap-3 pb-2.5 mb-2.5 border-b border-slate-800/80 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2">
          {data.icon === 'share' ? (
            <Share2 className="w-4 h-4 text-purple-400" />
          ) : data.icon === 'marketplace' ? (
            <Globe className="w-4 h-4 text-emerald-400" />
          ) : (
            <Bookmark className="w-4 h-4 text-blue-400" />
          )}
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-white">
            {data.title}
          </span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono border ${getAccentBadge()}`}>
            {data.count} {data.count === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 nodrag">
          {data.onRefresh && (
            <button
              onClick={data.onRefresh}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Refresh items"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${data.loading ? 'animate-spin' : ''}`} />
            </button>
          )}
          {data.onClose && (
            <button
              onClick={data.onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/20 transition-colors"
              title="Close section from canvas"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search & Category Pills */}
      <div className="space-y-2.5 nodrag">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={data.search || ''}
            onChange={(e) => data.onSearchChange?.(e.target.value)}
            placeholder={`Filter ${data.title.toLowerCase()}...`}
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {categories.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider flex-shrink-0 flex items-center gap-1">
              <Filter className="w-2.5 h-2.5" /> Topic:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => data.onCategoryChange?.(cat)}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all capitalize whitespace-nowrap ${
                  data.category === cat
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SavedToolCardNode({ data }) {
  const tool = data.tool || {}
  const meta = extractToolMetadata(tool)

  return (
    <div className="select-none w-[340px] rounded-2xl border border-slate-800/90 bg-[#0e1626]/95 backdrop-blur-xl hover:border-blue-500/50 shadow-xl transition-all hover:shadow-2xl hover:shadow-blue-500/10 p-4 flex flex-col justify-between group">
      <div>
        {/* Card Header / Drag Handle */}
        <div className="canvas-node-drag-handle flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800/80 cursor-grab active:cursor-grabbing">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30">
            {meta.toolType || 'Study Tool'}
          </span>
          <div className="flex items-center gap-1 nodrag opacity-0 group-hover:opacity-100 transition-opacity">
            {data.onShare && (
              <button
                onClick={data.onShare}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Share Tool"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            )}
            {data.onExportAnki && (
              <button
                onClick={data.onExportAnki}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Export Anki CSV"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
            {data.onDelete && (
              <button
                onClick={data.onDelete}
                className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/20 transition-colors"
                title="Delete from Library"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Card Content */}
        <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-1 mb-1">
          {meta.title || 'Interactive Tool'}
        </h4>
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
          {meta.description || 'Interactive revision kit with practice concepts and recall testing.'}
        </p>
      </div>

      {/* Card Footer with Launch Button */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 nodrag">
        <span className="text-[10px] text-slate-500 font-mono">
          {meta.items?.length ? `${meta.items.length} cards` : 'Interactive'}
        </span>
        <button
          onClick={data.onLaunch}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md hover:shadow-blue-500/25 active:scale-95"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Launch Tool</span>
        </button>
      </div>
    </div>
  )
}

function SharedToolCardNode({ data }) {
  const tool = data.tool || {}
  const meta = extractToolMetadata(tool)

  return (
    <div className="select-none w-[340px] rounded-2xl border border-purple-500/30 bg-[#130f24]/95 backdrop-blur-xl hover:border-purple-500/60 shadow-xl transition-all hover:shadow-2xl hover:shadow-purple-500/10 p-4 flex flex-col justify-between group">
      <div>
        <div className="canvas-node-drag-handle flex items-center justify-between gap-2 pb-2 mb-2 border-b border-purple-900/40 cursor-grab active:cursor-grabbing">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/30">
            {meta.toolType || 'Shared Tool'}
          </span>
          {tool.sender_email && (
            <span className="text-[11px] text-purple-300 font-medium truncate max-w-[140px]" title={`Shared by ${tool.sender_email}`}>
              From: {tool.sender_email.split('@')[0]}
            </span>
          )}
        </div>

        <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1 mb-1">
          {meta.title || 'Shared Tool'}
        </h4>
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
          {meta.description || 'Shared study session and revision kit.'}
        </p>
      </div>

      <div className="pt-2 border-t border-purple-900/40 flex items-center justify-between gap-2 nodrag">
        {data.onSave && (
          <button
            onClick={data.onSave}
            className="text-[11px] font-semibold text-slate-300 hover:text-white px-2 py-1 rounded hover:bg-slate-800 flex items-center gap-1 transition-colors"
          >
            <Bookmark className="w-3 h-3 text-purple-400" />
            <span>Save Copy</span>
          </button>
        )}
        <button
          onClick={data.onLaunch}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all shadow-md hover:shadow-purple-500/25 ml-auto active:scale-95"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Launch Tool</span>
        </button>
      </div>
    </div>
  )
}

function MarketplaceCardNode({ data }) {
  const tool = data.tool || {}
  const meta = extractToolMetadata(tool)

  return (
    <div className="select-none w-[340px] rounded-2xl border border-emerald-500/30 bg-[#0d1c1c]/95 backdrop-blur-xl hover:border-emerald-500/60 shadow-xl transition-all hover:shadow-2xl hover:shadow-emerald-500/10 p-4 flex flex-col justify-between group">
      <div>
        <div className="canvas-node-drag-handle flex items-center justify-between gap-2 pb-2 mb-2 border-b border-emerald-900/40 cursor-grab active:cursor-grabbing">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            {meta.toolType || 'Community'}
          </span>
          {tool.category && (
            <span className="text-[10px] text-emerald-400/80 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 font-mono">
              {tool.category}
            </span>
          )}
        </div>

        <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1 mb-1">
          {meta.title || 'Community Tool'}
        </h4>
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-2">
          {meta.description || 'Public study revision tool shared with the community.'}
        </p>

        {Array.isArray(tool.tags) && tool.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tool.tags.slice(0, 3).map((tg, idx) => (
              <span key={idx} className="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.2 rounded">
                #{tg}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-emerald-900/40 flex items-center justify-between gap-2 nodrag">
        {data.onSave && (
          <button
            onClick={data.onSave}
            className="text-[11px] font-semibold text-slate-300 hover:text-white px-2 py-1 rounded hover:bg-slate-800 flex items-center gap-1 transition-colors"
          >
            <Bookmark className="w-3 h-3 text-emerald-400" />
            <span>Fork / Save</span>
          </button>
        )}
        <button
          onClick={data.onLaunch}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md hover:shadow-emerald-500/25 ml-auto active:scale-95"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Launch Tool</span>
        </button>
      </div>
    </div>
  )
}

const canvasNodeTypes = {
  welcome: WelcomeNode,
  thread: ThreadNode,
  tool: ToolNode,
  sticky: StickyNoteNode,
  pin: PinNode,
  checklist: ChecklistNode,
  pdfViewer: PdfViewerNode,
  pageHeader: CanvasPageHeaderNode,
  toolCard: SavedToolCardNode,
  sharedCard: SharedToolCardNode,
  marketplaceCard: MarketplaceCardNode,
}

function CanvasViewAutoFitter({ activeView, nodeCount, hasTool }) {
  const { fitView } = useReactFlow()
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.28, duration: 400, maxZoom: 0.76 })
    }, 80)
    return () => clearTimeout(timer)
  }, [activeView, nodeCount, hasTool, fitView])
  return null
}

function CanvasViewportControls() {
  const { zoomIn, zoomOut, fitView, setViewport, getZoom } = useReactFlow()
  const [zoomLevel, setZoomLevel] = useState(80)

  useEffect(() => {
    const updateZoom = () => {
      try {
        setZoomLevel(Math.round(getZoom() * 100))
      } catch {}
    }
    const interval = setInterval(updateZoom, 500)
    return () => clearInterval(interval)
  }, [getZoom])

  return (
    <div className="nodrag absolute bottom-4 right-4 z-20 flex items-center gap-1 rounded-xl border border-[#282E38] bg-[#0c1017]/95 px-1.5 py-1 shadow-2xl backdrop-blur-xl select-none">
      <button
        onClick={() => zoomOut({ duration: 200 })}
        className="p-1 rounded-lg text-[#8493a8] hover:text-white hover:bg-[#1a2130] transition-colors"
        title="Zoom Out (-)"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setViewport({ x: 60, y: 30, zoom: 0.8 }, { duration: 200 })}
        className="px-2 py-0.5 rounded-lg text-[11px] font-mono text-[#cbd5e1] hover:text-white hover:bg-[#1a2130] transition-colors"
        title="Reset Zoom to 80%"
      >
        {zoomLevel}%
      </button>
      <button
        onClick={() => zoomIn({ duration: 200 })}
        className="p-1 rounded-lg text-[#8493a8] hover:text-white hover:bg-[#1a2130] transition-colors"
        title="Zoom In (+)"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
      <div className="h-3.5 w-px bg-[#282E38] mx-0.5" />
      <button
        onClick={() => fitView({ padding: 0.25, duration: 300 })}
        className="p-1 rounded-lg text-[#8493a8] hover:text-white hover:bg-[#1a2130] transition-colors"
        title="Fit Content to Screen (F)"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default function Learningplayground() {
  const { user, session, signOut } = useAuth()
  const location = useLocation()

  const [messages, setMessages] = useState([])
  const [suggestions, setSuggestions] = useState(defaultSuggestions)
  const [isLoadingTierStatus, setIsLoadingTierStatus] = useState(false)
  const [tierStatus, setTierStatus] = useState(null)
  const toolsQuota = (tierStatus?.quotas || []).find((quota) => quota.actionType === 'learning_tool_generate')

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isSidebarHovered, setIsSidebarHovered] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeNavSection, setActiveNavSection] = useState('chats') // 'chats' | 'saved-tools' | 'community'
  const [savedTools, setSavedTools] = useState([])
  const [isLoadingSavedTools, setIsLoadingSavedTools] = useState(false)
  const [marketplaceTools, setMarketplaceTools] = useState([])
  const [isLoadingMarketplaceTools, setIsLoadingMarketplaceTools] = useState(false)
  const [isThinkingMode, setIsThinkingMode] = useState(false)
  const [showSidebarSearch, setShowSidebarSearch] = useState(false)

  // Active Canvas Page View ('playground' | 'my-tools' | 'shared' | 'marketplace')
  const [activeCanvasView, setActiveCanvasView] = useState('playground')
  const [savedToolsSearch, setSavedToolsSearch] = useState('')
  const [savedToolsCategory, setSavedToolsCategory] = useState('all')
  const [sharedToolsSearch, setSharedToolsSearch] = useState('')
  const [marketplaceSearch, setMarketplaceSearch] = useState('')
  const [marketplaceCategory, setMarketplaceCategory] = useState('all')

  const switchCanvasView = (viewKey) => {
    setActiveCanvasView(viewKey)
    if (viewKey === 'my-tools') fetchSavedTools()
    if (viewKey === 'shared') fetchSharedTools()
    if (viewKey === 'marketplace') fetchMarketplaceTools()
  }

  // Persistent Chat History (Recents) State — strictly scoped to logged-in user
  const [chatHistory, setChatHistory] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Fetch chat sessions from backend database
  const fetchChatSessions = async () => {
    if (!user?.id || !session?.access_token) return
    setIsLoadingHistory(true)
    try {
      const res = await fetch(`${API_BASE}/api/learning-playground/sessions`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.data)) {
          const formatted = data.data.map((row) => ({
            id: String(row.id),
            title: row.title || 'Study Session',
            messages: Array.isArray(row.messages) ? row.messages : [],
            generatedTool: row.generated_tool || null,
            attachedDocument: row.context?.attachedDocument || row.context || null,
            latestPrompt: row.latest_prompt || '',
            updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
          }))
          setChatHistory(formatted)
          try {
            const userKey = `learning_playground_chat_history_${user.id}`
            localStorage.setItem(userKey, JSON.stringify(formatted))
          } catch {}
        }
      }
    } catch (err) {
      console.error('Failed to fetch chat sessions from server:', err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Load chat history ONLY when authenticated with a valid user
  useEffect(() => {
    if (user?.id) {
      try {
        const userKey = `learning_playground_chat_history_${user.id}`
        const saved = localStorage.getItem(userKey)
        if (saved) {
          setChatHistory(JSON.parse(saved))
        }
      } catch {
        setChatHistory([])
      }
      // Also fetch from backend if access token is available
      if (session?.access_token) {
        fetchChatSessions()
      }
    } else {
      // User is logged out — clear all in-memory chats and remove any legacy unauthenticated cache
      setChatHistory([])
      setActiveChatId(null)
      setMessages([])
      setGeneratedTool(null)
      setAttachedDocument(null)
      try {
        localStorage.removeItem('learning_playground_chat_history')
      } catch { }
    }
  }, [user?.id, session?.access_token])

  // Save chat history ONLY when logged in
  useEffect(() => {
    if (user?.id) {
      try {
        const userKey = `learning_playground_chat_history_${user.id}`
        localStorage.setItem(userKey, JSON.stringify(chatHistory))
      } catch (err) {
        console.error('Failed to save chat history:', err)
      }
    }
  }, [chatHistory, user?.id])

  // Document & Multi-Modal RAG State
  const [attachedDocument, setAttachedDocument] = useState(null) // { id, title }
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadTab, setUploadTab] = useState('document') // 'document' | 'youtube' | 'audio' | 'image-ocr'
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [audioFile, setAudioFile] = useState(null)
  const [ocrImageFile, setOcrImageFile] = useState(null)
  const [uploadInstruction, setUploadInstruction] = useState('')
  const [selectedIngestFormat, setSelectedIngestFormat] = useState('')
  const [isUploadingDoc, setIsUploadingDoc] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  // Voice recording state in modal
  const [isRecordingMic, setIsRecordingMic] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingTimerRef = useRef(null)

  // In-Canvas Inline Editor State
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingToolType, setEditingToolType] = useState('flashcards')
  const [editingTitle, setEditingTitle] = useState('')
  const [editingDesc, setEditingDesc] = useState('')
  const [editingItems, setEditingItems] = useState([])
  // Marketplace & Publishing State
  const [showMarketplaceExplorer, setShowMarketplaceExplorer] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [publishTargetTool, setPublishTargetTool] = useState(null)
  const [publishTitle, setPublishTitle] = useState('')
  const [publishDescription, setPublishDescription] = useState('')
  const [publishCategory, setPublishCategory] = useState('STEM & Medicine')
  const [publishTags, setPublishTags] = useState('')
  const [publishIsPublic, setPublishIsPublic] = useState(true)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishSuccessMessage, setPublishSuccessMessage] = useState('')
  const [marketplaceFilterCategory, setMarketplaceFilterCategory] = useState('all')
  const [marketplaceSearchQuery, setMarketplaceSearchQuery] = useState('')
  // Power Features State (Morphing, Global Ingest, Exports, Sharing)
  const [activeMorphFormat, setActiveMorphFormat] = useState('')
  const [isGlobalDragging, setIsGlobalDragging] = useState(false)
  const [pastedYouTubeUrl, setPastedYouTubeUrl] = useState('')
  const [shareToastMessage, setShareToastMessage] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [sharedTools, setSharedTools] = useState([])
  const [isLoadingSharedTools, setIsLoadingSharedTools] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareModalTargetTool, setShareModalTargetTool] = useState(null)
  const [shareEmailRecipient, setShareEmailRecipient] = useState('')
  const [isSharingEmail, setIsSharingEmail] = useState('')
  const [shareError, setShareError] = useState('')

  // Grounded Document Split-Viewer & Interactive Source Citations
  const [showCitationViewer, setShowCitationViewer] = useState(false)
  const [activeCitationTarget, setActiveCitationTarget] = useState(null)
  const [activeCitationDocTitle, setActiveCitationDocTitle] = useState('')
  const [userDocuments, setUserDocuments] = useState([])

  const handleOpenCitationViewer = (citation = null, docTitle = null) => {
    const titleToUse = docTitle || citation?.documentTitle || citation?.title || attachedDocument?.title
    if (!titleToUse) {
      setShareToastMessage('No document attached to this chat session.')
      setTimeout(() => setShareToastMessage(''), 3000)
      return
    }
    setActiveCitationDocTitle(titleToUse)
    setActiveCitationTarget(citation)
    setShowCitationViewer(true)
  }

  const handleGenerateFromHighlight = (text, actionType, citationMeta) => {
    if (!text) return
    const docName = citationMeta?.title || activeCitationDocTitle || 'Source Document'
    const pageNum = citationMeta?.pageNumber || 1
    const paraIdx = citationMeta?.paragraphIndex || 1

    if (actionType === 'flashcard') {
      const newCard = {
        id: `card_${Date.now()}`,
        front: text.length > 90 ? `${text.slice(0, 85)}...` : text,
        back: `Directly excerpted from "${docName}" (Page ${pageNum}, Paragraph ${paraIdx}).\n\nFull Quote:\n"${text}"`,
        citation: citationMeta,
      }
      if (generatedTool) {
        const meta = extractToolMetadata(generatedTool)
        const updatedItems = [newCard, ...(meta.items || [])]
        const updated = {
          ...generatedTool,
          items: updatedItems,
          html: morphToolToHtml('flashcards', meta.title || docName, meta.description, updatedItems),
        }
        setGeneratedTool(updated)
      } else {
        const newDeck = {
          id: `tool_${Date.now()}`,
          title: `${docName} Review Cards`,
          description: `Active recall cards annotated directly from ${docName}`,
          toolType: 'flashcards',
          items: [newCard],
          html: morphToolToHtml('flashcards', `${docName} Review Cards`, 'Annotated from document', [newCard]),
        }
        setGeneratedTool(newDeck)
      }
      setShareToastMessage(`⚡ Created Flashcard from quote! (Page ${pageNum})`)
      setTimeout(() => setShareToastMessage(''), 3500)
    } else if (actionType === 'quiz') {
      const prompt = `Generate an interactive multiple-choice quiz question testing this specific excerpt from "${docName}" (Page ${pageNum}):\n\n"${text}"`
      handleSendMessage(prompt)
      setShowCitationViewer(false)
    } else if (actionType === 'pin') {
      handleAddPinNode(360, 160)
      setCanvasUserNotes((prev) => {
        const last = prev[prev.length - 1]
        if (!last) return prev
        const updated = {
          ...last,
          title: `Quote • ${docName} (p.${pageNum})`,
          content: `"${text}"`,
        }
        debouncedSyncNote(updated)
        return prev.map((n) => (n.id === last.id ? updated : n))
      })
      setShareToastMessage(`📌 Pinned quote to canvas!`)
      setTimeout(() => setShareToastMessage(''), 3500)
    } else if (actionType === 'explain') {
      const prompt = `Explain this concept in plain English with an active recall question, grounded in "${docName}":\n\n"${text}"`
      handleSendMessage(prompt)
      setShowCitationViewer(false)
    }
  }


  const audioInputRef = useRef(null)
  const imageInputRef = useRef(null)
  const dragCounterRef = useRef(0)

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current += 1
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
    if (!isDraggingOver) {
      setIsDraggingOver(true)
    }
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1)
    if (dragCounterRef.current === 0) {
      setIsDraggingOver(false)
    }
  }

  const validateAndSetFile = (f) => {
    if (!f) return
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ]
    if (!validTypes.includes(f.type) && !/\.(pdf|doc|docx|txt)$/i.test(f.name)) {
      setUploadError('Please upload a valid PDF, DOC, DOCX, or TXT file.')
      return
    }
    if (f.size > 15 * 1024 * 1024) {
      setUploadError('File size must be under 15MB.')
      return
    }
    setUploadError('')
    setUploadFile(f)
    if (!uploadTitle) {
      setUploadTitle(f.name.replace(/\.[^/.]+$/, ''))
    }
  }

  const handleDropFile = (e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    setIsDraggingOver(false)

    const droppedFile = e.dataTransfer?.files?.[0]
    if (!droppedFile) return

    const docTitle = droppedFile.name.replace(/\.[^/.]+$/, '')

    // If a PDF is dropped directly onto the canvas:
    if (droppedFile.type === 'application/pdf' || droppedFile.name.toLowerCase().endsWith('.pdf')) {
      const fileBlobUrl = URL.createObjectURL(droppedFile)
      setUploadFile(droppedFile)
      setUploadTitle(docTitle)

      // Calculate drop coordinates on canvas relative to canvas viewport
      const rect = toolContainerRef.current?.getBoundingClientRect?.() || e.currentTarget?.getBoundingClientRect?.()
      const dropX = rect ? Math.max(60, Math.round(e.clientX - rect.left - 200)) : 340
      const dropY = rect ? Math.max(60, Math.round(e.clientY - rect.top - 120)) : 140

      const newDocNode = {
        id: `pdf_${Date.now()}`,
        type: 'pdfViewer',
        title: docTitle,
        fileUrl: fileBlobUrl,
        position: { x: dropX, y: dropY },
        width: 880,
        height: 640,
        sessionId: activeChatId || null,
      }
      setCanvasUserNotes((prev) => [...prev, newDocNode])
      debouncedSyncNote(newDocNode)

      // Attach to active study session
      const docObj = {
        id: `doc_${Date.now()}`,
        title: docTitle,
        fileUrl: fileBlobUrl,
      }
      setAttachedDocument(docObj)

      setShareToastMessage(`📄 Dropped "${docTitle}" directly into canvas reader!`)
      setTimeout(() => setShareToastMessage(''), 3500)

      // Background upload to Supabase Storage & vector embedding extraction
      if (session?.access_token) {
        const formData = new FormData()
        formData.append('document', droppedFile)
        formData.append('title', docTitle)

        fetch(`${API_BASE}/api/upload-document`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          credentials: 'include',
          body: formData,
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.document?.fileUrl) {
              handleUpdateUserNote(newDocNode.id, { fileUrl: data.document.fileUrl })
            }
          })
          .catch((err) => console.warn('Direct drop upload background note:', err))
      }
      return
    }

    // For image / audio / other documents
    if (droppedFile.type.startsWith('image/')) {
      setUploadTab('image-ocr')
      setOcrImageFile(droppedFile)
      if (!uploadTitle) setUploadTitle(docTitle)
      setShowUploadModal(true)
    } else if (droppedFile.type.startsWith('audio/')) {
      setUploadTab('audio')
      setAudioFile(droppedFile)
      if (!uploadTitle) setUploadTitle(docTitle)
      setShowUploadModal(true)
    } else {
      validateAndSetFile(droppedFile)
      setShowUploadModal(true)
    }
  }

  const [generatedTool, setGeneratedTool] = useState(null)
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(true)
  const [chatPanelWidth, setChatPanelWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('lp_chat_panel_width')
      return saved ? Math.max(300, Math.min(760, Number(saved))) : 400
    } catch {
      return 400
    }
  })
  const [isChatPanelResizing, setIsChatPanelResizing] = useState(false)
  const chatResizeRef = useRef({ startX: 0, startW: 400 })

  const handleChatResizeStart = (e) => {
    e.stopPropagation()
    e.preventDefault()
    setIsChatPanelResizing(true)
    chatResizeRef.current = {
      startX: e.clientX,
      startW: chatPanelWidth,
    }

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - chatResizeRef.current.startX
      const nextW = chatResizeRef.current.startW + deltaX
      if (nextW < 220) {
        setIsChatPanelOpen(false)
        setChatPanelWidth(400)
        try {
          localStorage.setItem('lp_chat_panel_width', '400')
        } catch {}
      } else {
        const clamped = Math.max(300, Math.min(760, nextW))
        setIsChatPanelOpen(true)
        setChatPanelWidth(clamped)
        try {
          localStorage.setItem('lp_chat_panel_width', String(clamped))
        } catch {}
      }
    }

    const handleMouseUp = () => {
      setIsChatPanelResizing(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  // Global keyboard shortcut to toggle chat assistant (Ctrl+J or Cmd+J)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        const targetTag = e.target?.tagName?.toLowerCase()
        if (targetTag === 'input' || targetTag === 'textarea' || e.target?.isContentEditable) return
        e.preventDefault()
        setIsChatPanelOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [mobileTab, setMobileTab] = useState('chat') // 'chat' | 'tool'
  const [isToolMaximized, setIsToolMaximized] = useState(false)
  const [generationStage, setGenerationStage] = useState(null)
  const [buildPhase, setBuildPhase] = useState(null) // 'planning' | 'building'
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isChatListening, setIsChatListening] = useState(false)
  const chatRecognitionRef = useRef(null)
  const [canvasNodes, setCanvasNodes, onCanvasNodesChange] = useNodesState([])
  const [canvasUserNotes, setCanvasUserNotes] = useState([])
  const saveTimeoutRef = useRef({})

  // Fetch canvas notes from backend API on mount or when active session changes
  const fetchCanvasNotes = async () => {
    if (!session?.access_token) {
      // Load from localStorage for guest / offline mode
      try {
        const localKey = `canvas_notes_${user?.id || 'guest'}_${activeChatId || 'global'}`
        const localData = localStorage.getItem(localKey)
        if (localData) {
          setCanvasUserNotes(JSON.parse(localData))
        } else {
          setCanvasUserNotes([])
        }
      } catch (err) {
        console.error('Failed to load local canvas notes:', err)
      }
      return
    }

    try {
      const url = activeChatId
        ? `${API_BASE}/api/canvas/notes?sessionId=${activeChatId}`
        : `${API_BASE}/api/canvas/notes`
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.data)) {
          const mapped = data.data.map((n) => ({
            id: String(n.id),
            type: n.type || 'sticky',
            title: n.title || '',
            content: n.content || '',
            items: Array.isArray(n.items) ? n.items : [],
            color: n.color || 'yellow',
            position: { x: Number(n.position_x) || 100, y: Number(n.position_y) || 100 },
            width: Number(n.width) || 260,
            height: Number(n.height) || 220,
            isPinned: Boolean(n.is_pinned),
            sessionId: n.session_id,
            fileUrl: n.file_url || n.fileUrl || null,
          }))
          setCanvasUserNotes(mapped)
          const localKey = `canvas_notes_${user?.id || 'guest'}_${activeChatId || 'global'}`
          localStorage.setItem(localKey, JSON.stringify(mapped))
        }
      }
    } catch (err) {
      console.error('Failed to fetch canvas notes from backend:', err)
    }
  }

  useEffect(() => {
    fetchCanvasNotes()
  }, [session?.access_token, activeChatId])

  // Debounced sync for a single note to DB and localStorage
  const debouncedSyncNote = (note) => {
    const localKey = `canvas_notes_${user?.id || 'guest'}_${activeChatId || 'global'}`
    setCanvasUserNotes((prev) => {
      const exists = prev.some((n) => n.id === note.id)
      const updated = exists ? prev.map((n) => (n.id === note.id ? { ...n, ...note } : n)) : [...prev, note]
      try {
        localStorage.setItem(localKey, JSON.stringify(updated))
      } catch { }
      return updated
    })

    if (!session?.access_token) return

    if (saveTimeoutRef.current[note.id]) {
      clearTimeout(saveTimeoutRef.current[note.id])
    }

    saveTimeoutRef.current[note.id] = setTimeout(async () => {
      try {
        await fetch(`${API_BASE}/api/canvas/notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            id: note.id,
            sessionId: activeChatId || null,
            type: note.type || 'sticky',
            title: note.title || '',
            content: note.content || '',
            items: note.items || [],
            color: note.color || 'yellow',
            positionX: note.position?.x ?? 100,
            positionY: note.position?.y ?? 100,
            width: note.width ?? 260,
            height: note.height ?? 220,
            isPinned: Boolean(note.isPinned),
          }),
        })
      } catch (err) {
        console.error('Failed to sync canvas note to DB:', err)
      }
    }, 500)
  }

  const handleAddStickyNote = (x = 350, y = 140) => {
    const newNote = {
      id: `sticky_${Date.now()}`,
      type: 'sticky',
      title: '',
      content: '',
      color: 'yellow',
      position: { x, y },
      width: 260,
      height: 220,
      isPinned: false,
      sessionId: activeChatId || null,
    }
    setCanvasUserNotes((prev) => [...prev, newNote])
    debouncedSyncNote(newNote)
  }

  const handleAddPinNode = (x = 380, y = 160) => {
    const newPin = {
      id: `pin_${Date.now()}`,
      type: 'pin',
      title: 'Key Formula / Concept',
      content: '',
      position: { x, y },
      isPinned: true,
      sessionId: activeChatId || null,
    }
    setCanvasUserNotes((prev) => [...prev, newPin])
    debouncedSyncNote(newPin)
  }

  const handleAddChecklistNode = (x = 400, y = 180) => {
    const newChecklist = {
      id: `check_${Date.now()}`,
      type: 'checklist',
      title: 'Study Milestones',
      items: [
        { id: '1', text: 'Revise core concepts', done: false },
        { id: '2', text: 'Practice 10 flashcards', done: false },
      ],
      position: { x, y },
      sessionId: activeChatId || null,
    }
    setCanvasUserNotes((prev) => [...prev, newChecklist])
    debouncedSyncNote(newChecklist)
  }

  const handleAddPdfReaderNode = (docTitle = null, fileUrl = null) => {
    const activeDoc = attachedDocument
    if (!activeDoc && !docTitle && !fileUrl) {
      setShareToastMessage('No PDF attached to this chat session. Attach a PDF to view it.')
      setTimeout(() => setShareToastMessage(''), 3000)
      return
    }
    const titleToUse = docTitle || activeDoc?.title || 'PDF Document'
    const fileUrlToUse = fileUrl || activeDoc?.fileUrl || null
    const newDocNode = {
      id: `pdf_${Date.now()}`,
      type: 'pdfViewer',
      title: titleToUse,
      fileUrl: fileUrlToUse,
      position: { x: 400, y: 120 },
      width: 760,
      height: 580,
      sessionId: activeChatId || null,
    }
    setCanvasUserNotes((prev) => [...prev, newDocNode])
    debouncedSyncNote(newDocNode)
    setShareToastMessage(`Opened "${titleToUse}" on canvas!`)
    setTimeout(() => setShareToastMessage(''), 3000)
  }

  const handleUpdateUserNote = (noteId, updates) => {
    setCanvasUserNotes((prev) => {
      const note = prev.find((n) => n.id === noteId)
      if (!note) return prev
      const updatedNote = { ...note, ...updates }
      debouncedSyncNote(updatedNote)
      return prev.map((n) => (n.id === noteId ? updatedNote : n))
    })
  }

  const handleDeleteUserNote = async (noteId) => {
    setCanvasUserNotes((prev) => {
      const remaining = prev.filter((n) => n.id !== noteId)
      const localKey = `canvas_notes_${user?.id || 'guest'}_${activeChatId || 'global'}`
      try {
        localStorage.setItem(localKey, JSON.stringify(remaining))
      } catch { }
      return remaining
    })

    if (session?.access_token) {
      try {
        await fetch(`${API_BASE}/api/canvas/notes/${noteId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          credentials: 'include',
        })
      } catch (err) {
        console.error('Failed to delete canvas note from DB:', err)
      }
    }
  }

  const onCustomCanvasNodesChange = (changes) => {
    onCanvasNodesChange(changes)
  }

  const handleNodeDragStop = (event, node) => {
    if (!node || !node.id || !node.position) return
    if (node.id.startsWith('sticky_') || node.id.startsWith('pin_') || node.id.startsWith('check_') || node.id.startsWith('pdf_') || node.id.length === 36) {
      handleUpdateUserNote(node.id, { position: node.position })
    }
  }

  const handleCanvasDoubleClick = (e) => {
    if (e.target.closest('.nodrag') || e.target.closest('.canvas-node') || e.target.closest('.canvas-sticky-note') || e.target.closest('.canvas-pin-node') || e.target.closest('.canvas-checklist-node') || e.target.closest('.canvas-pdf-viewer-node') || e.target.closest('button')) {
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(40, e.clientX - rect.left - 130)
    const y = Math.max(40, e.clientY - rect.top - 100)
    handleAddStickyNote(x, y)
  }

  const toggleChatVoiceInput = () => {
    if (isChatListening) {
      if (chatRecognitionRef.current) {
        try {
          chatRecognitionRef.current.stop()
        } catch { }
      }
      setIsChatListening(false)
      return
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRec) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.')
      return
    }

    try {
      const recognition = new SpeechRec()
      chatRecognitionRef.current = recognition
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setIsChatListening(true)
      }

      recognition.onresult = (event) => {
        let transcript = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript
        }
        if (transcript.trim()) {
          setInputValue((prev) => {
            const trimmed = prev.trim()
            return trimmed ? `${trimmed} ${transcript.trim()}` : transcript.trim()
          })
        }
      }

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsChatListening(false)
      }

      recognition.onend = () => {
        setIsChatListening(false)
      }

      recognition.start()
    } catch (err) {
      console.error('Failed to start speech recognition:', err)
      setIsChatListening(false)
    }
  }

  // Keyboard shortcut to exit maximized workspace on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isToolMaximized) {
        setIsToolMaximized(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isToolMaximized])

  // Speech bridge to proxy voice recognition from iframe to top-level window
  useEffect(() => {
    let iframeRecognition = null

    const handleWindowMessage = (e) => {
      const data = e.data
      if (!data || typeof data !== 'object') return

      if (data.type === 'START_TOOL_SPEECH' || data.type === 'TOGGLE_TOOL_SPEECH') {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRec) {
          alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.')
          return
        }

        if (iframeRecognition) {
          try { iframeRecognition.stop() } catch { }
          iframeRecognition = null
          return
        }

        try {
          const rec = new SpeechRec()
          iframeRecognition = rec
          rec.continuous = true
          rec.interimResults = true
          rec.lang = 'en-US'

          rec.onstart = () => {
            const iframes = document.querySelectorAll('iframe')
            iframes.forEach((ifr) => {
              try {
                ifr.contentWindow?.postMessage({ type: 'VOICE_STATUS', isListening: true }, '*')
              } catch { }
            })
          }

          rec.onresult = (evt) => {
            let txt = ''
            for (let i = evt.resultIndex; i < evt.results.length; ++i) {
              txt += evt.results[i][0].transcript
            }
            if (txt.trim()) {
              const iframes = document.querySelectorAll('iframe')
              iframes.forEach((ifr) => {
                try {
                  ifr.contentWindow?.postMessage({ type: 'VOICE_RESULT', transcript: txt.trim() }, '*')
                } catch { }
              })
            }
          }

          rec.onerror = (err) => {
            console.error('Tool Speech recognition error:', err)
            iframeRecognition = null
            const iframes = document.querySelectorAll('iframe')
            iframes.forEach((ifr) => {
              try {
                ifr.contentWindow?.postMessage({ type: 'VOICE_STATUS', isListening: false }, '*')
              } catch { }
            })
          }

          rec.onend = () => {
            iframeRecognition = null
            const iframes = document.querySelectorAll('iframe')
            iframes.forEach((ifr) => {
              try {
                ifr.contentWindow?.postMessage({ type: 'VOICE_STATUS', isListening: false }, '*')
              } catch { }
            })
          }

          rec.start()
        } catch (err) {
          console.error('Failed to start tool speech recognition:', err)
          iframeRecognition = null
        }
      } else if (data.type === 'STOP_TOOL_SPEECH') {
        if (iframeRecognition) {
          try { iframeRecognition.stop() } catch { }
          iframeRecognition = null
        }
      } else if (data.type === 'OPEN_CITATION' || data.type === 'VIEW_CITATION') {
        handleOpenCitationViewer(data.citation, data.documentTitle)
      }
    }

    window.addEventListener('message', handleWindowMessage)
    return () => {
      window.removeEventListener('message', handleWindowMessage)
      if (iframeRecognition) {
        try { iframeRecognition.stop() } catch { }
      }
    }
  }, [])

  const selectTool = (tool) => {
    setGeneratedTool(tool)
    setActiveCanvasView('playground')
    setRightPanelOpen(true)
    setMobileTab('tool')
  }

  const openInlineEditor = () => {
    if (!generatedTool) return
    const meta = extractToolMetadata(generatedTool)
    const canonical = meta.toolType || resolveCanonicalToolType(generatedTool.toolType || generatedTool.type, generatedTool)
    setEditingToolType(canonical)
    setEditingTitle(meta.title)
    setEditingDesc(meta.description)

    const rawItems = Array.isArray(meta.items) && meta.items.length > 0
      ? JSON.parse(JSON.stringify(meta.items))
      : []

    const seededItems = rawItems.length > 0 ? rawItems.map((it, idx) => {
      const id = String(it.id || idx + 1)
      if (canonical === 'quiz') {
        let choices = Array.isArray(it.choices)
          ? it.choices.map((c) => (typeof c === 'string' ? c : c.text || c.choice || c.value || String(c))).filter(Boolean)
          : []
        if (choices.length === 0 && it.options && Array.isArray(it.options)) {
          choices = it.options.map((o) => (typeof o === 'string' ? o : o.text || o.choice || String(o))).filter(Boolean)
        }
        if (choices.length < 4) {
          const fallbackSeed = [it.answerText || it.answer || it.back || 'Correct answer', 'Alternative perspective', 'Secondary mechanism', 'None of the above']
          for (const s of fallbackSeed) {
            if (choices.length >= 4) break
            if (!choices.includes(s)) choices.push(s)
          }
        }
        while (choices.length < 4) choices.push(`Choice ${choices.length + 1}`)

        let answer = 'A'
        if (it.answer && ['A', 'B', 'C', 'D'].includes(it.answer.toUpperCase())) {
          answer = it.answer.toUpperCase()
        } else if (it.answerText) {
          const fIdx = choices.findIndex((c) => c.toLowerCase() === it.answerText.toLowerCase())
          if (fIdx !== -1) answer = ['A', 'B', 'C', 'D'][fIdx]
        }

        const answerIndex = ['A', 'B', 'C', 'D'].indexOf(answer)
        const answerText = choices[answerIndex] || choices[0]

        return {
          id,
          question: it.question || it.front || it.concept || it.title || `Question ${idx + 1}`,
          choices: choices.slice(0, 4),
          answer,
          answerText,
          explanation: it.explanation || it.back || it.detail || '',
        }
      }
      if (canonical === 'matching') {
        return {
          id,
          left: it.left || it.term || it.front || it.concept || `Term ${idx + 1}`,
          right: it.right || it.definition || it.back || it.explanation || `Definition ${idx + 1}`,
        }
      }
      if (canonical === 'timeline') {
        return {
          id,
          text: it.text || it.title || it.event || it.front || `Milestone ${idx + 1}`,
          position: Number(it.position || idx + 1),
          detail: it.detail || it.explanation || it.back || it.date || '',
        }
      }
      if (canonical === 'crossword' || canonical === 'wordsearch') {
        const rawWord = String(it.word || it.front || it.term || it.concept || `WORD${idx + 1}`).toUpperCase().replace(/[^A-Z]/g, '')
        return {
          id,
          word: rawWord.length >= 3 ? rawWord : `TERM${idx + 1}`,
          clue: it.clue || it.back || it.definition || it.explanation || `Definition for term ${idx + 1}`,
        }
      }
      if (canonical === 'true-false') {
        const isTrue = it.answerText ? /^(true|t|yes|1)$/i.test(it.answerText) : (it.answer === 'A' || it.isTrue !== false)
        return {
          id,
          question: it.question || it.front || it.prompt || `Statement ${idx + 1}`,
          isTrue,
          answer: isTrue ? 'A' : 'B',
          answerText: isTrue ? 'True' : 'False',
          explanation: it.explanation || it.back || '',
        }
      }
      if (canonical === 'cloze') {
        return {
          id,
          sentence: it.sentence || it.front || it.question || `The [blank] is a fundamental component.`,
          answer: it.answer || it.target || 'key term',
          hint: it.hint || it.explanation || '',
        }
      }
      return {
        id,
        front: it.front || it.question || it.concept || it.term || `Concept ${idx + 1}`,
        back: it.back || it.answer || it.definition || it.explanation || `Details for concept ${idx + 1}`,
      }
    }) : [
      canonical === 'quiz'
        ? { id: '1', question: 'What is the primary concept?', choices: ['Choice A', 'Choice B', 'Choice C', 'Choice D'], answer: 'A', answerText: 'Choice A', explanation: 'Key concept explanation.' }
        : canonical === 'matching'
        ? { id: '1', left: 'Term 1', right: 'Definition 1' }
        : canonical === 'timeline'
        ? { id: '1', text: 'First Milestone', position: 1, detail: 'Initial milestone details.' }
        : canonical === 'crossword' || canonical === 'wordsearch'
        ? { id: '1', word: 'CONCEPT', clue: 'Fundamental idea or principle.' }
        : canonical === 'true-false'
        ? { id: '1', question: 'State whether this concept is valid.', isTrue: true, answer: 'A', answerText: 'True', explanation: 'Core scientific principle verified.' }
        : canonical === 'cloze'
        ? { id: '1', sentence: 'The [mechanism] is a fundamental component.', answer: 'mechanism', hint: 'Core function' }
        : { id: '1', front: 'Concept 1', back: 'Answer 1' }
    ]

    setEditingItems(seededItems)
    setShowEditModal(true)
  }

  const handleSaveInlineEdit = () => {
    if (!generatedTool) return
    const meta = extractToolMetadata(generatedTool)
    const canonical = editingToolType || meta.toolType || resolveCanonicalToolType(generatedTool.toolType || generatedTool.type, generatedTool)

    const normalizedItems = editingItems.map((item, idx) => {
      const id = String(item.id || idx + 1)
      if (canonical === 'quiz') {
        const rawChoices = Array.isArray(item.choices) ? item.choices : []
        const choices = [
          rawChoices[0] || 'Choice A',
          rawChoices[1] || 'Choice B',
          rawChoices[2] || 'Choice C',
          rawChoices[3] || 'Choice D',
        ]
        const answer = ['A', 'B', 'C', 'D'].includes(item.answer) ? item.answer : 'A'
        const answerIndex = ['A', 'B', 'C', 'D'].indexOf(answer)
        const answerText = choices[answerIndex] || choices[0]
        return {
          ...item,
          id,
          question: item.question || item.front || `Question ${idx + 1}`,
          choices,
          answer,
          answerText,
          explanation: item.explanation || item.back || '',
          front: item.question || item.front || `Question ${idx + 1}`,
          back: `${answerText}. ${item.explanation || ''}`,
        }
      }
      if (canonical === 'matching') {
        return {
          ...item,
          id,
          left: item.left || `Term ${idx + 1}`,
          right: item.right || `Definition ${idx + 1}`,
          front: item.left || `Term ${idx + 1}`,
          back: item.right || `Definition ${idx + 1}`,
        }
      }
      if (canonical === 'timeline') {
        return {
          ...item,
          id,
          text: item.text || `Milestone ${idx + 1}`,
          position: Number(item.position || idx + 1),
          detail: item.detail || '',
          front: item.text || `Milestone ${idx + 1}`,
          back: item.detail || '',
        }
      }
      if (canonical === 'crossword' || canonical === 'wordsearch') {
        const cleanWord = String(item.word || `WORD${idx + 1}`).toUpperCase().replace(/[^A-Z]/g, '') || `WORD${idx + 1}`
        return {
          ...item,
          id,
          word: cleanWord,
          clue: item.clue || `Definition for ${cleanWord}`,
          front: cleanWord,
          back: item.clue || `Definition for ${cleanWord}`,
        }
      }
      if (canonical === 'true-false') {
        const isTrue = item.isTrue !== false
        return {
          ...item,
          id,
          question: item.question || `Statement ${idx + 1}`,
          isTrue,
          answer: isTrue ? 'A' : 'B',
          answerText: isTrue ? 'True' : 'False',
          explanation: item.explanation || '',
          front: item.question || `Statement ${idx + 1}`,
          back: `${isTrue ? 'True' : 'False'}. ${item.explanation || ''}`,
        }
      }
      if (canonical === 'cloze') {
        return {
          ...item,
          id,
          sentence: item.sentence || '',
          answer: item.answer || '',
          hint: item.hint || '',
          front: item.sentence || '',
          back: item.answer || '',
        }
      }
      return {
        ...item,
        id,
        front: item.front || `Concept ${idx + 1}`,
        back: item.back || `Definition ${idx + 1}`,
      }
    })

    const newHtml = morphToolToHtml(canonical, editingTitle, editingDesc, normalizedItems)

    const updated = {
      ...generatedTool,
      title: editingTitle,
      description: editingDesc,
      items: normalizedItems,
      toolType: canonical,
      html: newHtml,
      app: { html: newHtml },
      data: {
        ...(generatedTool.data || {}),
        title: editingTitle,
        description: editingDesc,
        items: normalizedItems,
        toolType: canonical,
        html: newHtml,
      },
    }
    setGeneratedTool(updated)
    saveOrUpdateChatSession(messages, updated)
    setShareToastMessage('Tool updated and saved successfully!')
    setTimeout(() => setShareToastMessage(''), 3000)
    setShowEditModal(false)
  }

  const handleAddEditorItem = () => {
    const meta = extractToolMetadata(generatedTool)
    const canonical = editingToolType || meta.toolType || resolveCanonicalToolType(generatedTool.toolType || generatedTool.type, generatedTool)
    const nextId = String(editingItems.length + 1)

    let newItem = { id: nextId, front: `New Concept ${nextId}`, back: `Detailed answer or explanation ${nextId}` }
    if (canonical === 'quiz') {
      newItem = {
        id: nextId,
        question: `New Question ${nextId}`,
        choices: ['Choice A', 'Choice B', 'Choice C', 'Choice D'],
        answer: 'A',
        answerText: 'Choice A',
        explanation: 'Explanation for correct choice.',
      }
    } else if (canonical === 'matching') {
      newItem = {
        id: nextId,
        left: `New Term ${nextId}`,
        right: `Definition for Term ${nextId}`,
      }
    } else if (canonical === 'timeline') {
      newItem = {
        id: nextId,
        text: `New Milestone ${nextId}`,
        position: editingItems.length + 1,
        detail: 'Milestone description and significance.',
      }
    } else if (canonical === 'crossword' || canonical === 'wordsearch') {
      newItem = {
        id: nextId,
        word: `TERM${nextId}`,
        clue: 'Clue and definition for term.',
      }
    } else if (canonical === 'true-false') {
      newItem = {
        id: nextId,
        question: `New Statement ${nextId}`,
        isTrue: true,
        answer: 'A',
        answerText: 'True',
        explanation: 'Why this statement is true or false.',
      }
    } else if (canonical === 'cloze') {
      newItem = {
        id: nextId,
        sentence: `The [blank] is a fundamental component.`,
        answer: 'term',
        hint: 'Key definition',
      }
    }

    setEditingItems((prev) => [...prev, newItem])
  }

  const handleDeleteEditorItem = (idx) => {
    setEditingItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleUpdateEditorItem = (idx, field, val) => {
    setEditingItems((prev) => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: val }
      return copy
    })
  }

  const handleUpdateChoice = (itemIdx, choiceIdx, val) => {
    setEditingItems((prev) => {
      const copy = [...prev]
      const curChoices = Array.isArray(copy[itemIdx]?.choices) ? [...copy[itemIdx].choices] : ['', '', '', '']
      curChoices[choiceIdx] = val
      copy[itemIdx] = {
        ...copy[itemIdx],
        choices: curChoices,
        answerText: curChoices[['A', 'B', 'C', 'D'].indexOf(copy[itemIdx].answer || 'A')] || curChoices[0],
      }
      return copy
    })
  }

  const handleSelectQuizAnswer = (itemIdx, letter) => {
    setEditingItems((prev) => {
      const copy = [...prev]
      const curChoices = copy[itemIdx]?.choices || []
      const choiceIdx = ['A', 'B', 'C', 'D'].indexOf(letter)
      copy[itemIdx] = {
        ...copy[itemIdx],
        answer: letter,
        answerText: curChoices[choiceIdx] || curChoices[0] || '',
      }
      return copy
    })
  }

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const toolContainerRef = useRef(null)
  const fileInputRef = useRef(null)
  const activeHtml = extractToolHtml(generatedTool)
  const activeMeta = extractToolMetadata(generatedTool)
  const isSidebarExpanded = sidebarOpen || isSidebarHovered

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [messages, isLoading])

  useEffect(() => {
    setCanvasNodes((prevNodes) => {
      const previousPositions = new Map(prevNodes.map((node) => [node.id, node.position]))
      const getPosition = (id, fallback) => previousPositions.get(id) || fallback
      const nextNodes = []

      // ── PAGE 1: PLAYGROUND ──
      if (activeCanvasView === 'playground') {
        if (generatedTool || isLoading) {
          nextNodes.push({
            id: 'workspace-tool',
            type: 'tool',
            position: getPosition('workspace-tool', { x: 80, y: 100 }),
            dragHandle: '.canvas-node-drag-handle',
            data: {
              title: generatedTool ? activeMeta.title : 'Building your tool',
              toolType: generatedTool ? activeMeta.toolType : '',
              html: activeHtml,
              hasTool: Boolean(generatedTool),
              loading: isLoading,
              stage: generationStage,
              phase: buildPhase,
              onExpand: generatedTool ? () => setIsToolMaximized(true) : null,
              onClose: generatedTool ? handleUnloadTool : null,
              onEdit: generatedTool ? openInlineEditor : null,
              onViewCitation: (attachedDocument && attachedDocument.title) ? () => handleOpenCitationViewer(null, attachedDocument.title) : null,
              onSave: generatedTool ? () => handleSaveActiveToolToLibrary(generatedTool) : null,
              onShare: generatedTool ? () => handleOpenShareModal(generatedTool) : null,
              onExportMarkdown: generatedTool ? handleExportMarkdown : null,
              onPrintSheet: generatedTool ? handlePrintStudySheet : null,
              onPublish: generatedTool ? () => openPublishModal(generatedTool) : null,
              onSelectSuggestion: (prompt) => handleSendMessage(prompt),
            },
          })
        }
      }

      // ── PAGE 2: SAVED TOOLS ──
      if (activeCanvasView === 'my-tools') {
        const filteredSaved = savedTools.filter((t) => {
          const meta = extractToolMetadata(t)
          const matchesSearch = !savedToolsSearch.trim() ||
            meta.title.toLowerCase().includes(savedToolsSearch.toLowerCase()) ||
            meta.description.toLowerCase().includes(savedToolsSearch.toLowerCase()) ||
            (meta.toolType || '').toLowerCase().includes(savedToolsSearch.toLowerCase())
          const matchesCat = savedToolsCategory === 'all' ||
            (meta.toolType || '').toLowerCase().includes(savedToolsCategory.toLowerCase()) ||
            (t.category || '').toLowerCase().includes(savedToolsCategory.toLowerCase())
          return matchesSearch && matchesCat
        })

        // Floating Header & Filter Bar node
        nextNodes.push({
          id: 'header-saved-tools',
          type: 'pageHeader',
          position: getPosition('header-saved-tools', { x: 60, y: 30 }),
          dragHandle: '.canvas-node-drag-handle',
          data: {
            icon: 'bookmark',
            accent: 'blue',
            title: 'Saved Tools Library',
            count: filteredSaved.length,
            search: savedToolsSearch,
            onSearchChange: setSavedToolsSearch,
            category: savedToolsCategory,
            onCategoryChange: setSavedToolsCategory,
            categories: ['all', 'flashcards', 'quiz', 'feynman', 'cloze', 'scenario', 'notes', 'mindmap'],
            loading: isLoadingSavedTools,
            onRefresh: fetchSavedTools,
            onClose: () => switchCanvasView('playground'),
          },
        })

        // Individual Tool Card Nodes
        if (filteredSaved.length > 0) {
          filteredSaved.forEach((t, i) => {
            const col = i % 3
            const row = Math.floor(i / 3)
            const nodeId = `saved-tool-${t.id}`
            nextNodes.push({
              id: nodeId,
              type: 'toolCard',
              position: getPosition(nodeId, { x: 60 + col * 360, y: 160 + row * 220 }),
              dragHandle: '.canvas-node-drag-handle',
              data: {
                tool: t,
                onLaunch: () => selectTool(t),
                onDelete: (e) => handleDeleteTool(t.id, e),
                onShare: () => handleOpenShareModal(t),
                onExportAnki: () => handleExportAnkiCsv(t),
              },
            })
          })
        } else if (!isLoadingSavedTools) {
          nextNodes.push({
            id: 'empty-saved-tools',
            type: 'sticky',
            position: getPosition('empty-saved-tools', { x: 60, y: 160 }),
            dragHandle: '.canvas-node-drag-handle',
            data: {
              title: 'No saved tools found',
              content: savedToolsSearch || savedToolsCategory !== 'all'
                ? 'Try adjusting your search query or switching the category filter above.'
                : 'Generate your first revision tool from the chat dock below or explore the Marketplace!',
              color: 'blue',
            },
          })
        }
      }

      // ── PAGE 3: SHARED WITH ME ──
      if (activeCanvasView === 'shared') {
        const filteredShared = sharedTools.filter((t) => {
          const meta = extractToolMetadata(t)
          return !sharedToolsSearch.trim() ||
            meta.title.toLowerCase().includes(sharedToolsSearch.toLowerCase()) ||
            (t.sender_email || '').toLowerCase().includes(sharedToolsSearch.toLowerCase())
        })

        nextNodes.push({
          id: 'header-shared-tools',
          type: 'pageHeader',
          position: getPosition('header-shared-tools', { x: 60, y: 30 }),
          dragHandle: '.canvas-node-drag-handle',
          data: {
            icon: 'share',
            accent: 'purple',
            title: 'Shared with Me',
            count: filteredShared.length,
            search: sharedToolsSearch,
            onSearchChange: setSharedToolsSearch,
            category: 'all',
            categories: ['all'],
            loading: isLoadingSharedTools,
            onRefresh: fetchSharedTools,
            onClose: () => switchCanvasView('playground'),
          },
        })

        if (filteredShared.length > 0) {
          filteredShared.forEach((t, i) => {
            const col = i % 3
            const row = Math.floor(i / 3)
            const nodeId = `shared-tool-${t.id}`
            nextNodes.push({
              id: nodeId,
              type: 'sharedCard',
              position: getPosition(nodeId, { x: 60 + col * 360, y: 160 + row * 220 }),
              dragHandle: '.canvas-node-drag-handle',
              data: {
                tool: t,
                onLaunch: () => selectTool(t),
                onSave: (e) => handleForkTool(t, e),
              },
            })
          })
        } else if (!isLoadingSharedTools) {
          nextNodes.push({
            id: 'empty-shared-tools',
            type: 'sticky',
            position: getPosition('empty-shared-tools', { x: 60, y: 160 }),
            dragHandle: '.canvas-node-drag-handle',
            data: {
              title: 'No shared tools yet',
              content: 'When peers share study decks or quizzes with your email address, they will appear right here as visual canvas nodes.',
              color: 'purple',
            },
          })
        }
      }

      // ── PAGE 4: MARKETPLACE ──
      if (activeCanvasView === 'marketplace') {
        const filteredMarketplace = marketplaceTools.filter((t) => {
          const meta = extractToolMetadata(t)
          const matchesSearch = !marketplaceSearch.trim() ||
            meta.title.toLowerCase().includes(marketplaceSearch.toLowerCase()) ||
            meta.description.toLowerCase().includes(marketplaceSearch.toLowerCase()) ||
            (t.tags || []).some(tg => tg.toLowerCase().includes(marketplaceSearch.toLowerCase()))
          const matchesCat = marketplaceCategory === 'all' ||
            (t.category || '').toLowerCase().includes(marketplaceCategory.toLowerCase()) ||
            (meta.toolType || '').toLowerCase().includes(marketplaceCategory.toLowerCase())
          return matchesSearch && matchesCat
        })

        nextNodes.push({
          id: 'header-marketplace',
          type: 'pageHeader',
          position: getPosition('header-marketplace', { x: 60, y: 30 }),
          dragHandle: '.canvas-node-drag-handle',
          data: {
            icon: 'marketplace',
            accent: 'emerald',
            title: 'Community Marketplace',
            count: filteredMarketplace.length,
            search: marketplaceSearch,
            onSearchChange: setMarketplaceSearch,
            category: marketplaceCategory,
            onCategoryChange: setMarketplaceCategory,
            categories: ['all', 'STEM & Medicine', 'Humanities', 'flashcards', 'quiz', 'feynman', 'cloze', 'calculator'],
            loading: isLoadingMarketplaceTools,
            onRefresh: fetchMarketplaceTools,
            onClose: () => switchCanvasView('playground'),
          },
        })

        if (filteredMarketplace.length > 0) {
          filteredMarketplace.forEach((t, i) => {
            const col = i % 3
            const row = Math.floor(i / 3)
            const nodeId = `marketplace-tool-${t.id}`
            nextNodes.push({
              id: nodeId,
              type: 'marketplaceCard',
              position: getPosition(nodeId, { x: 60 + col * 360, y: 160 + row * 240 }),
              dragHandle: '.canvas-node-drag-handle',
              data: {
                tool: t,
                onLaunch: () => selectTool(t),
                onSave: (e) => handleForkTool(t, e),
              },
            })
          })
        } else if (!isLoadingMarketplaceTools) {
          nextNodes.push({
            id: 'empty-marketplace',
            type: 'sticky',
            position: getPosition('empty-marketplace', { x: 60, y: 160 }),
            dragHandle: '.canvas-node-drag-handle',
            data: {
              title: 'No community tools match',
              content: 'Try searching for a different keyword or selecting a different subject topic.',
              color: 'emerald',
            },
          })
        }
      }

      // Add all personal sticky notes, pins, checklists, and PDF document viewers to canvas
      canvasUserNotes.forEach((note) => {
        // PDF document viewers must only render in the specific chat session where they were opened
        if (note.type === 'pdfViewer') {
          if (note.sessionId && activeChatId && note.sessionId !== activeChatId) {
            return
          }
        }

        nextNodes.push({
          id: note.id,
          type: note.type || 'sticky',
          position: getPosition(note.id, note.position || { x: 300, y: 150 }),
          dragHandle: '.canvas-node-drag-handle',
          data: {
            ...note,
            authToken: session?.access_token,
            apiBase: API_BASE,
            onGenerateFromHighlight: handleGenerateFromHighlight,
            onUpdate: handleUpdateUserNote,
            onDelete: handleDeleteUserNote,
          },
        })
      })

      return nextNodes
    })
  }, [
    activeCanvasView, generatedTool, rightPanelOpen, isLoading, generationStage, buildPhase,
    activeHtml, activeMeta.title, activeMeta.toolType, suggestions, messages.length,
    canvasUserNotes, savedTools, sharedTools, marketplaceTools,
    isLoadingSavedTools, isLoadingSharedTools, isLoadingMarketplaceTools,
    savedToolsSearch, savedToolsCategory, sharedToolsSearch, marketplaceSearch, marketplaceCategory
  ])

  // Automatically fetch database tools on mount / auth state change & handle initial view param
  useEffect(() => {
    fetchMarketplaceTools()
    if (session?.access_token) {
      fetchTierStatus()
      fetchSavedTools()
      fetchSharedTools()
    }

    // Check if initial URL param wants to show a page on canvas
    const params = new URLSearchParams(window.location.search)
    const view = params.get('view') || params.get('tab')
    if (view === 'my-tools' || view === 'saved') {
      setActiveCanvasView('my-tools')
      if (session?.access_token) fetchSavedTools()
    } else if (view === 'shared') {
      setActiveCanvasView('shared')
      if (session?.access_token) fetchSharedTools()
    } else if (view === 'marketplace') {
      setActiveCanvasView('marketplace')
      fetchMarketplaceTools()
    }
  }, [session?.access_token])

  // Deep-linking tool loader from URL query (?toolId=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const deepToolId = params.get('toolId')
    if (deepToolId) {
      const loadDeepTool = async () => {
        try {
          const res = await fetch(`${API_BASE}/api/marketplace/tools/public?limit=100`, {
            credentials: 'include',
          })
          if (res.ok) {
            const data = await res.json()
            const found = (data.data || []).find((t) => String(t.id) === String(deepToolId))
            if (found) selectTool(found)
          }
        } catch (err) {
          console.error('Deep link tool load error:', err)
        }
      }
      loadDeepTool()
    }
  }, [])

  // Global Drag & Drop + Clipboard Paste Auto-Detection
  useEffect(() => {
    let dragCounter = 0

    const handleWindowDragEnter = (e) => {
      e.preventDefault()
      dragCounter++
      if (e.dataTransfer?.types?.includes('Files')) {
        setIsGlobalDragging(true)
      }
    }

    const handleWindowDragLeave = (e) => {
      e.preventDefault()
      dragCounter--
      if (dragCounter <= 0) {
        setIsGlobalDragging(false)
        dragCounter = 0
      }
    }

    const handleWindowDragOver = (e) => {
      e.preventDefault()
    }

    const handleWindowDrop = (e) => {
      e.preventDefault()
      dragCounter = 0
      setIsGlobalDragging(false)
      const files = e.dataTransfer?.files
      if (files && files.length > 0) {
        const file = files[0]
        if (file.type.startsWith('image/')) {
          setOcrImageFile(file)
          setUploadTab('image-ocr')
          setUploadTitle(file.name.replace(/\.[^/.]+$/, ''))
          setShowUploadModal(true)
        } else {
          validateAndSetFile(file)
          setUploadTab('document')
          setShowUploadModal(true)
        }
      }
    }

    const handleWindowPaste = (e) => {
      const clipboardData = e.clipboardData
      if (!clipboardData) return

      // 1. Check for image paste (screenshot)
      const items = clipboardData.items
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith('image/')) {
            const blob = items[i].getAsFile()
            if (blob) {
              setOcrImageFile(blob)
              setUploadTab('image-ocr')
              setUploadTitle(`Pasted Screenshot (${new Date().toLocaleTimeString()})`)
              setShowUploadModal(true)
              return
            }
          }
        }
      }

      // 2. Check for YouTube link paste
      const pastedText = clipboardData.getData('text') || ''
      const ytMatch = pastedText.match(/(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/)
      if (ytMatch) {
        setPastedYouTubeUrl(ytMatch[0])
      }
    }

    window.addEventListener('dragenter', handleWindowDragEnter)
    window.addEventListener('dragleave', handleWindowDragLeave)
    window.addEventListener('dragover', handleWindowDragOver)
    window.addEventListener('drop', handleWindowDrop)
    window.addEventListener('paste', handleWindowPaste)

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter)
      window.removeEventListener('dragleave', handleWindowDragLeave)
      window.removeEventListener('dragover', handleWindowDragOver)
      window.removeEventListener('drop', handleWindowDrop)
      window.removeEventListener('paste', handleWindowPaste)
    }
  }, [])

  // Zero-Latency Client-Side Tool Morpher
  const handleMorphTool = (targetFormat) => {
    if (!generatedTool) return
    const meta = extractToolMetadata(generatedTool)
    const newHtml = morphToolToHtml(targetFormat, meta.title, meta.description, meta.items)
    setActiveMorphFormat(targetFormat)
    setGeneratedTool((prev) => ({
      ...prev,
      toolType: targetFormat,
      tool_type: targetFormat,
      html: newHtml,
      app: { html: newHtml },
    }))
  }

  // Anki / Quizlet CSV Deck Exporter
  const handleExportAnkiCsv = () => {
    if (!generatedTool) return
    const meta = extractToolMetadata(generatedTool)
    const items = meta.items || []
    if (!items.length) {
      alert('No card items available to export.')
      return
    }

    const csvContent = items
      .map((item) => {
        const front = String(item.front || item.question || item.concept || item.word || item.title || '').replace(/"/g, '""').replace(/\n/g, ' ')
        const back = String(item.back || item.answer || item.definition || item.explanation || item.detail || '').replace(/"/g, '""').replace(/\n/g, ' ')
        return `"${front}"\t"${back}"`
      })
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/tab-separated-values;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(meta.title || 'Revision_Cards').replace(/[^a-z0-9]/gi, '_')}_Anki_Deck.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
  }

  // Printable Study Sheet & Cornell Notes Generator
  const handlePrintStudySheet = () => {
    if (!generatedTool) return
    const meta = extractToolMetadata(generatedTool)
    const items = meta.items || []
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${meta.title} - Printable Revision Sheet</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 2rem; color: #111; max-width: 850px; margin: 0 auto; line-height: 1.5; }
          h1 { font-size: 1.6rem; border-bottom: 2px solid #222; padding-bottom: 0.5rem; margin-bottom: 0.5rem; }
          p.desc { color: #555; font-size: 0.9rem; margin-bottom: 1.5rem; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
          .card-box { border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 1rem; background: #f8fafc; page-break-inside: avoid; }
          .card-front { font-weight: 800; font-size: 1rem; color: #1e293b; margin-bottom: 0.4rem; }
          .card-back { color: #475569; font-size: 0.875rem; }
          @media print { body { padding: 0.5in; } }
        </style>
      </head>
      <body>
        <h1>${meta.title}</h1>
        <p class="desc">${meta.description || 'Printable study revision notes and key concepts'}</p>
        <div class="grid">
          ${items.map((it, i) => `
            <div class="card-box">
              <div class="card-front">${i + 1}. ${it.front || it.concept || it.word || it.question || 'Concept'}</div>
              <div class="card-back">${it.back || it.answer || it.definition || it.explanation || ''}</div>
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 400)
    setShowExportMenu(false)
  }

  // Markdown Study Guide Exporter
  const handleExportMarkdown = () => {
    if (!generatedTool) return
    const meta = extractToolMetadata(generatedTool)
    const items = meta.items || []
    const mdLines = [
      `# ${meta.title || 'Interactive Study Tool'}`,
      `> ${meta.description || 'Study revision guide & key concepts'}`,
      '',
      `**Tool Format:** ${meta.toolType || 'Study Tool'}`,
      `**Exported:** ${new Date().toLocaleDateString()}`,
      '',
      '---',
      '',
      '## Key Concepts & Review Cards',
      '',
    ]

    items.forEach((it, idx) => {
      const q = it.front || it.concept || it.word || it.question || it.left || `Concept ${idx + 1}`
      const a = it.back || it.answer || it.definition || it.explanation || it.detail || it.right || ''
      mdLines.push(`### ${idx + 1}. ${q}`)
      if (a) mdLines.push(a)
      mdLines.push('')
    })

    const blob = new Blob([mdLines.join('\n')], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(meta.title || 'Study_Notes').replace(/[^a-z0-9]/gi, '_')}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
    setShareToastMessage('Markdown file downloaded successfully!')
    setTimeout(() => setShareToastMessage(''), 3000)
  }

  // 1-Click Direct Tool Share Link Generator
  const handleCopyShareLink = async (tool) => {
    const target = tool || generatedTool
    if (!target) return
    const meta = extractToolMetadata(target)
    const urlParams = target.id
      ? `?toolId=${target.id}`
      : (activeChatId ? `?sessionId=${activeChatId}` : '')

    const shareUrl = `${window.location.origin}${window.location.pathname}${urlParams}`

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl)
      } else {
        const temp = document.createElement('input')
        temp.value = shareUrl
        document.body.appendChild(temp)
        temp.select()
        document.execCommand('copy')
        document.body.removeChild(temp)
      }
      setShareToastMessage(`Direct share link copied to clipboard!`)
      setTimeout(() => setShareToastMessage(''), 3500)
    } catch {
      prompt('Copy shareable study link:', shareUrl)
    }
  }


  const fetchTierStatus = async () => {
    if (!session?.access_token) return
    setIsLoadingTierStatus(true)
    try {
      const response = await fetch(`${API_BASE}/api/tier-status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      })
      if (!response.ok) return
      const data = await response.json()
      setTierStatus(data?.data || null)
    } catch {
      setTierStatus(null)
    } finally {
      setIsLoadingTierStatus(false)
    }
  }

  const fetchSavedTools = async () => {
    if (!session?.access_token) return
    setIsLoadingSavedTools(true)
    try {
      const response = await fetch(`${API_BASE}/api/marketplace/tools/saved`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        credentials: 'include',
      })
      if (!response.ok) return
      const data = await response.json()
      const toolsList = data.data || []
      setSavedTools(toolsList)
    } catch (err) {
      console.error('Failed to fetch saved tools:', err)
    } finally {
      setIsLoadingSavedTools(false)
    }
  }

  const fetchMarketplaceTools = async () => {
    setIsLoadingMarketplaceTools(true)
    try {
      const headers = {}
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }
      const response = await fetch(`${API_BASE}/api/marketplace/tools/public?limit=20`, {
        headers,
        credentials: 'include',
      })
      if (!response.ok) return
      const data = await response.json()
      const mTools = data.data || []
      setMarketplaceTools(mTools)
    } catch (err) {
      console.error('Failed to fetch marketplace tools:', err)
    } finally {
      setIsLoadingMarketplaceTools(false)
    }
  }

  const fetchSharedTools = async () => {
    if (!session?.access_token) return
    setIsLoadingSharedTools(true)
    try {
      const response = await fetch(`${API_BASE}/api/marketplace/tools/shared-with-me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        credentials: 'include',
      })
      if (!response.ok) return
      const data = await response.json()
      setSharedTools(data.data || [])
    } catch (err) {
      console.error('Failed to fetch shared tools:', err)
    } finally {
      setIsLoadingSharedTools(false)
    }
  }

  // Ensure tool is saved to backend to get an ID before sharing
  const handleOpenShareModal = async (tool) => {
    const target = tool || generatedTool
    if (!target) return
    setShareError('')
    setShareEmailRecipient('')

    // If tool already has a database ID, open modal directly
    if (target.id && String(target.id).includes('-')) {
      setShareModalTargetTool(target)
      setShowShareModal(true)
      return
    }

    // Otherwise, automatically save it with shared-link visibility so it gets a UUID
    if (session?.access_token) {
      const meta = extractToolMetadata(target)
      try {
        const res = await fetch(`${API_BASE}/api/marketplace/tools/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            title: meta.title || 'Interactive Learning Tool',
            description: meta.description || 'Study revision guide',
            tool_type: meta.toolType || 'flashcards',
            category: 'General Revision',
            tags: ['shared', meta.toolType || 'study'],
            generated_tool: target,
            visibility: 'shared-link',
          }),
        })
        const data = await res.json()
        if (res.ok && data.tool?.id) {
          const updated = { ...target, id: data.tool.id }
          setGeneratedTool(updated)
          setShareModalTargetTool(updated)
          setShowShareModal(true)
          fetchSavedTools()
          return
        }
      } catch (e) {
        console.warn('Auto-save for share failed:', e)
      }
    }

    setShareModalTargetTool(target)
    setShowShareModal(true)
  }

  const handleShareToolToEmail = async () => {
    if (!shareEmailRecipient.trim()) {
      setShareError('Please enter a valid recipient email address.')
      return
    }
    if (!session?.access_token) {
      setShareError('Please sign in to share tools with other users.')
      return
    }

    let targetId = shareModalTargetTool?.id
    if (!targetId) {
      // Auto-save tool first
      const meta = extractToolMetadata(shareModalTargetTool || generatedTool)
      try {
        const res = await fetch(`${API_BASE}/api/marketplace/tools/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            title: meta.title || 'Interactive Learning Tool',
            description: meta.description || 'Study revision guide',
            tool_type: meta.toolType || 'flashcards',
            category: 'General Revision',
            tags: ['shared', meta.toolType || 'study'],
            generated_tool: shareModalTargetTool || generatedTool,
            visibility: 'private',
          }),
        })
        const data = await res.json()
        if (data.tool?.id) {
          targetId = data.tool.id
        }
      } catch (e) {
        console.warn('Auto-save before email share failed:', e)
      }
    }

    if (!targetId) {
      setShareError('Unable to prepare tool for sharing. Please try saving it first.')
      return
    }

    setIsSharingEmail(true)
    setShareError('')

    try {
      const res = await fetch(`${API_BASE}/api/marketplace/tools/share-to-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          tool_id: targetId,
          recipient_email: shareEmailRecipient.trim().toLowerCase(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to share tool')

      setShareToastMessage(`Tool shared directly with ${shareEmailRecipient}!`)
      setTimeout(() => setShareToastMessage(''), 3500)
      setShowShareModal(false)
      setShareEmailRecipient('')
    } catch (err) {
      console.error('Email share error:', err)
      setShareError(err.message || 'Failed to share tool with recipient.')
    } finally {
      setIsSharingEmail(false)
    }
  }

  const handleSaveActiveToolToLibrary = async (targetTool) => {
    const toolToSave = targetTool || generatedTool
    if (!toolToSave) return
    if (!session?.access_token) {
      alert('Please sign in to save tools to your library!')
      return
    }

    const meta = extractToolMetadata(toolToSave)
    try {
      const res = await fetch(`${API_BASE}/api/marketplace/tools/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          title: meta.title || 'Interactive Study Tool',
          description: meta.description || 'Study revision tool',
          tool_type: meta.toolType || 'flashcards',
          category: 'General Revision',
          tags: ['saved', meta.toolType || 'study'],
          generated_tool: toolToSave,
          forked_from_tool_id: toolToSave.id || null,
          visibility: 'private',
        }),
      })

      const data = await res.json()
      if (res.status === 409 && data.duplicate_tool_id) {
        setShareToastMessage(`"${meta.title}" is already in your Saved Tools library!`)
      } else if (!res.ok) {
        throw new Error(data.error || 'Failed to save tool')
      } else {
        setShareToastMessage(`Saved "${meta.title}" to your Saved Tools!`)
      }
      fetchSavedTools()
      setTimeout(() => setShareToastMessage(''), 3500)
    } catch (err) {
      console.error('Save to library error:', err)
      alert(err.message || 'Could not save tool to your library.')
    }
  }

  // Load shared tool from URL query parameter (?toolId=... or ?sharedToolId=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const toolId = params.get('toolId') || params.get('sharedToolId')
    if (toolId) {
      const loadSharedTool = async () => {
        try {
          const headers = {}
          if (session?.access_token) {
            headers.Authorization = `Bearer ${session.access_token}`
          }
          const res = await fetch(`${API_BASE}/api/marketplace/tools/${toolId}`, {
            headers,
            credentials: 'include',
          })
          if (res.ok) {
            const data = await res.json()
            if (data.data?.generated_tool) {
              const loadedTool = {
                ...data.data.generated_tool,
                id: data.data.id,
                title: data.data.title,
                description: data.data.description,
                is_shared: true,
                author_email: data.data.author_email,
                owner_user_id: data.data.owner_user_id,
              }
              setGeneratedTool(loadedTool)
              setRightPanelOpen(true)
              setMobileTab('tool')
              setShareToastMessage(`Loaded shared tool: "${data.data.title}"`)
              setTimeout(() => setShareToastMessage(''), 3500)
            }
          }
        } catch (err) {
          console.warn('Failed to load tool by id:', err)
        }
      }
      loadSharedTool()
    }
  }, [session?.access_token])


  const startMicRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], `mic_recording_${Date.now()}.webm`, { type: 'audio/webm' })
        setAudioFile(file)
        if (!uploadTitle) setUploadTitle(`Lecture Voice Recording (${new Date().toLocaleTimeString()})`)
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      setIsRecordingMic(true)
      setRecordingSeconds(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Mic access error:', err)
      setUploadError('Microphone permission was denied or is not supported.')
    }
  }

  const stopMicRecording = () => {
    if (mediaRecorderRef.current && isRecordingMic) {
      mediaRecorderRef.current.stop()
      setIsRecordingMic(false)
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    }
  }

  const triggerIngestCompletion = (docObj) => {
    setAttachedDocument(docObj)
    setShowUploadModal(false)
    setUploadFile(null)
    setYoutubeUrl('')
    setAudioFile(null)
    setOcrImageFile(null)
    setUploadTitle('')

    // Ensure canvas is on playground and chat is open to interact with the imported material
    setActiveCanvasView('playground')
    setIsChatPanelOpen(true)
    setRightPanelOpen(true)

    const instruction = uploadInstruction.trim()
    setUploadInstruction('')
    setSelectedIngestFormat('')

    if (instruction && instruction !== 'chat') {
      setTimeout(() => {
        handleSendMessage(`${instruction} based on "${docObj.title}"`)
      }, 300)
    } else {
      // Attached cleanly - post system guidance message in chat
      const attachMsg = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `Attached **"${docObj.title}"** to this study session.\n\nWhat would you like to create from this? You can type any prompt (e.g. *Flashcards*, *Practice Quiz*, *Feynman Grader*, *Summary Cheat Sheet*) or ask questions.`,
      }
      setMessages((prev) => [...prev, attachMsg])
    }
  }

  const handleUploadDocument = async () => {
    if (!uploadFile) {
      setUploadError('Please select a file to upload.')
      return
    }

    const docTitle = uploadTitle.trim() || uploadFile.name.replace(/\.[^/.]+$/, '')

    setIsUploadingDoc(true)
    setUploadError('')

    const fileBlobUrl = uploadFile.type === 'application/pdf' || uploadFile.name.endsWith('.pdf')
      ? URL.createObjectURL(uploadFile)
      : null

    // If user is guest / offline, attach document directly to session
    if (!session?.access_token) {
      const docObj = {
        id: `doc_${Date.now()}`,
        title: docTitle,
        name: uploadFile.name,
        fileUrl: fileBlobUrl,
      }
      setIsUploadingDoc(false)
      triggerIngestCompletion(docObj)
      return
    }

    try {
      const formData = new FormData()
      formData.append('document', uploadFile)
      formData.append('title', docTitle)

      const res = await fetch(`${API_BASE}/api/upload-document`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to upload document')
      }

      const docObj = {
        id: data.document?.id || Date.now(),
        title: docTitle,
        fileUrl: fileBlobUrl,
      }
      triggerIngestCompletion(docObj)
    } catch (err) {
      console.warn('Upload document API warning, using direct attachment:', err)
      // Graceful fallback to client-side attachment if RAG backend had an issue
      const fallbackDoc = {
        id: `doc_${Date.now()}`,
        title: docTitle,
        name: uploadFile.name,
        fileUrl: fileBlobUrl,
      }
      triggerIngestCompletion(fallbackDoc)
    } finally {
      setIsUploadingDoc(false)
    }
  }

  const handleIngestYouTube = async () => {
    if (!session?.access_token) {
      setUploadError('Please sign in to ingest YouTube lectures.')
      return
    }
    if (!youtubeUrl.trim()) {
      setUploadError('Please paste a valid YouTube video URL.')
      return
    }

    setIsUploadingDoc(true)
    setUploadError('')

    try {
      const res = await fetch(`${API_BASE}/api/multimodal/youtube`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          youtubeUrl: youtubeUrl.trim(),
          title: uploadTitle.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to ingest YouTube video')

      const docObj = {
        id: data.document?.id || Date.now(),
        title: data.document?.title || uploadTitle.trim() || 'YouTube Lecture',
      }
      triggerIngestCompletion(docObj)
    } catch (err) {
      console.error('YouTube Ingest Error:', err)
      setUploadError(err.message || 'Error processing YouTube video.')
    } finally {
      setIsUploadingDoc(false)
    }
  }

  const handleIngestAudio = async () => {
    if (!session?.access_token) {
      setUploadError('Please sign in to transcribe audio lectures.')
      return
    }
    if (!audioFile) {
      setUploadError('Please select or record an audio file first.')
      return
    }

    const audioTitle = uploadTitle.trim() || audioFile.name.replace(/\.[^/.]+$/, '')

    setIsUploadingDoc(true)
    setUploadError('')

    try {
      const formData = new FormData()
      formData.append('audio', audioFile)
      formData.append('title', audioTitle)

      const res = await fetch(`${API_BASE}/api/multimodal/audio`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to transcribe audio')

      const docObj = {
        id: data.document?.id || Date.now(),
        title: data.document?.title || audioTitle,
      }
      triggerIngestCompletion(docObj)
    } catch (err) {
      console.error('Audio Transcription Error:', err)
      setUploadError(err.message || 'Error transcribing audio recording.')
    } finally {
      setIsUploadingDoc(false)
    }
  }

  const handleIngestOCRImage = async () => {
    if (!session?.access_token) {
      setUploadError('Please sign in to scan handwritten notes.')
      return
    }
    if (!ocrImageFile) {
      setUploadError('Please select an image file to scan.')
      return
    }

    const ocrTitle = uploadTitle.trim() || ocrImageFile.name.replace(/\.[^/.]+$/, '')

    setIsUploadingDoc(true)
    setUploadError('')

    try {
      const formData = new FormData()
      formData.append('image', ocrImageFile)
      formData.append('title', ocrTitle)

      const res = await fetch(`${API_BASE}/api/multimodal/image-ocr`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to scan image notes')

      const docObj = {
        id: data.document?.id || Date.now(),
        title: data.document?.title || ocrTitle,
      }
      triggerIngestCompletion(docObj)
    } catch (err) {
      console.error('OCR Ingest Error:', err)
      setUploadError(err.message || 'Error scanning handwritten notes.')
    } finally {
      setIsUploadingDoc(false)
    }
  }

  const handleSendMessage = async (customPrompt = null) => {
    const textToSend = customPrompt || inputValue
    if (!textToSend.trim() || isLoading) return

    const userMsg = { role: 'user', content: textToSend, id: Date.now() }
    const updatedUserMsgs = [...messages, userMsg]
    setMessages(updatedUserMsgs)
    saveOrUpdateChatSession(updatedUserMsgs)
    if (!customPrompt) setInputValue('')
    setIsLoading(true)
    setRightPanelOpen(true)
    setGenerationStage(attachedDocument ? `Processing RAG vector context from "${attachedDocument.title}"...` : 'Analysing your request...')
    setBuildPhase('planning')

    try {
      const headers = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const bodyPayload = {
        prompt: textToSend,
        previousTool: generatedTool || null,
        chatHistory: messages.slice(-20).map(m => ({ role: m.role, content: m.content || m.text }))
      }
      if (attachedDocument) {
        bodyPayload.context = [{ title: attachedDocument.title }]
        bodyPayload.documentTitle = attachedDocument.title
      }

      const response = await fetch(`${API_BASE}/api/chat-tools`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(bodyPayload),
      })


      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`)
      }

      const data = await response.json()
      if (data?.tool) {
        const isChatResponse =
          data.tool.toolType === 'chat' ||
          data.tool.render === 'chat' ||
          data.tool.ui === 'chat';

        if (isChatResponse && !data.tool.generated_tool && data.tool.toolType === 'chat') {
          setBuildPhase(null)
          setGenerationStage(null)
          const aiReply =
            data.tool.data?.message ||
            data.tool.data?.chatResponse ||
            data.tool.chatResponse ||
            data.tool.description ||
            'I am here to help you study and learn!'

          const assistantMsg = {
            role: 'assistant',
            content: aiReply,
            id: Date.now() + 1,
          }
          setMessages((prev) => {
            const fullMsgs = [...prev, assistantMsg]
            saveOrUpdateChatSession(fullMsgs)
            return fullMsgs
          })
        } else {
          setBuildPhase('building')
          setGenerationStage('Building your interactive tool...')
          selectTool(data.tool)
          const toolMeta = extractToolMetadata(data.tool)
          const conversationalContent =
            data.tool.chatResponse ||
            data.tool.data?.chatResponse ||
            (attachedDocument
              ? `I've generated **${toolMeta.title}** for you based on "${attachedDocument.title}"! Explore the tool on the canvas, or ask me any follow-up questions.`
              : `I've generated **${toolMeta.title}** for you! Explore the tool on the canvas, or let me know if you want to revise this in a different format.`)

          const assistantMsg = {
            role: 'assistant',
            content: conversationalContent,
            id: Date.now() + 1,
            attachedTool: data.tool,
          }

          setMessages((prev) => {
            const fullMsgs = [...prev, assistantMsg]
            saveOrUpdateChatSession(fullMsgs, data.tool)
            return fullMsgs
          })
        }
      } else {
        const assistantMsg = {
          role: 'assistant',
          content: data?.reply || 'I processed your request.',
          id: Date.now() + 1,
        }
        setMessages((prev) => {
          const fullMsgs = [...prev, assistantMsg]
          saveOrUpdateChatSession(fullMsgs)
          return fullMsgs
        })
      }
    } catch (err) {
      console.error('Tool Generation Error:', err)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I ran into an error generating that tool. Make sure the backend server is online!',
          id: Date.now() + 1,
        },
      ])
    } finally {
      setIsLoading(false)
      setGenerationStage(null)
      setBuildPhase(null)
    }
  }

  const handleSaveToolToCollection = async (toolToSave) => {
    if (!session?.access_token) {
      alert('Please sign in to save tools to your personal collection!')
      return
    }

    const toolMeta = extractToolMetadata(toolToSave)

    try {
      const response = await fetch(`${API_BASE}/api/marketplace/tools/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          title: toolMeta.title || 'Saved Tool',
          description: toolMeta.description || '',
          tool_type: toolMeta.toolType || 'notes',
          category: 'study-guide',
          generated_tool: toolToSave,
          latest_prompt: inputValue || 'User generated tool',
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to save tool')
      }
      alert('Tool saved to your database collection!')
      fetchSavedTools()
    } catch (err) {
      console.error('Save tool error:', err)
      alert(err.message || 'Could not save tool.')
    }
  }

  const openPublishModal = (tool) => {
    if (!session?.access_token) {
      alert('Please sign in to publish tools to the Community Marketplace!')
      return
    }
    const target = tool || generatedTool
    if (!target) return
    const meta = extractToolMetadata(target)
    setPublishTargetTool(target)
    setPublishTitle(meta.title || '')
    setPublishDescription(meta.description || '')
    setPublishCategory(target.category || 'STEM & Medicine')
    setPublishTags(Array.isArray(target.tags) ? target.tags.join(', ') : '')
    setPublishIsPublic(true)
    setPublishSuccessMessage('')
    setShowPublishModal(true)
  }

  const handlePublishToMarketplace = async () => {
    if (!session?.access_token) {
      alert('Please sign in to publish tools to the Community Marketplace!')
      return
    }
    if (!publishTargetTool) return

    const toolMeta = extractToolMetadata(publishTargetTool)
    const title = publishTitle.trim() || toolMeta.title || 'Interactive Learning Tool'
    const description = publishDescription.trim() || toolMeta.description || ''
    const toolType = toolMeta.toolType || 'tool'
    const tags = publishTags.split(',').map(t => t.trim()).filter(Boolean)

    setIsPublishing(true)
    try {
      // Step 1: Save tool to database if not already persisted with a valid UUID
      let toolId = publishTargetTool.id
      const isPersistedUUID = typeof toolId === 'string' && toolId.length > 20 && toolId.includes('-')

      if (!isPersistedUUID) {
        const saveRes = await fetch(`${API_BASE}/api/marketplace/tools/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            title,
            description,
            tool_type: toolType,
            category: publishCategory || 'STEM & Medicine',
            tags,
            generated_tool: publishTargetTool,
            latest_prompt: inputValue || 'User generated tool',
            visibility: 'private',
          }),
        })
        const saveData = await saveRes.json()
        if (saveRes.status === 409 && saveData.duplicate_tool_id) {
          toolId = saveData.duplicate_tool_id
        } else if (!saveRes.ok) {
          throw new Error(saveData.error || 'Failed to save tool before publishing')
        } else {
          toolId = saveData.tool?.id
        }
      }

      // Step 2: Publish tool to marketplace
      const pubRes = await fetch(`${API_BASE}/api/marketplace/tools/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          tool_id: toolId,
          publish: publishIsPublic,
          title,
          description,
          tags,
        }),
      })

      const pubData = await pubRes.json()
      if (!pubRes.ok) throw new Error(pubData.error || 'Failed to publish to marketplace')

      setPublishSuccessMessage('Tool successfully published to Community Marketplace!')
      fetchSavedTools()
      fetchMarketplaceTools()
      setTimeout(() => {
        setShowPublishModal(false)
        setPublishSuccessMessage('')
      }, 1200)
    } catch (err) {
      console.error('Publish error:', err)
      alert(err.message || 'Error publishing tool to marketplace.')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleVoteTool = async (toolId, voteValue, e) => {
    if (e) e.stopPropagation()
    if (!session?.access_token) {
      alert('Please sign in to vote on community tools!')
      return
    }

    try {
      const res = await fetch(`${API_BASE}/api/marketplace/tools/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          tool_id: toolId,
          vote_value: voteValue,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Voting failed')

      setMarketplaceTools((prev) =>
        prev.map((t) => {
          if (t.id === toolId) {
            return {
              ...t,
              vote_score: data.data.vote_score,
              upvote_count: data.data.upvote_count,
              downvote_count: data.data.downvote_count,
              my_vote: data.data.my_vote,
            }
          }
          return t
        })
      )
    } catch (err) {
      console.error('Vote error:', err)
      alert(err.message || 'Could not register vote.')
    }
  }

  const handleForkTool = async (mTool, e) => {
    if (e) e.stopPropagation()
    if (!session?.access_token) {
      alert('Please sign in to fork and save tools to your library!')
      return
    }

    const meta = extractToolMetadata(mTool)
    try {
      const res = await fetch(`${API_BASE}/api/marketplace/tools/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          title: `Fork of ${meta.title}`,
          description: meta.description,
          tool_type: meta.toolType,
          category: mTool.category || 'General Revision',
          tags: mTool.tags || [],
          generated_tool: mTool.generated_tool || mTool,
          forked_from_tool_id: mTool.id,
          visibility: 'private',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fork tool')

      alert(`Successfully saved "${meta.title}" to your Saved Tools!`)
      fetchSavedTools()
      fetchMarketplaceTools()
    } catch (err) {
      console.error('Fork error:', err)
      alert(err.message || 'Could not fork tool.')
    }
  }

  const handleDeleteTool = async (toolId, e) => {
    if (e) e.stopPropagation()
    if (!session?.access_token) {
      alert('Please sign in to manage your collection.')
      return
    }

    if (!window.confirm('Are you sure you want to delete this tool from your collection?')) {
      return
    }

    try {
      const response = await fetch(`${API_BASE}/api/marketplace/tools/${toolId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to delete tool')
      }

      setSavedTools((prev) => prev.filter((t) => t.id !== toolId))

      if (generatedTool?.id === toolId) {
        setGeneratedTool(null)
      }
    } catch (err) {
      console.error('Delete tool error:', err)
      alert(err.message || 'Could not delete tool.')
    }
  }

  const saveOrUpdateChatSession = (updatedMessages, currentTool = generatedTool, doc = attachedDocument) => {
    if (!updatedMessages || updatedMessages.length === 0) return

    const firstUserMsg = updatedMessages.find((m) => m.role === 'user')
    const rawContent = firstUserMsg ? firstUserMsg.content : 'Study Session'
    const title = rawContent.slice(0, 48) + (rawContent.length > 48 ? '...' : '')
    const idToUse = activeChatId || `chat_${Date.now()}`
    if (!activeChatId) {
      setActiveChatId(idToUse)
    }

    const updatedSession = {
      id: idToUse,
      title,
      messages: updatedMessages,
      generatedTool: currentTool,
      attachedDocument: doc,
      updatedAt: Date.now(),
    }

    setChatHistory((prev) => {
      const existingIdx = prev.findIndex((s) => s.id === idToUse)
      let newHistory
      if (existingIdx >= 0) {
        newHistory = [...prev]
        newHistory[existingIdx] = updatedSession
      } else {
        newHistory = [updatedSession, ...prev]
      }
      if (user?.id) {
        try {
          const userKey = `learning_playground_chat_history_${user.id}`
          localStorage.setItem(userKey, JSON.stringify(newHistory))
        } catch {}
      }
      return newHistory
    })

    // If authenticated, persist to PostgreSQL backend
    if (user?.id && session?.access_token) {
      fetch(`${API_BASE}/api/learning-playground/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: idToUse,
          title,
          latestPrompt: firstUserMsg?.content || '',
          messages: updatedMessages,
          generatedTool: currentTool,
          context: doc ? { attachedDocument: doc } : null,
        }),
      }).catch((err) => console.error('Failed to sync session to server:', err))
    }
  }

  const loadChatSession = (chatSession) => {
    setActiveCanvasView('playground')
    setActiveChatId(chatSession.id)
    setMessages(chatSession.messages || [])
    const tool = chatSession.generatedTool || chatSession.generated_tool || null
    setGeneratedTool(tool)
    const doc = chatSession.attachedDocument || chatSession.context?.attachedDocument || chatSession.context || null
    setAttachedDocument(doc)
    setIsChatPanelOpen(true)
    if (tool) {
      setRightPanelOpen(true)
    }
    setMobileTab('chat')
  }

  const deleteChatSession = async (sessionId, e) => {
    if (e) e.stopPropagation()
    setChatHistory((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId)
      if (user?.id) {
        try {
          const userKey = `learning_playground_chat_history_${user.id}`
          localStorage.setItem(userKey, JSON.stringify(updated))
        } catch {}
      }
      return updated
    })
    if (activeChatId === sessionId) {
      handleStartNewSession()
    }
    if (user?.id && session?.access_token) {
      try {
        await fetch(`${API_BASE}/api/learning-playground/sessions/${sessionId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          credentials: 'include',
        })
      } catch (err) {
        console.error('Failed to delete session from server:', err)
      }
    }
  }

  const handleStartNewSession = () => {
    setActiveCanvasView('playground')
    setActiveChatId(null)
    setMessages([])
    setGeneratedTool(null)
    setAttachedDocument(null)
    setRightPanelOpen(false)
  }

  const handleUnloadTool = () => {
    setGeneratedTool(null)
    setRightPanelOpen(false)
  }

  const filteredChats = chatHistory.filter((c) =>
    (c.title || 'Previous Chat').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredSavedTools = savedTools.filter((t) => {
    const meta = extractToolMetadata(t)
    return meta.title.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const filteredMarketplaceTools = marketplaceTools.filter((t) => {
    const meta = extractToolMetadata(t)
    return meta.title.toLowerCase().includes(searchQuery.toLowerCase())
  })
  return (
    <div className="flex-1 h-0 w-full relative bg-slate-900 text-slate-100 flex overflow-hidden font-sans">

      {/* Left Sidebar */}
      <aside
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`group/sidebar relative z-30 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden transition-[width,transform] duration-300 ${sidebarOpen ? 'w-[17rem] translate-x-0' : 'w-0 -translate-x-full border-r-0'
          } lg:w-[4.75rem] lg:translate-x-0 lg:border-r lg:border-slate-800 lg:hover:w-[17rem]`}
      >
        {/* Top Header in Sidebar */}
        <div className="p-3.5 flex items-center justify-between gap-2 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <Vela size={22} className="flex-shrink-0" />
            <span className={`font-bold text-xs sm:text-sm text-white tracking-tight truncate transition-all duration-200 ${isSidebarExpanded ? 'opacity-100 max-w-[180px]' : 'lg:max-w-0 lg:opacity-0'}`}>
              Learning Playground
            </span>
          </div>

          <div className={`flex items-center gap-1 transition-all duration-200 ${isSidebarExpanded ? 'opacity-100' : 'lg:pointer-events-none lg:opacity-0'}`}>
            <button
              onClick={() => setShowSidebarSearch(!showSidebarSearch)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors lg:hidden"
              title="Close Sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 1. [+] New Chat Button (Prominent Action Button) */}
        <div className="p-3 border-b border-slate-800 flex-shrink-0">
          <button
            onClick={handleStartNewSession}
            className={`w-full flex items-center rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-2.5 transition-colors shadow-sm ${isSidebarExpanded ? 'px-3 justify-center gap-2' : 'justify-center px-2'}`}
            title="Start a new study chat"
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span className={`transition-all duration-200 whitespace-nowrap ${isSidebarExpanded ? 'opacity-100 max-w-[140px]' : 'lg:max-w-0 lg:overflow-hidden lg:opacity-0'}`}>
              New Chat
            </span>
          </button>
        </div>

        {/* Search Bar (Collapsible) */}
        {showSidebarSearch && isSidebarExpanded && (
          <div className="px-3 pt-2 pb-1 border-b border-slate-800">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats & tools..."
                className="w-full bg-slate-800/80 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Scrollable Sidebar Content */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 scrollbar-thin">
          {!isSidebarExpanded ? (
            <div className="hidden h-full items-center justify-center lg:flex">
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/40 px-2 py-5 text-[10px] uppercase tracking-[0.22em] text-slate-400 [writing-mode:vertical-rl] rotate-180">
                Menu
              </div>
            </div>
          ) : (
            <>
              {/* ── 1. YOUR WORKSPACE ── */}
              <div>
                <div className="px-2 pb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Your Workspace
                  </span>
                </div>

                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => switchCanvasView('playground')}
                    className={`w-full px-2.5 py-2 rounded-md text-xs flex items-center justify-between transition-colors ${
                      activeCanvasView === 'playground'
                        ? 'bg-blue-600/20 text-blue-400 font-semibold border border-blue-500/40 shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <span className="truncate">Playground</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => switchCanvasView('my-tools')}
                    className={`w-full px-2.5 py-2 rounded-md text-xs flex items-center justify-between transition-colors ${
                      activeCanvasView === 'my-tools'
                        ? 'bg-blue-600/20 text-blue-400 font-semibold border border-blue-500/40 shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Bookmark className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <span className="truncate">My Tools</span>
                    </div>
                    {savedTools.length > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeCanvasView === 'my-tools' ? 'bg-blue-500/30 text-blue-300' : 'bg-slate-800 text-slate-400'}`}>
                        {savedTools.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => switchCanvasView('shared')}
                    className={`w-full px-2.5 py-2 rounded-md text-xs flex items-center justify-between transition-colors ${
                      activeCanvasView === 'shared'
                        ? 'bg-purple-600/20 text-purple-400 font-semibold border border-purple-500/40 shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Share2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                      <span className="truncate">Shared with Me</span>
                    </div>
                    {sharedTools.length > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeCanvasView === 'shared' ? 'bg-purple-500/30 text-purple-300' : 'bg-slate-800 text-slate-400'}`}>
                        {sharedTools.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* ── 2. LIBRARY ── */}
              <div>
                <div className="px-2 pb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Library
                  </span>
                </div>

                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => switchCanvasView('marketplace')}
                    className={`w-full px-2.5 py-2 rounded-md text-xs flex items-center justify-between transition-colors ${
                      activeCanvasView === 'marketplace'
                        ? 'bg-emerald-600/20 text-emerald-400 font-semibold border border-emerald-500/40 shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Globe className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="truncate">Marketplace</span>
                    </div>
                    {marketplaceTools.length > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeCanvasView === 'marketplace' ? 'bg-emerald-500/30 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                        {marketplaceTools.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      switchCanvasView('playground')
                      setShowUploadModal(true)
                    }}
                    className="w-full px-2.5 py-2 rounded-md text-xs text-left text-slate-300 hover:bg-slate-800/60 hover:text-white flex items-center gap-2 transition-colors"
                    title="Import notes, lecture slides, or documents"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span className="truncate">Import Material (Files & Slides)</span>
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-800 my-2" />

              {/* ── 3. HISTORY ── */}
              <div>
                <div className="px-2 pb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    History
                  </span>
                  <div className="flex items-center gap-1">
                    {user?.id && (
                      <button
                        onClick={fetchChatSessions}
                        disabled={isLoadingHistory}
                        className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Refresh session history"
                      >
                        <RefreshCw className={`w-3 h-3 ${isLoadingHistory ? 'animate-spin text-blue-400' : ''}`} />
                      </button>
                    )}
                    <Clock className="w-3 h-3 text-slate-500" />
                  </div>
                </div>

                <div className="space-y-0.5 max-h-[240px] overflow-y-auto scrollbar-thin pr-0.5">
                  {filteredChats.length === 0 ? (
                    <div className="px-2.5 py-3 text-center rounded-lg bg-slate-800/30 border border-slate-800/60">
                      <p className="text-[11px] text-slate-500 font-medium">
                        {searchQuery ? 'No matching chats found' : 'No previous chats'}
                      </p>
                      {!searchQuery && (
                        <p className="text-[10px] text-slate-600 mt-0.5">
                          Your study sessions will appear here
                        </p>
                      )}
                    </div>
                  ) : (
                    filteredChats.map((chat) => {
                      const isActive = activeChatId === chat.id
                      return (
                        <div
                          key={chat.id}
                          onClick={() => loadChatSession(chat)}
                          className={`group px-2.5 py-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-all ${
                            isActive
                              ? 'bg-blue-600/20 text-blue-300 font-medium border border-blue-500/40 shadow-sm'
                              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-1 flex-1">
                            <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="truncate font-medium leading-tight">{chat.title || 'Previous Chat'}</span>
                              {chat.updatedAt && (
                                <span className="text-[10px] text-slate-500 mt-0.5">
                                  {new Date(chat.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => deleteChatSession(chat.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-slate-500 hover:bg-red-500/10 transition-all rounded"
                            title="Delete chat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">
              {user?.email ? user.email.charAt(0).toUpperCase() : 'G'}
            </div>
            <div className={`min-w-0 transition-all duration-200 ${isSidebarExpanded ? 'opacity-100 max-w-[120px]' : 'lg:max-w-0 lg:overflow-hidden lg:opacity-0'}`}>
              <p className="font-semibold text-xs text-white truncate max-w-[110px]">
                {user?.email ? user.email.split('@')[0] : 'Guest User'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {user ? 'Free Plan' : 'Not signed in'}
              </p>
            </div>
          </div>

          <button
            onClick={async () => {
              setChatHistory([])
              setActiveChatId(null)
              setMessages([])
              setGeneratedTool(null)
              setAttachedDocument(null)
              if (signOut) await signOut()
            }}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Fullscreen transparent overlay during chat panel resizing */}
      {isChatPanelResizing && (
        <div className="fixed inset-0 z-50 cursor-col-resize select-none bg-transparent" />
      )}

      {/* Floating Left Chat Panel (Collapsible - Only on Chat/Playground Page) */}
      {activeCanvasView === 'playground' && (
        <div
          className={`relative z-20 flex flex-col bg-[#10151f]/95 backdrop-blur-xl transition-[transform,margin,opacity] ${
            isChatPanelResizing ? 'transition-none select-none' : 'duration-300'
          } flex-shrink-0 overflow-hidden ${
            isChatPanelOpen
              ? 'translate-x-0 m-2 sm:my-3 sm:ml-3 sm:mr-1.5 h-[calc(100%-1rem)] sm:h-[calc(100%-1.5rem)] rounded-2xl border border-[#223247] shadow-2xl shadow-black/40'
              : 'w-0 m-0 -translate-x-full h-full border-0 pointer-events-none'
          }`}
          style={isChatPanelOpen ? { width: `min(${chatPanelWidth}px, calc(100vw - 1rem))` } : undefined}
        >
          {/* Draggable Vertical Resize Handle on Right Edge */}
          {isChatPanelOpen && (
            <div
              onMouseDown={handleChatResizeStart}
              onDoubleClick={() => {
                setChatPanelWidth(400)
                try {
                  localStorage.setItem('lp_chat_panel_width', '400')
                } catch {}
              }}
              className="nodrag absolute top-0 bottom-0 right-0 w-2.5 cursor-col-resize hover:bg-blue-500/30 transition-colors z-30 group flex items-center justify-center"
              title="Drag to resize chat panel • Double-click to reset width"
            >
              <div className="w-0.5 h-8 rounded-full bg-slate-700/80 group-hover:bg-blue-400 group-hover:h-14 transition-all" />
            </div>
          )}
          {/* Chat Panel Header */}
          <div className="p-3 sm:p-3.5 flex items-center justify-between gap-2 border-b border-[#223247] bg-[#0c1017]">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#16263d] border border-[#223247] flex items-center justify-center flex-shrink-0">
                <Vela size={16} />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-semibold text-white truncate">
                  {chatHistory.find((c) => c.id === activeChatId)?.title || 'Study Assistant'}
                </h2>
                <p className="text-[10px] text-[#7f93ad] truncate">
                  {messages.length > 0 ? `${messages.length} message${messages.length === 1 ? '' : 's'}` : 'Interactive session'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleStartNewSession}
                className="p-1.5 rounded-lg text-[#8493a8] hover:text-white hover:bg-[#21262E] transition-colors"
                title="New Chat"
              >
                <SquarePen className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsChatPanelOpen(false)}
                className="p-1.5 rounded-lg text-[#8493a8] hover:text-white hover:bg-[#21262E] transition-colors"
                title="Hide Chat"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Messages Thread */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-2 py-6">
                <div className="w-12 h-12 rounded-2xl bg-[#16263d]/80 border border-[#223247] flex items-center justify-center text-white mb-3 shadow-lg">
                  <Vela size={28} />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-white">How can I help you study?</h3>
                <p className="text-xs text-[#8493a8] mt-1 max-w-xs leading-relaxed">
                  Prompt to build custom revision tools, quizzes, flashcards, diagrams, or ask any concept question.
                </p>

                <div className="w-full mt-6 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 text-left px-1 mb-1.5">
                    Suggested Prompts
                  </div>
                  {suggestions.slice(0, 3).map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleSendMessage(action.prompt)}
                      className="w-full text-left p-3 rounded-lg border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700/80 hover:border-slate-600 transition-all group"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold text-white group-hover:text-blue-300">
                        <Lightbulb className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                        <span>{action.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{action.prompt}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, idx) => {
                const isUser = m.role === 'user'
                return (
                  <div key={m.id || idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {isUser ? (
                      <div className="max-w-[88%] bg-[#21262E] border border-[#282E38] text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm">
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2.5 max-w-[95%]">
                        <div className="w-6 h-6 rounded-full bg-[#16263d] border border-[#223247] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                          <Vela size={14} />
                        </div>
                        <div className="flex-1 min-w-0 bg-[#0e1626]/90 border border-[#1b2b40] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs sm:text-sm text-[#e2e8f0] leading-relaxed shadow-sm space-y-2 group/msg">
                          <p className="whitespace-pre-wrap">{m.content}</p>
                          {m.attachedTool && (
                            <div className="mt-2.5 pt-2.5 border-t border-[#1e2e45] flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-[11px] text-[#93c5fd] font-semibold truncate">
                                <Wrench className="w-3.5 h-3.5 text-[#3b82f6] flex-shrink-0" />
                                <span className="truncate">{extractToolMetadata(m.attachedTool).title || 'Interactive Tool'}</span>
                              </div>
                              <button
                                onClick={() => selectTool(m.attachedTool)}
                                className="px-2.5 py-1 text-[11px] font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg transition-colors flex-shrink-0 shadow-sm"
                              >
                                View Tool
                              </button>
                            </div>
                          )}

                          {/* Assistant Message Quick Actions */}
                          <div className="pt-2 border-t border-[#1a283e] flex items-center justify-between gap-2 opacity-70 group-hover/msg:opacity-100 transition-opacity">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  try {
                                    if (navigator.clipboard?.writeText) {
                                      navigator.clipboard.writeText(m.content)
                                      setShareToastMessage('Copied response text')
                                      setTimeout(() => setShareToastMessage(''), 2500)
                                    }
                                  } catch {}
                                }}
                                className="px-1.5 py-0.5 rounded text-[10px] text-[#8493a8] hover:text-white hover:bg-[#16263d] transition-colors flex items-center gap-1"
                                title="Copy message text"
                              >
                                <Copy className="w-3 h-3 text-[#5A7D99]" />
                                <span>Copy</span>
                              </button>
                              <button
                                onClick={() => handleSendMessage(`Create interactive flashcards based on this concept: "${m.content.slice(0, 180)}"`)}
                                className="px-1.5 py-0.5 rounded text-[10px] text-[#8493a8] hover:text-amber-300 hover:bg-[#16263d] transition-colors flex items-center gap-1"
                                title="Generate flashcards from this answer"
                              >
                                <Zap className="w-3 h-3 text-amber-400" />
                                <span>Cards</span>
                              </button>
                              <button
                                onClick={() => handleSendMessage(`Create a 5-question active recall quiz based on: "${m.content.slice(0, 180)}"`)}
                                className="px-1.5 py-0.5 rounded text-[10px] text-[#8493a8] hover:text-blue-300 hover:bg-[#16263d] transition-colors flex items-center gap-1"
                                title="Generate quiz from this answer"
                              >
                                <CheckSquare className="w-3 h-3 text-blue-400" />
                                <span>Quiz</span>
                              </button>
                            </div>
                            <span className="text-[9px] font-mono text-[#64748b]">
                              {new Date(m.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}

            {isLoading && (
              <div className="flex items-start gap-2.5 max-w-[95%]">
                <div className="w-6 h-6 rounded-full bg-[#16263d] border border-[#223247] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm animate-pulse">
                  <Vela size={14} />
                </div>
                <div className="bg-[#0e1626]/90 border border-[#1b2b40] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-[#9fb0c5] shadow-sm flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#5A7D99] animate-ping" />
                  <span>{generationStage || 'Thinking and generating tool...'}</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Docked Composer at Bottom of Chat Panel */}
          <div className="p-3 sm:p-3.5 border-t border-[#223247] bg-[#0c1017]">
            {attachedDocument && (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-[#3b82f6]/40 bg-[#5A7D99]/20 px-2.5 py-1.5 text-xs text-[#93c5fd]">
                <span className="flex items-center gap-1.5 truncate">
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{attachedDocument.title}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenCitationViewer(null, attachedDocument.title)}
                    className="px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 text-[10px] font-semibold flex items-center gap-1 transition-colors border border-blue-500/40"
                    title="Open Document Reader & Citations Split-Viewer"
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>Inspect</span>
                  </button>
                  <button
                    onClick={() => setAttachedDocument(null)}
                    className="text-[#bfdbfe] hover:text-white flex-shrink-0 p-0.5"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-[#223247] bg-[#141b29] p-2 focus-within:border-[#385677] transition-colors">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value)
                  if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto'
                    textareaRef.current.style.height = `${Math.min(140, Math.max(36, textareaRef.current.scrollHeight))}px`
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                    if (textareaRef.current) {
                      textareaRef.current.style.height = '36px'
                    }
                  }
                }}
                placeholder="Ask a question or build a study tool..."
                className="w-full resize-none border-none bg-transparent py-1 text-xs sm:text-sm text-white placeholder-[#7f93ad] focus:outline-none min-h-[36px] max-h-36 overflow-y-auto"
                rows={1}
              />

              <div className="mt-1.5 flex items-center justify-between gap-1.5 border-t border-[#1d293d] pt-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(true)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#8493a8] hover:bg-[#1f2e45] hover:text-white transition-colors"
                    title="Attach file, PDF, audio, or YouTube"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={toggleChatVoiceInput}
                    className={`inline-flex h-7 items-center justify-center rounded-lg px-2 text-xs font-medium transition-colors ${
                      isChatListening
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                        : 'text-[#8493a8] hover:bg-[#1f2e45] hover:text-white'
                    }`}
                    title="Voice Input (Whisper)"
                  >
                    <Mic className="w-3.5 h-3.5 mr-1" />
                    {isChatListening && <span>Listening...</span>}
                  </button>
                </div>

                <button
                  onClick={() => {
                    handleSendMessage()
                    if (textareaRef.current) {
                      textareaRef.current.style.height = '36px'
                    }
                  }}
                  disabled={isLoading || !inputValue.trim()}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#5A7D99] hover:bg-[#3D5E7A] text-white transition-all disabled:opacity-40 disabled:hover:bg-[#5A7D99]"
                  title="Send prompt"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Center & Canvas Workspace */}
      <div className="flex-1 min-w-0 h-full overflow-hidden relative z-10" ref={toolContainerRef}>
        <div className="absolute left-3 right-3 top-3 z-20 flex items-start justify-between gap-3 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg border border-slate-700 bg-slate-800/95 p-2 text-slate-300 shadow-md transition-colors hover:bg-slate-700 hover:text-white lg:hidden"
                title="Open Sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}

            {activeCanvasView === 'playground' && (
              <button
                onClick={() => {
                  setIsChatPanelOpen((prev) => !prev)
                  if (!isChatPanelOpen && chatPanelWidth < 280) setChatPanelWidth(400)
                }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-md transition-all flex items-center gap-2 ${
                  isChatPanelOpen
                    ? 'border-[#282E38] bg-[#1a2130]/90 text-[#cbd5e1] hover:bg-[#222c40] hover:text-white'
                    : 'border-blue-500/50 bg-blue-600/90 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 active:scale-95'
                }`}
                title={isChatPanelOpen ? 'Collapse Chat (Ctrl+J)' : 'Open AI Study Assistant (Ctrl+J)'}
              >
                {isChatPanelOpen ? (
                  <PanelLeftClose className="w-3.5 h-3.5 text-blue-400" />
                ) : (
                  <PanelLeft className="w-3.5 h-3.5 text-white" />
                )}
                <span>{isChatPanelOpen ? 'Hide Chat' : 'Open Chat'}</span>
                {messages.length > 0 && (
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                    isChatPanelOpen ? 'bg-[#282E38] text-[#94a3b8]' : 'bg-white/20 text-white'
                  }`}>
                    {messages.length}
                  </span>
                )}
                <kbd className="hidden lg:inline-block ml-0.5 text-[9px] font-mono text-slate-400/80 bg-black/30 border border-white/10 px-1 py-0.2 rounded">
                  Ctrl+J
                </kbd>
              </button>
            )}
          </div>

          {activeCanvasView === 'playground' && (
            <div className="flex items-center gap-2 pointer-events-auto">
              {/* Canvas Notes & Pins Toolbar */}
              <div className="flex items-center gap-1 bg-slate-800/95 border border-slate-700 rounded-lg p-1 shadow-md">
                <button
                  onClick={() => handleAddStickyNote(380, 140)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
                  title="Add a Sticky Note (or double-click canvas)"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sticky Note</span>
                </button>
                <button
                  onClick={() => handleAddPinNode(420, 160)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
                  title="Pin a key formula or concept"
                >
                  <Pin className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Formula Pin</span>
                </button>
                <button
                  onClick={() => handleAddChecklistNode(450, 180)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
                  title="Add a study checklist"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Checklist</span>
                </button>
                {attachedDocument && (
                  <>
                    <div className="h-4 w-px bg-slate-700 mx-0.5" />
                    <button
                      onClick={() => handleAddPdfReaderNode(attachedDocument.title, attachedDocument.fileUrl)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition-colors shadow-sm"
                      title={`Open "${attachedDocument.title}" in Canvas Reader`}
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span className="hidden sm:inline">PDF Reader</span>
                    </button>
                    <button
                      onClick={() => handleOpenCitationViewer(null, attachedDocument.title)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                      title="Open Grounded Document Split-Viewer Drawer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span className="hidden sm:inline">Citations Split-View</span>
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={handleStartNewSession}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/95 px-3.5 py-2 text-xs font-semibold text-slate-200 shadow-md transition-colors hover:bg-slate-700 hover:text-white"
              >
                <SquarePen className="w-3.5 h-3.5" />
                <span>New chat</span>
              </button>
              
              <button
                onClick={() => setRightPanelOpen(!rightPanelOpen)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold shadow-md transition-colors ${rightPanelOpen || generatedTool ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-700 bg-slate-800/95 text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                title={rightPanelOpen ? 'Hide Tool Canvas' : 'Show Tool Canvas'}
              >
                <span className="inline-flex items-center gap-1.5">
                  {rightPanelOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRight className="w-3.5 h-3.5" />}
                  <span>{rightPanelOpen ? 'Hide tool' : 'Show tool'}</span>
                </span>
              </button>
            </div>
          )}
        </div>

        <div
          className="w-full h-full learning-canvas relative overflow-hidden flex flex-col flex-1"
          style={{ width: '100%', height: '100%', minHeight: '450px', position: 'relative', display: 'flex' }}
          onDoubleClick={handleCanvasDoubleClick}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDropFile}
        >
          {/* Drag & Drop Global Overlay */}
          {isDraggingOver && (
            <div className="absolute inset-4 z-40 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-blue-400/80 bg-[#0c1017]/90 backdrop-blur-md shadow-2xl pointer-events-none">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300 mb-3 animate-bounce">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">Drop lecture notes, PDF, image, or audio</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
                Instantly parse and generate interactive study modules with grounded document citations
              </p>
            </div>
          )}

          {/* Toast Notification */}
          {shareToastMessage && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-[#0c1410]/95 px-4 py-2 text-xs font-semibold text-emerald-300 shadow-2xl backdrop-blur-xl animate-fade-in">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{shareToastMessage}</span>
            </div>
          )}

          {/* Canvas Bottom Left Shortcut Hint */}
          <div className="nodrag absolute bottom-4 left-4 z-20 hidden md:flex items-center gap-2 rounded-lg border border-[#282E38]/80 bg-[#0c1017]/80 px-2.5 py-1 text-[11px] text-slate-400 backdrop-blur-md select-none pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>Double-click canvas to add note • Ctrl+J for assistant</span>
          </div>

          <div className="w-full h-full flex-1 relative" style={{ width: '100%', height: '100%', minHeight: '400px' }}>
            <ReactFlowProvider>
              <ReactFlow
                style={{ width: '100%', height: '100%' }}
                className="w-full h-full"
                nodes={canvasNodes}
                edges={[]}
                nodeTypes={canvasNodeTypes}
                onNodesChange={onCustomCanvasNodesChange}
                onNodeDragStop={handleNodeDragStop}
                fitView
                fitViewOptions={{ padding: 0.25, maxZoom: 0.78, minZoom: 0.35, duration: 350 }}
                minZoom={0.25}
                maxZoom={1.8}
                defaultViewport={{ x: 60, y: 30, zoom: 0.72 }}
                panOnScroll
                selectionOnDrag={false}
                nodesDraggable
                proOptions={{ hideAttribution: true }}
              >
                <CanvasViewAutoFitter
                  activeView={activeCanvasView}
                  nodeCount={canvasNodes.length}
                  hasTool={Boolean(generatedTool)}
                />
                <CanvasViewportControls />
                <Background variant="dots" gap={26} size={1.5} color="rgba(148, 163, 184, 0.45)" />
                <MiniMap
                  pannable
                  zoomable
                  nodeColor={(node) => {
                    if (node.type === 'tool') return '#60a5fa'
                    if (node.type === 'welcome') return '#34d399'
                    if (node.type === 'pageHeader') return '#38bdf8'
                    if (node.type === 'toolCard') return '#3b82f6'
                    if (node.type === 'sharedCard') return '#a855f7'
                    if (node.type === 'marketplaceCard') return '#10b981'
                    if (node.type === 'pin') return '#fbbf24'
                    if (node.type === 'checklist') return '#38bdf8'
                    return '#94a3b8'
                  }}
                  maskColor="rgba(26, 32, 44, 0.75)"
                  className="!bg-[#242d3d]/95 !border !border-[#3e4d66] !rounded-2xl !shadow-xl"
                />
              </ReactFlow>
            </ReactFlowProvider>
          </div>
        </div>
      </div>

      {/* In-Canvas Direct Inline Editor Modal */}
      {showEditModal && (() => {
        const canonical = editingToolType || extractToolMetadata(generatedTool).toolType || resolveCanonicalToolType(generatedTool?.toolType || generatedTool?.tool_type || generatedTool?.type, generatedTool)
        const toolDisplayName = formatToolTypeName(canonical)
        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-3xl bg-[#1A1E24] border border-[#282E38] rounded-[8px] p-6 shadow-2xl space-y-5 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-[#282E38] pb-3 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[6px] bg-[#5A7D99]/20 border border-[#5A7D99]/40 flex items-center justify-center text-[#5A7D99]">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white">Edit {toolDisplayName} in Canvas</h3>
                      <span className="px-2 py-0.5 rounded-[4px] bg-[#5A7D99]/20 border border-[#5A7D99]/40 text-[#5A7D99] text-[10px] font-mono font-bold uppercase">
                        {canonical}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6E7580]">Customize questions, options, terms, and content before saving</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1 rounded-[6px] text-[#6E7580] hover:text-white hover:bg-[#21262E]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div>
                  <label className="block text-xs font-semibold text-[#CDD1D6] mb-1">Tool Title</label>
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    className="w-full bg-[#131519] border border-[#282E38] rounded-[6px] px-3.5 py-2 text-xs text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#CDD1D6] mb-1">Description</label>
                  <input
                    type="text"
                    value={editingDesc}
                    onChange={(e) => setEditingDesc(e.target.value)}
                    className="w-full bg-[#131519] border border-[#282E38] rounded-[6px] px-3.5 py-2 text-xs text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-[#CDD1D6]">
                      {canonical === 'quiz' && `Questions & Multiple Choice Options (${editingItems.length})`}
                      {canonical === 'matching' && `Matching Pairs (${editingItems.length})`}
                      {canonical === 'timeline' && `Milestones & Sequence (${editingItems.length})`}
                      {(canonical === 'crossword' || canonical === 'wordsearch') && `Puzzle Words & Clues (${editingItems.length})`}
                      {canonical === 'true-false' && `True/False Statements (${editingItems.length})`}
                      {canonical === 'cloze' && `Active Recall Blanks (${editingItems.length})`}
                      {canonical === 'flashcards' && `Flashcard Deck (${editingItems.length})`}
                    </label>
                    <button
                      onClick={handleAddEditorItem}
                      className="px-2.5 py-1 rounded-[6px] bg-[#21262E] hover:bg-[#5A7D99] text-xs font-semibold text-white border border-[#282E38] transition-all flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add {canonical === 'quiz' ? 'Question' : canonical === 'matching' ? 'Pair' : canonical === 'timeline' ? 'Milestone' : 'Item'}</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {editingItems.map((item, idx) => (
                      <div key={idx} className="p-3.5 rounded-[6px] bg-[#131519] border border-[#282E38] space-y-3 relative group">
                        <div className="flex items-center justify-between gap-2 border-b border-[#21262E] pb-2">
                          <span className="text-[10px] font-mono text-[#5A7D99] font-bold">
                            {canonical === 'quiz' && `QUESTION ${idx + 1}`}
                            {canonical === 'matching' && `PAIR ${idx + 1}`}
                            {canonical === 'timeline' && `MILESTONE ${idx + 1}`}
                            {(canonical === 'crossword' || canonical === 'wordsearch') && `ENTRY ${idx + 1}`}
                            {canonical === 'true-false' && `STATEMENT ${idx + 1}`}
                            {canonical === 'cloze' && `CLOZE PROMPT ${idx + 1}`}
                            {canonical === 'flashcards' && `CARD ${idx + 1}`}
                          </span>
                          <button
                            onClick={() => handleDeleteEditorItem(idx)}
                            className="p-1 text-[#6E7580] hover:text-red-400 rounded transition-colors"
                            title="Delete item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* ── 1. QUIZ MCQ EDITOR ── */}
                        {canonical === 'quiz' && (
                          <div className="space-y-2.5">
                            <div>
                              <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">Question Prompt</label>
                              <input
                                type="text"
                                value={item.question || ''}
                                onChange={(e) => handleUpdateEditorItem(idx, 'question', e.target.value)}
                                placeholder="Enter multiple-choice question stem..."
                                className="w-full bg-[#1A1E24] border border-[#282E38] rounded-[6px] px-3 py-1.5 text-xs text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99]"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">
                                Choices (Click letter button to select correct answer)
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {['A', 'B', 'C', 'D'].map((letter, choiceIdx) => {
                                  const isCorrect = (item.answer || 'A').toUpperCase() === letter
                                  const choiceVal = item.choices?.[choiceIdx] || ''
                                  return (
                                    <div key={letter} className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleSelectQuizAnswer(idx, letter)}
                                        className={`w-7 h-7 rounded-[4px] text-xs font-bold font-mono transition-all flex items-center justify-center flex-shrink-0 ${
                                          isCorrect
                                            ? 'bg-emerald-500 text-slate-900 border border-emerald-400 shadow-sm'
                                            : 'bg-[#21262E] text-[#8E8E93] border border-[#282E38] hover:text-white hover:bg-[#282E38]'
                                        }`}
                                        title={`Mark ${letter} as correct answer`}
                                      >
                                        {isCorrect ? '✓' : letter}
                                      </button>
                                      <input
                                        type="text"
                                        value={choiceVal}
                                        onChange={(e) => handleUpdateChoice(idx, choiceIdx, e.target.value)}
                                        placeholder={`Option ${letter}...`}
                                        className={`flex-1 bg-[#1A1E24] border rounded-[6px] px-2.5 py-1.5 text-xs text-white placeholder-[#6E7580] focus:outline-none ${
                                          isCorrect ? 'border-emerald-500/60 bg-emerald-950/10' : 'border-[#282E38] focus:border-[#5A7D99]'
                                        }`}
                                      />
                                    </div>
                                  )
                                })}
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">Explanation & Reasoning</label>
                              <textarea
                                value={item.explanation || ''}
                                onChange={(e) => handleUpdateEditorItem(idx, 'explanation', e.target.value)}
                                placeholder="Why is this answer correct? High-yield takeaway..."
                                rows={2}
                                className="w-full bg-[#1A1E24] border border-[#282E38] rounded-[6px] px-3 py-1.5 text-xs text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99] resize-none"
                              />
                            </div>
                          </div>
                        )}

                        {/* ── 2. MATCHING PAIRS EDITOR ── */}
                        {canonical === 'matching' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">Left Term / Concept</label>
                              <input
                                type="text"
                                value={item.left || item.term || item.front || ''}
                                onChange={(e) => handleUpdateEditorItem(idx, 'left', e.target.value)}
                                placeholder="Term or concept..."
                                className="w-full bg-[#1A1E24] border border-[#282E38] rounded-[6px] px-3 py-1.5 text-xs text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99]"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">Right Definition / Match</label>
                              <textarea
                                value={item.right || item.definition || item.back || ''}
                                onChange={(e) => handleUpdateEditorItem(idx, 'right', e.target.value)}
                                placeholder="Matching explanation or definition..."
                                rows={2}
                                className="w-full bg-[#1A1E24] border border-[#282E38] rounded-[6px] px-3 py-1.5 text-xs text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99] resize-none"
                              />
                            </div>
                          </div>
                        )}

                        {/* ── 3. TIMELINE & ORDERING EDITOR ── */}
                        {canonical === 'timeline' && (
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-20">
                                <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">Step #</label>
                                <input
                                  type="number"
                                  value={item.position !== undefined ? item.position : idx + 1}
                                  onChange={(e) => handleUpdateEditorItem(idx, 'position', Number(e.target.value))}
                                  className="w-full bg-[#1A1E24] border border-[#282E38] rounded-[6px] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#5A7D99]"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">Milestone Event / Phase</label>
                                <input
                                  type="text"
                                  value={item.text || item.title || item.front || ''}
                                  onChange={(e) => handleUpdateEditorItem(idx, 'text', e.target.value)}
                                  placeholder="Milestone title or historical event..."
                                  className="w-full bg-[#1A1E24] border border-[#282E38] rounded-[6px] px-3 py-1.5 text-xs text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99]"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">Significance & Details</label>
                              <textarea
                                value={item.detail || item.explanation || item.back || ''}
                                onChange={(e) => handleUpdateEditorItem(idx, 'detail', e.target.value)}
                                placeholder="Milestone context, date, or operational details..."
                                rows={2}
                                className="w-full bg-[#1A1E24] border border-[#282E38] rounded-[6px] px-3 py-1.5 text-xs text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99] resize-none"
                              />
                            </div>
                          </div>
                        )}

                        {/* ── 4. CROSSWORD & WORD SEARCH EDITOR ── */}
                        {(canonical === 'crossword' || canonical === 'wordsearch') && (
                          <div className="space-y-2.5">
                            <div>
                              <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">Target Word (Uppercase A-Z)</label>
                              <input
                                type="text"
                                value={item.word || item.front || ''}
                                onChange={(e) => handleUpdateEditorItem(idx, 'word', e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                                placeholder="WORD (letters only)..."
                                className="w-full bg-[#1A1E24] border border-[#282E38] rounded-[6px] px-3 py-1.5 text-xs font-mono font-bold text-sky-300 placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99]"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">Clue / Definition</label>
                              <textarea
                                value={item.clue || item.back || item.definition || ''}
                                onChange={(e) => handleUpdateEditorItem(idx, 'clue', e.target.value)}
                                placeholder="Clue or definition for this word..."
                                rows={2}
                                className="w-full bg-[#1A1E24] border border-[#282E38] rounded-[6px] px-3 py-1.5 text-xs text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99] resize-none"
                              />
                            </div>
                          </div>
                        )}

                        {/* ── 5. TRUE / FALSE EDITOR ── */}
                        {canonical === 'true-false' && (
                          <div className="space-y-2.5">
                            <div>
                              <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">Statement</label>
                              <input
                                type="text"
                                value={item.question || item.front || ''}
                                onChange={(e) => handleUpdateEditorItem(idx, 'question', e.target.value)}
                                placeholder="Enter statement to evaluate..."
                                className="w-full bg-[#1A1E24] border border-[#282E38] rounded-[6px] px-3 py-1.5 text-xs text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99]"
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="text-[11px] font-semibold text-[#8E8E93]">Correct Answer:</label>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateEditorItem(idx, 'isTrue', true)}
                                  className={`px-3 py-1 rounded-[4px] text-xs font-bold transition-all ${
                                    item.isTrue !== false
                                      ? 'bg-emerald-500 text-slate-900 shadow-sm'
                                      : 'bg-[#21262E] text-[#8E8E93] border border-[#282E38] hover:text-white'
                                  }`}
                                >
                                  True
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateEditorItem(idx, 'isTrue', false)}
                                  className={`px-3 py-1 rounded-[4px] text-xs font-bold transition-all ${
                                    item.isTrue === false
                                      ? 'bg-rose-500 text-white shadow-sm'
                                      : 'bg-[#21262E] text-[#8E8E93] border border-[#282E38] hover:text-white'
                                  }`}
                                >
                                  False
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">Explanation</label>
                              <textarea
                                value={item.explanation || item.back || ''}
                                onChange={(e) => handleUpdateEditorItem(idx, 'explanation', e.target.value)}
                                placeholder="Explanation of why statement is True or False..."
                                rows={2}
                                className="w-full bg-[#1A1E24] border border-[#282E38] rounded-[6px] px-3 py-1.5 text-xs text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99] resize-none"
                              />
                            </div>
                          </div>
                        )}

                        {/* ── 6. CLOZE BLURTING EDITOR ── */}
                        {canonical === 'cloze' && (
                          <div className="space-y-2.5">
                            <div>
                              <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">Sentence with [bracketed] target word</label>
                              <input
                                type="text"
                                value={item.sentence || item.front || ''}
                                onChange={(e) => handleUpdateEditorItem(idx, 'sentence', e.target.value)}
                                placeholder="e.g. The [mitochondria] produces ATP via oxidative phosphorylation."
                                className="w-full bg-[#1A1E24] border border-[#282E38] rounded-[6px] px-3 py-1.5 text-xs text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99]"
                              />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">Hidden Target Word</label>
                                <input
                                  type="text"
                                  value={item.answer || ''}
                                  onChange={(e) => handleUpdateEditorItem(idx, 'answer', e.target.value)}
                                  placeholder="Target word to test..."
                                  className="w-full bg-[#1A1E24] border border-[#282E38] rounded-[6px] px-3 py-1.5 text-xs text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99]"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">Optional Hint</label>
                                <input
                                  type="text"
                                  value={item.hint || ''}
                                  onChange={(e) => handleUpdateEditorItem(idx, 'hint', e.target.value)}
                                  placeholder="Helpful hint..."
                                  className="w-full bg-[#1A1E24] border border-[#282E38] rounded-[6px] px-3 py-1.5 text-xs text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99]"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ── 7. FLASHCARDS & NOTES (DEFAULT) ── */}
                        {canonical === 'flashcards' && (
                          <div className="space-y-2.5">
                            <div>
                              <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">Front / Prompt / Concept</label>
                              <input
                                type="text"
                                value={item.front || item.question || item.concept || item.title || ''}
                                onChange={(e) => handleUpdateEditorItem(idx, 'front', e.target.value)}
                                placeholder="Front of flashcard / Concept prompt..."
                                className="w-full bg-[#1A1E24] border border-[#282E38] rounded-[6px] px-3 py-1.5 text-xs text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99]"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">Back / Detailed Explanation</label>
                              <textarea
                                value={item.back || item.answer || item.explanation || item.detail || ''}
                                onChange={(e) => handleUpdateEditorItem(idx, 'back', e.target.value)}
                                placeholder="Back of flashcard / Explanation..."
                                rows={2}
                                className="w-full bg-[#1A1E24] border border-[#282E38] rounded-[6px] px-3 py-1.5 text-xs text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99] resize-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#282E38] flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-[6px] text-xs font-semibold text-[#8E8E93] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveInlineEdit}
                  className="px-5 py-2 rounded-[6px] bg-[#5A7D99] hover:bg-[#3D5E7A] text-xs font-bold text-white flex items-center gap-2 transition-all shadow-md"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Apply Changes</span>
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Upgraded Multi-Modal RAG Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-[#1A1E24] border border-[#282E38] rounded-[8px] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#282E38] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[6px] bg-[#5A7D99]/20 border border-[#5A7D99]/40 flex items-center justify-center text-[#5A7D99]">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Attach Course Material (RAG)</h3>
                  <p className="text-[11px] text-[#8E8E93]">Extract context from documents, YouTube, or handwritten notes</p>
                </div>
              </div>

              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-[6px] text-[#8E8E93] hover:text-white hover:bg-[#21262E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ingestion Source Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#131519] rounded-[6px] border border-[#282E38]">
              <button
                onClick={() => { setUploadTab('document'); setUploadError(''); }}
                className={`py-2 text-[11px] font-semibold rounded-[4px] transition-all flex flex-col items-center gap-1 ${uploadTab === 'document' ? 'bg-[#5A7D99] text-white shadow' : 'text-[#8E8E93] hover:text-white'
                  }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Document</span>
              </button>
              <button
                onClick={() => { setUploadTab('youtube'); setUploadError(''); }}
                className={`py-2 text-[11px] font-semibold rounded-[4px] transition-all flex flex-col items-center gap-1 ${uploadTab === 'youtube' ? 'bg-[#5A7D99] text-white shadow' : 'text-[#8E8E93] hover:text-white'
                  }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>YouTube</span>
              </button>
              <button
                onClick={() => { setUploadTab('image-ocr'); setUploadError(''); }}
                className={`py-2 text-[11px] font-semibold rounded-[4px] transition-all flex flex-col items-center gap-1 ${uploadTab === 'image-ocr' ? 'bg-[#5A7D99] text-white shadow' : 'text-[#8E8E93] hover:text-white'
                  }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Photo OCR</span>
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-[6px] bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#CDD1D6] mb-1.5">
                  Context / Topic Title
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Organic Chemistry Chapter 4 or Contract Law"
                  className="w-full bg-[#131519] border border-[#282E38] rounded-[6px] px-3.5 py-2 text-xs text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99]"
                />
              </div>

              {/* TAB 1: Document Upload */}
              {uploadTab === 'document' && (
                <div className="space-y-3">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDropFile}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border border-dashed rounded-[8px] p-5 text-center cursor-pointer transition-all ${isDraggingOver
                      ? 'border-[#5A7D99] bg-[#5A7D99]/10 shadow-lg'
                      : 'border-[#282E38] hover:border-[#5A7D99] bg-[#131519]/60 hover:bg-[#131519]'
                      }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) validateAndSetFile(f)
                      }}
                      className="hidden"
                    />
                    <FileText className="w-6 h-6 text-[#5A7D99] mx-auto mb-1.5" />
                    {uploadFile ? (
                      <div>
                        <p className="font-semibold text-xs text-white truncate">{uploadFile.name}</p>
                        <p className="text-[10px] text-[#6E7580] mt-0.5">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-white font-medium">Drag &amp; drop PDF, DOCX, or TXT (up to 15MB)</p>
                        <p className="text-[10px] text-[#6E7580] mt-1">Or click to browse file system</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: YouTube Ingestion */}
              {uploadTab === 'youtube' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-[6px] bg-[#131519] border border-[#282E38] space-y-2">
                    <label className="block text-xs font-semibold text-[#CDD1D6]">YouTube URL</label>
                    <input
                      type="url"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full bg-[#1A1E24] border border-[#282E38] rounded-[6px] px-3.5 py-2 text-xs text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99]"
                    />
                    <p className="text-[10px] text-[#6E7580]">
                      Extracts video transcripts and embeds context for tool synthesis.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 3: Handwritten Notes / Photo OCR */}
              {uploadTab === 'image-ocr' && (
                <div className="space-y-3">
                  <div
                    onClick={() => imageInputRef.current?.click()}
                    className="border border-dashed border-[#282E38] hover:border-[#5A7D99] rounded-[8px] p-5 text-center cursor-pointer bg-[#131519]/60 hover:bg-[#131519] transition-all"
                  >
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) {
                          setOcrImageFile(f)
                          if (!uploadTitle) setUploadTitle(f.name.replace(/\.[^/.]+$/, ''))
                        }
                      }}
                      className="hidden"
                    />
                    <Camera className="w-6 h-6 text-[#5A7D99] mx-auto mb-1.5" />
                    {ocrImageFile ? (
                      <div>
                        <p className="font-semibold text-xs text-white truncate">{ocrImageFile.name}</p>
                        <p className="text-[10px] text-[#6E7580] mt-0.5">{(ocrImageFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-white font-medium">Upload photo of notebook page, whiteboard, or diagram</p>
                        <p className="text-[10px] text-[#6E7580] mt-1">Vision OCR extraction</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Interactive Tool / Prompt Choice */}
              <div className="pt-2 border-t border-[#282E38] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#CDD1D6]">
                    Desired Tool Output
                  </label>
                  <span className="text-[10px] text-[#6E7580]">OPTIONAL</span>
                </div>

                {/* Quick-pick tool format chips */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'chat', label: 'Ask in Chat' },
                    { id: 'crossword', label: '2D Crossword', prompt: 'Generate an interactive 2D Crossword puzzle' },
                    { id: 'feynman', label: 'Feynman Grader', prompt: 'Create a Feynman Active Recall Audio/Text Grader with rubrics' },
                    { id: 'cloze', label: 'Cloze Blurting', prompt: 'Generate interactive Cloze Deletion blurting notes' },
                    { id: 'revision-kit', label: '3-in-1 Kit', prompt: 'Generate a comprehensive 3-in-1 Revision Kit (Notes + Flashcards + Timed Quiz)' },
                    { id: 'flashcards', label: 'Flashcards', prompt: 'Generate a deck of interactive flip flashcards' },
                    { id: 'quiz', label: 'MCQ Quiz', prompt: 'Create a multiple-choice practice quiz with explanations' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => {
                        if (selectedIngestFormat === fmt.id) {
                          setSelectedIngestFormat('')
                          setUploadInstruction('')
                        } else {
                          setSelectedIngestFormat(fmt.id)
                          if (fmt.id !== 'chat') {
                            setUploadInstruction(fmt.prompt || '')
                          } else {
                            setUploadInstruction('')
                          }
                        }
                      }}
                      className={`px-2.5 py-1 rounded-[6px] text-[11px] font-medium border transition-all ${selectedIngestFormat === fmt.id
                        ? 'bg-[#5A7D99] text-white border-[#5A7D99] shadow-sm'
                        : 'bg-[#131519] text-[#8E8E93] border-[#282E38] hover:border-[#5A7D99] hover:text-white'
                        }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>

                {/* Custom Instruction Input */}
                <input
                  type="text"
                  value={uploadInstruction}
                  onChange={(e) => {
                    setUploadInstruction(e.target.value)
                    setSelectedIngestFormat('custom')
                  }}
                  placeholder="e.g. Create a 12-clue crossword, speed drill, or prompt directive..."
                  className="w-full bg-[#131519] border border-[#282E38] rounded-[6px] px-3.5 py-2 text-xs text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#282E38]">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-3.5 py-1.5 rounded-[6px] text-xs font-semibold text-[#8E8E93] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={
                  uploadTab === 'youtube'
                    ? handleIngestYouTube
                    : uploadTab === 'image-ocr'
                    ? handleIngestOCRImage
                    : handleUploadDocument
                }
                disabled={
                  isUploadingDoc ||
                  (uploadTab === 'document' && !uploadFile) ||
                  (uploadTab === 'youtube' && !youtubeUrl.trim()) ||
                  (uploadTab === 'image-ocr' && !ocrImageFile)
                }
                className="px-4 py-1.5 rounded-[6px] bg-[#5A7D99] hover:bg-[#3D5E7A] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md disabled:opacity-30"
              >
                {isUploadingDoc ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Attaching Source...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Attach &amp; Process</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PUBLISH TO MARKETPLACE MODAL */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#1A1E24] border border-[#282E38] rounded-[8px] shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#282E38] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-[6px] bg-[#5A7D99]/20 border border-[#5A7D99]/40 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-[#5A7D99]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Publish Tool</h3>
                  <p className="text-[11px] text-[#8E8E93]">Share revision tool to the Community Marketplace</p>
                </div>
              </div>
              <button
                onClick={() => setShowPublishModal(false)}
                className="p-1 rounded-[6px] text-[#8E8E93] hover:text-white hover:bg-[#21262E] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {publishSuccessMessage ? (
              <div className="p-4 rounded-[6px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold text-center animate-fade-in flex flex-col items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <span>{publishSuccessMessage}</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#CDD1D6] mb-1.5">Tool Title</label>
                  <input
                    type="text"
                    value={publishTitle}
                    onChange={(e) => setPublishTitle(e.target.value)}
                    placeholder="e.g. Human Bones 2D Crossword"
                    className="w-full bg-[#131519] border border-[#282E38] rounded-[6px] px-3.5 py-2 text-xs text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#CDD1D6] mb-1.5">Description</label>
                  <textarea
                    rows={3}
                    value={publishDescription}
                    onChange={(e) => setPublishDescription(e.target.value)}
                    placeholder="Describe concepts, study goals, or syllabus..."
                    className="w-full bg-[#131519] border border-[#282E38] rounded-[6px] px-3.5 py-2 text-xs text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99] resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#CDD1D6] mb-1.5">Category</label>
                    <select
                      value={publishCategory}
                      onChange={(e) => setPublishCategory(e.target.value)}
                      className="w-full bg-[#131519] border border-[#282E38] rounded-[6px] px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5A7D99]"
                    >
                      <option value="STEM & Medicine">STEM &amp; Medicine</option>
                      <option value="Law & Humanities">Law &amp; Humanities</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Languages & Literature">Languages &amp; Literature</option>
                      <option value="Economics & Business">Economics &amp; Business</option>
                      <option value="General Revision">General Revision</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#CDD1D6] mb-1.5">Tags</label>
                    <input
                      type="text"
                      value={publishTags}
                      onChange={(e) => setPublishTags(e.target.value)}
                      placeholder="e.g. bones, anatomy, revision"
                      className="w-full bg-[#131519] border border-[#282E38] rounded-[6px] px-3.5 py-2 text-xs text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99]"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2.5 p-3 rounded-[6px] bg-[#131519] border border-[#282E38] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishIsPublic}
                    onChange={(e) => setPublishIsPublic(e.target.checked)}
                    className="rounded border-[#282E38] text-[#5A7D99] focus:ring-0"
                  />
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white">Make Public on Community Marketplace</p>
                    <p className="text-[10px] text-[#8E8E93]">Anyone can discover, play, and fork this tool</p>
                  </div>
                </label>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#282E38]">
                  <button
                    type="button"
                    onClick={() => setShowPublishModal(false)}
                    className="px-4 py-1.5 rounded-[6px] text-xs font-semibold text-[#8E8E93] hover:text-white"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handlePublishToMarketplace}
                    disabled={isPublishing || !publishTitle.trim()}
                    className="px-4 py-1.5 rounded-[6px] bg-[#5A7D99] hover:bg-[#3D5E7A] text-white text-xs font-bold flex items-center gap-2 disabled:opacity-40 transition-all shadow-md"
                  >
                    {isPublishing ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-3.5 h-3.5" />
                        <span>Publish Tool</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMMUNITY MARKETPLACE EXPLORER MODAL */}
      {showMarketplaceExplorer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-5xl h-[88vh] bg-[#1A1E24] border border-[#282E38] rounded-[8px] shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-3.5 border-b border-[#282E38] bg-[#161B22] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[6px] bg-[#5A7D99] flex items-center justify-center text-white shadow-md">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-sm text-white">Community Marketplace</h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-[4px] bg-[#5A7D99]/20 text-[#8BB0D1] font-mono font-semibold">
                      {marketplaceTools.length} Tools
                    </span>
                  </div>
                  <p className="text-xs text-[#8E8E93]">Explore, play, and fork interactive study tools created by learners</p>
                </div>
              </div>

              <button
                onClick={() => setShowMarketplaceExplorer(false)}
                className="p-1.5 rounded-[6px] text-[#8E8E93] hover:text-white hover:bg-[#21262E] transition-colors"
                title="Close Marketplace"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="px-6 py-2.5 border-b border-[#282E38] bg-[#131519] flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
              {/* Category Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin py-0.5">
                {[
                  { id: 'all', label: 'All Tools' },
                  { id: 'STEM & Medicine', label: 'STEM & Medicine' },
                  { id: 'Law & Humanities', label: 'Law & Humanities' },
                  { id: 'Computer Science', label: 'Computer Science' },
                  { id: 'Languages & Literature', label: 'Languages' },
                  { id: 'General Revision', label: 'General Revision' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setMarketplaceFilterCategory(cat.id)}
                    className={`px-3 py-1 rounded-[6px] text-xs font-medium transition-all whitespace-nowrap ${marketplaceFilterCategory === cat.id
                      ? 'bg-[#5A7D99] text-white shadow-sm'
                      : 'bg-[#21262E] text-[#8E8E93] hover:text-white hover:bg-[#282E38]'
                      }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[240px] flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2 text-[#8E8E93]" />
                <input
                  type="text"
                  value={marketplaceSearchQuery}
                  onChange={(e) => setMarketplaceSearchQuery(e.target.value)}
                  placeholder="Search marketplace tools..."
                  className="w-full bg-[#1A1E24] border border-[#282E38] rounded-[6px] pl-8 pr-3 py-1 text-xs text-white placeholder-[#8E8E93] focus:outline-none focus:border-[#5A7D99]"
                />
              </div>
            </div>

            {/* Marketplace Grid Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              {isLoadingMarketplaceTools ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <span className="w-6 h-6 border-2 border-[#5A7D99]/30 border-t-[#5A7D99] rounded-full animate-spin mb-3" />
                  <p className="text-xs text-[#8E8E93]">Fetching tools from community registry...</p>
                </div>
              ) : (() => {
                const filtered = marketplaceTools.filter((t) => {
                  const meta = extractToolMetadata(t)
                  const matchesCat =
                    marketplaceFilterCategory === 'all' ||
                    (t.category && t.category.toLowerCase().includes(marketplaceFilterCategory.toLowerCase()))
                  const q = marketplaceSearchQuery.toLowerCase().trim()
                  const matchesSearch =
                    !q ||
                    meta.title.toLowerCase().includes(q) ||
                    meta.description.toLowerCase().includes(q) ||
                    (Array.isArray(t.tags) && t.tags.some((tag) => String(tag).toLowerCase().includes(q)))
                  return matchesCat && matchesSearch
                })

                if (filtered.length === 0) {
                  return (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12">
                      <Globe className="w-10 h-10 text-[#282E38] mb-3" />
                      <h4 className="text-xs font-semibold text-white mb-1">No Tools Found</h4>
                      <p className="text-xs text-[#8E8E93] max-w-sm">
                        {marketplaceSearchQuery
                          ? `No tools matched "${marketplaceSearchQuery}". Try clearing search or selecting another category.`
                          : 'Be the first to publish a study tool to the Community Marketplace!'}
                      </p>
                    </div>
                  )
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filtered.map((mTool) => {
                      const meta = extractToolMetadata(mTool)
                      const isUpvoted = mTool.my_vote === 1
                      const isDownvoted = mTool.my_vote === -1

                      return (
                        <div
                          key={mTool.id}
                          className="bg-[#131519] border border-[#282E38] hover:border-[#5A7D99] rounded-[8px] p-4 flex flex-col justify-between transition-all group"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="capitalize text-[10px] px-2 py-0.5 rounded-[4px] bg-[#5A7D99]/15 border border-[#5A7D99]/30 text-[#8BB0D1] font-mono font-semibold">
                                {meta.toolType || 'Tool'}
                              </span>
                              {mTool.category && (
                                <span className="text-[10px] text-[#8E8E93] truncate max-w-[120px]">
                                  {mTool.category}
                                </span>
                              )}
                            </div>

                            <h4 className="font-bold text-xs sm:text-sm text-white mb-1 line-clamp-1 group-hover:text-[#8BB0D1] transition-colors">
                              {meta.title}
                            </h4>

                            <p className="text-xs text-[#8E8E93] line-clamp-2 mb-3 leading-relaxed">
                              {meta.description || 'Interactive educational tool sandbox.'}
                            </p>

                            {Array.isArray(mTool.tags) && mTool.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {mTool.tags.slice(0, 3).map((tag, i) => (
                                  <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-[4px] bg-[#21262E] text-[#8E8E93] font-mono">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="pt-3 border-t border-[#282E38] space-y-2.5">
                            {/* Social Score & Fork Count */}
                            <div className="flex items-center justify-between text-xs text-[#8E8E93]">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => handleVoteTool(mTool.id, isUpvoted ? 0 : 1, e)}
                                  className={`p-1 rounded-[4px] hover:bg-[#21262E] transition-colors flex items-center gap-1 ${isUpvoted ? 'text-emerald-400 font-bold' : 'hover:text-emerald-400'
                                    }`}
                                  title="Upvote tool"
                                >
                                  <ThumbsUp className="w-3 h-3" />
                                  <span className="font-mono text-[10px]">{mTool.upvote_count || 0}</span>
                                </button>

                                <button
                                  onClick={(e) => handleVoteTool(mTool.id, isDownvoted ? 0 : -1, e)}
                                  className={`p-1 rounded-[4px] hover:bg-[#21262E] transition-colors flex items-center gap-1 ${isDownvoted ? 'text-red-400 font-bold' : 'hover:text-red-400'
                                    }`}
                                  title="Downvote tool"
                                >
                                  <ThumbsDown className="w-3 h-3" />
                                </button>
                              </div>

                              <div className="flex items-center gap-1 text-[10px] font-mono">
                                <GitFork className="w-3 h-3 text-[#8E8E93]" />
                                <span>{mTool.fork_count || 0} forks</span>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  selectTool(mTool)
                                  setShowMarketplaceExplorer(false)
                                }}
                                className="flex-1 py-1.5 rounded-[6px] bg-[#5A7D99] hover:bg-[#3D5E7A] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>Open in Canvas</span>
                              </button>

                              <button
                                onClick={(e) => handleForkTool(mTool, e)}
                                className="p-1.5 px-2.5 rounded-[6px] bg-[#21262E] hover:bg-[#282E38] border border-[#282E38] text-[#CDD1D6] hover:text-white text-xs transition-all flex items-center gap-1"
                                title="Fork to My Saved Tools"
                              >
                                <GitFork className="w-3 h-3" />
                                <span className="hidden sm:inline">Fork</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ACTION NOTIFICATION TOAST */}
      {shareToastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-[#1A1E24] text-white px-4 py-3 rounded-xl border border-[#5A7D99]/40 shadow-2xl animate-fade-in text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-[#5A7D99]" />
          <span>{shareToastMessage}</span>
        </div>
      )}



      {/* SHARE & COLLABORATE MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A1E24] border border-[#282E38] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="p-4 px-6 border-b border-[#282E38] flex items-center justify-between bg-[#131519]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#5A7D99]/15 border border-[#5A7D99]/30 flex items-center justify-center text-[#5A7D99]">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Share Interactive Tool</h3>
                  <p className="text-[11px] text-[#94a3b8]">Share with a classmate or save directly to their library</p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#282E38] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Option 1: Direct Link */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#cbd5e1]">1. Direct Shareable Link</label>
                <p className="text-[11px] text-[#94a3b8]">Anyone with this link can interact with the tool and save it to their library:</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/?toolId=${shareModalTargetTool?.id || ''}`}
                    className="flex-1 bg-[#282E38] border border-[#282E38] rounded-xl px-3 py-2 text-xs text-white select-all font-mono"
                  />
                  <button
                    onClick={() => handleCopyShareLink(shareModalTargetTool)}
                    className="px-3.5 py-2 rounded-xl bg-[#5A7D99] hover:bg-[#3D5E7A] text-white text-xs font-bold transition-all flex items-center gap-1 shadow-md flex-shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[#282E38]" />
                <span className="text-[10px] text-[#64748b] uppercase font-bold tracking-wider">OR</span>
                <div className="flex-1 h-px bg-[#282E38]" />
              </div>

              {/* Option 2: Send Directly to User Email */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#cbd5e1]">2. Send Directly to Classmate (Saves in their Library)</label>
                <p className="text-[11px] text-[#94a3b8]">Enter their account email to deliver the tool directly into their "Saved Tools" collection:</p>
                <div className="space-y-2">
                  <input
                    type="email"
                    value={shareEmailRecipient}
                    onChange={(e) => setShareEmailRecipient(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleShareToolToEmail()
                    }}
                    placeholder="classmate@university.edu"
                    className="w-full bg-[#282E38] border border-[#282E38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5A7D99] transition-colors"
                  />
                  {shareError && (
                    <p className="text-[11px] text-[#ef4444] font-medium">{shareError}</p>
                  )}
                  <button
                    onClick={handleShareToolToEmail}
                    disabled={isSharingEmail || !shareEmailRecipient.trim()}
                    className="w-full py-2.5 rounded-xl bg-[#5A7D99] hover:bg-[#3D5E7A] disabled:opacity-40 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    {isSharingEmail ? (
                      <span>Sharing Tool...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send to Classmate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXPANDED FULLSCREEN WORKSPACE MODAL */}
      {isToolMaximized && generatedTool && (
        <div className="fixed inset-0 z-[100] bg-[#04070d]/95 backdrop-blur-md p-3 sm:p-5 flex flex-col animate-fade-in">
          <div className="flex h-full w-full flex-col rounded-[28px] border border-[#1f3046] bg-[#09111d] shadow-2xl overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#18283e] px-5 py-3 bg-[#0e1626] flex-shrink-0">
              <div className="min-w-0 flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7dd3fc]">
                  <Layers className="w-3.5 h-3.5 text-[#5A7D99]" />
                  <span>Fullscreen Workspace</span>
                </div>
                <div className="h-3.5 w-px bg-[#282E38]" />
                <h3 className="truncate text-sm font-semibold text-white max-w-[220px] sm:max-w-md">
                  {activeMeta.title}
                </h3>
                {activeMeta.toolType && (
                  <span className="rounded-[4px] border border-[#282E38] bg-[#131519] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8fb7ff]">
                    {activeMeta.toolType}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-[6px] border border-[#1b2b40] bg-[#09111d]/92 px-2 py-1 shadow-md">
                  <button
                    onClick={openInlineEditor}
                    className="rounded-[4px] border border-[#223247] bg-[#101b2d] px-2.5 py-1 text-[11px] font-semibold text-[#e2e8f0] transition-colors hover:bg-[#16263d] hover:text-white"
                    title="Edit questions, cards, and content in canvas"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-[#5A7D99]" />
                      <span>Edit</span>
                    </span>
                  </button>
                  <button
                    onClick={() => handleSaveActiveToolToLibrary(generatedTool)}
                    className="rounded-[4px] border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 transition-colors hover:bg-emerald-500 hover:text-white"
                    title="Save this tool to your personal Saved Tools library"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </span>
                  </button>
                  <button
                    onClick={() => handleOpenShareModal(generatedTool)}
                    className="rounded-[4px] border border-[#223247] bg-[#101b2d] px-2.5 py-1 text-[11px] font-semibold text-[#e2e8f0] transition-colors hover:bg-[#16263d] hover:text-white"
                    title="Share with another student or copy direct link"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5 text-[#5A7D99]" />
                      <span>Share</span>
                    </span>
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="rounded-[4px] border border-[#223247] bg-[#101b2d] px-2.5 py-1 text-[11px] font-semibold text-[#e2e8f0] transition-colors hover:bg-[#16263d] hover:text-white"
                      title="Export or print study materials"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5 text-[#5A7D99]" />
                        <span>Export</span>
                      </span>
                    </button>

                    {showExportMenu && (
                      <div className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-[6px] border border-[#1e2d45] bg-[#21262E] p-1.5 shadow-2xl">
                        <button
                          onClick={() => {
                            setShowExportMenu(false)
                            handleExportMarkdown()
                          }}
                          className="w-full rounded-[4px] px-3 py-2 text-left text-xs font-semibold text-white transition-colors hover:bg-[#1a253c] flex items-center gap-2"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#5A7D99]" />
                          <span>Download Markdown</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowExportMenu(false)
                            handlePrintStudySheet()
                          }}
                          className="mt-1 w-full rounded-[4px] px-3 py-2 text-left text-xs font-semibold text-white transition-colors hover:bg-[#1a253c] flex items-center gap-2"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#5A7D99]" />
                          <span>Print / PDF Cheat Sheet</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => openPublishModal(generatedTool)}
                    className="rounded-[4px] border border-[#3b82f6]/40 bg-[#3b82f6]/15 px-2.5 py-1 text-[11px] font-semibold text-[#93c5fd] transition-colors hover:bg-[#3b82f6] hover:text-white"
                    title="Publish this tool to the Community Marketplace"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />
                      <span>Publish</span>
                    </span>
                  </button>
                </div>
                <button
                  onClick={() => setIsToolMaximized(false)}
                  className="rounded-[4px] border border-[#223247] bg-[#101b2d] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#16263d] flex items-center gap-1.5 shadow-sm"
                  title="Exit Fullscreen (Escape)"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Minimize</span>
                </button>
              </div>
            </div>
            <div className="flex-1 p-3 sm:p-4 min-h-0 bg-[#060b13]">
              <iframe
                srcDoc={activeHtml}
                title="Expanded Interactive Tool Sandbox"
                className="h-full w-full rounded-[22px] border-none bg-white shadow-[0_24px_60px_rgba(15,23,42,0.24)]"
                allow="microphone"
                sandbox="allow-scripts allow-modals allow-forms"
              />
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN GLOBAL DRAG & DROP OVERLAY */}
      {isGlobalDragging && (
        <div className="fixed inset-0 z-50 bg-[#131519]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#5A7D99] pointer-events-none animate-fade-in">
          <div className="w-16 h-16 rounded-[8px] bg-[#1A1E24] border border-[#5A7D99]/40 flex items-center justify-center text-[#5A7D99] mb-3 animate-pulse">
            <Upload className="w-8 h-8 text-[#5A7D99]" />
          </div>
          <h2 className="text-base font-bold text-white mb-1">Drop Files for RAG Context</h2>
          <p className="text-xs text-[#8E8E93]">Release to attach PDF, DOCX, or TXT file</p>
        </div>
      )}

      {/* GROUNDED DOCUMENT SPLIT-VIEWER & IN-CANVAS TEXT ANNOTATION */}
      <CitationSplitViewer
        isOpen={showCitationViewer}
        onClose={() => setShowCitationViewer(false)}
        documentTitle={activeCitationDocTitle}
        activeCitation={activeCitationTarget}
        apiBase={API_BASE}
        authToken={session?.access_token}
        onGenerateFromHighlight={handleGenerateFromHighlight}
        onPromptChat={(prompt) => {
          handleSendMessage(prompt)
          setShowCitationViewer(false)
        }}
      />
    </div>
  )
}


