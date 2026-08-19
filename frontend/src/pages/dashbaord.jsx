import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useAuth } from '../AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Compass, Bell } from 'lucide-react';
import Vela from '../components/Vela.jsx';
import { Reveal, DotGrid } from '../components/Reveal.jsx';
import { Skeleton } from '../components/Skeleton.jsx';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const SUGGESTIONS_CACHE_TTL_MS = 15 * 60 * 1000;

const getSuggestionsCacheKey = (userId) => `dashboard_suggestions_${userId}`;

const readSuggestionsCache = (cacheKey) => {
  try {
    const raw = sessionStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data || typeof parsed.fetchedAt !== 'number') {
      sessionStorage.removeItem(cacheKey);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(cacheKey);
    return null;
  }
};

const writeSuggestionsCache = (cacheKey, data) => {
  try {
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({
        data,
        fetchedAt: Date.now(),
      })
    );
  } catch {
    // Ignore storage write failures to avoid blocking UI updates.
  }
};

// Handles Dashboard logic.
export default function Dashboard() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingTierStatus, setIsLoadingTierStatus] = useState(false);
  const [isLoadingRepetition, setIsLoadingRepetition] = useState(false);
  const [reviewingQueueIds, setReviewingQueueIds] = useState({});
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [tierStatus, setTierStatus] = useState(null);
  const [dueRepetitionItems, setDueRepetitionItems] = useState([]);

