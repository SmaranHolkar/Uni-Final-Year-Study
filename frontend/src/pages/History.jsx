import '../App.css'
import '../index.css'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { ChevronDown, ChevronUp, Eye, X } from 'lucide-react'
import { Reveal, DotGrid } from '../components/Reveal.jsx'

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
  const [modalQuiz, setModalQuiz] = useState(null)

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000"
  const solidCardBg = 'color-mix(in srgb, var(--background) 90%, var(--foreground) 10%)'
  const solidCardHoverBg = 'color-mix(in srgb, var(--background) 84%, var(--foreground) 16%)'

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
      .channel('shared-assets-incoming')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shared_assets' }, (payload) => {
        if (payload.new.recipient_id === user.id && payload.new.asset_type === 'quiz') {
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

  // Handles openModal logic.
  const openModal = (quiz) => {
    setModalQuiz(quiz)
  }

  // Handles closeModal logic.
  const closeModal = () => {
    setModalQuiz(null)
  }

  // Handles handleViewQuiz logic.
  const handleViewQuiz = (quiz) => {
    sessionStorage.setItem(`quiz_${quiz.id}`, JSON.stringify(quiz))
    navigate(`/quiz/${quiz.id}`)
  }

  // Handles handleViewShared logic.
  const handleViewShared = (shared) => {
    const quizObj = { id: shared.quiz_id, title: shared.title, quiz: shared.quiz, mindmap: shared.mindmap, created_at: shared.created_at, isShared: true }
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
    <div className="main-content min-h-screen relative" style={{ background: 'var(--background)', color: 'var(--foreground)', fontFamily: 'var(--font-sans)' }}>
      <DotGrid />

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
          <Reveal>
            <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>Quiz History</h2>
          </Reveal>
          {/* Tab switcher */}
          <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => setActiveSection('mine')}
              className={`px-5 py-2 text-sm font-medium transition-colors ${
                activeSection === 'mine'
                  ? 'border-b-2 text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
              style={activeSection === 'mine' ? { borderBottomColor: 'var(--primary)' } : {}}
            >
              My Quizzes
            </button>
            <button
              onClick={() => setActiveSection('shared')}
              className={`px-5 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                activeSection === 'shared'
                  ? 'border-b-2 text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
              style={activeSection === 'shared' ? { borderBottomColor: 'var(--primary)' } : {}}
            >
              Shared with me
              {sharedQuizzes.length > 0 && (
                <span className="bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{sharedQuizzes.length}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-8 sm:px-10 lg:px-12 py-6">

        {/* ── My Quizzes ── */}
        {activeSection === 'mine' && (
          <>
            {loading && <p className="text-center" style={{ color: 'var(--muted-foreground)' }}>Loading...</p>}

            {error && (
              <div className="p-4 rounded" style={{ background: 'var(--destructive)', color: 'var(--destructive-foreground)' }}>
                Error: {error}
              </div>
            )}

            {!loading && quizzes.length === 0 && (
              <Reveal>
                <div className="border p-6 rounded-xl text-center" style={{ background: solidCardBg, borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
                  No quiz history yet. Start taking quizzes to see them here!
                </div>
              </Reveal>
            )}

            {!loading && quizzes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quizzes.map((quiz, i) => {
                  const quizQuestions = parseQuizData(quiz.quiz)
                  const correctCount = quizQuestions.filter(q => q.isCorrect).length
                  const totalCount = quizQuestions.length
                  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0

                  return (
                    <Reveal key={quiz.id} delay={i * 0.05}>
                      <div className="rounded-xl overflow-hidden h-full flex flex-col" style={{ background: solidCardBg, borderColor: 'var(--border)', boxShadow: 'var(--shadow)', border: '1px solid var(--border)' }}>
                        <button
                          onClick={() => toggleExpand(quiz.id)}
                          className="flex-1 px-5 py-4 flex flex-col justify-between transition-colors cursor-pointer"
                          style={{ 
                            background: solidCardBg,
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = solidCardHoverBg}
                          onMouseLeave={e => e.currentTarget.style.background = solidCardBg}
                        >
                          <div className="text-left">
                            <h3 className="font-semibold text-base line-clamp-2" style={{ color: 'var(--foreground)' }}>{quiz.title}</h3>
                            <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
                              {new Date(quiz.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Score:</span>
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                score >= 80 ? 'bg-green-500/20 text-green-500' : 
                                score >= 60 ? 'bg-yellow-500/20 text-yellow-500' : 
                                'bg-red-500/20 text-red-500'
                              }`}>
                                {score}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Questions:</span>
                              <span className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{correctCount}/{totalCount}</span>
                            </div>
                          </div>
                        </button>

                        <div className="px-5 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewQuiz(quiz)}
                              className="flex-1 px-2 py-1.5 rounded text-xs flex items-center justify-center gap-1 font-medium transition-all hover:scale-105"
                              style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </button>
                            <button
                              onClick={() => openModal(quiz)}
                              className="flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors"
                              style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'var(--muted)'}
                            >
                              Details
                            </button>
                          </div>
                        </div>
                      </div>
                    </Reveal>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── Shared with me ── */}
        {activeSection === 'shared' && (
          <>
            {sharedLoading && <p className="text-center" style={{ color: 'var(--muted-foreground)' }}>Loading...</p>}

            {!sharedLoading && sharedQuizzes.length === 0 && (
              <Reveal>
                <div className="border p-6 rounded-xl text-center" style={{ background: solidCardBg, borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
                  Nobody has shared a mindmap with you yet.
                </div>
              </Reveal>
            )}

            {!sharedLoading && sharedQuizzes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sharedQuizzes.map((shared, i) => (
                  <Reveal key={shared.share_id} delay={i * 0.05}>
                    <div className="rounded-xl overflow-hidden" style={{ background: solidCardBg, borderColor: 'var(--border)', boxShadow: 'var(--shadow)', border: '1px solid var(--border)' }}>
                      <div className="px-5 py-4">
                        <h3 className="font-semibold text-base line-clamp-2 mb-2" style={{ color: 'var(--foreground)' }}>{shared.title}</h3>
                        <p className="text-xs mb-3" style={{ color: 'var(--muted-foreground)' }}>
                          From <span className="font-medium">{shared.sender_email}</span>
                        </p>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          {new Date(shared.shared_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="px-5 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
                        <button
                          onClick={() => handleViewShared(shared)}
                          className="w-full px-3 py-2 rounded text-sm flex items-center justify-center gap-2 font-medium transition-all hover:scale-105"
                          style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            )}
          </>
        )}

      </main>

      {/* Details Modal */}
      {modalQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: '#000000' }} onClick={closeModal}>
          <div 
            className="bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            style={{ background: solidCardBg, color: 'var(--foreground)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header with close button */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b" style={{ background: solidCardBg, borderColor: 'var(--border)' }}>
              <h3 className="text-xl font-bold">{modalQuiz.title}</h3>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-6 h-6" style={{ color: 'var(--foreground)' }} />
              </button>
            </div>

            {/* Modal content */}
            <div className="px-6 py-6 space-y-6">
              {/* Quiz metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg" style={{ background: 'var(--muted)' }}>
                  <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Date Taken</p>
                  <p className="text-lg font-semibold mt-2">{new Date(modalQuiz.created_at).toLocaleDateString()}</p>
                </div>
                <div className="p-4 rounded-lg" style={{ background: 'var(--muted)' }}>
                  <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Time</p>
                  <p className="text-lg font-semibold mt-2">{new Date(modalQuiz.created_at).toLocaleTimeString()}</p>
                </div>
              </div>

              {/* Questions & Answers */}
              {parseQuizData(modalQuiz.quiz).length > 0 && (
                <div>
                  <h4 className="font-semibold text-lg mb-4" style={{ color: 'var(--foreground)' }}>Questions & Answers</h4>
                  <div className="space-y-4">
                    {parseQuizData(modalQuiz.quiz).map((q, idx) => (
                      <div key={idx} className="p-4 rounded-lg" style={{ background: 'var(--muted)' }}>
                        <p className="font-medium mb-3" style={{ color: 'var(--foreground)' }}>Q{idx + 1}: {q.prompt}</p>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span style={{ color: 'var(--muted-foreground)' }}>Your Answer:</span>
                            <span style={{ color: q.isCorrect ? '#10b981' : '#ef4444', fontWeight: 'bold', marginLeft: '0.5rem' }}>
                              {q.isCorrect ? '✓' : '✗'} {q.userAnswer}
                            </span>
                          </div>
                          {!q.isCorrect && (
                            <div>
                              <span style={{ color: 'var(--muted-foreground)' }}>Correct Answer:</span>
                              <span style={{ color: '#10b981', fontWeight: 'bold', marginLeft: '0.5rem' }}>
                                {q.correctAnswer}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Topics/Mindmap */}
              {parseMindmapData(modalQuiz.mindmap).length > 0 && (
                <div>
                  <h4 className="font-semibold text-lg mb-4" style={{ color: 'var(--foreground)' }}>Review Topics</h4>
                  <div className="space-y-3">
                    {parseMindmapData(modalQuiz.mindmap).map((node, idx) => (
                      <div key={idx} className="p-4 rounded-lg" style={{ background: 'var(--muted)' }}>
                        <p className="font-medium" style={{ color: 'var(--foreground)' }}>{node.label}</p>
                        {node.description && (
                          <p className="text-sm mt-2" style={{ color: 'var(--muted-foreground)' }}>
                            {node.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default History
