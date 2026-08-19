import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Send, Sparkles, Lightbulb, TrendingUp, AlertCircle, Network, Clock, History, X, Zap, Share2 } from 'lucide-react'
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
    prompt: 'Help me create a study plan for my upcoming exams.',
    color: 'hsl(142, 70%, 50%)',
  },
  {
    id: 2,
    icon: TrendingUp,
    title: 'Practice questions',
    prompt: 'Generate practice questions on topics I recently studied.',
    color: 'hsl(195, 85%, 55%)',
  },
  {
    id: 3,
    icon: AlertCircle,
    title: 'Explain a concept',
    prompt: 'Explain a complex concept in simple terms.',
    color: 'hsl(280, 70%, 60%)',
  },

]

const API_BASE = import.meta.env.DEV ? 'http://localhost:5000' : (import.meta.env.VITE_API_URL || 'http://localhost:5000')

// Handles Learningplayground logic.
function Learningplayground() {
  const { user, session } = useAuth()
  const location = useLocation()
  
  // Extract quiz context if passed from StepTwo
  const initialQuizResults = location.state?.quizResults || null
  const initialWrongQs = location.state?.mindmapData?.wrongQuestions || null
  const isPerfectScore = location.state?.mindmapData?._perfect || false
  const initialAnalysis = location.state?.analysis || null
  const initialPromptFromAnalysis = location.state?.initialPrompt || null

  const [_activeQuizResults, setActiveQuizResults] = useState(initialQuizResults)
  const [activeWrongQs, setActiveWrongQs] = useState(initialWrongQs)
  const [activeAnalysis, setActiveAnalysis] = useState(initialAnalysis)
  const [activeSessionTitle, setActiveSessionTitle] = useState(null)

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
    if (toolType === 'image') {      const localImageUrl = toText(tool?.data?.localImageUrl) || ''
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
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
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
      // Trying to pull currentDocumentTitle if available from AuthContext (if exposed), 
      // otherwise fallback to a generic recent session label
      setActiveSessionTitle("Recent Document Quiz")
    }

    // If they came with an analysis, prioritize those suggestions
    const recommendedTools = activeAnalysis?.recommendedTools || []
    if (recommendedTools.length > 0) {
      setSuggestions(recommendedTools.map((tool, idx) => ({
        id: `rec-${idx}`,
        icon: Zap, // I'll use Zap for recommended tools
        title: tool.title,
        prompt: tool.prompt,
        color: ['hsl(142, 70%, 50%)', 'hsl(195, 85%, 55%)', 'hsl(280, 70%, 60%)'][idx % 3],
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
          title: 'Create Mindmap',
          prompt: 'Create a mindmap of my recent quiz mistakes to help me connect the concepts.',
          color: 'hsl(195, 85%, 55%)',
          isMindmapTrigger: true
        },
        {
          id: 'flashcards',
          icon: Lightbulb,
          title: 'Review Flashcards',
          prompt: 'Generate flashcards for the topics I got wrong in my recent quiz.',
          color: 'hsl(142, 70%, 50%)',
        },
        {
          id: 'explain',
          icon: AlertCircle,
          title: 'Explain Mistakes',
          prompt: 'Explain why I got those specific questions wrong and how to think about them correctly.',
          color: 'hsl(280, 70%, 60%)',
        }
      ])
      return
    }

    if (isPerfectScore) {
      setSuggestions([
        {
          id: 'perfect',
          icon: Sparkles,
          title: 'Explore deeper',
          prompt: 'I got a perfect score! Give me advanced questions on these topics to challenge me.',
          color: 'hsl(142, 70%, 50%)',
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

        // Create a suggestion card for EACH weak area the student has
        urgentAreas.forEach((area, idx) => {
          if (area && String(area).trim()) {
            list.push({
              id: idx + 1,
              icon: AlertCircle,
              title: `Study ${area}`,
              prompt: `Create a detailed study guide for ${area}. I need help with this topic.`,
              color: ['hsl(0, 70%, 60%)', 'hsl(280, 70%, 60%)', 'hsl(195, 85%, 55%)'][idx % 3],
            })
          }
        })

        // If no weak areas, still show the study plan tip
        if (list.length < 3 && (studyPlan[0] || encouragement)) {
          list.push({
            id: 3,
            icon: Lightbulb,
            title: 'AI Study Suggestion',
            prompt: studyPlan[0] || encouragement || 'Create a personalized study plan for me.',
            color: 'hsl(142, 70%, 50%)',
          })
        }

        if (list.length === 0) {
          // No quiz history — tell the user to do a quiz
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

    // Inject quiz context into the playground
    setActiveQuizResults(rawQuiz)
    setActiveWrongQs(wrongQuestions.length > 0 ? wrongQuestions : null)
    setActiveSessionTitle(quizSession.title || 'Past Study Session')
    setGeneratedTool(null)
    setShowSessionModal(false)

    // Greet the user with context
    const score = rawQuiz.filter(q => q.isCorrect).length
    const total = rawQuiz.length
    const fallbackGreeting = allCorrect
      ? `Loaded your study session: **${quizSession.title}**\n\nYou scored ${score}/${total} — perfect score! 🎉 I can generate advanced challenge questions to push your knowledge further.`
      : `Loaded your study session: **${quizSession.title}**\n\nYou scored ${score}/${total}. I found **${wrongQuestions.length} topic${wrongQuestions.length !== 1 ? 's' : ''}** you missed. Use the suggestions below to create a mindmap, flashcards, or explanations based on those gaps.`

    // Show loading state
    setMessages([{
      id: Date.now(),
      role: 'assistant',
      content: `Loading your study session: **${quizSession.title}**...\n\nAnalyzing performance...`,
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
          prompt: `I just loaded my past quiz session titled "${quizSession.title}". I scored ${score} out of ${total}. Please briefly analyze this performance in a friendly way and ask me how I would like to review or proceed.`,
          context: wrongQuestions.length > 0 ? wrongQuestions : null, 
          metacognitiveAnalysis: null 
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

    // Fallback if AI fails or returns a non-chat tool
    setMessages([{
      id: Date.now() + 2,
      role: 'assistant',
      content: fallbackGreeting,
      timestamp: new Date(),
    }])
  }

  // Initial greeting effect for fresh sessions with context
  useEffect(() => {
    if (messages.length === 0) {
      let greeting = "Hi! I'm **Vela**, your AI learning assistant. How can I help you today?"
      
      if (activeAnalysis) {
        greeting = `Hi! I'm **Vela**. I've finished analyzing your recent quiz results.\n\nYou're doing great, but I noticed some ${activeAnalysis.patternSpecificity}. I've prepared a personalized action plan for you below. Which one should we start with?`
      } else if (initialPromptFromAnalysis) {
        setInputValue(initialPromptFromAnalysis)
        return
      } else if (activeWrongQs) {
        greeting = `Hi! I'm **Vela**. I see you have some topics to review from your last session. Let's tackle those knowledge gaps together!`
      }

      const initialMessage = {
        id: Date.now(),
        role: 'assistant',
        content: greeting,
        timestamp: new Date(),
      }
      setMessages([initialMessage])
    }
  }, [activeAnalysis, activeWrongQs, initialPromptFromAnalysis, messages.length]) // Added dependencies for safety

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
        content: `📤 Tool shared successfully with **${shareEmail}**!`,
        timestamp: new Date(),
      }])
      setShowShareModal(false)
      setShareEmail('')
    } catch {
      setShareError('Something went wrong. Please try again.')
    } finally {
      setShareLoading(false)
    }
  }

  const handleMindmapGeneration = () => {
    setInputValue('Create a mindmap of my recent quiz mistakes to help me connect the concepts.')
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
    
    // Add a system message confirming the session was loaded
    const sysMessage = {
      id: Date.now(),
      role: 'assistant',
      content: `Loaded learning session: **${sessionData.title || 'Past Session'}**. Continue from where you left off.`,
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
          latest_prompt: messages[messages.length - 2]?.content || '', // Get the user's prompt
          visibility: 'private',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, {
          id: Date.now(), role: 'assistant',
          content: `✅ Tool saved to your collection! Find it in the "Saved Tools" tab.`,
          timestamp: new Date(),
        }])
        await fetchSavedTools()
        return data.tool?.id || null
      } else {
        let message = 'Failed to save tool. Please try again.'
        let duplicateToolId = null
        try {
          const payload = await res.json()
          if (payload?.error) message = 'Something went wrong. Please try again.'
          if (payload?.duplicate_tool_id) duplicateToolId = payload.duplicate_tool_id
        } catch {
          // Keep fallback message
        }

        // If this exact tool was already saved earlier, reuse it so publish flow can continue.
        if (duplicateToolId) {
          setMessages(prev => [...prev, {
            id: Date.now(), role: 'assistant',
            content: `ℹ️ This tool is already in your Saved Tools. Reusing the existing copy.`,
            timestamp: new Date(),
          }])
          return duplicateToolId
        }

        setMessages(prev => [...prev, {
          id: Date.now(), role: 'assistant',
          content: `❌ ${message}`,
          timestamp: new Date(),
        }])
        return null
      }
    } catch (err) {
      console.error('Failed to save tool to collection:', err)
      setMessages(prev => [...prev, {
        id: Date.now(), role: 'assistant',
        content: `❌ Error saving tool. Please try again.`,
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
          content: `ℹ️ Publish cancelled. Tool is still saved privately.`,
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
          if (payload?.error) message = 'Something went wrong. Please try again.'
        } catch {
          // Keep fallback message.
        }

        setMessages(prev => [...prev, {
          id: Date.now(),
          role: 'assistant',
          content: `❌ ${message}`,
          timestamp: new Date(),
        }])
        return
      }

      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: publish
          ? `🌐 Tool published to Marketplace.`
          : `🙈 Tool unpublished from Marketplace.`,
        timestamp: new Date(),
      }])

      await fetchSavedTools()
    } catch (err) {
      console.error('Failed to toggle publish state:', err)
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: `❌ Could not update publish status. Please try again.`,
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
        content: `❌ Tool name is required before publishing.`,
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
        content: `ℹ️ Publish cancelled. Your tool was not sent to Marketplace.`,
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
          content: `🌐 Tool shared to the Marketplace! Others can now find and fork it.`,
          timestamp: new Date(),
        }])
        await fetchSavedTools()
      } else {
        let message = `Tool was saved privately but couldn't be published. Try from the Saved Tools tab.`
        try {
          const payload = await res.json()
          if (payload?.error) message = 'Something went wrong. Please try again.'
        } catch {
          // Keep fallback message
        }
        setMessages(prev => [...prev, {
          id: Date.now(), role: 'assistant',
          content: `❌ ${message}`,
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
      // Trigger a special handler if they click the mindmap suggestion
      handleMindmapGeneration()
    } else {
      textareaRef.current?.focus()
    }
  }



  // Handles renderGeneratedTool logic.
  const renderGeneratedTool = () => {
    if (!generatedTool && !generationStage) return null

    // ── Loading state — anime.js powered PlaygroundLoader ──────────────────────
    if (generationStage && !generatedTool) {
      return <PlaygroundLoader stage={generationStage} phase={buildPhase} />
    }


    if (!generatedTool) return null



    if (generatedTool.toolType === 'image') {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%',
          maxWidth: '800px', margin: '0 auto', background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '1rem', padding: '1.5rem', marginTop: '1rem'
        }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--foreground)' }}>
                {generatedTool.title}
              </h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
                {generatedTool.description}
              </p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.72rem', color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>
                API: {API_BASE}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <button
                onClick={saveToolToCollection}
                style={{
                  background: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.375rem',
                  padding: '0.5rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                💾 Save
              </button>
              <button
                onClick={shareToolToMarketplace}
                style={{ background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: '0.375rem', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--primary)' }}
              >
                🌐 Share
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
                  cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>
          </div>

          <div style={{ width: '100%', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--muted)', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            {generatedImageLoading && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                  <span style={{ display: 'inline-block', width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 1.5s infinite' }} />
                  <span style={{ display: 'inline-block', width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 1.5s infinite 0.3s' }} />
                  <span style={{ display: 'inline-block', width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 1.5s infinite 0.6s' }} />
                </div>
                Generating image with FLUX...
              </div>
            )}
            {generatedImageError && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--destructive)' }}>
                <div>{generatedImageError}</div>
                {generatedImageUrl && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--muted-foreground)', wordBreak: 'break-all' }}>
                    Source: {generatedImageUrl.slice(0, 140)}{generatedImageUrl.length > 140 ? '...' : ''}
                  </div>
                )}
              </div>
            )}
            {generatedImageUrl && (
              <img
                src={generatedImageUrl}
                alt={generatedTool.title}
                onError={() => {
                  setGeneratedImageError('Image could not be displayed in browser. Try generating again.');
                }}
                style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain', maxHeight: '70vh' }}
              />
            )}
          </div>
        </div>
      )
    }

    // ALL tools are iframes - render the interactive app
    if (generatedTool.app?.html) {
      const toolFrame = (
        <div
          style={isToolMaximized ? {
            position: 'fixed',
            inset: 0,
            zIndex: 2147483647,
            background: 'var(--background)',
            display: 'flex',
            flexDirection: 'column',
          } : {
            border: '2px solid var(--primary)',
            background: 'var(--card)',
            borderRadius: '1rem',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem', ...(isToolMaximized ? { padding: '1rem 1.5rem', background: 'var(--card)', borderBottom: '1px solid var(--border)', flexShrink: 0 } : {}) }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--foreground)' }}>
                {generatedTool.title}
              </h3>
              <p style={{ margin: '0.35rem 0 0 0', color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>
                {generatedTool.description}
              </p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>
                {generatedTool.toolType}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <button
                onClick={saveToolToCollection}
                style={{
                  background: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.375rem',
                  padding: '0.5rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                💾 Save
              </button>
              <button
                onClick={shareToolToMarketplace}
                style={{ background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: '0.375rem', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--primary)' }}
              >
                🌐 Share
              </button>
              <button
                onClick={() => setIsToolMaximized(v => !v)}
                title={isToolMaximized ? 'Minimise' : 'Maximise'}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--muted-foreground)',
                  borderRadius: '0.375rem',
                  padding: '0.5rem 0.6rem',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                {isToolMaximized ? '⊡' : '⛶'}
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
                  fontSize: '1.5rem',
                  padding: '0.25rem',
                }}
                aria-label="Close"
              >
                ✕
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
              minHeight: '500px',
              borderRadius: '0.75rem',
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

    // If HTML generation failed, show error with regenerate option
    const lastUserPrompt = [...messages].reverse().find(m => m.role === 'user')?.content || ''
    return (
      <div
        style={{
          border: '2px solid var(--destructive)',
          background: 'var(--card)',
          borderRadius: '1rem',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          textAlign: 'center',
        }}
      >
        <p style={{ color: 'var(--destructive)', fontWeight: 600, margin: 0, fontSize: '1rem' }}>
          Tool generation failed
        </p>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          The AI couldn't build a valid interactive app. Try rephrasing — e.g. "create a quiz about X" or "make flashcards on Y".
        </p>
        {lastUserPrompt && (
          <button
            onClick={() => {
              setGeneratedTool(null)
              setInputValue(lastUserPrompt)
              setTimeout(() => textareaRef.current?.focus(), 0)
            }}
            style={{
              marginTop: '1rem',
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.5rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        )}
      </div>
    )
  }



  // Handles handleSubmit logic.
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const trimmedInput = inputValue.trim()



    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setGenerationStage('Analysing your learning request…')
    setBuildPhase('planning')

    try {
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
    background: 'color-mix(in oklch, var(--muted) 80%, var(--card) 20%)',
  }

  const renderSuggestionSkeletons = () => (
    <div style={{ width: '100%' }}>
      <div
        style={{
          height: '0.9rem',
          width: '10rem',
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
        }}
      >
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`suggestion-skeleton-${index}`}
            style={{
              borderRadius: '0.75rem',
              border: '1px solid var(--border)',
              background: 'oklch(0.18 0.01 240.0)',
              padding: '1.25rem',
              minHeight: '118px',
            }}
            aria-hidden
          >
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div
                className="lp-skeleton"
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '999px',
                  flexShrink: 0,
                  marginTop: '2px',
                  ...skeletonShimmerStyle,
                }}
              />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="lp-skeleton" style={{ height: '0.95rem', width: '56%', borderRadius: '0.35rem', ...skeletonShimmerStyle }} />
                <div className="lp-skeleton" style={{ height: '0.75rem', width: '94%', borderRadius: '0.35rem', ...skeletonShimmerStyle }} />
                <div className="lp-skeleton" style={{ height: '0.75rem', width: '72%', borderRadius: '0.35rem', ...skeletonShimmerStyle }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderSessionSkeletons = ({ variant = 'default', count = 4 }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`${variant}-skeleton-${index}`}
          style={{
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--border)',
            background: 'var(--card)',
          }}
          aria-hidden
        >
          <div className="lp-skeleton" style={{ height: '0.95rem', width: variant === 'saved' ? '42%' : '55%', borderRadius: '0.35rem', ...skeletonShimmerStyle }} />
          <div className="lp-skeleton" style={{ height: '0.75rem', width: '38%', borderRadius: '0.35rem', marginTop: '0.4rem', ...skeletonShimmerStyle }} />

          {variant === 'quiz' && (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.55rem' }}>
              <div className="lp-skeleton" style={{ height: '0.72rem', width: '30%', borderRadius: '999px', ...skeletonShimmerStyle }} />
              <div className="lp-skeleton" style={{ height: '0.72rem', width: '24%', borderRadius: '999px', ...skeletonShimmerStyle }} />
            </div>
          )}

          {variant === 'playground' && (
            <>
              <div className="lp-skeleton" style={{ height: '0.8rem', width: '82%', borderRadius: '0.35rem', marginTop: '0.45rem', ...skeletonShimmerStyle }} />
              <div className="lp-skeleton" style={{ height: '0.7rem', width: '30%', borderRadius: '0.35rem', marginTop: '0.4rem', ...skeletonShimmerStyle }} />
            </>
          )}

          {variant === 'saved' && (
            <>
              <div className="lp-skeleton" style={{ height: '0.8rem', width: '50%', borderRadius: '0.35rem', marginTop: '0.4rem', ...skeletonShimmerStyle }} />
              <div className="lp-skeleton" style={{ height: '0.8rem', width: '85%', borderRadius: '0.35rem', marginTop: '0.45rem', ...skeletonShimmerStyle }} />
              <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.5rem' }}>
                <div className="lp-skeleton" style={{ height: '1.2rem', width: '4.3rem', borderRadius: '999px', ...skeletonShimmerStyle }} />
                <div className="lp-skeleton" style={{ height: '1.2rem', width: '4.9rem', borderRadius: '999px', ...skeletonShimmerStyle }} />
              </div>
            </>
          )}

          {variant === 'shared' && (
            <>
              <div className="lp-skeleton" style={{ height: '0.78rem', width: '46%', borderRadius: '0.35rem', marginTop: '0.45rem', ...skeletonShimmerStyle }} />
              <div className="lp-skeleton" style={{ height: '0.7rem', width: '34%', borderRadius: '0.35rem', marginTop: '0.35rem', ...skeletonShimmerStyle }} />
            </>
          )}
        </div>
      ))}
    </div>
  )

  return (
    <main
      className="main-content min-h-screen"
      style={{
        background: 'var(--background)',
        color: 'var(--foreground)',
        fontFamily: 'var(--font-sans)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <DotGrid />
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2rem 2rem 2rem 4.5rem',
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--foreground)' }}>Learning Playground</h2>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            {isLoadingTierStatus ? (
              <span
                className="lp-skeleton"
                aria-hidden
                style={{
                  height: '0.8rem',
                  width: '7.5rem',
                  borderRadius: '999px',
                  ...skeletonShimmerStyle,
                }}
              />
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                Free Tier • Tools: <strong style={{ color: 'var(--foreground)' }}>{toolsQuota?.remaining ?? 0}</strong> left
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => {
                setSessionModalMode('quiz')
                setSavedToolsTab('sessions')
                fetchQuizSessions()
                setShowSessionModal(true)
              }}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--primary)',
                background: 'rgba(59, 130, 246, 0.1)',
                color: 'var(--primary)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              <Network size={16} />
              Link Quiz Session
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
                padding: '0.45rem 0.9rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
                background: 'var(--card)',
                color: 'var(--foreground)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              <History size={16} />
              History
            </button>
          </div>
        </div>

        {/* Active Session Header */}
        {activeSessionTitle && (
          <div style={{
            background: 'var(--muted)',
            border: '1px solid var(--border)',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
            fontSize: '0.9rem',
            color: 'var(--muted-foreground)',
            maxWidth: 'fit-content',
            margin: '0 auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} />
              Active Session: <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{activeSessionTitle}</span>
            </div>
            
            <button
              onClick={() => {
                setSessionModalMode('playground')
                setSavedToolsTab('playground')
                fetchPlaygroundSessions()
                fetchSavedTools()
                setShowSessionModal(true)
              }}
              style={{
                background: 'transparent',
                border: '1px solid var(--primary)',
                color: 'var(--primary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '0.25rem 0.75rem',
                borderRadius: '0.25rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary-foreground)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--primary)'; }}
            >
              Change
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '2rem',
              padding: '2rem',
              maxWidth: '900px',
              margin: '0 auto',
              width: '100%',
            }}
          >
            <div style={{ textAlign: 'center', color: 'var(--muted-foreground)' }}>
              <Vela size={120} className="mb-6" />
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: 'var(--foreground)',
                }}
              >
                Learning Playground
              </h2>
              <p style={{ fontSize: '0.95rem' }}>
                Build your own learning tools, explore ideas, or get help with any topic
              </p>
              
            </div>

            {suggestions.length === 0 && user?.id && (
              <p style={{
                fontSize: '0.95rem',
                color: 'var(--muted-foreground)',
                textAlign: 'center',
                padding: '0.5rem 0',
              }}>
                Please do a quiz first so I can suggest what to study next!
              </p>
            )}

            {isLoadingSuggestions && renderSuggestionSkeletons()}

            {!isLoadingSuggestions && suggestions.length > 0 && (
              <div style={{ width: '100%' }}>
                <h3
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: 'var(--muted-foreground)',
                    marginBottom: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Suggestions for you
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  {suggestions.map((suggestion) => {
                    const Icon = suggestion.icon
                    return (
                      <button
                        key={suggestion.id}
                        onClick={() => handleSuggestionClick(suggestion)}
                        style={{
                          padding: '1.25rem',
                          borderRadius: '0.75rem',
                          border: '1px solid var(--border)',
                          background: 'oklch(0.18 0.01 240.0)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = suggestion.color
                          e.currentTarget.style.background = 'oklch(0.22 0.01 240.0)'
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border)'
                          e.currentTarget.style.background = 'oklch(0.18 0.01 240.0)'
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                          }}
                        >
                          <Icon
                            size={20}
                            style={{ color: suggestion.color, flexShrink: 0, marginTop: '2px' }}
                          />
                          <div style={{ flex: 1 }}>
                            <h4
                              style={{
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                marginBottom: '0.25rem',
                                color: 'var(--foreground)',
                              }}
                            >
                              {suggestion.title}
                            </h4>
                            <p
                              style={{
                                fontSize: '0.85rem',
                                color: 'var(--muted-foreground)',
                                lineHeight: '1.4',
                              }}
                            >
                              {suggestion.prompt.length > 80
                                ? `${suggestion.prompt.substring(0, 80)}...`
                                : suggestion.prompt}
                            </p>
                          </div>
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
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '70%',
                  padding: '1rem 1.25rem',
                  borderRadius: '1rem',
                  background: message.role === 'user' ? 'var(--primary)' : 'var(--card)',
                  border: message.role === 'assistant' ? '1px solid var(--border)' : 'none',
                  color: message.role === 'user' ? '#ffffff' : 'var(--foreground)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  position: 'relative'
                }}
              >
                {message.role === 'assistant' && (
                  <div style={{ 
                    position: 'absolute', 
                    left: '-55px', 
                    top: '0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px'
                  }}>
                    <Vela size={30} loading={isLoading} />
                    <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Vela</span>
                  </div>
                )}
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.content}</div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.7 }}>
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))
        )}

        {renderGeneratedTool()}

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                padding: '1rem 1.25rem',
                borderRadius: '1rem',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                position: 'relative'
              }}
            >
              <div style={{ 
                position: 'absolute', 
                left: '-55px', 
                top: '0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px'
              }}>
                <Vela size={30} loading={true} />
                <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Vela</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', fontWeight: 500 }}>
                  {generationStage || 'Thinking...'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          padding: '1.5rem 2rem',
          borderTop: '1px solid var(--border)',
          background: 'var(--card)',
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              disabled={isLoading}
              rows={1}
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--foreground)',
                fontSize: '0.95rem',
                resize: 'none',
                maxHeight: '150px',
                overflowY: 'auto',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s',
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
            disabled={!inputValue.trim() || isLoading}
            style={{
              padding: '0.875rem 1.5rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: inputValue.trim() && !isLoading ? 'var(--primary)' : 'var(--muted)',
              color: '#ffffff',
              cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '500',
              fontSize: '0.95rem',
              transition: 'all 0.2s',
              opacity: inputValue.trim() && !isLoading ? 1 : 0.5,
            }}
            onMouseEnter={(e) => {
              if (inputValue.trim() && !isLoading) {
                e.target.style.transform = 'translateY(-1px)'
                e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = 'none'
            }}
          >
            <Send size={18} />
            Send
          </button>
        </form>
        <p
          style={{
            fontSize: '0.75rem',
            color: 'var(--muted-foreground)',
            marginTop: '0.75rem',
            textAlign: 'center',
          }}
        >
          Press Enter to send, Shift + Enter for new line
        </p>
      </div>

      <style>{`
        .typing-indicator {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .typing-indicator span {
          width: 8px;
          height: 8px;
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
            transform: translateY(-4px);
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
            rgba(255, 255, 255, 0.14),
            rgba(255, 255, 255, 0)
          );
          animation: lp-skeleton-shimmer 1.2s ease-in-out infinite;
        }

        @keyframes lp-skeleton-shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>

      {/* Session Loading Modal */}
      {showSessionModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center'
        }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="learningplayground-session-modal-title"
            style={{
            background: 'var(--background)', border: '1px solid var(--border)',
            borderRadius: '1rem', padding: '2rem', width: '90%', maxWidth: '500px',
            maxHeight: '80vh', overflowY: 'auto'
            }}
            tabIndex={-1}
            ref={sessionModalRef}
          >
            {/* Modal Header with Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 id="learningplayground-session-modal-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>
                {sessionModalMode === 'quiz'
                  ? 'Past Study Sessions'
                  : 'Learning Playground History'}
              </h3>
              <button aria-label="Close session history" onClick={() => setShowSessionModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--muted-foreground)' }}>✕</button>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              {sessionModalMode === 'quiz' ? (
                <button
                  onClick={() => setSavedToolsTab('sessions')}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    background: savedToolsTab === 'sessions' ? 'var(--primary)' : 'transparent',
                    color: savedToolsTab === 'sessions' ? '#ffffff' : 'var(--muted-foreground)',
                    cursor: 'pointer',
                    fontWeight: savedToolsTab === 'sessions' ? 600 : 400,
                    fontSize: '0.9rem',
                    transition: 'all 0.2s'
                  }}
                >
                  📚 Study Sessions
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setSavedToolsTab('playground')}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      background: savedToolsTab === 'playground' ? 'var(--primary)' : 'transparent',
                      color: savedToolsTab === 'playground' ? '#ffffff' : 'var(--muted-foreground)',
                      cursor: 'pointer',
                      fontWeight: savedToolsTab === 'playground' ? 600 : 400,
                      fontSize: '0.9rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    🧠 Playground History
                  </button>
                  <button
                    onClick={() => setSavedToolsTab('saved')}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      background: savedToolsTab === 'saved' ? 'var(--primary)' : 'transparent',
                      color: savedToolsTab === 'saved' ? '#ffffff' : 'var(--muted-foreground)',
                      cursor: 'pointer',
                      fontWeight: savedToolsTab === 'saved' ? 600 : 400,
                      fontSize: '0.9rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    💾 Saved Tools
                  </button>
                  <button
                    onClick={() => {
                      setSavedToolsTab('shared')
                      fetchSharedTools()
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      background: savedToolsTab === 'shared' ? 'var(--primary)' : 'transparent',
                      color: savedToolsTab === 'shared' ? '#ffffff' : 'var(--muted-foreground)',
                      cursor: 'pointer',
                      fontWeight: savedToolsTab === 'shared' ? 600 : 400,
                      fontSize: '0.9rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    📤 Shared with me
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
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)' }}>
                    <p>No past study sessions found.</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Complete a quiz to see your sessions here.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                            padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)',
                            background: 'var(--card)', textAlign: 'left', cursor: 'pointer',
                            transition: 'border-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                        >
                          <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{qs.title || 'Untitled Session'}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                            {new Date(qs.created_at).toLocaleString()}
                          </div>
                          {total > 0 && (
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                              <span style={{ color: 'var(--chart-2)', fontWeight: 600 }}>✓ {score}/{total} correct</span>
                              {wrongCount > 0 && (
                                <span style={{ color: 'var(--destructive)', fontWeight: 600 }}>✗ {wrongCount} to review</span>
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
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)' }}>
                    <p>No playground sessions found.</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Save a chat or generated tool to see it here.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {playgroundSessions.map(sessionItem => (
                      <button
                        key={sessionItem.id}
                        onClick={() => handleLoadSession(sessionItem)}
                        style={{
                          padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)',
                          background: 'var(--card)', textAlign: 'left', cursor: 'pointer',
                          transition: 'border-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{sessionItem.title || 'Untitled Playground Session'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                          {sessionItem.latest_prompt ? String(sessionItem.latest_prompt).slice(0, 90) : 'No prompt saved'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.35rem' }}>
                          {new Date(sessionItem.created_at).toLocaleString()}
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
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)' }}>
                    <p>No saved tools yet.</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Create or fork tools from the marketplace to save them here.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                          padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)',
                          background: 'var(--card)', textAlign: 'left', cursor: 'pointer',
                          transition: 'border-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{tool.title || 'Untitled Tool'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                              {tool.tool_type} · {new Date(tool.created_at).toLocaleDateString()}
                            </div>
                            {tool.description && (
                              <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: '0.35rem' }}>
                                {String(tool.description).slice(0, 100)}
                              </div>
                            )}
                            {Array.isArray(tool.tags) && tool.tags.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.45rem' }}>
                                {tool.tags.slice(0, 6).map((tag, index) => (
                                  <span
                                    key={`${tool.id}-tag-${index}`}
                                    style={{
                                      fontSize: '0.7rem',
                                      padding: '0.15rem 0.45rem',
                                      borderRadius: '999px',
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
                          <div style={{ display: 'flex', gap: '0.4rem', marginLeft: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {tool.is_published && (
                              <div style={{ fontSize: '0.7rem', background: 'rgba(34, 197, 94, 0.14)', color: '#16a34a', border: '1px solid rgba(34, 197, 94, 0.35)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', whiteSpace: 'nowrap' }}>
                                Published
                              </div>
                            )}
                            {tool.forked_from_tool_id && (
                              <div style={{ fontSize: '0.7rem', background: 'var(--muted)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', whiteSpace: 'nowrap' }}>
                                From Marketplace
                              </div>
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
                                fontSize: '0.7rem',
                                background: 'rgba(59, 130, 246, 0.12)',
                                color: '#2563eb',
                                border: '1px solid rgba(59, 130, 246, 0.35)',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <Share2 size={12} />
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
                                  fontSize: '0.7rem',
                                  background: tool.is_published ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                                  color: tool.is_published ? '#dc2626' : '#2563eb',
                                  border: `1px solid ${tool.is_published ? 'rgba(239, 68, 68, 0.35)' : 'rgba(59, 130, 246, 0.35)'}`,
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '0.25rem',
                                  whiteSpace: 'nowrap',
                                  cursor: publishingToolId === tool.id ? 'not-allowed' : 'pointer',
                                  opacity: publishingToolId === tool.id ? 0.6 : 1,
                                }}
                              >
                                {publishingToolId === tool.id
                                  ? (tool.is_published ? 'Unpublishing...' : 'Publishing...')
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
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)' }}>
                    <p>No shared tools found.</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Tools shared with you by others will appear here.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                          padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)',
                          background: 'var(--card)', textAlign: 'left', cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{tool.title || 'Untitled Tool'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                          Shared by: <span style={{ color: 'var(--primary)' }}>{tool.sender_email}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.15rem' }}>
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

      {showMarketplaceMetadataModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2100,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
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
              borderRadius: '1rem',
              width: '100%',
              maxWidth: '560px',
              boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
            ref={marketplaceMetadataModalRef}
          >
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 id="learningplayground-marketplace-modal-title" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--foreground)' }}>
                Share Tool to Marketplace
              </h3>
              <button
                type="button"
                onClick={() => closeMarketplaceMetadataModal(null)}
                aria-label="Close marketplace sharing"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', fontSize: '1.25rem', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem', color: 'var(--muted-foreground)' }}>
                  Tool Name
                </label>
                <input
                  type="text"
                  maxLength={180}
                  value={marketplaceMetadataForm.title}
                  onChange={(e) => setMarketplaceMetadataForm(prev => ({ ...prev, title: e.target.value }))}
                  style={{
                    width: '100%',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--foreground)',
                    padding: '0.65rem 0.75rem',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem', color: 'var(--muted-foreground)' }}>
                  One-Sentence Description
                </label>
                <textarea
                  maxLength={500}
                  rows={3}
                  value={marketplaceMetadataForm.description}
                  onChange={(e) => setMarketplaceMetadataForm(prev => ({ ...prev, description: e.target.value }))}
                  style={{
                    width: '100%',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--foreground)',
                    padding: '0.65rem 0.75rem',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                    minHeight: '88px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.35rem', color: 'var(--muted-foreground)' }}>
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={marketplaceMetadataForm.tags}
                  onChange={(e) => setMarketplaceMetadataForm(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="exam-prep, biology, active-recall"
                  style={{
                    width: '100%',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--foreground)',
                    padding: '0.65rem 0.75rem',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              {marketplaceMetadataError && (
                <div style={{ color: 'var(--destructive)', fontSize: '0.82rem' }}>
                  {marketplaceMetadataError}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', padding: '0.9rem 1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button
                type="button"
                onClick={() => closeMarketplaceMetadataModal(null)}
                style={{
                  borderRadius: '0.45rem',
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: 'var(--foreground)',
                  padding: '0.5rem 0.8rem',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
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
                  borderRadius: '0.45rem',
                  border: 'none',
                  background: 'var(--primary)',
                  color: '#fff',
                  padding: '0.5rem 0.95rem',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                Continue to Publish
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Share Tool Modal */}
      {showShareModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2100,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }} onClick={() => setShowShareModal(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="learningplayground-share-modal-title"
            style={{
            background: 'var(--background)', border: '1px solid var(--border)',
            borderRadius: '1rem', width: '90%', maxWidth: '450px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
            ref={shareToolModalRef}
          >
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 id="learningplayground-share-modal-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Share Learning Tool</h3>
              <button aria-label="Close share tool modal" onClick={() => setShowShareModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--foreground)' }}>
                  Option 1: Share to Marketplace
                </label>
                <div style={{ background: 'var(--muted)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginBottom: '0.75rem', marginTop: 0 }}>
                    Publish this tool to the public marketplace so anyone can learn from it.
                  </p>
                  <button
                    onClick={() => {
                      setShowShareModal(false)
                      toggleToolPublish(sharingTool, !sharingTool.is_published)
                    }}
                    style={{
                      width: '100%', padding: '0.6rem', borderRadius: '0.4rem',
                      background: sharingTool?.is_published ? 'rgba(239, 68, 68, 0.1)' : 'var(--primary)',
                      color: sharingTool?.is_published ? '#ef4444' : '#fff',
                      border: sharingTool?.is_published ? '1px solid rgba(239, 68, 68, 0.3)' : 'none',
                      fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem'
                    }}
                  >
                    {sharingTool?.is_published ? 'Unpublish from Marketplace' : 'Publish to Marketplace'}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--foreground)' }}>
                  Option 2: Share via Email
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="email"
                    placeholder="Enter friend's email..."
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    style={{
                      flex: 1, padding: '0.6rem', borderRadius: '0.4rem',
                      border: '1px solid var(--border)', background: 'var(--background)',
                      color: 'var(--foreground)', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                  <button
                    onClick={handleShareToUser}
                    disabled={!shareEmail.trim() || shareLoading}
                    style={{
                      padding: '0.6rem 1rem', borderRadius: '0.4rem',
                      background: 'var(--primary)', color: '#fff', border: 'none',
                      fontWeight: 600, cursor: shareLoading ? 'not-allowed' : 'pointer',
                      opacity: shareLoading ? 0.7 : 1, fontSize: '0.9rem'
                    }}
                  >
                    {shareLoading ? 'Sharing...' : 'Share'}
                  </button>
                </div>
                {shareError && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.5rem' }}>{shareError}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default Learningplayground
