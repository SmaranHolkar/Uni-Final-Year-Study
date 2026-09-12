import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  Handle,
  Position,
} from "@xyflow/react"
import '@xyflow/react/dist/style.css';
import { ArrowLeft, X, ExternalLink, Share2 } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import '../App.css'
import MetacognitiveAnalysis from '../components/MetacognitiveAnalysis'
import Vela from '../components/Vela'
import { Skeleton } from '../components/Skeleton.jsx'

// Custom node component
const CustomNode = ({ data, isSelected, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-yellow-400' : 'hover:shadow-lg'}`}
    >
      <Handle type="target" position={Position.Top} />
      <div className="p-2 text-xs font-medium">{data.label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

const categoryColors = [
  "hsl(0, 70%, 60%)",
  "hsl(142, 70%, 50%)",
  "hsl(195, 85%, 55%)",
  "hsl(280, 70%, 60%)",
]

// Handles QuizDetail logic.
function QuizDetail() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const [activeTab, setActiveTab] = useState('metacognitive') // Default to Learning Insights (overridden for shared)
  const [quizData, setQuizData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [nodeActionLoading, setNodeActionLoading] = useState(false)
  const [mcq, setMcq] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [shareStatus, setShareStatus] = useState('idle')
  const [shareError, setShareError] = useState('')
  const [generatingMindmap, setGeneratingMindmap] = useState(false)
  const shareModalRef = useRef(null)

  // Fetch quiz details
  useEffect(() => {
    const fetchQuizDetail = async () => {
      try {
        // First check sessionStorage for immediate render
        const savedData = sessionStorage.getItem(`quiz_${quizId}`)
        if (savedData) {
          const parsed = JSON.parse(savedData)
          setQuizData(parsed)
          if (parsed.isShared) {
            setActiveTab('mindmap')
          }
        }

        // Fetch fresh quiz data from database if authenticated
        const { data: { session: freshSession } } = await supabase.auth.getSession()
        const token = freshSession?.access_token || session?.access_token
        if (token) {
          const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
          const res = await axios.get(`${API_BASE}/api/quiz/${quizId}`, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          })
          if (res.data?.success && res.data?.quiz) {
            const dbQuiz = res.data.quiz
            setQuizData(dbQuiz)
            sessionStorage.setItem(`quiz_${quizId}`, JSON.stringify(dbQuiz))
            if (dbQuiz.isShared) {
              setActiveTab('mindmap')
            }
          }
        }
        setLoading(false)
      } catch (err) {
        console.error("Error loading quiz details:", err)
        if (!sessionStorage.getItem(`quiz_${quizId}`)) {
          setError("Unable to load quiz details. Please try again.")
        }
        setLoading(false)
      }
    }
    fetchQuizDetail()
  }, [quizId, session?.access_token])

  // Handles parseQuizData logic.
  const parseQuizData = (quizData) => {
    if (typeof quizData === 'string') {
      try {
        return JSON.parse(quizData)
      } catch {
        return []
      }
    }
    return quizData || []
  }

  // Handles getAnswerText logic.
  const getAnswerText = (correctAnswer, choices) => {
    if (!correctAnswer || !choices) return correctAnswer
    
    // If correctAnswer is a letter (A, B, C, D), map it to index
    if (correctAnswer.length === 1 && /^[A-Z]$/.test(correctAnswer)) {
      const index = correctAnswer.charCodeAt(0) - 65 // A = 0, B = 1, etc.
      return choices[index] || correctAnswer
    }
    
    // return as is
    return correctAnswer
  }

  // Handles parseMindmapData logic.
  const parseMindmapData = (mindmapData) => {
    let parsed = mindmapData
    
    if (typeof mindmapData === 'string') {
      try {
        parsed = JSON.parse(mindmapData)
      } catch {
        return { nodes: [], edges: [] }
      }
    }
    
    // Handle old format (array of nodes) by converting to new format
    if (Array.isArray(parsed)) {
      return {
        nodes: parsed,
        edges: []
      }
    }
    
    // Handle new format (object with nodes and edges)
    if (parsed && typeof parsed === 'object') {
      return {
        nodes: parsed.nodes || [],
        edges: parsed.edges || []
      }
    }
    
    return { nodes: [], edges: [] }
  }

  // Build ReactFlow nodes & edges for mindmap
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!quizData?.mindmap) {
      return { initialNodes: [], initialEdges: [] }
    }

    const mindmapData = parseMindmapData(quizData.mindmap)
    const rawNodes = Array.isArray(mindmapData?.nodes) ? mindmapData.nodes : []
    const rawEdges = Array.isArray(mindmapData?.edges) ? mindmapData.edges : []

    if (rawNodes.length === 0) {
      return { initialNodes: [], initialEdges: [] }
    }

    const rootIndex = rawNodes.findIndex(n => n.id === 'root' || n.id === '0')
    const rootNode = rootIndex >= 0 ? rawNodes[rootIndex] : rawNodes[0]
    const childNodes = rawNodes.filter(n => n.id !== rootNode?.id)

    const nodes = []
    const rootX = 400
    const rootY = 40

    if (rootNode) {
      nodes.push({
        id: rootNode.id,
        data: {
          label: rootNode.label || 'Review Topics',
          description: rootNode.description || 'Targeted concepts synthesized for exam review',
          category: 'Central Concept',
        },
        position: { x: childNodes.length > 0 ? rootX : 320, y: rootY },
        type: 'default',
        style: {
          background: '#f0f0ee',
          color: '#121214',
          borderRadius: '12px',
          padding: '14px 22px',
          fontWeight: 700,
          border: '2px solid #ffffff',
          boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
          minWidth: '180px',
          maxWidth: '280px',
          textAlign: 'center',
          fontSize: '13px',
        },
      })
    }

    childNodes.forEach((n, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const xPos = 80 + col * 340
      const yPos = 210 + row * 180
      const color = categoryColors[i % categoryColors.length]

      nodes.push({
        id: n.id,
        data: {
          label: n.label || `Topic ${i + 1}`,
          description: n.description || 'Review this key concept to master the material',
          category: n.category || 'Review Topic',
          sourceLink: n.sourceLink || '',
        },
        position: { x: xPos, y: yPos },
        type: 'default',
        style: {
          background: '#18181b',
          color: '#f0f0ee',
          borderRadius: '12px',
          padding: '14px 18px',
          fontWeight: 600,
          border: `1.5px solid ${color}`,
          boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
          minWidth: '220px',
          maxWidth: '300px',
          textAlign: 'left',
          fontSize: '12px',
        },
      })
    })

    let edges = []
    if (rawEdges.length > 0) {
      edges = rawEdges.map((e, i) => ({
        id: `e-${i}`,
        source: e.from,
        target: e.to,
        animated: true,
        style: { stroke: '#a1a1a6', strokeWidth: 1.5 },
      }))
    } else if (rootNode && childNodes.length > 0) {
      edges = childNodes.map((n, i) => ({
        id: `e-auto-${i}`,
        source: rootNode.id,
        target: n.id,
        animated: true,
        style: { stroke: '#a1a1a6', strokeWidth: 1.5 },
      }))
    }

    return { initialNodes: nodes, initialEdges: edges }
  }, [quizData])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges, setNodes, setEdges])

  useEffect(() => {
    if (!shareModalOpen) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShareModalOpen(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    setTimeout(() => shareModalRef.current?.focus(), 0)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [shareModalOpen])

  // Handles handleNodeClick logic.
  const handleNodeClick = (_, node) => {
    setSelectedNodeId(node.id)
  }

  // Handles handleAddSimilarTopic logic.
  const handleAddSimilarTopic = async () => {
    const selectedNode = nodes.find(n => n.id === selectedNodeId)
    if (!selectedNode) return

    setNodeActionLoading(true)
    try {
      const { data: { session: freshSession } } = await supabase.auth.getSession()
      const accessToken = freshSession?.access_token || session?.access_token
      if (!accessToken) {
        alert('Something went wrong. Please try again.')
        setNodeActionLoading(false)
        return
      }

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const res = await axios.post(
        `${API_BASE}/api/generate-similar-topic`,
        {
          topic: selectedNode.data.label,
          description: selectedNode.data.description,
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true,
        }
      )

      const newId = `node-${Date.now()}`
      const newNode = {
        id: newId,
        data: {
          label: res.data.label,
          description: res.data.description,
          category: res.data.category || 'Related Topic',
        },
        position: {
          x: selectedNode.position.x + 220,
          y: selectedNode.position.y + 80,
        },
        type: 'default',
        style: {
          background: categoryColors[Math.floor(Math.random() * categoryColors.length)],
          color: 'white',
          borderRadius: '12px',
          padding: '12px 20px',
          fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          minWidth: '150px',
          textAlign: 'center',
        },
      }

      const newEdge = {
        id: `e-${selectedNode.id}-${newId}`,
        source: selectedNode.id,
        target: newId,
        animated: true,
        style: { stroke: 'hsl(195, 85%, 55%)', strokeWidth: 2 },
      }

      setNodes(nds => [...nds, newNode])
      setEdges(eds => [...eds, newEdge])
    } catch (err) {
      console.error('Failed to generate similar topic:', err)
      alert('Something went wrong. Please try again.')
    } finally {
      setNodeActionLoading(false)
    }
  }

  // Handle sharing mindmap via email
  const handleShare = async () => {
    if (!shareEmail.trim()) return
    setShareStatus('loading')
    setShareError('')
    try {
      const { data: { session: freshSession } } = await supabase.auth.getSession()
      const accessToken = freshSession?.access_token || session?.access_token
      if (!accessToken) {
        setShareError('Something went wrong. Please try again.')
        setShareStatus('error')
        return
      }
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const res = await axios.post(
        `${API_BASE}/api/share-mindmap`,
        { quizMindmapId: quizId, recipientEmail: shareEmail },
        { headers: { Authorization: `Bearer ${accessToken}` }, withCredentials: true }
      )
      if (res.data.success) setShareStatus('success')
    } catch (err) {
      console.error('Share error:', err)
      setShareError('Something went wrong. Please try again.')
      setShareStatus('error')
    }
  }

  // Handle generating MCQ for topics
  const handleGenerateMCQ = async () => {
    const selectedNode = nodes.find(n => n.id === selectedNodeId)
    if (!selectedNode) return

    setNodeActionLoading(true)
    try {
      const { data: { session: freshSession } } = await supabase.auth.getSession()
      const accessToken = freshSession?.access_token || session?.access_token
      if (!accessToken) {
        alert('Something went wrong. Please try again.')
        setNodeActionLoading(false)
        return
      }

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const res = await axios.post(
        `${API_BASE}/api/generate-mcq-for-topic`,
        {
          topic: selectedNode.data.label,
          description: selectedNode.data.description,
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true,
        }
      )

      setMcq(res.data)
      setSelectedAnswer(null)
    } catch (err) {
      console.error('Failed to generate MCQ:', err)
      alert('Something went wrong. Please try again.')
    } finally {
      setNodeActionLoading(false)
    }
  }

  // Handle generating the initial mindmap if it doesn't exist
  const handleGenerateMindmap = async () => {
    const wrongQs = quizQuestions.filter(q => !q.isCorrect)
    if (wrongQs.length === 0) {
      alert("Perfect score! No review topics needed.")
      return
    }

    setGeneratingMindmap(true)
    try {
      const { data: { session: freshSession } } = await supabase.auth.getSession()
      const accessToken = freshSession?.access_token || session?.access_token
      if (!accessToken) {
        alert('Authentication required to generate review mindmap.')
        setGeneratingMindmap(false)
        return
      }

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const res = await axios.post(
        `${API_BASE}/api/generate-mindmap`,
        { wrongQuestions: wrongQs },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true,
        }
      )

      if (res.data?.mindmap) {
        const mindmapData = res.data.mindmap

        // Update database record for current quiz
        try {
          await axios.put(
            `${API_BASE}/api/quiz/${quizId}/mindmap`,
            { mindmapNodes: mindmapData },
            { headers: { Authorization: `Bearer ${accessToken}` }, withCredentials: true }
          )
        } catch (saveErr) {
          console.warn('Failed to update existing quiz row, creating fallback:', saveErr)
          await axios.post(
            `${API_BASE}/api/save-quiz-mindmap`,
            {
              userId: session.user?.id,
              title: quizData?.title || 'Quiz Review',
              quizResults: quizQuestions,
              mindmapNodes: mindmapData
            },
            { headers: { Authorization: `Bearer ${accessToken}` }, withCredentials: true }
          )
        }

        // Update local state
        const updatedQuizData = { ...quizData, mindmap: mindmapData }
        setQuizData(updatedQuizData)
        sessionStorage.setItem(`quiz_${quizId}`, JSON.stringify(updatedQuizData))
      }
    } catch (err) {
      console.error('Failed to generate mindmap:', err)
      alert('Failed to generate review mindmap. Please try again.')
    } finally {
      setGeneratingMindmap(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6" style={{ background: 'var(--background)', minHeight: '100vh' }} aria-hidden>
        <div className="mb-4 flex items-center gap-3">
          <Skeleton rounded="0.45rem" style={{ width: '5.2rem', height: '2rem' }} />
          <div className="space-y-2">
            <Skeleton style={{ width: '14rem', height: '1.1rem' }} />
            <Skeleton style={{ width: '8rem', height: '0.7rem' }} />
          </div>
        </div>
        <div className="mb-5 flex gap-6 border-b border-[var(--border)] pb-3">
          <Skeleton style={{ width: '8rem', height: '0.95rem' }} />
          <Skeleton style={{ width: '7rem', height: '0.95rem' }} />
          <Skeleton style={{ width: '8.5rem', height: '0.95rem' }} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`quiz-detail-card-skeleton-${index}`} className="rounded p-5 border border-[var(--border)]">
              <Skeleton style={{ width: '55%', height: '0.75rem' }} />
              <Skeleton className="mt-3" style={{ width: '40%', height: '1.7rem' }} />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`quiz-detail-row-skeleton-${index}`} className="rounded p-5 border border-[var(--border)]">
              <Skeleton style={{ width: '85%', height: '0.95rem' }} />
              <Skeleton className="mt-3" style={{ width: '60%', height: '0.75rem' }} />
              <Skeleton className="mt-2" style={{ width: '50%', height: '0.75rem' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (error) return <div className="p-6 text-center text-rose-400 text-sm">Error: {error}</div>;
  if (!quizData) return <div className="p-6 text-center text-sm text-[#a1a1a6]">Quiz not found</div>;

  const quizQuestions = parseQuizData(quizData.quiz);
  const correctCount = quizQuestions.filter(q => q.isCorrect).length;
  const scorePercentage = Math.round((correctCount / quizQuestions.length) * 100);

  return (
    <div className="main-content min-h-screen bg-[#121214] text-[#f0f0ee] font-sans flex flex-col">
      <header className="flex items-center justify-between p-4 px-6 bg-[#18181b] border-b border-[#2e2e33] shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-[#f0f0ee]">{quizData.title}</h1>
            <p className="text-xs text-[#a1a1a6]">
              {new Date(quizData.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        {!quizData.isShared && (
          <button
            onClick={() => {
              navigate('/learningpage', {
                state: {
                  retakePayload: {
                    retakeOfQuizId: quizData.id,
                    retakeTitle: quizData.title,
                    retakeQuestions: quizQuestions,
                  },
                },
              });
            }}
            className="btn-secondary px-3 py-1.5 text-xs font-medium"
          >
            Retake Quiz
          </button>
        )}
      </header>

      {/* Tabs */}
      <div className="border-b border-[#2e2e33] px-6 bg-[#121214] flex gap-6">
        {!quizData.isShared && (
          <button
            onClick={() => setActiveTab('metacognitive')}
            className={`py-3.5 text-xs font-medium transition-colors border-b-2 ${
              activeTab === 'metacognitive'
                ? 'border-[#f0f0ee] text-[#f0f0ee]'
                : 'border-transparent text-[#a1a1a6] hover:text-[#f0f0ee]'
            }`}
          >
            Mind's Mirror
          </button>
        )}
        {!quizData.isShared && (
          <button
            onClick={() => setActiveTab('quiz')}
            className={`py-3.5 text-xs font-medium transition-colors border-b-2 ${
              activeTab === 'quiz'
                ? 'border-[#f0f0ee] text-[#f0f0ee]'
                : 'border-transparent text-[#a1a1a6] hover:text-[#f0f0ee]'
            }`}
          >
            Quiz Results
          </button>
        )}
        <button
          onClick={() => {
            setActiveTab('mindmap')
            if (!quizData.isShared && nodes.length === 0 && !generatingMindmap && quizQuestions.filter(q => !q.isCorrect).length > 0) {
              handleGenerateMindmap()
            }
          }}
          className={`py-3.5 text-xs font-medium transition-colors border-b-2 ${
            activeTab === 'mindmap'
              ? 'border-[#f0f0ee] text-[#f0f0ee]'
              : 'border-transparent text-[#a1a1a6] hover:text-[#f0f0ee]'
          }`}
        >
          Review Mindmap
        </button>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 w-full max-w-6xl mx-auto flex-1 flex flex-col">
        
        {activeTab === 'quiz' && (
          <div className="space-y-6">
            {/* Score Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="card-standard p-5">
                <p className="text-xs text-[#a1a1a6]">Total Questions</p>
                <p className="text-2xl font-bold font-mono text-[#f0f0ee] mt-1">{quizQuestions.length}</p>
              </div>
              <div className="card-standard p-5">
                <p className="text-xs text-[#a1a1a6]">Correct Answers</p>
                <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">{correctCount}</p>
              </div>
              <div className="card-standard p-5">
                <p className="text-xs text-[#a1a1a6]">Score</p>
                <p className="text-2xl font-bold font-mono text-[#f0f0ee] mt-1">{scorePercentage}%</p>
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-3">
              {quizQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="card-standard p-5"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        q.isCorrect ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {q.isCorrect ? '✓' : '✗'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-sm text-[#f0f0ee] mb-3">
                        Q{idx + 1}: {q.prompt}
                      </h3>
                      <div className="space-y-1.5 ml-1">
                        <div>
                          <p className="text-xs text-[#a1a1a6]">Your Answer:</p>
                          <p
                            className={`text-xs font-medium ${
                              q.isCorrect
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {q.userAnswer}
                          </p>
                        </div>
                        {!q.isCorrect && (
                          <div>
                            <p className="text-xs text-[#a1a1a6]">Correct Answer:</p>
                            <p className="text-xs text-emerald-400 font-medium">
                              {getAnswerText(q.correctAnswer, q.choices)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'mindmap' && (
          <div
            className="card-standard p-0 overflow-hidden relative w-full"
            style={{ width: '100%', height: '650px', minHeight: '650px' }}
          >
            {/* Share button */}
            <div className="absolute top-4 left-4 z-10">
              <button
                onClick={() => { setShareModalOpen(true); setShareStatus('idle'); setShareEmail(''); setShareError('') }}
                className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium shadow-md"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share
              </button>
            </div>

            {nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full h-full gap-4">
                {generatingMindmap ? (
                  <div className="flex flex-col items-center gap-4 card-standard p-8 text-center max-w-sm">
                    <Vela size={80} loading={true} />
                    <div>
                      <p className="text-sm font-semibold text-[#f0f0ee]">Vela is building your map...</p>
                      <p className="text-xs text-[#a1a1a6] mt-0.5">Searching your notes &amp; crafting explanations</p>
                    </div>
                    <div className="w-48 h-1.5 bg-[#131519] rounded-full overflow-hidden border border-[#2e2e33]">
                      <div className="h-full bg-[#f0f0ee] animate-[progress_30s_linear_forwards]" style={{ width: '0%' }}></div>
                    </div>
                    <p className="text-xs text-[#a1a1aa] uppercase tracking-wider font-mono">Phase: AI Synthesis</p>
                  </div>
                ) : (
                  <div className="card-standard p-8 text-center max-w-md flex flex-col items-center gap-4">
                    <Vela size={70} />
                    <div>
                      <h3 className="text-base font-semibold text-[#f0f0ee] mb-1">Ready to Review?</h3>
                      <p className="text-xs text-[#a1a1a6] mb-5 leading-relaxed">
                        Vela can build a custom mindmap to help you understand where you went wrong and how to fix it.
                      </p>
                      <button
                        onClick={handleGenerateMindmap}
                        className="btn-primary w-full py-2.5 text-xs font-medium"
                      >
                        Generate Review Map ✨
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full" style={{ width: '100%', height: '100%' }}>
                <ReactFlowProvider>
                  <ReactFlow
                    style={{ width: '100%', height: '100%' }}
                    className="w-full h-full"
                    nodes={nodes.map(node => ({
                      ...node,
                      selected: node.id === selectedNodeId
                    }))}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={handleNodeClick}
                    onPaneClick={() => setSelectedNodeId(null)}
                    fitView
                    fitViewOptions={{ padding: 0.2, duration: 400 }}
                  >
                    <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#2e2e33" />
                    <Controls />
                    <MiniMap />
                  </ReactFlow>
                </ReactFlowProvider>
              </div>
            )}

            {/* Node Details Panel */}
            {selectedNodeId && nodes.find(n => n.id === selectedNodeId) && (
              <div className="absolute top-4 right-4 w-[380px] max-h-[85vh] card-standard p-6 z-20 overflow-y-auto flex flex-col shadow-2xl">
                <div className="flex justify-between items-center mb-3 shrink-0">
                  <span
                    className="badge-standard"
                  >
                    {nodes.find(n => n.id === selectedNodeId)?.data?.category}
                  </span>
                  <button onClick={() => setSelectedNodeId(null)} className="btn-ghost p-1">
                    <X className="w-4 h-4 text-[#a1a1a6]" />
                  </button>
                </div>

                <h2 className="text-base font-semibold text-[#f0f0ee] mb-2">
                  {nodes.find(n => n.id === selectedNodeId)?.data?.label}
                </h2>
                <p className="text-xs text-[#a1a1a6] mb-5 leading-relaxed flex-grow">
                  {nodes.find(n => n.id === selectedNodeId)?.data?.description}
                </p>

                <div className="space-y-2">
                  <button
                    className="btn-primary w-full py-2 text-xs"
                    onClick={handleAddSimilarTopic}
                    disabled={nodeActionLoading}
                  >
                    Add Similar Topic
                  </button>

                  <button
                    className="btn-secondary w-full py-2 text-xs"
                    onClick={handleGenerateMCQ}
                    disabled={nodeActionLoading}
                  >
                    Generate Practice MCQ
                  </button>

                  <button
                    className="btn-secondary w-full py-2 text-xs flex justify-center items-center gap-1.5"
                    onClick={() => {
                      const selectedNode = nodes.find(n => n.id === selectedNodeId);
                      const q = encodeURIComponent(selectedNode?.data?.label || '');
                      window.open(`https://www.google.com/search?q=${q}`, "_blank");
                    }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Search Resources
                  </button>
                </div>
              </div>
            )}

            {/* Share modal */}
            {shareModalOpen && (
              <div className="fixed inset-0 bg-[#121214]/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setShareModalOpen(false)}>
                <div
                  className="card-standard max-w-sm w-full p-6 shadow-2xl"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="quiz-share-modal-title"
                  onClick={(e) => e.stopPropagation()}
                  tabIndex={-1}
                  ref={shareModalRef}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h2 id="quiz-share-modal-title" className="text-sm font-semibold text-[#f0f0ee]">Share Mindmap</h2>
                    <button aria-label="Close share modal" onClick={() => setShareModalOpen(false)} className="btn-ghost p-1">
                      <X className="w-4 h-4 text-[#a1a1a6]" />
                    </button>
                  </div>
                  {shareStatus === 'success' ? (
                    <div className="text-center py-4">
                      <p className="text-emerald-400 font-medium text-sm">Sent!</p>
                      <p className="text-xs text-[#a1a1a6] mt-1">They'll see it instantly in their History.</p>
                      <button className="mt-4 btn-secondary w-full py-2 text-xs" onClick={() => setShareModalOpen(false)}>Close</button>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-[#a1a1a6] mb-4">Enter the email of a registered user to share this mindmap with them.</p>
                      <input
                        type="email"
                        value={shareEmail}
                        onChange={e => setShareEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleShare()}
                        placeholder="friend@example.com"
                        className="input-standard w-full mb-3 text-xs"
                      />
                      {shareStatus === 'error' && <p className="text-rose-400 text-xs mb-3">{shareError}</p>}
                      <button
                        onClick={handleShare}
                        disabled={shareStatus === 'loading' || !shareEmail.trim()}
                        className="btn-primary w-full py-2 text-xs font-medium disabled:opacity-50"
                      >
                        {shareStatus === 'loading' ? 'Sending...' : 'Send Mindmap'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {mcq && (
              <div className="fixed inset-0 bg-[#121214]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
                <div className="card-standard max-w-md w-full p-6">
                  <h2 className="text-sm font-semibold text-[#f0f0ee] mb-4">{mcq.question}</h2>

                  <div className="space-y-2">
                    {mcq.choices.map((c, i) => {
                      const letterMap = ['A', 'B', 'C', 'D'];
                      const letter = letterMap[i];
                      const isSelected = selectedAnswer === letter;
                      const isCorrect = mcq.answer === letter;
                      let btnClass = 'w-full p-3 rounded-[10px] border text-left text-sm transition-colors ';
                      if (selectedAnswer) {
                        if (isCorrect) btnClass += 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-medium';
                        else if (isSelected) btnClass += 'bg-rose-500/15 border-rose-500/40 text-rose-400';
                        else btnClass += 'bg-[#131519] border-[#2e2e33] text-[#a1a1aa]';
                      } else {
                        btnClass += 'bg-[#131519] border-[#2e2e33] hover:border-[#404047] text-[#f0f0ee]';
                      }
                      return (
                        <button
                          key={i}
                          className={btnClass}
                          disabled={!!selectedAnswer}
                          onClick={() => setSelectedAnswer(letter)}
                        >
                          <span className="font-mono mr-2">{letter}.</span>{c}
                          {selectedAnswer && isCorrect && <span className="ml-2">✓</span>}
                          {selectedAnswer && isSelected && !isCorrect && <span className="ml-2">✗</span>}
                        </button>
                      );
                    })}
                  </div>

                  {selectedAnswer && (
                    <p className={`mt-3 text-xs font-medium ${selectedAnswer === mcq.answer ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {selectedAnswer === mcq.answer
                        ? 'Correct!'
                        : `Incorrect. The correct answer is ${mcq.answer}.`}
                    </p>
                  )}

                  <button
                    className="mt-4 btn-secondary w-full py-2 text-xs"
                    onClick={() => { setMcq(null); setSelectedAnswer(null) }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'metacognitive' && (
          <MetacognitiveAnalysis
            quizId={quizId}
            onOpenMindmap={() => {
              setActiveTab('mindmap')
              if (!quizData?.isShared && nodes.length === 0 && !generatingMindmap && quizQuestions.filter(q => !q.isCorrect).length > 0) {
                handleGenerateMindmap()
              }
            }}
          />
        )}

      </div>
    </div>
  );
}

export default QuizDetail;

