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
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { ArrowLeft, ChevronDown } from 'lucide-react'
import '../App.css'

const categoryColors = [
  "hsl(0, 70%, 60%)",
  "hsl(142, 70%, 50%)",
  "hsl(195, 85%, 55%)",
  "hsl(280, 70%, 60%)",
]

function QuizDetail() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('quiz') // 'quiz' or 'mindmap'
  const [quizData, setQuizData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
        
    </main>
  )
}

export default QuizDetail
