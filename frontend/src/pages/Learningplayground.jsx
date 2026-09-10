import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Send, Sparkles, Lightbulb, TrendingUp, AlertCircle, Network, Clock, History, X, Zap,
  Share2, Image, Camera, BookOpen, Volume2, ShieldCheck, Bookmark, Globe, Maximize2, Minimize2,
  Check, ArrowRight, CornerDownLeft, Sparkle, Search, Folder, User, Layers, ArrowUpRight, Plus, Eye
} from 'lucide-react'
import { useAuth } from '../AuthContext'
import { useLocation } from 'react-router-dom'
import Vela from '../components/Vela'
import '../App.css'
import { DotGrid } from '../components/Reveal.jsx'
import PlaygroundLoader from '../components/PlaygroundLoader'

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
    title: 'Practice questions',
    prompt: 'Generate practice questions on topics I recently studied.',
    tag: 'Active Recall',
  },
  {
    id: 3,
    icon: AlertCircle,
    title: 'Explain a complex concept',
    prompt: 'Explain a complex concept in intuitive, first-principles terms.',
    tag: 'Deep Dive',
  },
]

const API_BASE = import.meta.env.DEV ? 'http://localhost:5000' : (import.meta.env.VITE_API_URL || 'http://localhost:5000')

// Handles Learningplayground logic.
function Learningplayground() {
  const { user, session } = useAuth()
  const location = useLocation()

  // Extract quiz context if passed from StepTwo or Metacognitive Analysis
  const initialQuizResults = location.state?.quizResults || null
  const initialWrongQs = location.state?.mindmapData?.wrongQuestions || null
  const isPerfectScore = location.state?.mindmapData?._perfect || false
  const initialAnalysis = location.state?.analysis || null
  const initialPromptFromAnalysis = location.state?.initialPrompt || null
  const initialDocumentTitle = location.state?.documentTitle || location.state?.title || null

  const [_activeQuizResults, setActiveQuizResults] = useState(initialQuizResults)
  const [activeWrongQs, setActiveWrongQs] = useState(initialWrongQs)
  const [activeAnalysis, setActiveAnalysis] = useState(initialAnalysis)
  const [activeSessionTitle, setActiveSessionTitle] = useState(initialDocumentTitle || null)

  const [messages, setMessages] = useState([])
  const [suggestions, setSuggestions] = useState(defaultSuggestions)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [isLoadingTierStatus, setIsLoadingTierStatus] = useState(false)
  const [tierStatus, setTierStatus] = useState(null)
  const toolsQuota = (tierStatus?.quotas || []).find((quota) => quota.actionType === 'learning_tool_generate')
  const [savedToolsTab, setSavedToolsTab] = useState('sessions') // 'sessions' or 'saved'
  const [sessionModalMode, setSessionModalMode] = useState('quiz') // 'quiz' or 'playground'
  const [savedTools, setSavedTools] = useState([])
  const [isLoadingSavedTools, setIsLoadingSavedTools] = useState(false)
  const [publishingToolId, setPublishingToolId] = useState(null)
  const [quizSessions, setQuizSessions] = useState([])
  const [isLoadingQuizSessions, setIsLoadingQuizSessions] = useState(false)
  const [activePlaygroundSessionId, setActivePlaygroundSessionId] = useState(null)
  const [playgroundSessions, setPlaygroundSessions] = useState([])
  const [isLoadingPlaygroundSessions, setIsLoadingPlaygroundSessions] = useState(false)
  const [generatedTool, setGeneratedTool] = useState(null)
  const [isToolMaximized, setIsToolMaximized] = useState(false)
  const [generationStage, setGenerationStage] = useState(null)
  const [buildPhase, setBuildPhase] = useState(null) // 'planning' | 'building'
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [showMarketplaceMetadataModal, setShowMarketplaceMetadataModal] = useState(false)
  const [marketplaceMetadataForm, setMarketplaceMetadataForm] = useState({ title: '', description: '', tags: '' })
  const [marketplaceMetadataError, setMarketplaceMetadataError] = useState('')

  // Multimodal Image Attachment state
  const [attachedImage, setAttachedImage] = useState(null) // { file, previewUrl, base64 }
  const imageInputRef = useRef(null)

  // Grounded Paragraph Inspector Drawer state
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [inspectorDocTitle, setInspectorDocTitle] = useState('')
  const [inspectorParagraphs, setInspectorParagraphs] = useState([])
  const [inspectorTargetPara, setInspectorTargetPara] = useState(null)
  const [isLoadingParagraphs, setIsLoadingParagraphs] = useState(false)
  const inspectorScrollRef = useRef(null)

  const [generatedImageUrl, setGeneratedImageUrl] = useState(null)
  const [generatedImageError, setGeneratedImageError] = useState(null)
  const [generatedImageLoading, setGeneratedImageLoading] = useState(false)

  const [sharedTools, setSharedTools] = useState([])
  const [isLoadingSharedTools, setIsLoadingSharedTools] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [sharingTool, setSharingTool] = useState(null)
  const [shareEmail, setShareEmail] = useState('')
  const [shareLoading, setShareLoading] = useState(false)
  const [shareError, setShareError] = useState('')

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const mindmapRef = useRef(null)
  const marketplaceMetadataResolverRef = useRef(null)
  const sessionModalRef = useRef(null)
  const marketplaceMetadataModalRef = useRef(null)
  const shareToolModalRef = useRef(null)

  const openMarketplaceMetadataModal = ({ title, description, tags }) => {
    setMarketplaceMetadataError('')
    setMarketplaceMetadataForm({
      title: String(title || '').trim().slice(0, 180) || 'My Learning Tool',
      description: String(description || '').trim().slice(0, 500),
      tags: Array.isArray(tags) ? tags.join(', ') : '',
    })
    setShowMarketplaceMetadataModal(true)

    return new Promise((resolve) => {
      marketplaceMetadataResolverRef.current = resolve
    })
  }

  const closeMarketplaceMetadataModal = (result = null) => {
    if (marketplaceMetadataResolverRef.current) {
      marketplaceMetadataResolverRef.current(result)
      marketplaceMetadataResolverRef.current = null
    }
    setShowMarketplaceMetadataModal(false)
    setMarketplaceMetadataError('')
  }

  // Scroll mindmap into view whenever a tool is generated
  useEffect(() => {
    if (generatedTool) {
      setTimeout(() => mindmapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
  }, [generatedTool])

  const anyModalOpen = showSessionModal || showMarketplaceMetadataModal || showShareModal

  useEffect(() => {
    if (!anyModalOpen) return

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return

      if (showShareModal) {
        setShowShareModal(false)
        return
      }

      if (showMarketplaceMetadataModal) {
        closeMarketplaceMetadataModal(null)
        return
      }

      if (showSessionModal) {
        setShowSessionModal(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    setTimeout(() => {
      if (showShareModal) {
        shareToolModalRef.current?.focus()
      } else if (showMarketplaceMetadataModal) {
        marketplaceMetadataModalRef.current?.focus()
      } else if (showSessionModal) {
        sessionModalRef.current?.focus()
      }
    }, 0)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [anyModalOpen, showMarketplaceMetadataModal, showSessionModal, showShareModal])

  // Handles toText logic.
  const toText = (value) => {
    if (typeof value === 'string') return value.trim()
    if (value == null) return ''
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }

  // Handles normalizeToolPayload logic.
  const normalizeToolPayload = (tool) => {
    if (!tool || typeof tool !== 'object') return null

    const toolType = toText(tool.toolType).toLowerCase() || 'notes'
    const render = toText(tool.render).toLowerCase() || 'native'
    const rawItems = Array.isArray(tool?.data?.items) ? tool.data.items : []

    // If iframe mode, preserve the HTML app directly
    if (render === 'iframe' && tool?.app?.html) {
      return {
        toolType,
        title: toText(tool.title) || 'Generated Learning Tool',
        description: toText(tool.description) || 'Generated from your request',
        render: 'iframe',
        app: {
          html: String(tool.app.html),
        },
        data: { items: [] },
      }
    }

    // If it's a mindmap tool, pass through nodes/edges for ReactFlow rendering
    if (toolType === 'mindmap' || toolType === 'native-mindmap') {
      return {
        toolType,
        title: toText(tool.title) || 'Mindmap',
        description: toText(tool.description) || 'Generated from your request',
        render: 'native',
        ui: 'mindmap',
        data: {
          nodes: Array.isArray(tool?.data?.nodes) ? tool.data.nodes : [],
          edges: Array.isArray(tool?.data?.edges) ? tool.data.edges : [],
          items: []
        }
      }
    }

    // If it's an image tool, pass it through directly
    if (toolType === 'image') {
      const localImageUrl = toText(tool?.data?.localImageUrl) || ''
      const imageDataUrl = toText(tool?.data?.imageDataUrl) || ''
      const imageUrl = toText(tool?.data?.imageUrl) || ''
      const staleLegacyImageUrl = /\/prompt\//i.test(imageUrl)

      return {
        toolType,
        title: toText(tool.title) || 'Generated Image',
        description: toText(tool.description) || 'Generated from your request',
        render: 'native',
        ui: 'image',
        data: {
          imagePrompt: toText(tool?.data?.imagePrompt) || '',
          localImageUrl,
          imageDataUrl,
          imageUrl: staleLegacyImageUrl ? '' : imageUrl,
          imageError: staleLegacyImageUrl
            ? 'Stale image-provider response detected. Open the local app at http://localhost:5173 and regenerate.'
            : (toText(tool?.data?.imageError) || ''),
          items: []
        }
      }
    }

    // If it's a chat response, pass it through directly
    if (toolType === 'chat' || render === 'chat') {
      return {
        toolType: 'chat',
        title: toText(tool.title) || 'Chat Response',
        description: toText(tool.description) || '',
        render: 'chat',
        ui: 'chat',
        data: {
          message: toText(tool?.data?.message) || toText(tool.description) || '',
          items: []
        }
      }
    }

    // Otherwise, normalize items for native rendering
    const normalizedItems = rawItems.map((item, index) => {
      const title = toText(item?.title) || `Item ${index + 1}`
      const question = toText(item?.question)
      const answer = toText(item?.answer)
      const content = toText(item?.content)
      const front = toText(item?.front)
      const back = toText(item?.back)

      if (toolType === 'flashcards' || toolType === 'card-deck') {
        const resolvedFront = front || question || title || `Card ${index + 1}`
        const resolvedBack = back || answer || content || `Key idea: ${resolvedFront}`
        return { ...item, title: resolvedFront, front: resolvedFront, back: resolvedBack }
      }

      return {
        ...item,
        title,
        question: question || title,
        answer,
        content: content || answer || question || title,
      }
    })

    return {
      toolType,
      title: toText(tool.title) || 'Generated Learning Tool',
      description: toText(tool.description) || 'Generated from your request',
      render: render === 'iframe' ? 'iframe' : 'native',
      ui: toText(tool.ui) || 'cards',
      data: { items: normalizedItems },
    }
  }

  // Handles scrollToBottom logic.
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchTierStatus = useCallback(async () => {
    if (!session?.access_token) {
      setTierStatus(null)
      return
    }

    setIsLoadingTierStatus(true)
    try {
      const res = await fetch(`${API_BASE}/api/tier-status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      })

      if (!res.ok) {
        setTierStatus(null)
        return
      }

      const data = await res.json()
      setTierStatus(data?.data || null)
    } catch {
      setTierStatus(null)
    } finally {
      setIsLoadingTierStatus(false)
    }
  }, [session?.access_token])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!user?.id || !session?.access_token) {
      setTierStatus(null)
      setIsLoadingTierStatus(false)
      return
    }
    fetchTierStatus()
  }, [user?.id, session?.access_token, fetchTierStatus])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + 'px'
    }
  }, [inputValue])

  useEffect(() => {
    if (!user?.id || !session?.access_token) {
      setSuggestions(defaultSuggestions)
      setIsLoadingSuggestions(false)
      return
    }

    // Set initial session title if coming from a recent document quiz
    if (!activeSessionTitle && initialQuizResults) {
      setActiveSessionTitle("Recent Document Quiz")
    }

    // If they came with an analysis, prioritize those suggestions
    const recommendedTools = activeAnalysis?.recommendedTools || []
    if (recommendedTools.length > 0) {
      setSuggestions(recommendedTools.map((tool, idx) => ({
        id: `rec-${idx}`,
        icon: Zap,
        title: tool.title,
        prompt: tool.prompt,
        tag: 'Recommended Plan',
        description: tool.description
      })))
      return
    }

    // If they came from a quiz or loaded a session, override suggestions
    if (activeWrongQs && activeWrongQs.length > 0) {
      setSuggestions([
        {
          id: 'mindmap',
          icon: Network,
          title: 'Create Concept Mindmap',
          prompt: 'Create a mindmap connecting the topics and questions I missed in my quiz.',
          tag: 'Concept Map',
          isMindmapTrigger: true
        },
        {
          id: 'flashcards',
          icon: Lightbulb,
          title: 'Review Flashcard Deck',
          prompt: 'Generate an active-recall flashcard deck for the topics I missed in my recent quiz.',
          tag: 'Flashcards',
        },
        {
          id: 'explain',
          icon: AlertCircle,
          title: 'Deconstruct Mistakes',
          prompt: 'Explain why I got those specific questions wrong and how to reason through them correctly.',
          tag: 'Deep Review',
        }
      ])
      return
    }

    if (isPerfectScore) {
      setSuggestions([
        {
          id: 'perfect',
          icon: Sparkles,
          title: 'Advanced Mastery Challenge',
          prompt: 'I got a perfect score. Provide challenging synthesis questions and edge cases to deepen my understanding.',
          tag: 'Mastery',
        }
      ])
      return
    }

    // Handles fetchSuggestions logic.
    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true)
      try {
        const res = await fetch(
          `${API_BASE}/api/suggestions`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
            credentials: 'include',
          }
        )

        if (!res.ok) {
          setSuggestions([])
          return
        }

        const data = await res.json()
        const list = []

        const urgentAreas = data?.suggestions?.urgentAreas || data?.analysisData?.lowestScoringAreas || []
        const studyPlan = data?.suggestions?.studyPlan || []
        const encouragement = data?.suggestions?.encouragement

        urgentAreas.forEach((area, idx) => {
          if (area && String(area).trim()) {
            list.push({
              id: idx + 1,
              icon: AlertCircle,
              title: `Review ${area}`,
              prompt: `Create a targeted study guide and practice breakdown for ${area}.`,
              tag: 'Focus Area',
            })
          }
        })

        if (list.length < 3 && (studyPlan[0] || encouragement)) {
          list.push({
            id: 3,
            icon: Lightbulb,
            title: 'Personalized Study Plan',
            prompt: studyPlan[0] || encouragement || 'Create a personalized study plan for me.',
            tag: 'Action Plan',
          })
        }

        if (list.length === 0) {
          if (data?.message || (!urgentAreas.length && !studyPlan.length)) {
            setSuggestions([])
          } else {
            setSuggestions(defaultSuggestions)
          }
          return
        }

        setSuggestions(list.slice(0, 3))
      } catch (err) {
        console.error('Failed to fetch suggestions:', err)
        setSuggestions(defaultSuggestions)
      } finally {
        setIsLoadingSuggestions(false)
      }
    }

    fetchSuggestions()
  }, [user?.id, session?.access_token, activeWrongQs, isPerfectScore, activeSessionTitle, initialQuizResults, activeAnalysis])

  // Consume backend-provided FLUX image result whenever an image tool is set.
  useEffect(() => {
    if (generatedTool?.toolType !== 'image') return
    setGeneratedImageLoading(true)
    setGeneratedImageUrl(
      generatedTool.data?.localImageUrl ||
      generatedTool.data?.imageDataUrl ||
      generatedTool.data?.imageUrl ||
      ''
    )
    setGeneratedImageError(generatedTool.data?.imageError || '')
    setGeneratedImageLoading(false)
  }, [generatedTool])

  // Fetch past quiz study sessions.
  const fetchQuizSessions = async () => {
    if (!session?.access_token) return
    setIsLoadingQuizSessions(true)
    try {
      const res = await fetch(`${API_BASE}/api/quiz-history`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setQuizSessions(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch quiz sessions', err)
    } finally {
      setIsLoadingQuizSessions(false)
    }
  }

  // Fetch saved Learning Playground sessions.
  const fetchPlaygroundSessions = async () => {
    if (!session?.access_token) return
    setIsLoadingPlaygroundSessions(true)
    try {
      const res = await fetch(`${API_BASE}/api/learning-playground/sessions`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setPlaygroundSessions(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch learning playground sessions', err)
    } finally {
      setIsLoadingPlaygroundSessions(false)
    }
  }

  // Load a real quiz session into the playground context
  const handleLoadQuizSession = async (quizSession) => {
    const rawQuiz = typeof quizSession.quiz === 'string'
      ? JSON.parse(quizSession.quiz)
      : (quizSession.quiz || [])

    const wrongQuestions = rawQuiz.filter(q => q.isCorrect === false)
    const allCorrect = wrongQuestions.length === 0 && rawQuiz.length > 0

    setActiveQuizResults(rawQuiz)
    setActiveWrongQs(wrongQuestions.length > 0 ? wrongQuestions : null)
    setActiveSessionTitle(quizSession.title || 'Past Study Session')
    setGeneratedTool(null)
    setShowSessionModal(false)

    const score = rawQuiz.filter(q => q.isCorrect).length
    const total = rawQuiz.length
    const fallbackGreeting = allCorrect
      ? `Loaded study session: **${quizSession.title}**\n\nYou scored ${score}/${total} (100%). Source context is active. You can generate advanced challenge tools or explore connected topics.`
      : `Loaded study session: **${quizSession.title}**\n\nYou scored ${score}/${total} with **${wrongQuestions.length} topic${wrongQuestions.length !== 1 ? 's' : ''}** flagged for review. Use the prompts below to build a concept mindmap, flashcards, or step-by-step explanations.`

    setMessages([{
      id: Date.now(),
      role: 'assistant',
      content: `Loading study session: **${quizSession.title}**...`,
      timestamp: new Date(),
    }])

    try {
      const res = await fetch(`${API_BASE}/api/chat-tools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          prompt: `I just loaded my past quiz session titled "${quizSession.title}". I scored ${score} out of ${total}. Please briefly analyze this performance in a direct, friendly manner and ask how I would like to review.`,
          context: wrongQuestions.length > 0 ? wrongQuestions : null,
          metacognitiveAnalysis: null,
          documentTitle: quizSession.title
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data?.tool) {
          const normalized = normalizeToolPayload(data.tool)
          if (normalized && normalized.render === 'chat') {
            setMessages([{
              id: Date.now() + 1,
              role: 'assistant',
              content: normalized.data.message || fallbackGreeting,
              timestamp: new Date(),
            }]);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('AI dynamic greeting failed, using fallback', e)
    }

    setMessages([{
      id: Date.now() + 2,
      role: 'assistant',
      content: fallbackGreeting,
      timestamp: new Date(),
    }])
  }

  // Image selection for Multimodal Vision
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP).')
      return
    }
    const previewUrl = URL.createObjectURL(file)
    const reader = new FileReader()
    reader.onload = () => {
      setAttachedImage({ file, previewUrl, base64: reader.result })
    }
    reader.readAsDataURL(file)
  }

  // Open the Paragraph Inspector Drawer for verified citations
  const openParagraphInspector = async (docTitle, targetParagraphIndex) => {
    setInspectorDocTitle(docTitle)
    setInspectorTargetPara(targetParagraphIndex)
    setInspectorOpen(true)
    setIsLoadingParagraphs(true)

    try {
      const res = await fetch(`${API_BASE}/api/document-paragraphs?title=${encodeURIComponent(docTitle)}`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setInspectorParagraphs(data.paragraphs || [])
      } else {
        setInspectorParagraphs([])
      }
    } catch (err) {
      console.error('Failed to load document paragraphs for inspector:', err)
      setInspectorParagraphs([])
    } finally {
      setIsLoadingParagraphs(false)
    }
  }

  // Render message text with interactive citation pills
  const renderMessageWithCitations = (content) => {
    if (!content || typeof content !== 'string') return content;
    const regex = /\[Cite:\s*id="([^"]+)",\s*title="([^"]+)",\s*para=(\d+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      const [fullMatch, chunkId, title, paraIndex] = match;
      parts.push(
        <button
          key={`${chunkId}-${match.index}`}
          onClick={() => openParagraphInspector(title, Number(paraIndex))}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            margin: '0 4px', padding: '2px 8px', borderRadius: '6px',
            background: 'rgba(90, 125, 153, 0.16)', border: '1px solid rgba(90, 125, 153, 0.35)',
            color: 'var(--foreground)', fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title={`Inspect paragraph ${paraIndex} of "${title}"`}
        >
          <BookOpen size={11} style={{ opacity: 0.7 }} />
          <span>{title.length > 20 ? title.slice(0, 18) + '…' : title} ¶{paraIndex}</span>
        </button>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  // Initial greeting effect for fresh sessions with context
  useEffect(() => {
    if (messages.length === 0) {
      let greeting = "Welcome to the Learning Playground. Ask any question, explore study concepts, or request custom interactive tools."

      if (activeAnalysis) {
        greeting = `Quiz performance analyzed.\n\nIdentified focus area: ${activeAnalysis.patternSpecificity}. Recommended next steps are available below. Choose a module or request a custom review.`
      } else if (initialPromptFromAnalysis) {
        setInputValue(initialPromptFromAnalysis)
        return
      } else if (activeWrongQs) {
        greeting = `Loaded ${activeWrongQs.length} review item${activeWrongQs.length !== 1 ? 's' : ''} from your latest session. Use the prompts below to generate a concept mindmap, flashcards, or detailed breakdowns.`
      }

      const initialMessage = {
        id: Date.now(),
        role: 'assistant',
        content: greeting,
        timestamp: new Date(),
      }
      setMessages([initialMessage])
    }
  }, [activeAnalysis, activeWrongQs, initialPromptFromAnalysis, messages.length])

  // Handles fetchSavedTools logic.
  const fetchSavedTools = async () => {
    if (!session?.access_token) return
    setIsLoadingSavedTools(true)
    try {
      const res = await fetch(`${API_BASE}/api/marketplace/tools/saved`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setSavedTools(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch saved tools', err)
    } finally {
      setIsLoadingSavedTools(false)
    }
  }

  // Fetch tools shared with me.
  const fetchSharedTools = async () => {
    if (!session?.access_token) return
    setIsLoadingSharedTools(true)
    try {
      const res = await fetch(`${API_BASE}/api/marketplace/tools/shared-with-me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setSharedTools(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch shared tools', err)
    } finally {
      setIsLoadingSharedTools(false)
    }
  }

  // Handle sharing a tool to another user via email
  const handleShareToUser = async () => {
    if (!shareEmail.trim() || !sharingTool || !session?.access_token) return
    setShareLoading(true)
    setShareError('')
    try {
      const res = await fetch(`${API_BASE}/api/marketplace/tools/share-to-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          tool_id: sharingTool.id,
          recipient_email: shareEmail.trim()
        })
      })

      await res.json()
      if (!res.ok) throw new Error('share_failed')

      setMessages(prev => [...prev, {
        id: Date.now(), role: 'assistant',
        content: `Tool shared successfully with ${shareEmail}.`,
        timestamp: new Date(),
      }])
      setShowShareModal(false)
      setShareEmail('')
    } catch {
      setShareError('Failed to share tool. Please check the email and try again.')
    } finally {
      setShareLoading(false)
    }
  }

  const handleMindmapGeneration = () => {
    setInputValue('Create a mindmap connecting the topics and questions I missed in my quiz.')
    textareaRef.current?.focus()
  }

  // Handles loadSession logic.
  const handleLoadSession = (sessionData) => {
    const safeMessages = Array.isArray(sessionData.messages)
      ? sessionData.messages.map((msg, index) => ({
        id: msg?.id || `${Date.now()}-${index}`,
        role: msg?.role === 'assistant' ? 'assistant' : 'user',
        content: String(msg?.content || ''),
        timestamp: msg?.timestamp ? new Date(msg.timestamp) : new Date(),
      }))
      : []

    let restoredTool = null
    if (sessionData.generated_tool && typeof sessionData.generated_tool === 'object') {
      restoredTool = normalizeToolPayload(sessionData.generated_tool)
    }

    let restoredWrongQs = null
    let restoredAnalysis = null

    if (Array.isArray(sessionData.context)) {
      restoredWrongQs = sessionData.context
    } else if (sessionData.context && typeof sessionData.context === 'object') {
      restoredWrongQs = sessionData.context.wrongQuestions || null
      restoredAnalysis = sessionData.context.metacognitiveAnalysis || null
    }

    setMessages(safeMessages)
    setActiveQuizResults(null)
    setActiveWrongQs(restoredWrongQs)
    setActiveAnalysis(restoredAnalysis)
    setGeneratedTool(restoredTool)
    setActiveSessionTitle(sessionData.title || 'Past Learning Session')
    setGeneratedImageUrl(null)
    setGeneratedImageError(null)
    setGeneratedImageLoading(false)
    setShowSessionModal(false)

    const sysMessage = {
      id: Date.now(),
      role: 'assistant',
      content: `Loaded session: **${sessionData.title || 'Past Session'}**.`,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, sysMessage])
    setActivePlaygroundSessionId(sessionData.id)
  }

  const saveLearningSession = async ({ latestPrompt, nextMessages, tool }) => {
    if (!session?.access_token) return
    try {
      const title = String(tool?.title || latestPrompt || 'Learning Playground Session').slice(0, 180)
      const res = await fetch(`${API_BASE}/api/learning-playground/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: activePlaygroundSessionId,
          title,
          latestPrompt,
          messages: nextMessages,
          generatedTool: tool,
          context: {
            wrongQuestions: activeWrongQs || [],
            metacognitiveAnalysis: activeAnalysis
          },
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.data?.id && !activePlaygroundSessionId) {
          setActivePlaygroundSessionId(data.data.id)
          fetchPlaygroundSessions()
        }
      }
    } catch (err) {
      console.error('Failed to save learning playground session:', err)
    }
  }

  // Save generated tool to personal collection
  const saveToolToCollection = async () => {
    if (!session?.access_token || !generatedTool) return

    try {
      const res = await fetch(`${API_BASE}/api/marketplace/tools/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          title: generatedTool.title || 'My Learning Tool',
          description: generatedTool.description || '',
          tool_type: generatedTool.toolType || 'notes',
          category: 'study-guide',
          tags: [],
          generated_tool: generatedTool,
          latest_prompt: messages[messages.length - 2]?.content || '',
          visibility: 'private',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, {
          id: Date.now(), role: 'assistant',
          content: `Tool saved to collection. View it in Saved Tools.`,
          timestamp: new Date(),
        }])
        await fetchSavedTools()
        return data.tool?.id || null
      } else {
        let message = 'Failed to save tool.'
        let duplicateToolId = null
        try {
          const payload = await res.json()
          if (payload?.error) message = payload.error
          if (payload?.duplicate_tool_id) duplicateToolId = payload.duplicate_tool_id
        } catch {
          // Keep fallback message
        }

        if (duplicateToolId) {
          setMessages(prev => [...prev, {
            id: Date.now(), role: 'assistant',
            content: `Tool already exists in Saved Tools. Reusing existing entry.`,
            timestamp: new Date(),
          }])
          return duplicateToolId
        }

        setMessages(prev => [...prev, {
          id: Date.now(), role: 'assistant',
          content: message,
          timestamp: new Date(),
        }])
        return null
      }
    } catch (err) {
      console.error('Failed to save tool to collection:', err)
      setMessages(prev => [...prev, {
        id: Date.now(), role: 'assistant',
        content: `Error saving tool. Please try again.`,
        timestamp: new Date(),
      }])
      return null
    }
  }

  // Toggle whether a saved tool is published on Marketplace.
  const toggleToolPublish = async (tool, publish) => {
    if (!session?.access_token || !tool?.id) return
    if (publishingToolId) return

    let publishMetadata = null
    if (publish) {
      publishMetadata = await collectMarketplaceMetadata({
        title: tool.title || generatedTool?.title || 'My Learning Tool',
        description: tool.description || generatedTool?.description || '',
        tags: Array.isArray(tool.tags) ? tool.tags : [],
      })
      if (!publishMetadata) {
        setMessages(prev => [...prev, {
          id: Date.now(),
          role: 'assistant',
          content: `Publish cancelled. Tool remains private.`,
          timestamp: new Date(),
        }])
        return
      }
    }

    setPublishingToolId(tool.id)
    try {
      const res = await fetch(`${API_BASE}/api/marketplace/tools/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          tool_id: tool.id,
          publish,
          ...(publish ? publishMetadata : {}),
        }),
      })

      if (!res.ok) {
        let message = publish ? 'Failed to publish tool.' : 'Failed to unpublish tool.'
        try {
          const payload = await res.json()
          if (payload?.error) message = payload.error
        } catch {
          // Keep fallback message.
        }

        setMessages(prev => [...prev, {
          id: Date.now(),
          role: 'assistant',
          content: message,
          timestamp: new Date(),
        }])
        return
      }

      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: publish
          ? `Tool published to the Marketplace.`
          : `Tool unpublished from Marketplace.`,
        timestamp: new Date(),
      }])

      await fetchSavedTools()
    } catch (err) {
      console.error('Failed to toggle publish state:', err)
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: `Could not update publish status. Please try again.`,
        timestamp: new Date(),
      }])
    } finally {
      setPublishingToolId(null)
    }
  }

  const collectMarketplaceMetadata = async ({ title, description, tags }) => {
    const result = await openMarketplaceMetadataModal({ title, description, tags })
    if (!result) return null

    const nextTitle = String(result.title || '').trim().slice(0, 180)
    if (!nextTitle) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: `Tool name is required before publishing.`,
        timestamp: new Date(),
      }])
      return null
    }

    return {
      title: nextTitle,
      description: String(result.description || '').trim().slice(0, 500),
      tags: Array.isArray(result.tags) ? result.tags : [],
    }
  }

  // Share tool publicly to the marketplace
  const shareToolToMarketplace = async () => {
    if (!session?.access_token || !generatedTool) return

    const publishMetadata = await collectMarketplaceMetadata({
      title: generatedTool.title || 'My Learning Tool',
      description: generatedTool.description || '',
      tags: Array.isArray(generatedTool.tags) ? generatedTool.tags : [],
    })
    if (!publishMetadata) {
      setMessages(prev => [...prev, {
        id: Date.now(), role: 'assistant',
        content: `Publish cancelled. Tool was not published to Marketplace.`,
        timestamp: new Date(),
      }])
      return
    }

    const savedId = await saveToolToCollection()
    if (!savedId) return

    try {
      const res = await fetch(`${API_BASE}/api/marketplace/tools/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ tool_id: savedId, publish: true, ...publishMetadata }),
      })
      if (res.ok) {
        setMessages(prev => [...prev, {
          id: Date.now(), role: 'assistant',
          content: `Tool published to Marketplace. Others can now discover and study from it.`,
          timestamp: new Date(),
        }])
        await fetchSavedTools()
      } else {
        let message = `Tool was saved privately, but publishing encountered an issue.`
        try {
          const payload = await res.json()
          if (payload?.error) message = payload.error
        } catch {
          // Keep fallback message
        }
        setMessages(prev => [...prev, {
          id: Date.now(), role: 'assistant',
          content: message,
          timestamp: new Date(),
        }])
      }
    } catch (err) {
      console.error('Failed to publish tool:', err)
    }
  }

  // Handles handleSuggestionClick logic.
  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion.prompt)
    if (suggestion.isMindmapTrigger) {
      handleMindmapGeneration()
    } else {
      textareaRef.current?.focus()
    }
  }

  // Handles renderGeneratedTool logic.
  const renderGeneratedTool = () => {
    if (!generatedTool && !generationStage) return null

    if (generationStage && !generatedTool) {
      return <PlaygroundLoader stage={generationStage} phase={buildPhase} />
    }

    if (!generatedTool) return null

    if (generatedTool.toolType === 'image') {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', width: '100%',
          maxWidth: '820px', margin: '0 auto 1.5rem', background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '0.75rem', padding: '1.25rem', overflow: 'hidden'
        }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--foreground)', letterSpacing: '-0.01em' }}>
                {generatedTool.title}
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--muted-foreground)' }}>
                {generatedTool.description}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <button
                onClick={saveToolToCollection}
                style={{
                  background: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'opacity 0.15s ease'
                }}
              >
                <Bookmark size={13} />
                <span>Save</span>
              </button>
              <button
                onClick={shareToolToMarketplace}
                style={{
                  background: 'transparent',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.5rem',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'background 0.15s ease'
                }}
              >
                <Globe size={13} />
                <span>Publish</span>
              </button>
              <button
                onClick={() => {
                  setGeneratedTool(null)
                  setGeneratedImageUrl(null)
                  setGeneratedImageError(null)
                  setGeneratedImageLoading(false)
                  setInputValue('')
                }}
                style={{
                  background: 'transparent', border: 'none', color: 'var(--muted-foreground)',
                  cursor: 'pointer', padding: '0.35rem', borderRadius: '0.35rem', display: 'flex', alignItems: 'center'
                }}
                title="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div style={{
            width: '100%', borderRadius: '0.5rem', overflow: 'hidden',
            border: '1px solid var(--border)', background: '#0e1117',
            minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'
          }}>
            {generatedImageLoading && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 1.5s infinite', marginRight: '8px' }} />
                Generating diagram image...
              </div>
            )}
            {generatedImageError && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--destructive)', fontSize: '0.85rem' }}>
                <div>{generatedImageError}</div>
              </div>
            )}
            {generatedImageUrl && (
              <img
                src={generatedImageUrl}
                alt={generatedTool.title}
                onError={() => {
                  setGeneratedImageError('Image could not be rendered in browser.');
                }}
                style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain', maxHeight: '65vh' }}
              />
            )}
          </div>
        </div>
      )
    }

    // ALL interactive tools are rendered cleanly in iframe
    if (generatedTool.app?.html) {
      const toolFrame = (
        <div
          style={isToolMaximized ? {
            position: 'fixed',
            inset: 0,
            zIndex: 2147483647,
            background: '#0e1117',
            display: 'flex',
            flexDirection: 'column',
          } : {
            border: '1px solid var(--border)',
            background: 'var(--card)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '1rem',
            ...(isToolMaximized ? { padding: '1rem 1.5rem', background: 'var(--card)', borderBottom: '1px solid var(--border)', flexShrink: 0 } : {})
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--foreground)', letterSpacing: '-0.01em' }}>
                  {generatedTool.title}
                </h3>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '2px 7px',
                  borderRadius: '999px',
                  border: '1px solid var(--border)',
                  color: 'var(--muted-foreground)',
                  background: 'rgba(255,255,255,0.03)',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.05em'
                }}>
                  {generatedTool.toolType}
                </span>
              </div>
              <p style={{ margin: '0.2rem 0 0 0', color: 'var(--muted-foreground)', fontSize: '0.82rem' }}>
                {generatedTool.description}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'center' }}>
              <button
                onClick={saveToolToCollection}
                style={{
                  background: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'opacity 0.15s ease',
                }}
              >
                <Bookmark size={13} />
                <span>Save</span>
              </button>
              <button
                onClick={shareToolToMarketplace}
                style={{
                  background: 'transparent',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.5rem',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Globe size={13} />
                <span>Publish</span>
              </button>
              <button
                onClick={() => setIsToolMaximized(v => !v)}
                title={isToolMaximized ? 'Minimize' : 'Maximize'}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--muted-foreground)',
                  borderRadius: '0.5rem',
                  padding: '0.45rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isToolMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button
                onClick={() => {
                  setIsToolMaximized(false)
                  setGeneratedTool(null)
                  setGenerationStage(null)
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted-foreground)',
                  cursor: 'pointer',
                  padding: '0.35rem',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '0.35rem',
                }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <iframe
            sandbox="allow-scripts allow-same-origin"
            srcDoc={generatedTool.app.html}
            style={isToolMaximized ? {
              flex: 1,
              width: '100%',
              border: 'none',
              background: '#fff',
              display: 'block',
            } : {
              width: '100%',
              minHeight: '520px',
              borderRadius: '0.5rem',
              border: '1px solid var(--border)',
              background: '#fff',
              display: 'block',
            }}
            title={generatedTool.title}
          />
        </div>
      )

      if (isToolMaximized && typeof document !== 'undefined') {
        return createPortal(toolFrame, document.body)
      }

      return toolFrame
    }

    const lastUserPrompt = [...messages].reverse().find(m => m.role === 'user')?.content || ''
    return (
      <div
        style={{
          border: '1px solid var(--border)',
          background: 'var(--card)',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          textAlign: 'center',
        }}
      >
        <p style={{ color: 'var(--destructive)', fontWeight: 600, margin: 0, fontSize: '0.95rem' }}>
          Interactive tool generation encountered an error
        </p>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
          Try rephrasing your prompt with specific study topics or formats.
        </p>
        {lastUserPrompt && (
          <button
            onClick={() => {
              setGeneratedTool(null)
              setInputValue(lastUserPrompt)
              setTimeout(() => textareaRef.current?.focus(), 0)
            }}
            style={{
              marginTop: '0.85rem',
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.45rem 1rem',
              fontSize: '0.82rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Retry generation
          </button>
        )}
      </div>
    )
  }



  // Handles handleSubmit logic.
  const handleSubmit = async (e) => {
    e.preventDefault()
    if ((!inputValue.trim() && !attachedImage) || isLoading) return

    const trimmedInput = inputValue.trim()
    const imageToSend = attachedImage

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: trimmedInput || 'Analyze this image and explain what is depicted in academic detail.',
      image: imageToSend?.previewUrl || null,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setAttachedImage(null)
    setIsLoading(true)
    setGenerationStage(imageToSend ? 'Analyzing image notes with Vision AI…' : 'Analysing your learning request…')
    setBuildPhase('planning')

    try {
      if (imageToSend) {
        const formData = new FormData()
        formData.append('prompt', trimmedInput || 'Analyze this study image/diagram and explain key concepts step-by-step.')
        if (imageToSend.file) {
          formData.append('image', imageToSend.file)
        } else if (imageToSend.base64) {
          formData.append('imageBase64', imageToSend.base64)
        }

        const res = await fetch(`${API_BASE}/api/ai/vision-chat`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          credentials: 'include',
          body: formData,
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Failed to analyze image.')
        }

        const data = await res.json()
        const aiMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.answer || data.tool?.data?.message || 'Analyzed your image.',
          timestamp: new Date(),
        }

        const nextMessages = [...messages, userMessage, aiMessage]
        setMessages(nextMessages)
        setGenerationStage(null)
        setBuildPhase(null)
        return
      }

      setGenerationStage('Planning your learning tool…')

      const res = await fetch(`${API_BASE}/api/chat-tools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          prompt: trimmedInput,
          context: activeWrongQs,
          metacognitiveAnalysis: activeAnalysis,
          documentTitle: activeSessionTitle || null,
          previousTool: generatedTool || null,
          chatHistory: messages.slice(-20).map(m => ({ role: m.role, content: m.content || m.text }))
        }),
      })


      if (!res.ok) {
        let payload = null
        try {
          payload = await res.json()
        } catch {
          payload = null
        }

        if (res.status === 429 && payload?.errorCode === 'FREE_TIER_LIMIT_REACHED') {
          throw new Error('Daily learning-tool limit reached (1/1 used). Try again tomorrow or unlock unlimited mode through mastery rewards.')
        }

        throw new Error(payload?.error || 'Failed to generate tool')
      }

      // Switch to building phase while the large HTML is being parsed
      setBuildPhase('building')
      setGenerationStage('Building your interactive tool…')

      const data = await res.json()

      let normalizedTool = null
      let chatMessageText = 'I generated a response, but no tool payload was returned.'

      if (data?.tool) {
        setGenerationStage('Finalizing your response...')
        normalizedTool = normalizeToolPayload(data.tool)

        if (normalizedTool.render === 'chat') {
          // If it's a chat response, just add it to the chat logs and do NOT open a tool pane.
          chatMessageText = normalizedTool.data.message
          normalizedTool = null // Do not render a tool
        } else {
          setGeneratedTool(normalizedTool)
          chatMessageText =
            data.tool.chatResponse ||
            data.tool.data?.chatResponse ||
            `I've created **${data.tool.title}** for you! Explore the interactive tool on the canvas, or let me know if you want to quiz yourself or try a different format.`

        }
      }

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: chatMessageText,
        timestamp: new Date(),
      }

      const nextMessages = [...messages, userMessage, aiMessage]
      setMessages(nextMessages)

      saveLearningSession({
        latestPrompt: userMessage.content,
        nextMessages,
        tool: normalizedTool,
      })
      setGenerationStage(null)
      setBuildPhase(null)
    } catch (error) {
      console.error('Error getting AI response:', error)
      const isQuotaError = error.message?.includes('limit reached') || error.message?.includes('FREE_TIER')
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: isQuotaError
          ? error.message
          : 'Something went wrong generating your tool. Try a different prompt — e.g. "create a quiz about photosynthesis" or "make flashcards on World War 2".',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
      setGenerationStage(null)
      setBuildPhase(null)
    } finally {
      setIsLoading(false)
      fetchTierStatus()
    }

  }

  // Handles handleKeyDown logic.
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const skeletonShimmerStyle = {
    position: 'relative',
    overflow: 'hidden',
    background: 'var(--card)',
  }

  const renderSuggestionSkeletons = () => (
    <div style={{ width: '100%' }}>
      <div
        style={{
          height: '0.85rem',
          width: '8rem',
          borderRadius: '999px',
          marginBottom: '1rem',
          ...skeletonShimmerStyle,
        }}
        className="lp-skeleton"
        aria-hidden
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '0.85rem',
        }}
      >
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`suggestion-skeleton-${index}`}
            style={{
              borderRadius: '0.75rem',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              padding: '1.1rem',
              minHeight: '105px',
            }}
            aria-hidden
          >
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div
                className="lp-skeleton"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  flexShrink: 0,
                  ...skeletonShimmerStyle,
                }}
              />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <div className="lp-skeleton" style={{ height: '0.85rem', width: '55%', borderRadius: '0.25rem', ...skeletonShimmerStyle }} />
                <div className="lp-skeleton" style={{ height: '0.75rem', width: '90%', borderRadius: '0.25rem', ...skeletonShimmerStyle }} />
                <div className="lp-skeleton" style={{ height: '0.75rem', width: '65%', borderRadius: '0.25rem', ...skeletonShimmerStyle }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderSessionSkeletons = ({ variant = 'default', count = 4 }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`${variant}-skeleton-${index}`}
          style={{
            padding: '0.9rem 1rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--border)',
            background: 'var(--card)',
          }}
          aria-hidden
        >
          <div className="lp-skeleton" style={{ height: '0.9rem', width: variant === 'saved' ? '45%' : '60%', borderRadius: '0.25rem', ...skeletonShimmerStyle }} />
          <div className="lp-skeleton" style={{ height: '0.75rem', width: '35%', borderRadius: '0.25rem', marginTop: '0.4rem', ...skeletonShimmerStyle }} />

          {variant === 'quiz' && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div className="lp-skeleton" style={{ height: '0.7rem', width: '28%', borderRadius: '4px', ...skeletonShimmerStyle }} />
              <div className="lp-skeleton" style={{ height: '0.7rem', width: '22%', borderRadius: '4px', ...skeletonShimmerStyle }} />
            </div>
          )}

          {variant === 'playground' && (
            <div className="lp-skeleton" style={{ height: '0.75rem', width: '80%', borderRadius: '0.25rem', marginTop: '0.4rem', ...skeletonShimmerStyle }} />
          )}

          {variant === 'saved' && (
            <>
              <div className="lp-skeleton" style={{ height: '0.75rem', width: '80%', borderRadius: '0.25rem', marginTop: '0.4rem', ...skeletonShimmerStyle }} />
              <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.45rem' }}>
                <div className="lp-skeleton" style={{ height: '1rem', width: '3.5rem', borderRadius: '4px', ...skeletonShimmerStyle }} />
                <div className="lp-skeleton" style={{ height: '1rem', width: '4rem', borderRadius: '4px', ...skeletonShimmerStyle }} />
              </div>
            </>
          )}

          {variant === 'shared' && (
            <div className="lp-skeleton" style={{ height: '0.75rem', width: '40%', borderRadius: '0.25rem', marginTop: '0.4rem', ...skeletonShimmerStyle }} />
          )}
        </div>
      ))}
    </div>
  )

  return (
    <main
      className="main-content min-h-screen"
      style={{
        background: '#11141a',
        color: 'var(--foreground)',
        fontFamily: 'var(--font-sans)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <DotGrid opacity={0.15} />

      {/* Top Navigation Bar */}
      <header
        style={{
          padding: '0.9rem 1.75rem 0.9rem 4.5rem',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(17, 20, 26, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          zIndex: 20,
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', letterSpacing: '-0.01em' }}>
              Learning Playground
            </h1>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
              Interactive Study & Tool Generation Studio
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {isLoadingTierStatus ? (
            <span
              className="lp-skeleton"
              aria-hidden
              style={{
                height: '1.4rem',
                width: '6.5rem',
                borderRadius: '999px',
                ...skeletonShimmerStyle,
              }}
            />
          ) : (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '0.25rem 0.65rem', borderRadius: '999px',
              border: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)',
              fontSize: '0.75rem', color: 'var(--muted-foreground)'
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--primary)' }} />
              <span>Tools remaining: <strong style={{ color: 'var(--foreground)' }}>{toolsQuota?.remaining ?? 0}</strong></span>
            </div>
          )}

          <button
            onClick={() => {
              setSessionModalMode('quiz')
              setSavedToolsTab('sessions')
              fetchQuizSessions()
              setShowSessionModal(true)
            }}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(90, 125, 153, 0.35)',
              background: 'rgba(90, 125, 153, 0.12)',
              color: 'var(--foreground)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              fontWeight: 500,
              transition: 'background 0.15s ease'
            }}
          >
            <Network size={14} style={{ opacity: 0.8 }} />
            <span>Link Quiz</span>
          </button>

          <button
            onClick={() => {
              setSessionModalMode('playground')
              setSavedToolsTab('playground')
              fetchPlaygroundSessions()
              fetchSavedTools()
              setShowSessionModal(true)
            }}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border)',
              background: 'rgba(255, 255, 255, 0.03)',
              color: 'var(--foreground)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              fontWeight: 500,
              transition: 'all 0.15s ease'
            }}
          >
            <History size={14} style={{ opacity: 0.8 }} />
            <span>History</span>
          </button>
        </div>
      </header>

      {/* Main Scrollable Canvas */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem 2rem 2rem 4.5rem',
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        {/* Active Session Context Banner */}
        {activeSessionTitle && (
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            fontSize: '0.82rem',
            color: 'var(--foreground)',
            maxWidth: '720px',
            margin: '0 auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={14} style={{ color: 'var(--primary)' }} />
              <span>Grounded in: <strong>{activeSessionTitle}</strong></span>
              {activeWrongQs && (
                <span style={{
                  fontSize: '0.72rem',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.25)'
                }}>
                  {activeWrongQs.length} mistake{activeWrongQs.length !== 1 ? 's' : ''} loaded
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <button
                onClick={() => {
                  setSessionModalMode('quiz')
                  setSavedToolsTab('sessions')
                  fetchQuizSessions()
                  setShowSessionModal(true)
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--muted-foreground)',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '0.35rem',
                  transition: 'color 0.15s ease'
                }}
              >
                Change
              </button>
              <button
                onClick={() => {
                  setActiveSessionTitle(null)
                  setActiveWrongQs(null)
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted-foreground)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  padding: '0.2rem',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Clear quiz session context"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Empty State / Suggestions */}
        {messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '1.75rem',
              padding: '1.5rem',
              maxWidth: '820px',
              margin: '0 auto',
              width: '100%',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '0.2rem 0.65rem', borderRadius: '999px',
                border: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)',
                fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em',
                color: 'var(--muted-foreground)', marginBottom: '0.75rem',
                fontFamily: 'var(--font-mono)'
              }}>
                <Sparkles size={11} style={{ color: 'var(--primary)' }} />
                Interactive Study Canvas
              </div>
              <h2
                style={{
                  fontSize: '1.65rem',
                  fontWeight: 600,
                  marginBottom: '0.4rem',
                  color: 'var(--foreground)',
                  letterSpacing: '-0.02em',
                }}
              >
                Design customized learning tools.
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.5 }}>
                Ask questions, explore complex concepts, or generate interactive study modules tailored to your knowledge gaps.
              </p>
            </div>

            {suggestions.length === 0 && user?.id && (
              <p style={{
                fontSize: '0.85rem',
                color: 'var(--muted-foreground)',
                textAlign: 'center',
                padding: '0.5rem 0',
              }}>
                Complete a quiz session to receive targeted study suggestions.
              </p>
            )}

            {isLoadingSuggestions && renderSuggestionSkeletons()}

            {!isLoadingSuggestions && suggestions.length > 0 && (
              <div style={{ width: '100%' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: '0.75rem', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border)'
                }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--muted-foreground)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    Suggested Prompts
                  </span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '0.85rem',
                  }}
                >
                  {suggestions.map((suggestion) => {
                    const Icon = suggestion.icon
                    return (
                      <button
                        key={suggestion.id}
                        onClick={() => handleSuggestionClick(suggestion)}
                        style={{
                          padding: '1.1rem',
                          borderRadius: '0.65rem',
                          border: '1px solid var(--border)',
                          background: 'var(--card)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: '110px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--primary)'
                          e.currentTarget.style.background = '#252b35'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border)'
                          e.currentTarget.style.background = 'var(--card)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '0.5rem' }}>
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '28px', height: '28px', borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.04)', color: 'var(--primary)'
                          }}>
                            <Icon size={14} />
                          </div>
                          {suggestion.tag && (
                            <span style={{
                              fontSize: '0.68rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.03)',
                              color: 'var(--muted-foreground)',
                              border: '1px solid var(--border)',
                              fontFamily: 'var(--font-mono)'
                            }}>
                              {suggestion.tag}
                            </span>
                          )}
                        </div>

                        <div>
                          <h3
                            style={{
                              fontSize: '0.88rem',
                              fontWeight: 600,
                              margin: '0 0 0.2rem 0',
                              color: 'var(--foreground)',
                              letterSpacing: '-0.01em'
                            }}
                          >
                            {suggestion.title}
                          </h3>
                          <p
                            style={{
                              fontSize: '0.78rem',
                              color: 'var(--muted-foreground)',
                              lineHeight: '1.4',
                              margin: 0,
                            }}
                          >
                            {suggestion.prompt.length > 70
                              ? `${suggestion.prompt.substring(0, 70)}...`
                              : suggestion.prompt}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                width: '100%',
                maxWidth: '820px',
                margin: '0 auto',
              }}
            >
              {message.role === 'assistant' && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  marginBottom: '0.35rem', paddingLeft: '0.2rem'
                }}>
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '4px',
                    background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Sparkles size={10} color="#fff" />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground)' }}>Vela</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>
                    {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              )}

              <div
                style={{
                  maxWidth: message.role === 'user' ? '75%' : '100%',
                  padding: '0.85rem 1.1rem',
                  borderRadius: '0.65rem',
                  background: message.role === 'user'
                    ? '#1E2530'
                    : 'var(--card)',
                  border: message.role === 'user'
                    ? '1px solid rgba(90, 125, 153, 0.4)'
                    : '1px solid var(--border)',
                  color: message.role === 'user' ? '#ffffff' : 'var(--foreground)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  lineHeight: '1.6',
                  fontSize: '0.88rem'
                }}
              >
                {message.image && (
                  <img
                    src={message.image}
                    alt="Uploaded notes/diagram"
                    style={{
                      maxWidth: '220px',
                      maxHeight: '160px',
                      borderRadius: '0.4rem',
                      objectFit: 'contain',
                      marginBottom: '0.25rem',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--border)'
                    }}
                  />
                )}
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {renderMessageWithCitations(message.content)}
                </div>
              </div>
            </div>
          ))
        )}

        {renderGeneratedTool()}

        {isLoading && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'flex-start', width: '100%', maxWidth: '820px', margin: '0 auto'
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              marginBottom: '0.35rem', paddingLeft: '0.2rem'
            }}>
              <div style={{
                width: '18px', height: '18px', borderRadius: '4px',
                background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Sparkles size={10} color="#fff" />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground)' }}>Vela</span>
            </div>

            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '0.65rem',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center'
              }}
            >
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                {generationStage || 'Synthesizing response...'}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer Dock */}
      <div
        style={{
          padding: '1rem 2rem 1.25rem 4.5rem',
          borderTop: '1px solid var(--border)',
          background: 'rgba(17, 20, 26, 0.92)',
          backdropFilter: 'blur(16px)',
          flexShrink: 0
        }}
      >
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          {attachedImage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem',
              padding: '0.3rem 0.65rem',
              borderRadius: '0.4rem',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              width: 'fit-content'
            }}>
              <img src={attachedImage.previewUrl} alt="Attached" style={{ width: '24px', height: '24px', objectFit: 'cover', borderRadius: '3px' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--foreground)', fontWeight: 500 }}>Image notes attached</span>
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center' }}
                title="Remove attachment"
              >
                <X size={12} />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end' }}>
            <input
              type="file"
              ref={imageInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageSelect}
            />

            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              style={{
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: attachedImage ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: attachedImage ? 'rgba(90, 125, 153, 0.2)' : 'var(--card)',
                color: attachedImage ? 'var(--foreground)' : 'var(--muted-foreground)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              title="Attach handwritten notes, diagrams, or questions"
            >
              <Image size={16} />
            </button>

            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={attachedImage ? "Ask a question about this image..." : (activeSessionTitle ? `Ask about "${activeSessionTitle}" or generate review tools...` : "Ask Vela, create flashcards, generate mindmaps, or build a tool...")}
                disabled={isLoading}
                rows={1}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.9rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: 'var(--foreground)',
                  fontSize: '0.88rem',
                  resize: 'none',
                  maxHeight: '160px',
                  overflowY: 'auto',
                  fontFamily: 'inherit',
                  outline: 'none',
                  lineHeight: 1.4,
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--primary)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border)'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={(!inputValue.trim() && !attachedImage) || isLoading}
              style={{
                padding: '0.75rem 1.1rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: (inputValue.trim() || attachedImage) && !isLoading ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                color: (inputValue.trim() || attachedImage) && !isLoading ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                cursor: (inputValue.trim() || attachedImage) && !isLoading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 500,
                fontSize: '0.85rem',
                transition: 'all 0.15s ease',
                opacity: (inputValue.trim() || attachedImage) && !isLoading ? 1 : 0.5,
              }}
            >
              <Send size={15} />
              <span>Send</span>
            </button>
          </form>

          <p
            style={{
              fontSize: '0.72rem',
              color: 'var(--muted-foreground)',
              marginTop: '0.45rem',
              textAlign: 'center',
            }}
          >
            Return to send · Shift + Return for new line
          </p>
        </div>
      </div>

      <style>{`
        .typing-indicator {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .typing-indicator span {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--muted-foreground);
          animation: typing 1.4s infinite;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typing {
          0%,
          60%,
          100% {
            opacity: 0.3;
            transform: translateY(0);
          }
          30% {
            opacity: 1;
            transform: translateY(-3px);
          }
        }

        .lp-skeleton::after {
          content: '';
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0),
            rgba(255, 255, 255, 0.06),
            rgba(255, 255, 255, 0)
          );
          animation: lp-skeleton-shimmer 1.4s ease-in-out infinite;
        }

        @keyframes lp-skeleton-shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>

      {/* Session Loading / History Modal */}
      {showSessionModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }} onClick={() => setShowSessionModal(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="learningplayground-session-modal-title"
            style={{
              background: 'var(--background)', border: '1px solid var(--border)',
              borderRadius: '0.75rem', padding: '1.5rem', width: '100%', maxWidth: '520px',
              maxHeight: '82vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
            }}
            tabIndex={-1}
            ref={sessionModalRef}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 id="learningplayground-session-modal-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  {sessionModalMode === 'quiz'
                    ? 'Past Quiz Sessions'
                    : 'Playground Archive'}
                </h3>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>
                  Load previous context or review saved tools
                </p>
              </div>
              <button
                aria-label="Close session history"
                onClick={() => setShowSessionModal(false)}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--muted-foreground)', padding: '0.25rem', display: 'flex', alignItems: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Tab Navigation */}
            <div style={{
              display: 'flex', gap: '0.35rem', marginBottom: '1.25rem',
              padding: '0.25rem', background: 'var(--card)', borderRadius: '0.5rem', border: '1px solid var(--border)'
            }}>
              {sessionModalMode === 'quiz' ? (
                <button
                  onClick={() => setSavedToolsTab('sessions')}
                  style={{
                    flex: 1,
                    padding: '0.45rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    background: savedToolsTab === 'sessions' ? 'var(--surface)' : 'transparent',
                    color: savedToolsTab === 'sessions' ? 'var(--foreground)' : 'var(--muted-foreground)',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '0.82rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Quiz Sessions
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setSavedToolsTab('playground')}
                    style={{
                      flex: 1,
                      padding: '0.45rem 0.5rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      background: savedToolsTab === 'playground' ? 'var(--surface)' : 'transparent',
                      color: savedToolsTab === 'playground' ? 'var(--foreground)' : 'var(--muted-foreground)',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: '0.8rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Sessions
                  </button>
                  <button
                    onClick={() => setSavedToolsTab('saved')}
                    style={{
                      flex: 1,
                      padding: '0.45rem 0.5rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      background: savedToolsTab === 'saved' ? 'var(--surface)' : 'transparent',
                      color: savedToolsTab === 'saved' ? 'var(--foreground)' : 'var(--muted-foreground)',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: '0.8rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Saved Tools
                  </button>
                  <button
                    onClick={() => {
                      setSavedToolsTab('shared')
                      fetchSharedTools()
                    }}
                    style={{
                      flex: 1,
                      padding: '0.45rem 0.5rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      background: savedToolsTab === 'shared' ? 'var(--surface)' : 'transparent',
                      color: savedToolsTab === 'shared' ? 'var(--foreground)' : 'var(--muted-foreground)',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: '0.8rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Shared With Me
                  </button>
                </>
              )}
            </div>

            {/* Sessions Tab Content */}
            {sessionModalMode === 'quiz' && savedToolsTab === 'sessions' && (
              <>
                {isLoadingQuizSessions ? (
                  renderSessionSkeletons({ variant: 'quiz' })
                ) : quizSessions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                    <p>No past quiz sessions found.</p>
                    <p style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>Complete a quiz first to load study gaps here.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {quizSessions.map(qs => {
                      const rawQuiz = typeof qs.quiz === 'string' ? (() => { try { return JSON.parse(qs.quiz) } catch { return [] } })() : (qs.quiz || [])
                      const score = rawQuiz.filter(q => q.isCorrect).length
                      const total = rawQuiz.length
                      const wrongCount = total - score
                      return (
                        <button
                          key={qs.id}
                          onClick={() => handleLoadQuizSession(qs)}
                          style={{
                            padding: '0.85rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border)',
                            background: 'var(--card)', textAlign: 'left', cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                        >
                          <div style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: '0.88rem' }}>{qs.title || 'Untitled Session'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.2rem' }}>
                            {new Date(qs.created_at).toLocaleDateString()} · {new Date(qs.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {total > 0 && (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', fontSize: '0.75rem' }}>
                              <span style={{ color: '#4ade80', fontWeight: 500 }}>{score}/{total} correct</span>
                              {wrongCount > 0 && (
                                <span style={{ color: '#f87171', fontWeight: 500 }}>{wrongCount} to review</span>
                              )}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* Playground History Tab Content */}
            {sessionModalMode === 'playground' && savedToolsTab === 'playground' && (
              <>
                {isLoadingPlaygroundSessions ? (
                  renderSessionSkeletons({ variant: 'playground' })
                ) : playgroundSessions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                    <p>No playground sessions archived yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {playgroundSessions.map(sessionItem => (
                      <button
                        key={sessionItem.id}
                        onClick={() => handleLoadSession(sessionItem)}
                        style={{
                          padding: '0.85rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border)',
                          background: 'var(--card)', textAlign: 'left', cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: '0.88rem' }}>{sessionItem.title || 'Untitled Playground Session'}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', marginTop: '0.2rem' }}>
                          {sessionItem.latest_prompt ? String(sessionItem.latest_prompt).slice(0, 85) : 'No prompt saved'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginTop: '0.3rem' }}>
                          {new Date(sessionItem.created_at).toLocaleDateString()}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Saved Tools Tab Content */}
            {sessionModalMode === 'playground' && savedToolsTab === 'saved' && (
              <>
                {isLoadingSavedTools ? (
                  renderSessionSkeletons({ variant: 'saved' })
                ) : savedTools.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                    <p>No saved tools yet.</p>
                    <p style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>Generate and save tools to access them here.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {savedTools.map(tool => (
                      <button
                        key={tool.id}
                        onClick={() => {
                          if (tool.generated_tool) {
                            handleLoadSession({
                              id: tool.id,
                              title: tool.title,
                              messages: [],
                              generated_tool: tool.generated_tool,
                              created_at: tool.created_at
                            })
                          }
                        }}
                        style={{
                          padding: '0.85rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border)',
                          background: 'var(--card)', textAlign: 'left', cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: '0.88rem' }}>{tool.title || 'Untitled Tool'}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                              {tool.tool_type} · {new Date(tool.created_at).toLocaleDateString()}
                            </div>
                            {tool.description && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                                {String(tool.description).slice(0, 90)}
                              </div>
                            )}
                            {Array.isArray(tool.tags) && tool.tags.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.4rem' }}>
                                {tool.tags.slice(0, 5).map((tag, index) => (
                                  <span
                                    key={`${tool.id}-tag-${index}`}
                                    style={{
                                      fontSize: '0.68rem',
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      border: '1px solid var(--border)',
                                      color: 'var(--muted-foreground)',
                                      background: 'var(--muted)',
                                    }}
                                  >
                                    #{String(tag)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '0.35rem', marginLeft: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {tool.is_published && (
                              <span style={{ fontSize: '0.68rem', background: 'rgba(34, 197, 94, 0.12)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '0.2rem 0.45rem', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                Published
                              </span>
                            )}
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSharingTool(tool)
                                setShowShareModal(true)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setSharingTool(tool)
                                  setShowShareModal(true)
                                }
                              }}
                              style={{
                                fontSize: '0.68rem',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: 'var(--foreground)',
                                border: '1px solid var(--border)',
                                padding: '0.2rem 0.45rem',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <Share2 size={11} />
                              Share
                            </span>
                            {!tool.forked_from_tool_id && (
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleToolPublish(tool, !tool.is_published)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    toggleToolPublish(tool, !tool.is_published)
                                  }
                                }}
                                style={{
                                  fontSize: '0.68rem',
                                  background: tool.is_published ? 'rgba(239, 68, 68, 0.1)' : 'rgba(90, 125, 153, 0.15)',
                                  color: tool.is_published ? '#f87171' : 'var(--foreground)',
                                  border: `1px solid ${tool.is_published ? 'rgba(239, 68, 68, 0.3)' : 'var(--border)'}`,
                                  padding: '0.2rem 0.45rem',
                                  borderRadius: '4px',
                                  whiteSpace: 'nowrap',
                                  cursor: publishingToolId === tool.id ? 'not-allowed' : 'pointer',
                                  opacity: publishingToolId === tool.id ? 0.6 : 1,
                                }}
                              >
                                {publishingToolId === tool.id
                                  ? 'Updating...'
                                  : (tool.is_published ? 'Unpublish' : 'Publish')}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Shared with me Tab Content */}
            {sessionModalMode === 'playground' && savedToolsTab === 'shared' && (
              <>
                {isLoadingSharedTools ? (
                  renderSessionSkeletons({ variant: 'shared' })
                ) : sharedTools.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                    <p>No tools shared with you yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {sharedTools.map(tool => (
                      <button
                        key={tool.id}
                        onClick={() => {
                          if (tool.generated_tool) {
                            handleLoadSession({
                              id: tool.id,
                              title: tool.title,
                              messages: [],
                              generated_tool: tool.generated_tool,
                              created_at: tool.created_at,
                              sender_email: tool.sender_email
                            })
                          }
                        }}
                        style={{
                          padding: '0.85rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border)',
                          background: 'var(--card)', textAlign: 'left', cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: '0.88rem' }}>{tool.title || 'Untitled Tool'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.2rem' }}>
                          Shared by: <strong style={{ color: 'var(--foreground)' }}>{tool.sender_email}</strong>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginTop: '0.15rem', fontFamily: 'var(--font-mono)' }}>
                          {tool.tool_type} · {new Date(tool.shared_at).toLocaleDateString()}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Share to Marketplace Metadata Modal */}
      {showMarketplaceMetadataModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2100,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => closeMarketplaceMetadataModal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="learningplayground-marketplace-modal-title"
            style={{
              background: 'var(--background)',
              border: '1px solid var(--border)',
              borderRadius: '0.75rem',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 18px 50px rgba(0,0,0,0.4)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
            ref={marketplaceMetadataModalRef}
          >
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 id="learningplayground-marketplace-modal-title" style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)' }}>
                Publish to Marketplace
              </h3>
              <button
                type="button"
                onClick={() => closeMarketplaceMetadataModal(null)}
                aria-label="Close marketplace sharing"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.35rem', color: 'var(--muted-foreground)' }}>
                  Tool Title
                </label>
                <input
                  type="text"
                  maxLength={180}
                  value={marketplaceMetadataForm.title}
                  onChange={(e) => setMarketplaceMetadataForm(prev => ({ ...prev, title: e.target.value }))}
                  style={{
                    width: '100%',
                    borderRadius: '0.4rem',
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--foreground)',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.35rem', color: 'var(--muted-foreground)' }}>
                  Summary / Overview
                </label>
                <textarea
                  maxLength={500}
                  rows={3}
                  value={marketplaceMetadataForm.description}
                  onChange={(e) => setMarketplaceMetadataForm(prev => ({ ...prev, description: e.target.value }))}
                  style={{
                    width: '100%',
                    borderRadius: '0.4rem',
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--foreground)',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.88rem',
                    resize: 'vertical',
                    minHeight: '80px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.35rem', color: 'var(--muted-foreground)' }}>
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={marketplaceMetadataForm.tags}
                  onChange={(e) => setMarketplaceMetadataForm(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="biology, active-recall, photosynthesis"
                  style={{
                    width: '100%',
                    borderRadius: '0.4rem',
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--foreground)',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>

              {marketplaceMetadataError && (
                <div style={{ color: 'var(--destructive)', fontSize: '0.8rem' }}>
                  {marketplaceMetadataError}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => closeMarketplaceMetadataModal(null)}
                style={{
                  borderRadius: '0.4rem',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--foreground)',
                  padding: '0.45rem 0.75rem',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextTitle = String(marketplaceMetadataForm.title || '').trim().slice(0, 180)
                  if (!nextTitle) {
                    setMarketplaceMetadataError('Tool name is required before publishing.')
                    return
                  }

                  const nextDescription = String(marketplaceMetadataForm.description || '').trim().slice(0, 500)
                  const nextTags = String(marketplaceMetadataForm.tags || '')
                    .split(',')
                    .map(tag => tag.trim().toLowerCase())
                    .filter(Boolean)
                    .slice(0, 12)

                  closeMarketplaceMetadataModal({
                    title: nextTitle,
                    description: nextDescription,
                    tags: nextTags,
                  })
                }}
                style={{
                  borderRadius: '0.4rem',
                  border: 'none',
                  background: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  padding: '0.45rem 0.9rem',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                }}
              >
                Publish Tool
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Tool Modal */}
      {showShareModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2100,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }} onClick={() => setShowShareModal(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="learningplayground-share-modal-title"
            style={{
              background: 'var(--background)', border: '1px solid var(--border)',
              borderRadius: '0.75rem', width: '100%', maxWidth: '440px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
            ref={shareToolModalRef}
          >
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 id="learningplayground-share-modal-title" style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)' }}>
                Share Learning Tool
              </h3>
              <button aria-label="Close share tool modal" onClick={() => setShowShareModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '1.25rem' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--foreground)' }}>
                  Marketplace Publication
                </label>
                <div style={{ background: 'var(--card)', padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginBottom: '0.65rem', marginTop: 0 }}>
                    Make this tool discoverable on the community marketplace.
                  </p>
                  <button
                    onClick={() => {
                      setShowShareModal(false)
                      toggleToolPublish(sharingTool, !sharingTool.is_published)
                    }}
                    style={{
                      width: '100%', padding: '0.5rem', borderRadius: '0.4rem',
                      background: sharingTool?.is_published ? 'rgba(239, 68, 68, 0.1)' : 'var(--primary)',
                      color: sharingTool?.is_published ? '#f87171' : 'var(--primary-foreground)',
                      border: sharingTool?.is_published ? '1px solid rgba(239, 68, 68, 0.3)' : 'none',
                      fontWeight: 500, cursor: 'pointer', fontSize: '0.82rem'
                    }}
                  >
                    {sharingTool?.is_published ? 'Unpublish from Marketplace' : 'Publish to Marketplace'}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--foreground)' }}>
                  Share Directly via Email
                </label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="email"
                    placeholder="student@example.com"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    style={{
                      flex: 1, padding: '0.55rem 0.75rem', borderRadius: '0.4rem',
                      border: '1px solid var(--border)', background: 'var(--card)',
                      color: 'var(--foreground)', fontSize: '0.85rem', outline: 'none'
                    }}
                  />
                  <button
                    onClick={handleShareToUser}
                    disabled={!shareEmail.trim() || shareLoading}
                    style={{
                      padding: '0.55rem 0.9rem', borderRadius: '0.4rem',
                      background: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none',
                      fontWeight: 500, cursor: shareLoading ? 'not-allowed' : 'pointer',
                      opacity: shareLoading ? 0.7 : 1, fontSize: '0.82rem'
                    }}
                  >
                    {shareLoading ? 'Sharing...' : 'Send'}
                  </button>
                </div>
                {shareError && <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.35rem' }}>{shareError}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paragraph Inspector Drawer */}
      {inspectorOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '440px',
          background: 'var(--background)',
          borderLeft: '1px solid var(--border)',
          zIndex: 2200,
          boxShadow: '-8px 0 25px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            padding: '1.1rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--card)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BookOpen size={16} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--foreground)' }}>Source Verification</h3>
              </div>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                {inspectorDocTitle || 'Source Document'}
              </p>
            </div>
            <button
              onClick={() => setInspectorOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted-foreground)',
                cursor: 'pointer',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Paragraph List */}
          <div
            ref={inspectorScrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}
          >
            {isLoadingParagraphs ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                Loading source passages...
              </div>
            ) : inspectorParagraphs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)', fontSize: '0.82rem' }}>
                No paragraph content found for this document.
              </div>
            ) : (
              inspectorParagraphs.map((para) => {
                const isTarget = Number(para.paragraph_index) === Number(inspectorTargetPara)
                return (
                  <div
                    key={para.id || para.paragraph_index}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '0.5rem',
                      border: isTarget ? '1px solid var(--primary)' : '1px solid var(--border)',
                      background: isTarget ? 'rgba(90, 125, 153, 0.12)' : 'var(--card)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.4rem',
                      fontSize: '0.72rem',
                      color: isTarget ? 'var(--foreground)' : 'var(--muted-foreground)',
                      fontWeight: 600,
                      fontFamily: 'var(--font-mono)'
                    }}>
                      <span>Paragraph {para.paragraph_index}</span>
                      {isTarget && (
                        <span style={{
                          background: 'var(--primary)',
                          color: 'var(--primary-foreground)',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          fontSize: '0.65rem'
                        }}>
                          Cited In Chat
                        </span>
                      )}
                    </div>
                    <p style={{
                      margin: 0,
                      fontSize: '0.82rem',
                      lineHeight: 1.5,
                      color: 'var(--foreground)'
                    }}>
                      {para.chunk_text}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </main>
  )
}

export default Learningplayground

