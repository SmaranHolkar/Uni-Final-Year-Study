import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ReactFlow,
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
        // Parse the quiz data from URL params or sessionStorage
        const savedData = sessionStorage.getItem(`quiz_${quizId}`)
        if (savedData) {
          const parsed = JSON.parse(savedData)
          setQuizData(parsed)
          // If this is a shared mindmap, default to the mindmap tab
          if (parsed.isShared) {
            setActiveTab('mindmap')
          }
        }
        setLoading(false)
      } catch (err) {
        console.error("Error loading quiz:", err)
        setError("Unable to load quiz. Please try again")
        setLoading(false)
      }
    }
    fetchQuizDetail()
  }, [quizId])

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
    const nodes = mindmapData.nodes?.map((n, i) => {
      const color = categoryColors[i % categoryColors.length]
      return {
        id: n.id,
        data: {
          label: n.label,
          description: n.description || "Review this concept",
          category: n.category || "Review Topic",
        },
        position: { x: i * 250, y: i % 2 === 0 ? 0 : 150 },
        type: 'default',
        style: {
          background: color,
          color: "white",
          borderRadius: "12px",
          padding: "12px 20px",
          fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          minWidth: "150px",
          textAlign: "center",
        },
      }
    }) || []

    const edges = mindmapData.edges?.map((e, i) => ({
      id: `e-${i}`,
      source: e.from,
      target: e.to,
      animated: true,
      style: { stroke: "hsl(195, 85%, 55%)", strokeWidth: 2 },
    })) || []

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
        alert('Something went wrong. Please try again.')
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

      if (res.data.mindmap) {
        // Save to database
        await axios.post(
          `${API_BASE}/api/save-quiz-mindmap`,
          {
            userId: session.user?.id,
            title: quizData.title,
            quizResults: quizQuestions,
            mindmapNodes: res.data.mindmap
          },
          { headers: { Authorization: `Bearer ${accessToken}` }, withCredentials: true }
        )

        // Update local state
        const updatedQuizData = { ...quizData, mindmap: res.data.mindmap }
        setQuizData(updatedQuizData)
        sessionStorage.setItem(`quiz_${quizId}`, JSON.stringify(updatedQuizData))
      }
    } catch (err) {
      console.error('Failed to generate mindmap:', err)
      alert('Something went wrong. Please try again.')
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
  if (error) return <div className="p-6 text-center text-red-600">Error: {error}</div>
  if (!quizData) return <div className="p-6 text-center">Quiz not found</div>

  const quizQuestions = parseQuizData(quizData.quiz)
  const correctCount = quizQuestions.filter(q => q.isCorrect).length
  const scorePercentage = Math.round((correctCount / quizQuestions.length) * 100)

  return (
    <main className="main-content min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)', fontFamily: 'var(--font-sans)' }}>
      <header className="flex items-center justify-between shadow-md p-4 bg-[var(--card)] text-[var(--card-foreground)] border-b border-[var(--border)]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1 border border-[var(--border)] rounded-md text-[var(--foreground)] hover:bg-[var(--muted)]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold">{quizData.title}</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
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
            className="px-3 py-1 border border-[var(--border)] rounded-md text-[var(--foreground)] hover:bg-[var(--muted)]"
          >
            Retake Quiz
          </button>
        )}
      </header>

      {/* Tabs */}
      <div className="border-b border-[var(--border)] px-6 bg-[var(--background)] flex gap-8">
        {!quizData.isShared && (
          <button
            onClick={() => setActiveTab('metacognitive')}
            className={`py-4 font-medium transition-colors ${
              activeTab === 'metacognitive'
                ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            Mind's Mirror
          </button>
        )}
        {!quizData.isShared && (
          <button
            onClick={() => setActiveTab('quiz')}
            className={`py-4 font-medium transition-colors ${
              activeTab === 'quiz'
                ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
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
          className={`py-4 font-medium transition-colors ${
            activeTab === 'mindmap'
              ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Review Mindmap
        </button>
      </div>

      {/* Content */}
      <main className="p-6">
        
        {activeTab === 'quiz' && (
          <div className="space-y-6">
            {/* Score Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[var(--card)] p-6 rounded shadow border-l-4 border-[var(--primary)]">
                <p className="text-sm text-[var(--muted-foreground)]">Total Questions</p>
                <p className="text-3xl font-bold text-[var(--primary)]">{quizQuestions.length}</p>
              </div>
              <div className="bg-[var(--card)] p-6 rounded shadow border-l-4 border-[var(--chart-2)]">
                <p className="text-sm text-[var(--muted-foreground)]">Correct Answers</p>
                <p className="text-3xl font-bold text-[var(--chart-2)]">{correctCount}</p>
              </div>
              <div className="bg-[var(--card)] p-6 rounded shadow border-l-4 border-[var(--chart-5)]">
                <p className="text-sm text-[var(--muted-foreground)]">Score</p>
                <p className="text-3xl font-bold text-[var(--chart-5)]">{scorePercentage}%</p>
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-4">
              {quizQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className={`bg-[var(--card)] p-6 rounded shadow border-l-4 ${
                    q.isCorrect ? 'border-[var(--chart-2)]' : 'border-[var(--destructive)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[var(--card-foreground)] font-bold flex-shrink-0 ${
                        q.isCorrect ? 'bg-[var(--chart-2)]' : 'bg-[var(--destructive)]'
                      }`}
                    >
                      {q.isCorrect ? '✓' : '✗'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-[var(--foreground)] mb-3">
                        Q{idx + 1}: {q.prompt}
                      </h3>
                      <div className="space-y-2 ml-2">
                        <div>
                          <p className="text-sm font-medium text-[var(--muted-foreground)]">Your Answer:</p>
                          <p
                            className={`text-sm ${
                              q.isCorrect
                                ? 'text-[var(--chart-2)] font-semibold'
                                : 'text-[var(--destructive)] font-semibold'
                            }`}
                          >
                            {q.userAnswer}
                          </p>
                        </div>
                        {!q.isCorrect && (
                          <div>
                            <p className="text-sm font-medium text-[var(--muted-foreground)]">Correct Answer:</p>
                            <p className="text-sm text-[var(--chart-2)] font-semibold">
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
          <div className="bg-[var(--card)] rounded shadow overflow-hidden h-[600px] relative">
            {/* Share button */}
            <div className="absolute top-4 left-4 z-10">
              <button
                onClick={() => { setShareModalOpen(true); setShareStatus('idle'); setShareEmail(''); setShareError('') }}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium shadow hover:bg-blue-700 transition"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>

            {nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                {generatingMindmap ? (
                  <div className="flex flex-col items-center gap-4 bg-white/50 backdrop-blur-sm p-8 rounded-2xl border border-blue-100 shadow-xl">
                    <Vela size={100} loading={true} />
                    <div className="text-center">
                      <p className="text-slate-800 font-bold text-lg">Vela is building your map...</p>
                      <p className="text-sm text-slate-500">Searching your notes & crafting explanations</p>
                    </div>
                    <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 animate-[progress_30s_linear_forwards]" style={{ width: '0%' }}></div>
                    </div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Phase: AI Synthesis</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center max-w-md shadow-xl flex flex-col items-center gap-4">
                      <Vela size={80} />
                      <div>
                        <h3 className="font-bold text-slate-900 text-xl mb-2">Ready to Review?</h3>
                        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                          Vela can build a custom mindmap to help you understand where you went wrong and how to fix it.
                        </p>
                        <button
                          onClick={handleGenerateMindmap}
                          className="w-full bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0"
                        >
                          Generate Review Map ✨
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <ReactFlow
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
              >
                <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
                <Controls />
                <MiniMap />
              </ReactFlow>
            )}

            {/* Node Details Panel */}
            {selectedNodeId && nodes.find(n => n.id === selectedNodeId) && (
              <div className="absolute top-4 right-4 w-[480px] max-h-[85vh] bg-white rounded-xl shadow-2xl p-8 z-20 overflow-y-auto flex flex-col">
                <div className="flex justify-between mb-3 flex-shrink-0">
                  <span
                    className="text-xs text-white px-3 py-1.5 rounded font-semibold"
                    style={{ background: nodes.find(n => n.id === selectedNodeId)?.style?.background }}
                  >
                    {nodes.find(n => n.id === selectedNodeId)?.data?.category}
                  </span>
                  <button onClick={() => setSelectedNodeId(null)} className="hover:bg-gray-100 p-1 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <h2 className="font-bold text-xl mb-4 text-slate-900">
                  {nodes.find(n => n.id === selectedNodeId)?.data?.label}
                </h2>
                <p className="text-base text-slate-700 mb-6 leading-relaxed flex-grow">
                  {nodes.find(n => n.id === selectedNodeId)?.data?.description}
                </p>

                <button
                  className="w-full mb-2 p-2 bg-blue-600 text-white rounded"
                  onClick={handleAddSimilarTopic}
                  disabled={nodeActionLoading}
                >
                  Add Similar Topic
                </button>

                <button
                  className="w-full p-2 bg-purple-600 text-white rounded"
                  onClick={handleGenerateMCQ}
                  disabled={nodeActionLoading}
                >
                  Generate MCQ
                </button>

                <button
                  className="w-full mt-3 p-2 bg-slate-100 rounded flex justify-center gap-2"
                  onClick={() => {
                    const selectedNode = nodes.find(n => n.id === selectedNodeId)
                    const q = encodeURIComponent(selectedNode?.data?.label || '')
                    window.open(`https://www.google.com/search?q=${q}`, "_blank")
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Search Resources
                </button>
              </div>
            )}

            {/* Share modal */}
            {shareModalOpen && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShareModalOpen(false)}>
                <div
                  className="bg-white rounded-xl shadow-2xl p-6 w-[380px]"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="quiz-share-modal-title"
                  onClick={(e) => e.stopPropagation()}
                  tabIndex={-1}
                  ref={shareModalRef}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h2 id="quiz-share-modal-title" className="font-bold text-lg text-slate-900">Share Mindmap</h2>
                    <button aria-label="Close share modal" onClick={() => setShareModalOpen(false)} className="hover:bg-gray-100 p-1 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {shareStatus === 'success' ? (
                    <div className="text-center py-4">
                      <p className="text-green-600 font-semibold text-lg">Sent!</p>
                      <p className="text-slate-500 text-sm mt-1">They'll see it instantly in their History.</p>
                      <button className="mt-4 w-full bg-slate-700 text-white p-2 rounded" onClick={() => setShareModalOpen(false)}>Close</button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-slate-500 mb-4">Enter the email of a registered user to share this mindmap with them.</p>
                      <input
                        type="email"
                        value={shareEmail}
                        onChange={e => setShareEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleShare()}
                        placeholder="friend@example.com"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {shareStatus === 'error' && <p className="text-red-600 text-sm mb-3">{shareError}</p>}
                      <button
                        onClick={handleShare}
                        disabled={shareStatus === 'loading' || !shareEmail.trim()}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                      >
                        {shareStatus === 'loading' ? 'Sending...' : 'Send'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {mcq && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-xl w-[420px]">
                  <h2 className="font-bold mb-4">{mcq.question}</h2>

                  <div className="space-y-2">
                    {mcq.choices.map((c, i) => {
                      const letterMap = ['A', 'B', 'C', 'D']
                      const letter = letterMap[i]
                      const isSelected = selectedAnswer === letter
                      const isCorrect = mcq.answer === letter
                      let btnClass = 'w-full p-2 border rounded text-left transition-colors '
                      if (selectedAnswer) {
                        if (isCorrect) btnClass += 'bg-green-100 border-green-500 text-green-800 font-semibold'
                        else if (isSelected) btnClass += 'bg-red-100 border-red-400 text-red-700'
                        else btnClass += 'bg-white text-slate-500'
                      } else {
                        btnClass += 'hover:bg-slate-100'
                      }
                      return (
                        <button
                          key={i}
                          className={btnClass}
                          disabled={!!selectedAnswer}
                          onClick={() => setSelectedAnswer(letter)}
                        >
                          <span className="font-medium mr-2">{letter}.</span>{c}
                          {selectedAnswer && isCorrect && <span className="ml-2">✓</span>}
                          {selectedAnswer && isSelected && !isCorrect && <span className="ml-2">✗</span>}
                        </button>
                      )
                    })}
                  </div>

                  {selectedAnswer && (
                    <p className={`mt-3 text-sm font-medium ${selectedAnswer === mcq.answer ? 'text-green-700' : 'text-red-600'}`}>
                      {selectedAnswer === mcq.answer
                        ? 'Correct!'
                        : `Incorrect. The correct answer is ${mcq.answer}.`}
                    </p>
                  )}

                  <button
                    className="mt-4 w-full bg-slate-700 text-white p-2 rounded"
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
          <MetacognitiveAnalysis quizId={quizId} />
        )}


        
      </main>
    </main>
  )
}

export default QuizDetail
