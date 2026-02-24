import { useState, useEffect, useMemo } from 'react'
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
import { ArrowLeft, ChevronDown, X } from 'lucide-react'
import '../App.css'
import MetacognitiveAnalysis from '../components/MetacognitiveAnalysis'

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

function QuizDetail() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('metacognitive') // Default to Learning Insights
  const [quizData, setQuizData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedNodeId, setSelectedNodeId] = useState(null)

  // Fetch quiz details
  useEffect(() => {
    const fetchQuizDetail = async () => {
      try {
        // Parse the quiz data from URL params or sessionStorage
        const savedData = sessionStorage.getItem(`quiz_${quizId}`)
        if (savedData) {
          const parsed = JSON.parse(savedData)
          setQuizData(parsed)
        }
        setLoading(false)
      } catch (err) {
        console.error("Error loading quiz:", err)
        setError(err.message)
        setLoading(false)
      }
    }
    fetchQuizDetail()
  }, [quizId])

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

  if (loading) return <div className="p-6 text-center">Loading quiz details...</div>
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
      </header>

      {/* Tabs */}
      <div className="border-b border-[var(--border)] px-6 bg-[var(--background)] flex gap-8">
        <button
          onClick={() => setActiveTab('metacognitive')}
          className={`py-4 font-medium transition-colors ${
            activeTab === 'metacognitive'
              ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Learning Insights
        </button>
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
        <button
          onClick={() => setActiveTab('mindmap')}
          className={`py-4 font-medium transition-colors ${
            activeTab === 'mindmap'
              ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Review Mindmap
        </button>
        <button
          onClick={() => setActiveTab('playground')}
          className={`py-4 font-medium transition-colors ${
            activeTab === 'playground'
              ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Playground
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
            <ReactFlow
              nodes={nodes.map(node => ({
                ...node,
                selected: node.id === selectedNodeId
              }))}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              fitView
            >
              <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
              <Controls />
              <MiniMap />
            </ReactFlow>

            {/* Node Details Panel */}
            {selectedNodeId && nodes.find(n => n.id === selectedNodeId) && (
              <div className="absolute top-4 right-4 w-80 bg-white rounded-xl shadow-xl p-6 z-20">
                <div className="flex justify-between mb-2">
                  <span
                    className="text-xs text-white px-2 py-1 rounded"
                    style={{ background: nodes.find(n => n.id === selectedNodeId)?.style?.background }}
                  >
                    {nodes.find(n => n.id === selectedNodeId)?.data?.category}
                  </span>
                  <button onClick={() => setSelectedNodeId(null)}>
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <h2 className="font-bold text-lg mb-2">
                  {nodes.find(n => n.id === selectedNodeId)?.data?.label}
                </h2>
                <p className="text-sm text-slate-600 mb-4">
                  {nodes.find(n => n.id === selectedNodeId)?.data?.description}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'metacognitive' && (
          <MetacognitiveAnalysis quizId={quizId} />
        )}

        {activeTab === 'playground' && (
          <div className="bg-[var(--card)] p-6 rounded shadow">
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4">Learning Playground</h2>
            <p className="text-[var(--muted-foreground)] mb-6">
              Take control of your learning by building and experimenting with interactive tools tailored to your recent sessions.
            </p>
            <div className="bg-[var(--muted)] p-8 rounded border border-[var(--border)] text-center">
              <p className="text-[var(--muted-foreground)]">
                Playground coming soon...
              </p>
            </div>
          </div>
        )}
      </main>
    </main>
  )
}

export default QuizDetail
