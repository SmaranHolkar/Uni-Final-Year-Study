import '../App.css'
import '../index.css'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { ChevronDown, ChevronUp, Eye } from 'lucide-react'

// Handles History logic.
function History() {
  const { user, session } = useAuth()
  const navigate = useNavigate()
  const [quizzes, setQuizzes] = useState([])
  const [sharedQuizzes, setSharedQuizzes] = useState([])
  const [loading, setLoading] = useState(false)
  const [sharedLoading, setSharedLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [activeSection, setActiveSection] = useState('mine')
  const [notification, setNotification] = useState(null)

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000"

  // Handles fetchQuizHistory logic.
  const fetchQuizHistory = async (token) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/api/quiz-history?token=${encodeURIComponent(token)}`, {
        method: "GET",
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to fetch quiz history')
      const data = await response.json()
      setQuizzes(data.data || [])
    } catch (err) {
      console.error("Error fetching quiz history:", err)
      setError("Unable to load quiz history. Please try again")
    } finally {
      setLoading(false)
    }
  }

  // Handles fetchSharedWithMe logic.
  const fetchSharedWithMe = async (token) => {
    setSharedLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/shared-with-me?token=${encodeURIComponent(token)}`, {
        method: "GET",
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to fetch shared mindmaps')
      const data = await response.json()
      setSharedQuizzes(data.data || [])
    } catch (err) {
      console.error("Error fetching shared mindmaps:", err)
    } finally {
      setSharedLoading(false)
    }
  }

  useEffect(() => {
    if (!user?.id || !session?.access_token) return
    fetchQuizHistory(session.access_token)
    fetchSharedWithMe(session.access_token)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, session?.access_token])

  // Realtime: listen for new shares sent to this user
  useEffect(() => {
    if (!user?.id || !session?.access_token) return
    const channel = supabase
      .channel('shared-mindmaps-incoming')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shared_mindmaps' }, (payload) => {
        if (payload.new.recipient_id === user.id) {
          fetchSharedWithMe(session.access_token)
          setNotification('Someone just shared a mindmap with you!')
          setTimeout(() => setNotification(null), 4000)
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, session?.access_token])

  useEffect(() => {
    // Handles refreshHistory logic.
    const refreshHistory = () => {
      setQuizzes([])
      setSharedQuizzes([])
      setExpandedId(null)
    }

    // Handles handleStorage logic.
    const handleStorage = (event) => {
      if (event.key === 'user_data_cleared_at') {
        refreshHistory()
      }
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('user-data-cleared', refreshHistory)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('user-data-cleared', refreshHistory)
    }
  }, [])

  // Handles toggleExpand logic.
  const toggleExpand = (quizId) => {
    setExpandedId(expandedId === quizId ? null : quizId)
  }

  // Handles handleViewQuiz logic.
  const handleViewQuiz = (quiz) => {
    sessionStorage.setItem(`quiz_${quiz.id}`, JSON.stringify(quiz))
    navigate(`/quiz/${quiz.id}`)
  }

  // Handles handleViewShared logic.
  const handleViewShared = (shared) => {
    const quizObj = { id: shared.quiz_id, title: shared.title, quiz: shared.quiz, mindmap: shared.mindmap, created_at: shared.created_at }
    sessionStorage.setItem(`quiz_${shared.quiz_id}`, JSON.stringify(quizObj))
    navigate(`/quiz/${shared.quiz_id}`)
  }

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

  // Handles parseMindmapData logic.
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

      {/* Live notification toast */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 bg-blue-600 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium">
          {notification}
        </div>
      )}

      <header
        className="sticky top-0 z-20 backdrop-blur-lg border-b"
        style={{
          background: 'color-mix(in srgb, var(--background) 80%, transparent)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div className="px-8 sm:px-10 lg:px-12 py-6">
          <h2 className="text-3xl font-bold mb-4">Quiz History</h2>
          {/* Tab switcher */}
          <div className="flex gap-1 border-b border-[var(--border)]">
            <button
              onClick={() => setActiveSection('mine')}
              className={`px-5 py-2 text-sm font-medium transition-colors ${
                activeSection === 'mine'
                  ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              My Quizzes
            </button>
            <button
              onClick={() => setActiveSection('shared')}
              className={`px-5 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                activeSection === 'shared'
                  ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              Shared with me
              {sharedQuizzes.length > 0 && (
                <span className="bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{sharedQuizzes.length}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="px-8 sm:px-10 lg:px-12 py-6">

        {/* ── My Quizzes ── */}
        {activeSection === 'mine' && (
          <>
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
                            onClick={(e) => { e.stopPropagation(); handleViewQuiz(quiz) }}
                            className="px-3 py-1 rounded text-sm flex items-center gap-2 button-primary"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-muted" /> : <ChevronDown className="w-5 h-5 text-muted" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-default px-6 py-4 surface-muted space-y-6">
                          <div>
                            <h4 className="font-semibold text-[color:var(--foreground)] mb-3">Quiz Results</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="surface-card p-3 rounded">
                                <p className="text-sm text-muted">Total Questions</p>
                                <p className="text-2xl font-bold text-primary">{quizQuestions.length}</p>
                              </div>
                              <div className="surface-card p-3 rounded">
                                <p className="text-sm text-muted">Correct Answers</p>
                                <p className="text-2xl font-bold text-success">{quizQuestions.filter(q => q.isCorrect).length}</p>
                              </div>
                            </div>
                          </div>

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

                          {mindmapNodes.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-[color:var(--foreground)] mb-3">Review Topics (Mindmap)</h4>
                              <div className="space-y-2 max-h-96 overflow-y-auto">
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
          </>
        )}

        {/* ── Shared with me ── */}
        {activeSection === 'shared' && (
          <>
            {sharedLoading && <p className="text-center text-muted">Loading...</p>}

            {!sharedLoading && sharedQuizzes.length === 0 && (
              <div className="surface-muted border border-default p-6 rounded text-center">
                Nobody has shared a mindmap with you yet.
              </div>
            )}

            {!sharedLoading && sharedQuizzes.length > 0 && (
              <div className="space-y-4">
                {sharedQuizzes.map((shared) => (
                  <div key={shared.share_id} className="surface-card rounded overflow-hidden">
                    <div className="px-6 py-4 flex justify-between items-center">
                      <div className="text-left flex-1">
                        <h3 className="font-semibold text-lg">{shared.title}</h3>
                        <p className="text-sm text-muted">
                          Shared by <span className="font-medium">{shared.sender_email}</span>
                          {' · '}{new Date(shared.shared_at).toLocaleDateString()} at {new Date(shared.shared_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleViewShared(shared)}
                        className="px-3 py-1 rounded text-sm flex items-center gap-2 button-primary"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </main>
    </div>
  )
}

export default History