useEffect(() => {
    if (!user?.id || !session?.access_token) return

    const cacheKey = getSuggestionsCacheKey(user.id)
    const cachedSuggestions = readSuggestionsCache(cacheKey)
    const cacheIsFresh = Boolean(
      cachedSuggestions && Date.now() - cachedSuggestions.fetchedAt < SUGGESTIONS_CACHE_TTL_MS
    )

    if (cachedSuggestions?.data) {
      setSuggestions(cachedSuggestions.data)
    }
    
    // Fetch quiz history from backend API using access token for authentication
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
          },
          credentials: 'include'
        })

        if (!response.ok) {
          throw new Error('Failed to fetch quiz history')
        }

        const data = await response.json()
        setQuizzes(data.data || [])
      } catch (err) {
        console.error("Error fetching quiz history:", err)
        setError("Unable to load quiz history. Please try again")
      } finally {
        setLoading(false)
      }
    }

    // Handles fetchSuggestions logic.
    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true)
      try {
        const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const res = await fetch(`${API_BASE}/api/suggestions`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          credentials: 'include'
        });
        
        if (!res.ok) {
          console.warn(`Suggestions API returned ${res.status}:`, await res.text());
          return;
        }
        
        const data = await res.json();
        setSuggestions(data);
        writeSuggestionsCache(cacheKey, data);
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
      } finally {
        setIsLoadingSuggestions(false)
      }
    };

    const fetchTierStatus = async () => {
      setIsLoadingTierStatus(true)
      try {
        const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000"
        const response = await fetch(`${API_BASE}/api/tier-status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          credentials: 'include',
        })

        if (!response.ok) {
          return
        }

        const data = await response.json()
        setTierStatus(data?.data || null)
      } catch {
        setTierStatus(null)
      } finally {
        setIsLoadingTierStatus(false)
      }
    }

    const fetchDueRepetition = async () => {
      setIsLoadingRepetition(true)
      try {
        const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000"
        const response = await fetch(`${API_BASE}/api/spaced-repetition/due?limit=5`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          credentials: 'include',
        })

        if (!response.ok) {
          return
        }

        const data = await response.json()
        setDueRepetitionItems(Array.isArray(data?.data) ? data.data : [])
      } catch {
        setDueRepetitionItems([])
      } finally {
        setIsLoadingRepetition(false)
      }
    }
    
    fetchQuizHistory();
    fetchTierStatus();
    fetchDueRepetition();
    if (!cacheIsFresh) {
      fetchSuggestions();
    }
  }, [user?.id, session?.access_token])

  const handleMarkReviewed = async (itemId) => {
    if (!session?.access_token || !itemId) return
    setReviewingQueueIds((prev) => ({ ...prev, [itemId]: true }))

    try {
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000"
      const response = await fetch(`${API_BASE}/api/spaced-repetition/${itemId}/reviewed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      })

      if (!response.ok) return

      setDueRepetitionItems((prev) => prev.filter((item) => item.id !== itemId))
    } catch {
      // No-op: keep UI stable without noisy errors for this quick action.
    } finally {
      setReviewingQueueIds((prev) => {
        const copy = { ...prev }
        delete copy[itemId]
        return copy
      })
    }
  }

  // Handles handleViewQuiz logic.
  const handleViewQuiz = (quiz) => {
    // Store quiz data in sessionStorage to pass to detail page
    sessionStorage.setItem(`quiz_${quiz.id}`, JSON.stringify(quiz))
    navigate(`/quiz/${quiz.id}`)
  }

  // Calculate topics mastered (100% score = fully mastered)
  const calculateTopicsMastered = () => {
    const topicScores = {}
    quizzes.forEach((quiz) => {
      const quizTitle = quiz.title || 'Unknown Topic'
      const correctCount = Array.isArray(quiz.quiz) ? quiz.quiz.filter(q => q.isCorrect).length : 0
      const totalCount = Array.isArray(quiz.quiz) ? quiz.quiz.length : 0
      const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
      if (!topicScores[quizTitle] || topicScores[quizTitle] < score) {
        topicScores[quizTitle] = score
      }
    })
    const masteredCount = Object.values(topicScores).filter(score => score === 100).length
    const totalTopics = Object.keys(topicScores).length
    return { masteredCount, totalTopics }
  }

  // Calculate current study streak (consecutive days with ≥1 quiz)
  const calculateStreak = () => {
    if (!quizzes.length) return 0

    // Handles toLocalDayKey logic.
    const toLocalDayKey = (value) => {
      const d = new Date(value)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    const quizDays = new Set(
      quizzes.map(q => toLocalDayKey(q.created_at))
    )
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = toLocalDayKey(today)
    const checkDate = new Date(today)
    // If no quiz today, start checking from yesterday
    if (!quizDays.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1)
    }
    let streak = 0
    while (quizDays.has(toLocalDayKey(checkDate))) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    }
    return streak
  }

  // Calculate average score across all quizzes
  const calculateAverageScore = () => {
    if (!quizzes.length) return 0
    const scores = quizzes.map(q => {
      const correct = Array.isArray(q.quiz) ? q.quiz.filter(x => x.isCorrect).length : 0
      const total = Array.isArray(q.quiz) ? q.quiz.length : 0
      return total > 0 ? Math.round((correct / total) * 100) : 0
    })
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }

  const { masteredCount, totalTopics } = calculateTopicsMastered()
  const streak = calculateStreak()
  const averageScore = calculateAverageScore()
  const isLoadingQuizData = loading && quizzes.length === 0
  const solidCardBg = 'color-mix(in srgb, var(--background) 90%, var(--foreground) 10%)'
  const quotas = Array.isArray(tierStatus?.quotas) ? tierStatus.quotas : []
  const isUnlimited = Boolean(tierStatus?.isUnlimited)


  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
            Please log in
          </h1>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 rounded-lg transition-all hover:scale-105 font-medium"
            style={{ 
              background: 'var(--primary)',
              color: 'var(--primary-foreground)'
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        backgroundColor: '#1e1c30',
        titleColor: '#ede8d8',
        bodyColor: '#9090b0',
        borderColor: '#3a3858',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: function(context) {
            const v = context.parsed.y;
            return v === 1 ? '1 quiz' : v + ' quizzes';
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#9090b0',
          font: { size: 12 },
          stepSize: 1,
          precision: 0
        },
        grid: { 
          color: '#2d2b42',
          drawBorder: false
        },
        border: { display: false }
      },
      x: {
        grid: { display: false },
        ticks: { 
          color: '#9090b0',
          font: { size: 12 }
        },
        border: { display: false }
      }
    },
    elements: {
      line: { tension: 0.4 }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  };

  // Build last-6-weeks quiz count
  const buildWeeklyData = () => {
    const weeks = Array.from({ length: 6 }, (_, i) => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      // week 0 = current week (Mon-based), week 1 = last week, etc.
      const dayOfWeek = (start.getDay() + 6) % 7; // Mon=0 … Sun=6
      start.setDate(start.getDate() - dayOfWeek - (5 - i) * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { start, end };
    });

    const counts = weeks.map(({ start, end }) =>
      quizzes.filter(q => {
        const d = new Date(q.created_at);
        return d >= start && d < end;
      }).length
    );

    const labels = weeks.map(({ start }) =>
      start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );

    return { labels, counts };
  };

  const { labels: chartLabels, counts: chartCounts } = buildWeeklyData();

  const renderRecentQuizSkeletonRows = () => (
    <div className="overflow-auto max-h-64" aria-hidden>
      <table className="w-full text-left border-collapse text-xs">
        <thead className="bg-[var(--muted)] text-[var(--muted-foreground)] uppercase tracking-wider sticky top-0">
          <tr>
            <th className="px-3 py-2 font-semibold">Title</th>
            <th className="px-3 py-2 font-semibold">Date</th>
            <th className="px-3 py-2 font-semibold text-center">Score</th>
            <th className="px-3 py-2 font-semibold text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {Array.from({ length: 8 }).map((_, index) => (
            <tr key={`quiz-skeleton-${index}`}>
              <td className="px-3 py-2"><Skeleton style={{ height: '0.8rem', width: `${90 - index * 4}%` }} /></td>
              <td className="px-3 py-2"><Skeleton style={{ height: '0.8rem', width: '65%' }} /></td>
              <td className="px-3 py-2">
                <div className="flex justify-center">
                  <Skeleton rounded="999px" style={{ height: '1.25rem', width: '3.4rem' }} />
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="flex justify-end">
                  <Skeleton rounded="0.4rem" style={{ height: '1.5rem', width: '2.9rem' }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderSuggestionSkeleton = () => (
    <div className="rounded-xl p-4 border h-full overflow-auto" style={{ background: 'color-mix(in srgb, var(--primary) 8%, var(--card))', borderColor: 'var(--primary)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)' }} aria-hidden>
      <div className="flex items-center gap-2 mb-3">
        <Skeleton rounded="999px" style={{ width: '1.9rem', height: '1.9rem' }} />
        <Skeleton style={{ height: '0.9rem', width: '8.8rem' }} />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`dashboard-suggestion-skeleton-${index}`} className="border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
            <Skeleton style={{ height: '0.82rem', width: `${88 - index * 8}%` }} />
            <Skeleton className="mt-2" style={{ height: '0.7rem', width: `${95 - index * 6}%` }} />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-3 mt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <Skeleton rounded="999px" style={{ height: '0.4rem', width: '100%' }} />
        <Skeleton style={{ height: '0.75rem', width: '2rem' }} />
      </div>
    </div>
  )

  const renderRepetitionSkeletonItems = () => (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={`repetition-skeleton-${index}`} className="rounded-lg border p-2" style={{ borderColor: 'var(--border)' }}>
          <Skeleton style={{ height: '0.78rem', width: `${88 - index * 8}%` }} />
          <Skeleton className="mt-1.5" style={{ height: '0.78rem', width: `${70 - index * 7}%` }} />
          <div className="mt-2 flex justify-end">
            <Skeleton rounded="0.4rem" style={{ height: '1.5rem', width: '4.2rem' }} />
          </div>
        </div>
      ))}
    </div>
  )

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Quizzes',
        data: chartCounts,
        borderColor: '#c2844b',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(194, 132, 75, 0.35)');
          gradient.addColorStop(1, 'rgba(194, 132, 75, 0)');
          return gradient;
        },
        fill: true,
        pointBackgroundColor: '#d4a853',
        pointBorderColor: '#d4a853',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointHoverBorderWidth: 3,
        pointHoverBackgroundColor: '#d4a853'
      },
    ],
  };

  const suggestionAverageScore = Number.isFinite(Number(suggestions?.analysisData?.averageScore))
    ? Number(suggestions.analysisData.averageScore)
    : null;




  return (
    <main className="main-content min-h-screen xl:h-screen overflow-x-hidden relative flex flex-col" style={{ background: 'var(--background)', color: 'var(--foreground)', fontFamily: 'var(--font-sans)' }}>
      <DotGrid />

      <header
        className="relative z-20 backdrop-blur-lg border-b shrink-0"
        style={{
          background: 'color-mix(in srgb, var(--background) 84%, transparent)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4 max-w-7xl mx-auto">
          <Reveal>
            <div>
              <h1 className="text-2xl font-bold mb-0.5" style={{ color: 'var(--foreground)' }}>
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Your'} Dashboard
              </h1>
              <p className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                One-screen command center
              </p>
            </div>
          </Reveal>

          <div className="flex items-center space-x-3">
            <Link
              to="/Learningpage"
              className="inline-flex items-center gap-2 px-4 py-2 font-mono font-bold text-[12px] transition-all duration-200 uppercase tracking-widest rounded-lg"
              style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', textDecoration: 'none', border: '1px solid var(--primary)' }}
            >
              <span>+</span> New Session
            </Link>
            <button
              className="p-2 rounded-full relative transition-all border"
              style={{ background: 'var(--accent)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              <Bell size={16} />
            </button>
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-base border-2 transition-all cursor-pointer"
              style={{
                background: 'var(--accent)',
                color: 'var(--foreground)',
                borderColor: 'var(--primary)'
              }}
            >
              <Link to="/Profile">{user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}</Link>
            </div>
          </div>
        </div>
      </header>

      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-3 max-w-7xl mx-auto w-full flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-12 gap-4">
          <Reveal delay={0.05} className="col-span-12 md:col-span-4 xl:col-span-3">
            <div className="rounded-xl p-4 border h-full" style={{ background: solidCardBg, borderColor: 'var(--border)', boxShadow: 'var(--shadow)', borderLeft: '4px solid var(--chart-5)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>Study Streak</p>
              {isLoadingQuizData ? (
                <div className="mt-2 space-y-2" aria-hidden>
                  <Skeleton style={{ height: '2rem', width: '55%' }} />
                  <Skeleton style={{ height: '0.9rem', width: '70%' }} />
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold mt-2" style={{ color: 'var(--card-foreground)' }}>{streak} {streak === 1 ? 'Day' : 'Days'}</p>
                  <p className="text-sm mt-2 font-medium" style={{ color: 'var(--chart-4)' }}>
                    {streak === 0 ? 'Start your streak today!' : streak >= 7 ? 'On fire!' : 'Keep it up!'}
                  </p>
                </>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.08} className="col-span-12 md:col-span-4 xl:col-span-3">
            <div className="rounded-xl p-4 border h-full" style={{ background: solidCardBg, borderColor: 'var(--border)', boxShadow: 'var(--shadow)', borderLeft: '4px solid var(--chart-4)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>Topics Mastered</p>
              {isLoadingQuizData ? (
                <div className="mt-2 space-y-2" aria-hidden>
                  <Skeleton style={{ height: '2rem', width: '58%' }} />
                  <Skeleton style={{ height: '0.75rem', width: '50%' }} />
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold mt-2" style={{ color: 'var(--card-foreground)' }}>
                    {masteredCount}<span className="text-lg" style={{ color: 'var(--muted-foreground)' }}>/{totalTopics}</span>
                  </p>
                  <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>100% score required</p>
                </>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.1} className="col-span-12 md:col-span-4 xl:col-span-3">
            <div className="rounded-xl p-4 border h-full" style={{ background: solidCardBg, borderColor: 'var(--border)', boxShadow: 'var(--shadow)', borderLeft: '4px solid var(--chart-2)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>Average Score</p>
              {isLoadingQuizData ? (
                <div className="mt-3 space-y-3" aria-hidden>
                  <Skeleton style={{ height: '1.9rem', width: '42%' }} />
                  <Skeleton rounded="999px" style={{ height: '0.5rem', width: '100%' }} />
                </div>
              ) : quizzes.length === 0 ? (
                <p className="text-sm mt-3" style={{ color: 'var(--muted-foreground)' }}>No quizzes yet</p>
              ) : (
                <>
                  <p className="text-3xl font-bold mt-2" style={{ color: 'var(--card-foreground)' }}>{averageScore}%</p>
                  <div className="relative h-2 rounded-full overflow-hidden mt-3" style={{ background: 'var(--muted)' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${averageScore}%`, background: averageScore >= 80 ? 'var(--chart-4)' : averageScore >= 60 ? '#d4a853' : 'var(--chart-3)' }} />
                  </div>
                </>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.12} className="col-span-12 xl:col-span-3">
            <div className="rounded-xl p-4 border h-full overflow-auto" style={{ background: solidCardBg, borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Free Tier</h2>
                {isUnlimited && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--chart-2)', color: 'var(--primary-foreground)' }}>
                    Unlimited
                  </span>
                )}
              </div>
              {isLoadingTierStatus ? (
                <div className="space-y-2" aria-hidden>
                  <Skeleton style={{ height: '2rem', width: '100%' }} rounded="0.65rem" />
                  <Skeleton style={{ height: '2rem', width: '100%' }} rounded="0.65rem" />
                </div>
              ) : quotas.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>No quota data yet.</p>
              ) : (
                <div className="space-y-2">
                  {quotas.map((quota) => {
                    const label = quota.actionType === 'learning_tool_generate' ? 'Tools' : 'Study Sessions'
                    return (
                      <div key={quota.actionType} className="rounded-lg border p-2" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold">{label}</p>
                          <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>{quota.used}/{quota.limit}</p>
                        </div>
                        <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>{quota.remaining} left today</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.15} className="col-span-12 xl:col-span-5">
            <div className="rounded-xl p-4 border" style={{ background: solidCardBg, borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}>
              <h2 className="text-sm font-bold mb-2" style={{ color: 'var(--foreground)' }}>Quizzes per Week</h2>
              {isLoadingQuizData ? (
                <div className="relative h-52 w-full" aria-hidden>
                  <Skeleton rounded="0.75rem" style={{ height: '100%', width: '100%' }} />
                </div>
              ) : quizzes.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>No quiz data yet. Start a study session to see your trend.</p>
              ) : (
                <div className="relative h-52 w-full">
                  <Line options={chartOptions} data={chartData} />
                </div>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.2} className="col-span-12 xl:col-span-4">
            <div className="rounded-xl border overflow-hidden" style={{ background: solidCardBg, borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}>
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <h2 className="text-sm font-bold text-[var(--foreground)]">Recent Quizzes</h2>
              </div>
              {loading && renderRecentQuizSkeletonRows()}
              {error && <p className="text-red-500 px-4 py-3 text-sm">Error: {error}</p>}
              {!loading && (!quizzes || quizzes.length === 0) && (
                <p className="text-[var(--muted-foreground)] px-4 py-3 text-xs">No quizzes yet</p>
              )}
              {!loading && quizzes.length > 0 && (
                <div className="overflow-auto max-h-64">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-[var(--muted)] text-[var(--muted-foreground)] uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Title</th>
                        <th className="px-3 py-2 font-semibold">Date</th>
                        <th className="px-3 py-2 font-semibold text-center">Score</th>
                        <th className="px-3 py-2 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {quizzes.slice(0, 8).map((quiz) => {
                        const correctCount = Array.isArray(quiz.quiz) ? quiz.quiz.filter(q => q.isCorrect).length : 0
                        const totalCount = Array.isArray(quiz.quiz) ? quiz.quiz.length : 0
                        const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0

                        return (
                          <tr key={quiz.id} className="hover:bg-[var(--muted)]/50 transition-colors">
                            <td className="px-3 py-2"><span className="font-medium text-[var(--foreground)] line-clamp-1">{quiz.title}</span></td>
                            <td className="px-3 py-2 text-[var(--muted-foreground)]">{new Date(quiz.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${score >= 80 ? 'bg-green-500/20 text-green-500' : score >= 60 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-red-500/20 text-red-500'}`}>
                                {score}%
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button onClick={() => handleViewQuiz(quiz)} className="text-[10px] px-2 py-1 rounded-md font-medium transition-all" style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>View</button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Reveal>

          <div className="col-span-12 xl:col-span-3 grid gap-4 min-h-0 xl:grid-rows-[auto_minmax(0,1fr)]">
            <Reveal delay={0.22} className="min-h-0">
              <div className="rounded-xl p-4 border h-fit max-h-full overflow-auto" style={{ background: solidCardBg, borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}>
                <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--foreground)' }}>Spaced Repetition</h2>
                {isLoadingRepetition ? (
                  renderRepetitionSkeletonItems()
                ) : dueRepetitionItems.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>No items due now.</p>
                ) : (
                  <div className="space-y-2">
                    {dueRepetitionItems.map((item) => (
                      <div key={item.id} className="rounded-lg border p-2" style={{ borderColor: 'var(--border)' }}>
                        <p className="text-xs font-semibold line-clamp-2">{item.topic_label}</p>
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => handleMarkReviewed(item.id)}
                            disabled={Boolean(reviewingQueueIds[item.id])}
                            className="text-[10px] px-2 py-1 rounded-md font-medium"
                            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', opacity: reviewingQueueIds[item.id] ? 0.7 : 1 }}
                          >
                            {reviewingQueueIds[item.id] ? 'Saving...' : 'Reviewed'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Reveal>

            <Reveal delay={0.24} className="min-h-0">
              {suggestions?.suggestions?.urgentAreas?.[0] ? (
                <div className="rounded-xl p-4 border h-full overflow-auto" style={{ background: 'color-mix(in srgb, var(--primary) 8%, var(--card))', borderColor: 'var(--primary)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)' }}>
                  <h3 className="text-sm font-bold uppercase tracking-wider opacity-90 flex items-center gap-2 mb-3"><Vela size={30} /> Vela Suggestions</h3>
                  <div className="space-y-3">
                    {[0, 1, 2].map((index) => {
                      const topicName = suggestions.analysisData.lowestScoringAreas[index]
                      const urgentArea = suggestions.suggestions.urgentAreas[index]
                      const studyAction = suggestions.suggestions.studyPlan[index]
                      return (
                        <div key={index} className="border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
                          <p className="font-bold mb-1 text-xs">{index + 1}. {topicName || urgentArea || 'General Review'}</p>
                          <p className="text-[11px] opacity-80 italic leading-relaxed">{studyAction || 'Review fundamentals and practice problems'}</p>
                        </div>
                      )
                    })}
                  </div>
                  {suggestionAverageScore !== null && (
                    <div className="flex items-center gap-2 pt-3 mt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--muted)' }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, suggestionAverageScore))}%`, background: 'var(--primary)' }} />
                      </div>
                      <span className="text-[11px] font-semibold">{Math.round(suggestionAverageScore)}%</span>
                    </div>
                  )}
                </div>
              ) : suggestions?.message ? (
                <div className="rounded-xl p-4 border h-full" style={{ background: solidCardBg, borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-2 mb-3"><Vela size={30} /><h3 className="text-sm font-bold uppercase tracking-wider">Vela Suggestions</h3></div>
                  <p className="text-xs text-[var(--muted-foreground)] italic">{suggestions.message}</p>
                </div>
              ) : isLoadingSuggestions || !suggestions ? (
                <div className="h-full">{renderSuggestionSkeleton()}</div>
              ) : (
                <div className="rounded-xl p-4 border h-full" style={{ background: solidCardBg, borderColor: 'var(--border)' }}>
                  <p className="text-xs">Loading suggestions...</p>
                </div>
              )}
            </Reveal>
          </div>
        </div>
      </section>
    </main>
  );
}
