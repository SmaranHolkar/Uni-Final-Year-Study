import '../App.css'
import '../index.css'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { ChevronDown, ChevronUp, Eye, X } from 'lucide-react'
import { Reveal, DotGrid } from '../components/Reveal.jsx'
import { Skeleton } from '../components/Skeleton.jsx'

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
  const modalShellRef = useRef(null)

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000"
  const solidCardBg = 'color-mix(in srgb, var(--background) 90%, var(--foreground) 10%)'
  const solidCardHoverBg = 'color-mix(in srgb, var(--background) 84%, var(--foreground) 16%)'

  // Handles fetchQuizHistory logic.
  const fetchQuizHistory = async (token) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/api/quiz-history`, {
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
      const response = await fetch(`${API_BASE}/api/shared-with-me`, {
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

  useEffect(() => {
    if (!modalQuiz) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeModal()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    modalShellRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [modalQuiz])

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

  const renderQuizCardSkeletons = ({ count = 6 }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <div key={`history-skeleton-${index}`} className="card-standard p-0 overflow-hidden">
          <div className="px-5 py-4">
            <Skeleton style={{ height: '0.95rem', width: '78%' }} />
            <Skeleton className="mt-2" style={{ height: '0.7rem', width: '42%' }} />
            <div className="mt-3 space-y-2">
              <Skeleton style={{ height: '0.75rem', width: '66%' }} />
              <Skeleton style={{ height: '0.75rem', width: '54%' }} />
            </div>
          </div>
          <div className="px-5 py-3 border-t border-[#2e2e33] bg-[#131519]/50">
            <div className="flex gap-2">
              <Skeleton rounded="8px" style={{ height: '1.8rem', width: '100%' }} />
              <Skeleton rounded="8px" style={{ height: '1.8rem', width: '100%' }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="main-content min-h-screen relative bg-[#121214] text-[#f0f0ee] font-sans">
      <DotGrid />

      {/* Live notification toast */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 bg-[#18181b] border border-[#2e2e33] text-[#f0f0ee] px-4 py-3 rounded-[10px] shadow-xl text-xs font-medium">
          {notification}
        </div>
      )}

      <header className="sticky top-0 z-20 backdrop-blur-lg border-b border-[#2e2e33] bg-[#121214]/80">
        <div className="px-8 sm:px-10 lg:px-12 py-6">
          <Reveal>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#f0f0ee] mb-4">Quiz History</h2>
          </Reveal>
          {/* Tab switcher */}
          <div role="tablist" aria-label="History sections" className="flex gap-2 border-b border-[#2e2e33]">
            <button
              id="history-tab-mine"
              role="tab"
              aria-selected={activeSection === 'mine'}
              aria-controls="history-panel-mine"
              onClick={() => setActiveSection('mine')}
              className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 ${
                activeSection === 'mine'
                  ? 'border-blue-500 text-blue-400 font-semibold'
                  : 'border-transparent text-[#a1a1a6] hover:text-[#f0f0ee]'
              }`}
            >
              My Quizzes
            </button>
            <button
              id="history-tab-shared"
              role="tab"
              aria-selected={activeSection === 'shared'}
              aria-controls="history-panel-shared"
              onClick={() => setActiveSection('shared')}
              className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 flex items-center gap-2 ${
                activeSection === 'shared'
                  ? 'border-blue-500 text-blue-400 font-semibold'
                  : 'border-transparent text-[#a1a1a6] hover:text-[#f0f0ee]'
              }`}
            >
              Shared with me
              {sharedQuizzes.length > 0 && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-500/15 text-blue-400 border border-blue-500/30">{sharedQuizzes.length}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-8 sm:px-10 lg:px-12 py-6">

        {/* ── My Quizzes ── */}
        {activeSection === 'mine' && (
          <div id="history-panel-mine" role="tabpanel" aria-labelledby="history-tab-mine">
            {loading && renderQuizCardSkeletons({ count: 6 })}

            {error && (
              <div className="p-4 rounded-[10px] bg-[#ef4444]/10 border border-[#ef4444]/30 text-xs text-[#f87171]">
                Error: {error}
              </div>
            )}

            {!loading && quizzes.length === 0 && (
              <Reveal>
                <div className="card-standard text-center py-10 text-xs text-[#a1a1a6]">
                  No quiz history yet. Start taking quizzes to see them here!
                </div>
              </Reveal>
            )}

            {!loading && quizzes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {quizzes.map((quiz, i) => {
                  const quizQuestions = parseQuizData(quiz.quiz);
                  const correctCount = quizQuestions.filter(q => q.isCorrect).length;
                  const totalCount = quizQuestions.length;
                  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
                  const cardColorClass = score >= 80 ? 'card-emerald' : score >= 60 ? 'card-amber' : 'card-red';

                  return (
                    <Reveal key={quiz.id} delay={i * 0.05}>
                      <div className={`card-standard ${cardColorClass} p-0 overflow-hidden h-full flex flex-col justify-between transition-all`}>
                        <button
                          onClick={() => toggleExpand(quiz.id)}
                          className="flex-1 px-5 py-4 flex flex-col justify-between text-left transition-colors hover:bg-[#131519]/50 cursor-pointer"
                        >
                          <div>
                            <h3 className="font-semibold text-sm line-clamp-2 text-[#f0f0ee]">{quiz.title}</h3>
                            <p className="text-[11px] mt-1.5 text-[#a1a1a6]">
                              {new Date(quiz.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-[#a1a1a6]">Score:</span>
                              <span className={`px-2 py-0.5 rounded-md text-xs font-mono font-medium ${
                                score >= 80 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 
                                score >= 60 ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 
                                'bg-red-500/15 text-red-400 border border-red-500/30'
                              }`}>
                                {score}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-[#a1a1a6]">Questions:</span>
                              <span className="text-xs font-mono text-[#f0f0ee]">{correctCount}/{totalCount}</span>
                            </div>
                          </div>
                        </button>

                        <div className="px-5 py-3 border-t border-[#2e2e33] bg-[#131519]/70">
                          <button
                            onClick={() => handleViewQuiz(quiz)}
                            className="btn-primary w-full py-1.5 text-xs flex items-center justify-center gap-1.5 font-medium"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Shared with me ── */}
        {activeSection === 'shared' && (
          <div id="history-panel-shared" role="tabpanel" aria-labelledby="history-tab-shared">
            {sharedLoading && renderQuizCardSkeletons({ count: 3 })}

            {!sharedLoading && sharedQuizzes.length === 0 && (
              <Reveal>
                <div className="card-standard text-center py-10 text-xs text-[#a1a1a6]">
                  Nobody has shared a mindmap with you yet.
                </div>
              </Reveal>
            )}

            {!sharedLoading && sharedQuizzes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {sharedQuizzes.map((shared, i) => (
                  <Reveal key={shared.share_id} delay={i * 0.05}>
                    <div className="card-standard p-0 overflow-hidden">
                      <div className="px-5 py-4">
                        <h3 className="font-semibold text-sm line-clamp-2 mb-1.5 text-[#f0f0ee]">{shared.title}</h3>
                        <p className="text-xs mb-2 text-[#a1a1a6]">
                          From <span className="font-medium text-[#f0f0ee]">{shared.sender_email}</span>
                        </p>
                        <p className="text-xs text-[#a1a1aa]">
                          {new Date(shared.shared_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="px-5 py-3 border-t border-[#2e2e33] bg-[#131519]/60">
                        <button
                          onClick={() => handleViewShared(shared)}
                          className="btn-primary w-full py-1.5 text-xs flex items-center justify-center gap-2 font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Details Modal */}
      {modalQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121214]/80 backdrop-blur-md" onClick={closeModal}>
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-modal-title"
            className="card-standard max-w-2xl w-full max-h-[80vh] overflow-y-auto p-0"
            onClick={e => e.stopPropagation()}
            tabIndex={-1}
            ref={modalShellRef}
          >
            {/* Header with close button */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[#2e2e33] bg-[#18181b]">
              <h3 id="history-modal-title" className="text-base font-semibold text-[#f0f0ee]">{modalQuiz.title}</h3>
              <button
                onClick={closeModal}
                aria-label="Close quiz details"
                className="btn-ghost p-1"
              >
                <X className="w-5 h-5 text-[#a1a1a6]" />
              </button>
            </div>

            {/* Modal content */}
            <div className="p-6 space-y-5">
              {/* Quiz metadata */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-[10px] bg-[#131519] border border-[#2e2e33]">
                  <p className="text-xs text-[#a1a1a6]">Date Taken</p>
                  <p className="text-sm font-semibold text-[#f0f0ee] mt-1">{new Date(modalQuiz.created_at).toLocaleDateString()}</p>
                </div>
                <div className="p-3.5 rounded-[10px] bg-[#131519] border border-[#2e2e33]">
                  <p className="text-xs text-[#a1a1a6]">Time</p>
                  <p className="text-sm font-semibold text-[#f0f0ee] mt-1">{new Date(modalQuiz.created_at).toLocaleTimeString()}</p>
                </div>
              </div>

              {/* Questions & Answers */}
              {parseQuizData(modalQuiz.quiz).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#a1a1a6] mb-3">Questions &amp; Answers</h4>
                  <div className="space-y-3">
                    {parseQuizData(modalQuiz.quiz).map((q, idx) => (
                      <div key={idx} className="p-4 rounded-[10px] bg-[#131519] border border-[#2e2e33]">
                        <p className="font-medium text-xs text-[#f0f0ee] mb-2">Q{idx + 1}: {q.prompt}</p>
                        <div className="space-y-1.5 text-xs">
                          <div>
                            <span className="text-[#a1a1a6]">Your Answer:</span>
                            <span className={`font-medium ml-2 ${q.isCorrect ? 'text-emerald-400' : 'text-[#f87171]'}`}>
                              {q.isCorrect ? '✓' : '✗'} {q.userAnswer}
                            </span>
                          </div>
                          {!q.isCorrect && (
                            <div>
                              <span className="text-[#a1a1a6]">Correct Answer:</span>
                              <span className="text-emerald-400 font-medium ml-2">
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
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#a1a1a6] mb-3">Review Topics</h4>
                  <div className="space-y-2">
                    {parseMindmapData(modalQuiz.mindmap).map((node, idx) => (
                      <div key={idx} className="p-3.5 rounded-[10px] bg-[#131519] border border-[#2e2e33]">
                        <p className="font-medium text-xs text-[#f0f0ee]">{node.label}</p>
                        {node.description && (
                          <p className="text-xs text-[#a1a1a6] mt-1">
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
  );
}

export default History;

