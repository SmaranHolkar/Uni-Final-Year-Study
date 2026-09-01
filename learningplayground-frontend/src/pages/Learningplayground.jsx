import React, { useState, useRef, useEffect } from 'react'
import { ReactFlow, Background, Controls, MiniMap, useNodesState } from '@xyflow/react'
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
} from 'iconoir-react'
import { useAuth } from '../AuthContext'
import Vela from '../components/Vela'
import PlaygroundLoader from '../components/PlaygroundLoader'
import { morphToolToHtml } from '../utils/toolMorpher'

const defaultSuggestions = [
  {
    id: 1,
    icon: Lightbulb,
    title: 'Create a study plan',
    prompt: 'Help me create a structured study plan for my upcoming exams.',
    color: 'hsl(142, 70%, 50%)',
  },
  {
    id: 2,
    icon: TrendingUp,
    title: 'Practice flashcards',
    prompt: 'Generate practice flashcards on concepts I recently studied.',
    color: 'hsl(195, 85%, 55%)',
  },
  {
    id: 3,
    icon: AlertCircle,
    title: 'Explain a concept',
    prompt: 'Explain a complex academic concept in simple intuitive terms.',
    color: 'hsl(280, 70%, 60%)',
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

// Helper to safely extract tool metadata (title, description, items, toolType)
function extractToolMetadata(toolObj) {
  if (!toolObj) return { title: 'Interactive Learning Tool', description: '', items: [], toolType: 'tool' }
  const target = toolObj.generated_tool || toolObj
  const items = Array.isArray(target.items)
    ? target.items
    : (Array.isArray(target?.data?.items) ? target.data.items : [])

  return {
    title: target.title || toolObj.title || 'Interactive Learning Tool',
    description: target.description || toolObj.description || '',
    items,
    toolType: target.toolType || target.tool_type || toolObj.tool_type || 'tool',
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
  const resizeRef = useRef({ startX: 0, startY: 0, startW: 820, startH: 580 })

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
      <div className="canvas-node-drag-handle flex items-center justify-between gap-3 border-b border-[#18283e] px-4 py-2.5 bg-[#0e1626]">
        <div className="min-w-0 flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[#7dd3fc]">
            <Layers className="w-3.5 h-3.5 text-[#5A7D99]" />
            <span className="hidden sm:inline">Workspace</span>
          </div>
          <div className="h-3 w-px bg-[#282E38]" />
          <h3 className="truncate text-xs sm:text-sm font-semibold text-white max-w-[180px] sm:max-w-[280px]">
            {data.title}
          </h3>
          {data.toolType && (
            <span className="rounded-full border border-[#282E38] bg-[#131519] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8fb7ff]">
              {data.toolType}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
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
                  className="nodrag px-2.5 py-1 text-[11px] rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                >
                  ⚡ Flashcards
                </button>
                <button
                  onClick={() => data.onSelectSuggestion?.('Build a 10-question practice quiz with active recall')}
                  className="nodrag px-2.5 py-1 text-[11px] rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                >
                  📝 Practice Quiz
                </button>
                <button
                  onClick={() => data.onSelectSuggestion?.('Generate a concept breakdown diagram')}
                  className="nodrag px-2.5 py-1 text-[11px] rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                >
                  🧠 Mind Map
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

const canvasNodeTypes = {
  welcome: WelcomeNode,
  thread: ThreadNode,
  tool: ToolNode,
  sticky: StickyNoteNode,
  pin: PinNode,
  checklist: ChecklistNode,
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

  // Persistent Chat History (Recents) State — strictly scoped to logged-in user
  const [chatHistory, setChatHistory] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)

  // Load chat history ONLY when authenticated with a valid user
  useEffect(() => {
    if (user?.id) {
      try {
        const userKey = `learning_playground_chat_history_${user.id}`
        const saved = localStorage.getItem(userKey)
        setChatHistory(saved ? JSON.parse(saved) : [])
      } catch {
        setChatHistory([])
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
  }, [user?.id])

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
  const [isSharingEmail, setIsSharingEmail] = useState(false)
  const [shareError, setShareError] = useState('')


  const audioInputRef = useRef(null)
  const imageInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)
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
    setIsDraggingOver(false)

    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      if (droppedFile.type.startsWith('image/')) {
        setUploadTab('image-ocr')
        setOcrImageFile(droppedFile)
        if (!uploadTitle) setUploadTitle(droppedFile.name.replace(/\.[^/.]+$/, ''))
      } else if (droppedFile.type.startsWith('audio/')) {
        setUploadTab('audio')
        setAudioFile(droppedFile)
        if (!uploadTitle) setUploadTitle(droppedFile.name.replace(/\.[^/.]+$/, ''))
      } else {
        validateAndSetFile(droppedFile)
      }
      if (!showUploadModal) {
        setShowUploadModal(true)
      }
    }
  }

  const [generatedTool, setGeneratedTool] = useState(null)
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(true)
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
    if (node.id.startsWith('sticky_') || node.id.startsWith('pin_') || node.id.startsWith('check_') || node.id.length === 36) {
      handleUpdateUserNote(node.id, { position: node.position })
    }
  }

  const handleCanvasDoubleClick = (e) => {
    if (e.target.closest('.nodrag') || e.target.closest('.canvas-node') || e.target.closest('.canvas-sticky-note') || e.target.closest('.canvas-pin-node') || e.target.closest('.canvas-checklist-node') || e.target.closest('button')) {
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
    setRightPanelOpen(true)
    setMobileTab('tool')
  }

  const openInlineEditor = () => {
    if (!generatedTool) return
    const meta = extractToolMetadata(generatedTool)
    setEditingTitle(meta.title)
    setEditingDesc(meta.description)
    setEditingItems(
      Array.isArray(meta.items) && meta.items.length > 0
        ? JSON.parse(JSON.stringify(meta.items))
        : [{ id: '1', front: 'Card 1', back: 'Answer 1' }]
    )
    setShowEditModal(true)
  }

  const handleSaveInlineEdit = () => {
    if (!generatedTool) return
    const meta = extractToolMetadata(generatedTool)
    const newHtml = morphToolToHtml(meta.toolType || 'flashcards', editingTitle, editingDesc, editingItems)

    const updated = {
      ...generatedTool,
      title: editingTitle,
      description: editingDesc,
      items: editingItems,
      html: newHtml,
      app: { html: newHtml },
      data: {
        ...(generatedTool.data || {}),
        title: editingTitle,
        description: editingDesc,
        items: editingItems,
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
    setEditingItems((prev) => [
      ...prev,
      {
        id: String(prev.length + 1),
        front: 'New Concept / Question',
        back: 'Detailed answer or explanation',
      },
    ])
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

      // Welcome card on clean canvas when empty
      if (!generatedTool && !isLoading && !rightPanelOpen && messages.length === 0) {
        nextNodes.push({
          id: 'welcome-card',
          type: 'welcome',
          position: getPosition('welcome-card', { x: 100, y: 100 }),
          dragHandle: '.canvas-node-drag-handle',
          data: {
            quickActions: suggestions,
            onSelectSuggestion: (prompt) => handleSendMessage(prompt),
          },
        })
      }

      if (rightPanelOpen || generatedTool || isLoading) {
        nextNodes.push({
          id: 'workspace-tool',
          type: 'tool',
          position: getPosition('workspace-tool', { x: 80, y: 100 }),
          dragHandle: '.canvas-node-drag-handle',
          data: {
            title: generatedTool ? activeMeta.title : (isLoading ? 'Building your tool' : 'Canvas workspace'),
            toolType: generatedTool ? activeMeta.toolType : '',
            html: activeHtml,
            hasTool: Boolean(generatedTool),
            loading: isLoading,
            stage: generationStage,
            phase: buildPhase,
            onExpand: generatedTool ? () => setIsToolMaximized(true) : null,
            onClose: generatedTool ? handleUnloadTool : null,
          },
        })
      }

      // Add all personal sticky notes, pins, and checklists to canvas
      canvasUserNotes.forEach((note) => {
        nextNodes.push({
          id: note.id,
          type: note.type || 'sticky',
          position: getPosition(note.id, note.position || { x: 300, y: 150 }),
          dragHandle: '.canvas-node-drag-handle',
          data: {
            ...note,
            onUpdate: handleUpdateUserNote,
            onDelete: handleDeleteUserNote,
          },
        })
      })

      return nextNodes
    })
  }, [generatedTool, rightPanelOpen, isLoading, generationStage, buildPhase, activeHtml, activeMeta.title, activeMeta.toolType, suggestions, messages.length, canvasUserNotes])

  // Automatically fetch database tools on mount / auth state change
  useEffect(() => {
    fetchMarketplaceTools()
    if (session?.access_token) {
      fetchTierStatus()
      fetchSavedTools()
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

    const instruction = uploadInstruction.trim()
    setUploadInstruction('')
    setSelectedIngestFormat('')

    if (instruction && instruction !== 'chat') {
      setTimeout(() => {
        handleSendMessage(`${instruction} based on "${docObj.title}"`)
      }, 300)
    } else {
      // Attached cleanly without auto-generation so user can freely prompt
      setChatHistory(prev => [
        ...prev,
        {
          id: Date.now(),
          role: 'assistant',
          content: `**Attached "${docObj.title}" to this session.**\n\nWhat would you like to create from this? You can type any request in the chat bar (e.g. *2D Crossword*, *Feynman Grader*, *Cloze Notes*, *Flashcards*, *Quiz*, or ask specific questions).`
        }
      ])
    }
  }

  const handleUploadDocument = async () => {
    if (!session?.access_token) {
      setUploadError('Please sign in to upload documents.')
      return
    }

    if (!uploadFile) {
      setUploadError('Please select a file to upload.')
      return
    }

    const docTitle = uploadTitle.trim() || uploadFile.name.replace(/\.[^/.]+$/, '')

    setIsUploadingDoc(true)
    setUploadError('')

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
      }
      triggerIngestCompletion(docObj)
    } catch (err) {
      console.error('Upload document error:', err)
      setUploadError(err.message || 'Error processing document RAG embeddings.')
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
    if (!updatedMessages || updatedMessages.length === 0 || !user?.id) return

    const firstUserMsg = updatedMessages.find((m) => m.role === 'user')
    const rawContent = firstUserMsg ? firstUserMsg.content : 'Study Session'
    const title = rawContent.slice(0, 36) + (rawContent.length > 36 ? '...' : '')

    setChatHistory((prev) => {
      let idToUse = activeChatId
      if (!idToUse) {
        idToUse = `chat_${Date.now()}`
        setActiveChatId(idToUse)
      }

      const existingIdx = prev.findIndex((s) => s.id === idToUse)
      const updatedSession = {
        id: idToUse,
        title,
        messages: updatedMessages,
        generatedTool: currentTool,
        attachedDocument: doc,
        updatedAt: Date.now(),
      }

      if (existingIdx >= 0) {
        const newHistory = [...prev]
        newHistory[existingIdx] = updatedSession
        return newHistory
      } else {
        return [updatedSession, ...prev]
      }
    })
  }

  const loadChatSession = (chatSession) => {
    setActiveChatId(chatSession.id)
    setMessages(chatSession.messages || [])
    setGeneratedTool(chatSession.generatedTool || null)
    setAttachedDocument(chatSession.attachedDocument || null)
    setIsChatPanelOpen(true)
    if (chatSession.generatedTool) {
      setRightPanelOpen(true)
    }
    setMobileTab('chat')
  }

  const deleteChatSession = (sessionId, e) => {
    if (e) e.stopPropagation()
    setChatHistory((prev) => prev.filter((s) => s.id !== sessionId))
    if (activeChatId === sessionId) {
      handleStartNewSession()
    }
  }

  const handleStartNewSession = () => {
    setActiveChatId(null)
    setMessages([])
    setGeneratedTool(null)
    setAttachedDocument(null)
  }

  const handleUnloadTool = () => {
    setGeneratedTool(null)
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
                  <Link
                    to="/tools?tab=my-tools"
                    className={`w-full px-2.5 py-2 rounded-md text-xs flex items-center justify-between transition-colors ${
                      location.pathname === '/tools' && location.search.includes('tab=my-tools')
                        ? 'bg-slate-800 text-white font-semibold border border-slate-700'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Bookmark className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <span className="truncate">📁 My Tools</span>
                    </div>
                    {savedTools.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-mono">
                        {savedTools.length}
                      </span>
                    )}
                  </Link>

                  <Link
                    to="/tools?tab=shared"
                    className={`w-full px-2.5 py-2 rounded-md text-xs flex items-center justify-between transition-colors ${
                      location.pathname === '/tools' && location.search.includes('tab=shared')
                        ? 'bg-slate-800 text-white font-semibold border border-slate-700'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Share2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <span className="truncate">Shared with Me</span>
                    </div>
                    {sharedTools.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-mono">
                        {sharedTools.length}
                      </span>
                    )}
                  </Link>
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
                  <Link
                    to="/tools?tab=marketplace"
                    className={`w-full px-2.5 py-2 rounded-md text-xs flex items-center justify-between transition-colors ${
                      location.pathname === '/tools' && location.search.includes('tab=marketplace')
                        ? 'bg-slate-800 text-white font-semibold border border-slate-700'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Globe className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <span className="truncate">Marketplace</span>
                    </div>
                    {marketplaceTools.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-mono">
                        {marketplaceTools.length}
                      </span>
                    )}
                  </Link>

                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="w-full px-2.5 py-2 rounded-md text-xs text-left text-slate-300 hover:bg-slate-800/60 hover:text-white flex items-center gap-2 transition-colors"
                    title="Import notes, lecture slides, or documents"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span className="truncate">Import from Drive</span>
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
                  <Clock className="w-3 h-3 text-slate-500" />
                </div>

                <div className="space-y-0.5">
                  {filteredChats.length === 0 ? (
                    <div className="space-y-0.5">
                      <button
                        onClick={() => handleSendMessage('Organic Chemistry reaction mechanisms')}
                        className="w-full px-2.5 py-1.5 rounded-md text-xs text-left text-slate-400 hover:text-white hover:bg-slate-800/60 truncate transition-colors flex items-center gap-2"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span className="truncate">Organic Chemistry</span>
                      </button>
                      <button
                        onClick={() => handleSendMessage('Calculus II integration techniques and practice')}
                        className="w-full px-2.5 py-1.5 rounded-md text-xs text-left text-slate-400 hover:text-white hover:bg-slate-800/60 truncate transition-colors flex items-center gap-2"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span className="truncate">Calculus II</span>
                      </button>
                    </div>
                  ) : (
                    filteredChats.slice(0, 5).map((chat) => {
                      const isActive = activeChatId === chat.id
                      return (
                        <div
                          key={chat.id}
                          onClick={() => loadChatSession(chat)}
                          className={`group px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between cursor-pointer transition-all ${
                            isActive
                              ? 'bg-slate-800 text-white font-medium border border-slate-700'
                              : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-1">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                            <span className="truncate">{chat.title || 'Previous Chat'}</span>
                          </div>
                          <button
                            onClick={(e) => deleteChatSession(chat.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 text-slate-500 transition-opacity rounded"
                            title="Delete chat"
                          >
                            <Trash2 className="w-3 h-3" />
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

      {/* Floating Left Chat Panel (Collapsible) */}
      <div
        className={`relative z-20 flex flex-col bg-[#10151f]/95 backdrop-blur-xl transition-[width,transform,margin,opacity] duration-300 flex-shrink-0 overflow-hidden ${
          isChatPanelOpen
            ? 'w-[calc(100%-1rem)] sm:w-[380px] lg:w-[420px] translate-x-0 m-2 sm:my-3 sm:ml-3 sm:mr-1.5 h-[calc(100%-1rem)] sm:h-[calc(100%-1.5rem)] rounded-2xl border border-[#223247] shadow-2xl shadow-black/40'
            : 'w-0 m-0 -translate-x-full h-full border-0 pointer-events-none'
        }`}
      >
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
                      <div className="flex-1 min-w-0 bg-[#0e1626]/90 border border-[#1b2b40] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs sm:text-sm text-[#e2e8f0] leading-relaxed shadow-sm space-y-2">
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
            <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-[#3b82f6]/40 bg-[#5A7D99]/20 px-2.5 py-1 text-xs text-[#93c5fd]">
              <span className="flex items-center gap-1.5 truncate">
                <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{attachedDocument.title}</span>
              </span>
              <button
                onClick={() => setAttachedDocument(null)}
                className="text-[#bfdbfe] hover:text-white flex-shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          <div className="rounded-xl border border-[#223247] bg-[#141b29] p-2 focus-within:border-[#385677] transition-colors">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder="Ask a question or build a study tool..."
              className="w-full resize-none border-none bg-transparent py-1 text-xs sm:text-sm text-white placeholder-[#7f93ad] focus:outline-none min-h-[36px] max-h-28"
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
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                    isChatListening ? 'bg-red-500 text-white animate-pulse' : 'text-[#8493a8] hover:bg-[#1f2e45] hover:text-white'
                  }`}
                  title="Voice Input (Whisper)"
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => handleSendMessage()}
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
          </div>

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
        </div>

        {generatedTool && (
          <div className="absolute left-3 right-3 top-[5.75rem] z-20 flex justify-end pointer-events-none">
            <div className="flex max-w-full flex-wrap items-center gap-2 rounded-[22px] border border-[#1b2b40] bg-[#09111d]/92 px-3 py-2 shadow-xl shadow-black/20 backdrop-blur-md pointer-events-auto">
              <button
                onClick={openInlineEditor}
                className="rounded-full border border-[#223247] bg-[#101b2d] px-3 py-1.5 text-[11px] font-semibold text-[#e2e8f0] transition-colors hover:bg-[#16263d] hover:text-white"
                title="Edit questions, cards, and content in canvas"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-[#5A7D99]" />
                  <span>Edit</span>
                </span>
              </button>
              <button
                onClick={() => handleSaveActiveToolToLibrary(generatedTool)}
                className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 transition-colors hover:bg-emerald-500 hover:text-white"
                title="Save this tool to your personal Saved Tools library"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Save</span>
                </span>
              </button>
              <button
                onClick={() => handleOpenShareModal(generatedTool)}
                className="rounded-full border border-[#223247] bg-[#101b2d] px-3 py-1.5 text-[11px] font-semibold text-[#e2e8f0] transition-colors hover:bg-[#16263d] hover:text-white"
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
                  className="rounded-full border border-[#223247] bg-[#101b2d] px-3 py-1.5 text-[11px] font-semibold text-[#e2e8f0] transition-colors hover:bg-[#16263d] hover:text-white"
                  title="Export or print study materials"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-[#5A7D99]" />
                    <span>Export</span>
                  </span>
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#1e2d45] bg-[#21262E] p-1.5 shadow-2xl">
                    <button
                      onClick={handleExportMarkdown}
                      className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-white transition-colors hover:bg-[#1a253c]"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-[#5A7D99]" />
                        Download Markdown
                      </span>
                    </button>
                    <button
                      onClick={handlePrintStudySheet}
                      className="mt-1 w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-white transition-colors hover:bg-[#1a253c]"
                    >
                      <span className="flex items-center gap-2">
                        <Printer className="w-3.5 h-3.5 text-[#5A7D99]" />
                        Print / PDF Cheat Sheet
                      </span>
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => openPublishModal(generatedTool)}
                className="rounded-full border border-[#3b82f6]/40 bg-[#3b82f6]/15 px-3 py-1.5 text-[11px] font-semibold text-[#93c5fd] transition-colors hover:bg-[#3b82f6] hover:text-white"
                title="Publish this tool to the Community Marketplace"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Publish</span>
                </span>
              </button>
            </div>
          </div>
        )}

        <div className="absolute inset-0 z-0 learning-canvas" onDoubleClick={handleCanvasDoubleClick}>
          <ReactFlow
            nodes={canvasNodes}
            edges={[]}
            nodeTypes={canvasNodeTypes}
            onNodesChange={onCustomCanvasNodesChange}
            onNodeDragStop={handleNodeDragStop}
            fitView
            fitViewOptions={{ padding: 0.18, minZoom: 0.7 }}
            minZoom={0.35}
            maxZoom={1.8}
            defaultViewport={{ x: 0, y: 0, zoom: 0.88 }}
            panOnScroll
            selectionOnDrag={false}
            nodesDraggable
            proOptions={{ hideAttribution: true }}
          >
            <Background variant="dots" gap={26} size={1.5} color="rgba(148, 163, 184, 0.45)" />
            <MiniMap
              pannable
              zoomable
              nodeColor={(node) => {
                if (node.type === 'tool') return '#60a5fa'
                if (node.type === 'welcome') return '#34d399'
                return '#94a3b8'
              }}
              maskColor="rgba(26, 32, 44, 0.75)"
              className="!bg-[#242d3d]/95 !border !border-[#3e4d66] !rounded-2xl !shadow-xl"
            />
            <Controls className="!rounded-2xl !overflow-hidden !border !border-[#3e4d66] !bg-[#242d3d]/95 !backdrop-blur-md !shadow-xl" />
          </ReactFlow>
        </div>


        {isToolMaximized && generatedTool && (
          <div className="fixed inset-0 z-50 bg-[#04070d]/92 backdrop-blur-sm p-3 sm:p-5">
            <div className="flex h-full flex-col rounded-[28px] border border-[#1f3046] bg-[#09111d] shadow-2xl">
              <div className="flex items-center justify-between gap-3 border-b border-[#18283e] px-4 py-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8fb7ff]">Expanded workspace</div>
                  <h3 className="mt-1 truncate text-sm font-semibold text-white">{activeMeta.title}</h3>
                </div>
                <button
                  onClick={() => setIsToolMaximized(false)}
                  className="rounded-full border border-[#223247] bg-[#101b2d] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#16263d]"
                  title="Exit Fullscreen (Escape)"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Minimize</span>
                  </span>
                </button>
              </div>
              <div className="flex-1 p-3 sm:p-4">
                <iframe
                  srcDoc={activeHtml}
                  title="Expanded Interactive Tool Sandbox"
                  className="h-full min-h-[420px] w-full rounded-[22px] border-none bg-white shadow-[0_24px_60px_rgba(15,23,42,0.24)]"
                  allow="microphone"
                  sandbox="allow-scripts allow-modals allow-forms"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* In-Canvas Direct Inline Editor Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-2xl bg-[#1A1E24] border border-[#282E38] rounded-[8px] p-6 shadow-2xl space-y-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#282E38] pb-3 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[6px] bg-[#5A7D99]/20 border border-[#5A7D99]/40 flex items-center justify-center text-[#5A7D99]">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Edit Tool in Canvas</h3>
                  <p className="text-[11px] text-[#6E7580]">Customize cards, questions, and answers before saving</p>
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
                    Tool Items / Cards ({editingItems.length})
                  </label>
                  <button
                    onClick={handleAddEditorItem}
                    className="px-2.5 py-1 rounded-[6px] bg-[#21262E] hover:bg-[#5A7D99] text-xs font-semibold text-white border border-[#282E38] transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {editingItems.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-[6px] bg-[#131519] border border-[#282E38] space-y-2 relative group">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono text-[#5A7D99] font-bold">ITEM {idx + 1}</span>
                        <button
                          onClick={() => handleDeleteEditorItem(idx)}
                          className="p-1 text-[#6E7580] hover:text-red-400 rounded transition-colors"
                          title="Delete card"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={item.front || item.question || item.concept || item.title || ''}
                        onChange={(e) => handleUpdateEditorItem(idx, item.front !== undefined ? 'front' : (item.question !== undefined ? 'question' : 'title'), e.target.value)}
                        placeholder="Front / Question / Term"
                        className="w-full bg-[#1A1E24] border border-[#282E38] rounded-[6px] px-3 py-1.5 text-xs text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99]"
                      />

                      <textarea
                        value={item.back || item.answer || item.explanation || item.detail || ''}
                        onChange={(e) => handleUpdateEditorItem(idx, item.back !== undefined ? 'back' : (item.answer !== undefined ? 'answer' : 'explanation'), e.target.value)}
                        placeholder="Back / Answer / Explanation"
                        rows={2}
                        className="w-full bg-[#1A1E24] border border-[#282E38] rounded-[6px] px-3 py-1.5 text-xs text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99] resize-none"
                      />
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
      )}

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
                onClick={handleUploadDocument}
                disabled={isUploading || (!uploadFile && !youtubeUrl && !ocrImageFile)}
                className="px-4 py-1.5 rounded-[6px] bg-[#5A7D99] hover:bg-[#3D5E7A] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md disabled:opacity-30"
              >
                {isUploading ? (
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

      {/* INLINE TOOL EDITOR MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A1E24] border border-[#282E38] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="p-4 px-6 border-b border-[#282E38] flex items-center justify-between bg-[#131519]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#5A7D99]/15 border border-[#5A7D99]/30 flex items-center justify-center text-[#5A7D99]">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Edit Interactive Tool</h3>
                  <p className="text-[11px] text-[#94a3b8]">Modify titles, definitions, questions, and flashcard content</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#282E38] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#cbd5e1] mb-1.5">Tool Title</label>
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  className="w-full bg-[#282E38] border border-[#282E38] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5A7D99] transition-colors"
                  placeholder="e.g., Photosynthesis Flashcards"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#cbd5e1] mb-1.5">Description</label>
                <input
                  type="text"
                  value={editingDesc}
                  onChange={(e) => setEditingDesc(e.target.value)}
                  className="w-full bg-[#282E38] border border-[#282E38] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5A7D99] transition-colors"
                  placeholder="e.g., Core light-dependent and light-independent mechanisms"
                />
              </div>

              <div className="pt-2 border-t border-[#282E38]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-[#cbd5e1]">Study Items & Cards ({editingItems.length})</h4>
                  <button
                    onClick={handleAddEditorItem}
                    className="px-2.5 py-1 rounded-lg bg-[#5A7D99]/15 hover:bg-[#5A7D99]/25 text-[#5A7D99] text-xs font-semibold flex items-center gap-1 border border-[#5A7D99]/30 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Card / Item</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {editingItems.map((item, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-[#282E38]/70 border border-[#282E38] space-y-2 relative group">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#5A7D99]">Card {idx + 1}</span>
                        <button
                          onClick={() => handleDeleteEditorItem(idx)}
                          className="p-1 text-[#ef4444] hover:bg-[#ef4444]/15 rounded-md transition-colors"
                          title="Delete Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <input
                          type="text"
                          value={item.front || item.question || item.concept || item.word || item.left || ''}
                          onChange={(e) => handleUpdateEditorItem(idx, 'front', e.target.value)}
                          placeholder="Front / Term / Question"
                          className="w-full bg-[#1A1E24] border border-[#282E38] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#5A7D99]"
                        />
                      </div>

                      <div>
                        <textarea
                          rows={2}
                          value={item.back || item.answer || item.definition || item.explanation || item.detail || item.right || ''}
                          onChange={(e) => handleUpdateEditorItem(idx, 'back', e.target.value)}
                          placeholder="Back / Definition / Detailed Explanation"
                          className="w-full bg-[#1A1E24] border border-[#282E38] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#5A7D99] resize-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-[#282E38] flex items-center justify-end gap-2.5 bg-[#131519]">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#94a3b8] hover:text-white hover:bg-[#282E38] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInlineEdit}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#5A7D99] hover:bg-[#3D5E7A] shadow-md transition-colors flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
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
    </div>
  )
}


