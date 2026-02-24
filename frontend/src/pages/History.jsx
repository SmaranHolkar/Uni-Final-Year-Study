import '../App.css'
import '../index.css'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { ChevronDown, ChevronUp, Eye } from 'lucide-react'

function History() {
  const { user, session } = useAuth()
  const navigate = useNavigate()
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    if (!user?.id || !session?.access_token) return
    
    const fetchQuizHistory = async () => {
      setLoading(true)
      setError(null)
      try {
        const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000"
        
        const response = await fetch(`${API_BASE}/api/quiz-history`, {
          method: "GET",
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch quiz history')
        }

        const data = await response.json()
        setQuizzes(data.data || [])
      } catch (err) {
        console.error("Error fetching quiz history:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchQuizHistory()
  }, [user?.id, session?.access_token])

  const toggleExpand = (quizId) => {
    setExpandedId(expandedId === quizId ? null : quizId)
  }

  const handleViewQuiz = (quiz) => {
    // Store quiz data in sessionStorage to pass to detail page
    sessionStorage.setItem(`quiz_${quiz.id}`, JSON.stringify(quiz))
    navigate(`/quiz/${quiz.id}`)
  }

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
        return []
      }
    }
    
    // Handle new format (object with nodes and edges)
    if (parsed && typeof parsed === 'object' && parsed.nodes) {
      return parsed.nodes
    }
    
    // Handle old format (array of nodes)
    if (Array.isArray(parsed)) {
      return parsed
    }
    
    return []
  }

  return (
    <div className="main-content">
      <header 
        className="sticky top-0 z-20 backdrop-blur-lg border-b"
        style={{ 
          background: 'color-mix(in srgb, var(--background) 80%, transparent)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div className="px-8 sm:px-10 lg:px-12 py-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold">Quiz History</h2>
        </div>
      </header>

      <main className="px-8 sm:px-10 lg:px-12 py-6">
        {loading && <p className="text-center text-muted">Loading...</p>}
        
        {error && (
          <div className="alert-error p-4 rounded">
            Error: {error}
          </div>
        )}

        {!loading && quizzes.length === 0 && (
          <div className="surface-muted border border-default p-6 rounded text-center">
            No quiz history yet. Start taking quizzes to see them here!
          </div>
        )}

        {!loading && quizzes.length > 0 && (
          <div className="space-y-4">
            {quizzes.map((quiz) => {
              const quizQuestions = parseQuizData(quiz.quiz)
              const mindmapNodes = parseMindmapData(quiz.mindmap)
              const isExpanded = expandedId === quiz.id

              return (
                <div key={quiz.id} className="surface-card rounded overflow-hidden">
                  {/* Header */}
                  <button
                    onClick={() => toggleExpand(quiz.id)}
                    className="w-full px-6 py-4 flex justify-between items-center transition surface-hover"
                  >
                    <div className="text-left flex-1">
                      <h3 className="font-semibold text-lg">{quiz.title}</h3>
                      <p className="text-sm text-muted">
                        {new Date(quiz.created_at).toLocaleDateString()} at {new Date(quiz.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewQuiz(quiz)
                        }}
                        className="px-3 py-1 rounded text-sm flex items-center gap-2 button-primary"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-default px-6 py-4 surface-muted space-y-6">
                      {/* Quiz Results Summary */}
                      <div>
                        <h4 className="font-semibold text-[color:var(--foreground)] mb-3">Quiz Results</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="surface-card p-3 rounded">
                            <p className="text-sm text-muted">Total Questions</p>
                            <p className="text-2xl font-bold text-primary">{quizQuestions.length}</p>
                          </div>
                          <div className="surface-card p-3 rounded">
                            <p className="text-sm text-muted">Correct Answers</p>
                            <p className="text-2xl font-bold text-success">
                              {quizQuestions.filter(q => q.isCorrect).length}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Quiz Details */}
                      {quizQuestions.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-[color:var(--foreground)] mb-3">Questions & Answers</h4>
                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {quizQuestions.map((q, idx) => (
                              <div key={idx} className="surface-card p-3 rounded">
                                <p className="text-sm font-medium">Q{idx + 1}: {q.prompt}</p>
                                <div className="mt-2 flex gap-4 text-sm">
                                  <span className="text-muted">
                                    Your Answer: <span className={q.isCorrect ? 'text-success font-semibold' : 'text-danger font-semibold'}>{q.userAnswer}</span>
                                  </span>
                                  {!q.isCorrect && (
                                    <span className="text-muted">
                                      Correct: <span className="text-success font-semibold">{q.correctAnswer}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Mindmap Topics */}
                      {mindmapNodes.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-[color:var(--foreground)] mb-3">Review Topics (Mindmap)</h4>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {mindmapNodes.map((node, idx) => (
                              <div key={idx} className="surface-card p-3 rounded">
                                <p className="font-medium">{node.label}</p>
                                <p className="text-sm text-muted mt-1">{node.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export default History
