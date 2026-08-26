import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Send,
  Sparkles,
  Lightbulb,
  TrendingUp,
  AlertCircle,
  X,
  Bookmark,
  Maximize2,
  Minimize2,
  Wrench,
  Trash2,
  Plus,
  Search,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  PanelRightClose,
  MessageSquare,
  Play,
  Share2,
  Check,
  Zap,
  Paperclip,
  FileText,
  Upload,
  LogOut,
  Clock,
  Video,
  Mic,
  MicOff,
  Image,
  Camera,
  Edit3,
  Save,
  BookOpen,
  Layers,
  Flame,
  RotateCcw,
  CheckCircle2,
  Globe,
  ThumbsUp,
  ThumbsDown,
  GitFork,
  ExternalLink,
  Eye,
  Tag,
  Download,
  Printer,
  Copy,
  Shuffle,
  Volume2,
  Timer,
  Package,
  Brain,
  CheckSquare,
  Compass,
  Scale,
  SquarePen,
  Folder,
  Pin,
  AudioLines,
  MoreHorizontal,
  Activity,
  Target,
} from 'lucide-react'
import { useAuth } from '../AuthContext'
import Vela from '../components/Vela'
import { DotGrid } from '../components/Reveal.jsx'
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

export default function Learningplayground() {
  const { user, session, signOut } = useAuth()

  const [messages, setMessages] = useState([])
  const [suggestions, setSuggestions] = useState(defaultSuggestions)
  const [isLoadingTierStatus, setIsLoadingTierStatus] = useState(false)
  const [tierStatus, setTierStatus] = useState(null)
  const toolsQuota = (tierStatus?.quotas || []).find((quota) => quota.actionType === 'learning_tool_generate')

  const [sidebarOpen, setSidebarOpen] = useState(true)
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
      } catch {}
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
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [mobileTab, setMobileTab] = useState('chat') // 'chat' | 'tool'
  const [isToolMaximized, setIsToolMaximized] = useState(false)
  const [generationStage, setGenerationStage] = useState(null)
  const [buildPhase, setBuildPhase] = useState(null) // 'planning' | 'building'
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isChatListening, setIsChatListening] = useState(false)
  const chatRecognitionRef = useRef(null)

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
    const updated = {
      ...generatedTool,
      title: editingTitle,
      description: editingDesc,
      items: editingItems,
      data: {
        ...(generatedTool.data || {}),
        title: editingTitle,
        description: editingDesc,
        items: editingItems,
      },
    }
    setGeneratedTool(updated)
    saveOrUpdateChatSession(messages, updated)
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

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

  // 1-Click Direct Tool Share Link Generator
  const handleCopyShareLink = (tool) => {
    const target = tool || generatedTool
    if (!target) return
    const shareUrl = `${window.location.origin}/?toolId=${target.id || ''}`
    navigator.clipboard.writeText(shareUrl)
    setShareToastMessage('Direct study link copied to clipboard')
    setTimeout(() => setShareToastMessage(''), 2500)
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

  const activeHtml = extractToolHtml(generatedTool)
  const activeMeta = extractToolMetadata(generatedTool)

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
    <div className="flex-1 h-0 w-full relative bg-[#080c14] text-[#f1f5f9] flex overflow-hidden font-sans">
      <DotGrid />

      {/* Left ChatGPT-Style Sidebar */}
      <aside
        className={`relative z-30 bg-[#080c14] border-r border-[#162032] flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-64 sm:w-68' : 'w-0 border-r-0 overflow-hidden'
          }`}
      >
        {/* Top Header in Sidebar */}
        {/* Top Header in Sidebar */}
        <div className="p-3.5 flex items-center justify-between gap-2 border-b border-[#162032]">
          <div className="flex items-center gap-2.5 min-w-0">
            <Vela size={22} className="flex-shrink-0" />
            <span className="font-bold text-xs sm:text-sm text-white tracking-tight truncate">
              Learning Playground
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSidebarSearch(!showSidebarSearch)}
              className="p-1.5 rounded-lg text-[#8493a8] hover:text-white hover:bg-[#131c2e] transition-colors"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg text-[#8493a8] hover:text-white hover:bg-[#131c2e] transition-colors"
              title="Close Sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="p-3 space-y-1.5 border-b border-[#162032]">
          <button
            onClick={handleStartNewSession}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#131c2e] hover:bg-[#19243b] border border-[#1e2d45] text-xs font-semibold text-white transition-all group shadow-sm"
          >
            <Plus className="w-4 h-4 text-[#38bdf8] group-hover:scale-110 transition-transform" />
            <span>New chat</span>
          </button>
        </div>

        {/* Core Navigation Items */}
        <div className="px-2 pt-2 space-y-0.5 text-xs text-[#94a3b8] border-b border-[#162032] pb-2">
          <button
            onClick={() => setActiveNavSection('chats')}
            className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all ${activeNavSection === 'chats'
              ? 'bg-[#131c2e] text-white font-semibold'
              : 'hover:bg-[#131c2e]/70 hover:text-white'
              }`}
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-[#38bdf8]" />
              <span>Chats</span>
            </div>
            {chatHistory.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#3b82f6]/20 text-[#38bdf8] font-mono">
                {chatHistory.length}
              </span>
            )}
          </button>

          <Link
            to="/tools"
            className="w-full px-3 py-2 rounded-lg text-xs font-medium text-[#94a3b8] hover:bg-[#131c2e]/70 hover:text-white flex items-center gap-2.5 transition-all"
          >
            <Wrench className="w-4 h-4 text-[#38bdf8]" />
            <span>Tools Studio</span>
          </Link>

          <button
            onClick={() => setShowMarketplaceExplorer(true)}
            className="w-full px-3 py-2 rounded-lg text-xs font-medium text-[#94a3b8] hover:bg-[#131c2e]/70 hover:text-white flex items-center justify-between transition-all"
            title="Browse Community Marketplace Tools"
          >
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-[#38bdf8]" />
              <span>Marketplace</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#3b82f6]/20 text-[#38bdf8] font-mono">
              {marketplaceTools.length}
            </span>
          </button>

          <button
            onClick={() => setActiveNavSection('saved-tools')}
            className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all ${activeNavSection === 'saved-tools'
              ? 'bg-[#131c2e] text-white font-semibold'
              : 'hover:bg-[#131c2e]/70 hover:text-white'
              }`}
          >
            <div className="flex items-center gap-2.5">
              <Bookmark className="w-4 h-4 text-[#38bdf8]" />
              <span>Saved Tools</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1e293b] text-[#8493a8] font-mono">
              {savedTools.length}
            </span>
          </button>

          <button
            onClick={() => setActiveNavSection('community')}
            className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all ${activeNavSection === 'community'
              ? 'bg-[#131c2e] text-white font-semibold'
              : 'hover:bg-[#131c2e]/70 hover:text-white'
              }`}
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-[#38bdf8]" />
              <span>Community Library</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1e293b] text-[#8493a8] font-mono">
              {marketplaceTools.length}
            </span>
          </button>
        </div>

        {/* Search Bar (Collapsible) */}
        {showSidebarSearch && (
          <div className="px-3 pt-2 pb-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#64748b]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeNavSection === 'chats'
                    ? 'Search chats...'
                    : activeNavSection === 'saved-tools'
                      ? 'Search saved tools...'
                      : 'Search community...'
                }
                className="w-full bg-[#131c2e] border border-[#1e2b45] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#38bdf8]"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Scrollable Recents / Conversations & Tools List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 scrollbar-thin">
          {activeNavSection === 'chats' && (
            <div>
              <div className="px-2 pt-1 pb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#8493a8] uppercase tracking-wider">
                  Recents
                </span>
                <Clock className="w-3 h-3 text-[#64748b]" />
              </div>

              {filteredChats.length === 0 ? (
                <p className="px-3 py-3 text-xs text-[#64748b]">No previous chats found.</p>
              ) : (
                filteredChats.map((chat) => {
                  const isActive = activeChatId === chat.id
                  return (
                    <div
                      key={chat.id}
                      onClick={() => loadChatSession(chat)}
                      className={`group px-3 py-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-all ${isActive
                        ? 'bg-[#131c2e] text-white font-medium border border-[#1e2b45]'
                        : 'text-[#94a3b8] hover:bg-[#131c2e]/60 hover:text-white'
                        }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <MessageSquare className="w-3.5 h-3.5 text-[#38bdf8] flex-shrink-0" />
                        <span className="truncate">{chat.title || 'Previous Chat'}</span>
                      </div>

                      <button
                        onClick={(e) => deleteChatSession(chat.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-[#64748b] transition-opacity rounded-md"
                        title="Delete chat thread"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {activeNavSection === 'saved-tools' && (
            <div>
              <div className="px-2 pt-1 pb-1.5">
                <span className="text-[11px] font-semibold text-[#8493a8] uppercase tracking-wider">
                  Saved Tools
                </span>
              </div>
              {isLoadingSavedTools ? (
                <p className="px-3 py-2 text-xs text-[#64748b]">Loading saved tools...</p>
              ) : filteredSavedTools.length === 0 ? (
                <p className="px-3 py-2 text-xs text-[#64748b]">No saved tools found.</p>
              ) : (
                filteredSavedTools.map((tool) => {
                  const meta = extractToolMetadata(tool)
                  const isActive = generatedTool?.id === tool.id
                  return (
                    <div
                      key={tool.id}
                      onClick={() => selectTool(tool)}
                      className={`group px-3 py-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-all ${isActive
                        ? 'bg-[#131c2e] text-white font-medium border border-[#1e2b45]'
                        : 'text-[#94a3b8] hover:bg-[#131c2e]/60 hover:text-white'
                        }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <Wrench className="w-3.5 h-3.5 text-[#38bdf8] flex-shrink-0" />
                        <span className="truncate">{meta.title}</span>
                      </div>

                      <button
                        onClick={(e) => handleDeleteTool(tool.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-[#64748b] transition-opacity rounded-md"
                        title="Delete tool"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {activeNavSection === 'community' && (
            <div>
              <div className="px-2 pt-1 pb-1.5">
                <span className="text-[11px] font-semibold text-[#8493a8] uppercase tracking-wider">
                  Community Library
                </span>
              </div>
              {isLoadingMarketplaceTools ? (
                <p className="px-3 py-2 text-xs text-[#64748b]">Loading community tools...</p>
              ) : filteredMarketplaceTools.length === 0 ? (
                <p className="px-3 py-2 text-xs text-[#64748b]">No community tools available.</p>
              ) : (
                filteredMarketplaceTools.map((mTool) => {
                  const meta = extractToolMetadata(mTool)
                  const isActive = generatedTool?.id === mTool.id
                  return (
                    <div
                      key={mTool.id}
                      onClick={() => selectTool(mTool)}
                      className={`group px-3 py-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-all ${isActive
                        ? 'bg-[#131c2e] text-white font-medium border border-[#1e2b45]'
                        : 'text-[#94a3b8] hover:bg-[#131c2e]/60 hover:text-white'
                        }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#38bdf8] flex-shrink-0" />
                        <span className="truncate">{meta.title}</span>
                      </div>

                      <button className="opacity-0 group-hover:opacity-100 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-[#3b82f6]/20 text-[#38bdf8] transition-opacity">
                        Load
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-[#162032] bg-[#080c14] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#1e293b] border border-[#334155] flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">
              {user?.email ? user.email.charAt(0).toUpperCase() : 'G'}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-xs text-white truncate max-w-[110px]">
                {user?.email ? user.email.split('@')[0] : 'Guest User'}
              </p>
              <p className="text-[10px] text-[#64748b] truncate">
                {user ? 'Unlimited Plan' : 'Free Plan'}
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
            className="p-1.5 rounded-lg hover:bg-[#131c2e] text-[#64748b] hover:text-red-400 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* Main Center & Canvas Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-10 bg-[#080c14]">

        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#141c2e]/60 bg-[#080c14] flex-shrink-0 z-20">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-lg text-[#8493a8] hover:text-white hover:bg-[#131c2e] transition-colors"
                title="Open Sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleStartNewSession}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#cbd5e1] hover:text-white hover:bg-[#131c2e] transition-colors"
            >
              <SquarePen className="w-3.5 h-3.5" />
              <span>New chat</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0e1726] border border-[#1e2d45] text-xs font-semibold text-white hover:bg-[#182338] transition-all shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Upgrade</span>
            </button>

            <button
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className={`p-1.5 rounded-lg transition-colors ${rightPanelOpen ? 'text-[#38bdf8] bg-[#131c2e]' : 'text-[#8493a8] hover:text-white'}`}
              title={rightPanelOpen ? 'Hide Tool Canvas' : 'Show Tool Canvas'}
            >
              <PanelRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center Workspace (Chat Stream + Interactive Canvas) */}
        <div className="flex-1 flex overflow-hidden min-h-0 relative">

          {/* Center Chat Stream Column */}
          <div
            className={`flex-1 flex flex-col h-full min-h-0 overflow-hidden min-w-0 bg-[#080c14] relative z-10 transition-all ${mobileTab === 'tool' ? 'hidden lg:flex' : 'flex'
              }`}
          >
            {/* Conversation Stream */}
            <div className="flex-1 overflow-y-auto min-h-0 px-4 py-6 space-y-4 max-w-3xl mx-auto w-full flex flex-col">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-6 px-2">
                  {/* ChatGPT Hero Title */}
                  <h1 className="text-3xl font-semibold text-white mb-8 tracking-tight">
                    Where should we begin?
                  </h1>

                  {/* Centered Large ChatGPT Input Pill Capsule */}
                  <div className="w-full max-w-2xl bg-[#131c2e] border border-[#1f2d45] rounded-3xl p-3 shadow-2xl focus-within:border-[#38bdf8]/70 focus-within:shadow-[0_0_30px_rgba(56,189,248,0.15)] transition-all">
                    {/* Top Input Row */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowUploadModal(true)}
                        className="w-8 h-8 rounded-full bg-[#1b2740] hover:bg-[#243555] text-white flex items-center justify-center font-bold text-base transition-colors flex-shrink-0"
                        title="Attach files, PDF, audio, or YouTube"
                      >
                        <Plus className="w-4 h-4" />
                      </button>

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
                        placeholder="Ask anything"
                        className="flex-1 bg-transparent border-none focus:outline-none text-sm text-white placeholder-[#8493a8] resize-none py-1 max-h-32 min-h-[36px]"
                        rows={1}
                      />
                    </div>

                    {/* Bottom Action Controls Row inside Pill */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1a263c]">
                      <div className="flex items-center gap-2">
                        {attachedDocument && (
                          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#3b82f6]/20 border border-[#3b82f6]/40 text-xs text-[#38bdf8]">
                            <FileText className="w-3 h-3" />
                            <span className="truncate max-w-[140px]">{attachedDocument.title}</span>
                            <button onClick={() => setAttachedDocument(null)} className="hover:text-white ml-1">✕</button>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Grammer / AI Icon */}
                        <div className="w-6 h-6 rounded-full bg-[#0e1726] border border-[#1e2d45] flex items-center justify-center text-[#38bdf8]" title="Vela AI Ready">
                          <Sparkles className="w-3 h-3" />
                        </div>

                        {/* Think Button */}
                        <button
                          type="button"
                          onClick={() => setIsThinkingMode(!isThinkingMode)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${isThinkingMode
                            ? 'bg-[#3b82f6]/20 text-[#38bdf8] border border-[#3b82f6]/40 shadow-sm'
                            : 'text-[#8493a8] hover:text-white hover:bg-[#1b2740]'
                            }`}
                          title="Deep Reasoning Mode"
                        >
                          <Brain className="w-3.5 h-3.5" />
                          <span>Think</span>
                        </button>

                        {/* Voice Mic Button */}
                        <button
                          type="button"
                          onClick={toggleChatVoiceInput}
                          className={`p-1.5 rounded-full transition-colors ${isChatListening ? 'bg-red-500 text-white animate-pulse' : 'text-[#8493a8] hover:text-white hover:bg-[#1b2740]'}`}
                          title="Voice Input (Whisper)"
                        >
                          <Mic className="w-4 h-4" />
                        </button>

                        {/* Audio Waveform / Send Button */}
                        <button
                          onClick={() => handleSendMessage()}
                          disabled={isLoading || !inputValue.trim()}
                          className="w-8 h-8 rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 disabled:opacity-40"
                          title="Send prompt"
                        >
                          <AudioLines className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Prompt Items under Capsule */}
                  <div className="flex flex-col items-start gap-2.5 mt-6 w-full max-w-2xl px-2">
                    <button
                      onClick={() => handleSendMessage('Create interactive revision flashcards and a timed quiz on key concepts')}
                      className="flex items-center gap-3 text-xs text-[#94a3b8] hover:text-white transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-[#38bdf8]" />
                      <span>Create interactive revision tools or flashcards</span>
                    </button>

                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="flex items-center gap-3 text-xs text-[#94a3b8] hover:text-white transition-colors"
                    >
                      <FileText className="w-4 h-4 text-[#38bdf8]" />
                      <span>Ground study session in lecture notes (PDF / Slides)</span>
                    </button>

                    <button
                      onClick={() => handleSendMessage('Perform deep research and generate a comprehensive study guide')}
                      className="flex items-center gap-3 text-xs text-[#94a3b8] hover:text-white transition-colors"
                    >
                      <Globe className="w-4 h-4 text-[#38bdf8]" />
                      <span>Deep academic research and study summary</span>
                    </button>
                  </div>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.role === 'assistant' && <Vela size={26} className="mt-1 flex-shrink-0" />}
                    <div
                      className={`max-w-xl px-4 py-3 rounded-2xl text-xs leading-relaxed ${m.role === 'user'
                        ? 'bg-[#1e293b] border border-[#334155] text-white shadow-md'
                        : 'bg-[#131c2e] border border-[#1e2d45] text-[#f1f5f9]'
                        }`}
                    >
                      <div className="whitespace-pre-wrap">{m.content}</div>
                      {m.attachedTool && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <button
                            onClick={() => {
                              selectTool(m.attachedTool)
                              setRightPanelOpen(true)
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold text-[11px] transition-all shadow-sm"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-white" />
                            <span>Open in Canvas</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {isLoading && (
                <div className="flex gap-3 justify-start items-center animate-fade-in py-1">
                  <Vela size={26} loading={true} className="flex-shrink-0" />
                  <div className="px-4 py-2.5 rounded-2xl bg-[#131c2e] border border-[#1e2d45] text-xs text-white flex items-center gap-2 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-ping" />
                    <span>{generationStage || 'Vela is crafting your interactive tool on the canvas...'}</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Docked Bottom Input Bar (when conversation has messages) */}
            {messages.length > 0 && (
              <div className="p-4 bg-[#080c14] border-t border-[#141c2e]/60 flex-shrink-0">
                <div className="max-w-3xl mx-auto w-full">
                  <div className="bg-[#131c2e] border border-[#1f2d45] rounded-3xl p-2.5 shadow-2xl focus-within:border-[#38bdf8]/70 transition-all">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setShowUploadModal(true)}
                        className="w-7 h-7 rounded-full bg-[#1b2740] hover:bg-[#243555] text-white flex items-center justify-center font-bold text-sm transition-colors flex-shrink-0"
                        title="Attach files or notes"
                      >
                        <Plus className="w-4 h-4" />
                      </button>

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
                        placeholder="Ask anything"
                        className="flex-1 bg-transparent border-none focus:outline-none text-xs text-white placeholder-[#8493a8] resize-none px-1 py-1 max-h-24 min-h-[32px]"
                        rows={1}
                      />

                      <button
                        type="button"
                        onClick={toggleChatVoiceInput}
                        className={`p-1.5 rounded-full transition-colors ${isChatListening ? 'bg-red-500 text-white animate-pulse' : 'text-[#8493a8] hover:text-white hover:bg-[#1b2740]'}`}
                        title="Voice Input (Whisper)"
                      >
                        <Mic className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleSendMessage()}
                        disabled={isLoading || !inputValue.trim()}
                        className="w-7 h-7 rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 disabled:opacity-40 flex-shrink-0"
                        title="Send message"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right Interactive Tool Viewer Canvas Panel */}
          <div
            ref={toolContainerRef}
            className={`bg-[#0b101b] flex flex-col overflow-hidden transition-all duration-300 relative ${isToolMaximized
              ? 'fixed inset-0 z-50 bg-[#080c14]'
              : rightPanelOpen
                ? 'flex-1 border-l border-[#162032] min-w-0 shadow-2xl'
                : 'w-0 border-l-0 overflow-hidden hidden'
              } ${mobileTab === 'chat' ? 'hidden lg:flex' : 'flex'}`}
          >
            {/* Always-visible Floating Minimize Badge when Maximized */}
            {isToolMaximized && (
              <button
                onClick={() => setIsToolMaximized(false)}
                className="fixed top-3 right-4 z-50 px-3 py-1.5 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold shadow-2xl border border-white/20 flex items-center gap-1.5 transition-all"
                title="Exit Fullscreen (Escape)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Minimize (Esc)</span>
              </button>
            )}

            {/* Unified Single Canvas Header Bar */}
            <div className="px-4 py-2.5 border-b border-[#162032] bg-[#0e1424] flex items-center justify-between flex-shrink-0 z-30 relative gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Sparkles className="w-4 h-4 text-[#38bdf8] flex-shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-white truncate">
                  {activeMeta.title || 'Interactive Workspace'}
                </span>
                {generatedTool && (
                  <span className="capitalize text-[10px] px-2 py-0.5 rounded-full bg-[#3b82f6]/15 border border-[#3b82f6]/30 text-[#38bdf8] font-mono font-semibold flex-shrink-0">
                    {activeMeta.toolType}
                  </span>
                )}
              </div>

              {generatedTool && (
                <div className="flex items-center gap-1.5 text-xs text-[#cbd5e1] flex-shrink-0">
                  <button
                    onClick={openInlineEditor}
                    className="p-1 px-2.5 rounded-lg bg-[#131c2e] hover:bg-[#1a253c] text-[#cbd5e1] hover:text-white transition-colors flex items-center gap-1 text-[11px] border border-[#1e2d45]"
                    title="Edit questions, cards, and content in canvas"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#38bdf8]" />
                    <span className="hidden md:inline">Edit</span>
                  </button>

                  <button
                    onClick={() => handleCopyShareLink(generatedTool)}
                    className="p-1 px-2.5 rounded-lg bg-[#131c2e] hover:bg-[#1a253c] text-[#cbd5e1] hover:text-white transition-all flex items-center gap-1 text-[11px] border border-[#1e2d45]"
                    title="Copy direct shareable study link"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#38bdf8]" />
                    <span className="hidden md:inline">Share</span>
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="p-1 px-2 rounded-lg bg-[#131c2e] hover:bg-[#1a253c] text-[#cbd5e1] hover:text-white transition-all flex items-center gap-1 text-[11px] border border-[#1e2d45]"
                      title="Export or print study materials"
                    >
                      <Download className="w-3.5 h-3.5 text-[#38bdf8]" />
                      <span className="hidden md:inline">Export</span>
                    </button>

                    {showExportMenu && (
                      <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-[#131c2e] border border-[#1e2d45] shadow-2xl p-1.5 z-50 animate-fade-in space-y-1">
                        <button
                          onClick={handleExportMarkdown}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1a253c] text-xs font-semibold text-white flex items-center gap-2 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#38bdf8]" />
                          <div>
                            <p className="text-xs">Download Markdown</p>
                            <p className="text-[10px] text-[#8493a8]">Clean Obsidian/Notion format</p>
                          </div>
                        </button>

                        <button
                          onClick={handlePrintStudySheet}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1a253c] text-xs font-semibold text-white flex items-center gap-2 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#38bdf8]" />
                          <div>
                            <p className="text-xs">Print / PDF Cheat Sheet</p>
                            <p className="text-[10px] text-[#8493a8]">Clean 2-column print layout</p>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => openPublishModal(generatedTool)}
                    className="p-1 px-2.5 rounded-lg bg-[#3b82f6]/20 hover:bg-[#3b82f6] text-[#38bdf8] hover:text-white transition-all flex items-center gap-1.5 text-[11px] border border-[#3b82f6]/40 hover:border-[#3b82f6] font-medium shadow-sm group"
                    title="Publish this tool to the Community Marketplace"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#38bdf8] group-hover:text-white" />
                    <span className="hidden sm:inline">Publish</span>
                  </button>

                  <button
                    onClick={() => setIsToolMaximized(!isToolMaximized)}
                    className={`p-1 px-2.5 rounded-lg transition-all flex items-center gap-1 text-[11px] font-medium border ${isToolMaximized
                      ? 'bg-[#3b82f6] hover:bg-[#2563eb] text-white border-[#3b82f6] shadow-md'
                      : 'bg-[#131c2e] hover:bg-[#1a253c] text-[#cbd5e1] hover:text-white border-[#1e2d45]'
                      }`}
                    title={isToolMaximized ? 'Minimize Workspace (Esc)' : 'Expand Fullscreen'}
                  >
                    {isToolMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    <span className="hidden md:inline">{isToolMaximized ? 'Minimize' : 'Expand'}</span>
                  </button>

                  <button
                    onClick={handleUnloadTool}
                    className="p-1 px-1.5 rounded-lg hover:bg-red-500/20 text-[#8493a8] hover:text-red-400 transition-colors flex items-center gap-1 text-[11px]"
                    title="Close tool and return to canvas idle"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Sandbox Canvas Body */}
            <div className="flex-1 p-2 sm:p-4 overflow-y-auto bg-[#080c14] flex flex-col min-h-0">
              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center my-auto w-full max-w-xl mx-auto p-2 sm:p-4">
                  <PlaygroundLoader stage={generationStage} phase={buildPhase} />
                </div>
              ) : generatedTool ? (
                activeHtml ? (
                  <iframe
                    srcDoc={activeHtml}
                    title="Interactive Tool Sandbox"
                    className="w-full h-full min-h-[450px] border-none rounded-[8px] bg-white flex-1 shadow-2xl"
                    allow="microphone"
                    sandbox="allow-scripts allow-modals allow-forms"
                  />
                ) : (
                  <div className="space-y-4 p-4">
                    <h4 className="text-base font-semibold text-white">{activeMeta.title}</h4>
                    <p className="text-xs text-[#ECECF1]">{activeMeta.description}</p>
                    {Array.isArray(activeMeta.items) && activeMeta.items.length > 0 && (
                      <div className="grid gap-3 grid-cols-1">
                        {activeMeta.items.map((item, idx) => (
                          <div key={idx} className="p-3.5 rounded-[6px] bg-[#212121] border border-[#2F2F2F]">
                            <p className="font-medium text-xs text-white mb-1">
                              {item.question || item.title || item.concept || item.front}
                            </p>
                            <p className="text-xs text-[#8E8E93]">
                              {item.answer || item.explanation || item.detail || item.back || item.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 my-auto">
                  <Vela size={56} className="mb-3 opacity-40 hover:opacity-100 transition-opacity" />
                  <h4 className="text-sm font-semibold text-white mb-1">Interactive Canvas</h4>
                  <p className="text-xs text-[#8E8E93] max-w-xs">
                    Select a tool from your left sidebar or ask Vela in the chat to generate an interactive revision tool.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
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
