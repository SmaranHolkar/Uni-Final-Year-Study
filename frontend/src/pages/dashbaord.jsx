import React, { useState, useEffect, useMemo } from 'react';
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
import {
  Flame,
  Award,
  Target,
  Sparkles,
  ArrowUpRight,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  BookOpen,
  Calendar,
  Layers
} from 'lucide-react';
import Vela from '../components/Vela.jsx';
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
    // Ignore storage write failures
  }
};

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
    if (!user?.id || !session?.access_token) return;

    const cacheKey = getSuggestionsCacheKey(user.id);
    const cachedSuggestions = readSuggestionsCache(cacheKey);
    const cacheIsFresh = Boolean(
      cachedSuggestions && Date.now() - cachedSuggestions.fetchedAt < SUGGESTIONS_CACHE_TTL_MS
    );

    if (cachedSuggestions?.data) {
      setSuggestions(cachedSuggestions.data);
    }

    const fetchQuizHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_BASE}/api/quiz-history`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch quiz history');
        }

        const data = await response.json();
        setQuizzes(data.data || []);
      } catch (err) {
        console.error('Error fetching quiz history:', err);
        setError('Unable to load quiz history.');
      } finally {
        setLoading(false);
      }
    };

    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true);
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await fetch(`${API_BASE}/api/suggestions`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          credentials: 'include',
        });

        if (!res.ok) {
          return;
        }

        const data = await res.json();
        setSuggestions(data);
        writeSuggestionsCache(cacheKey, data);
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    const fetchTierStatus = async () => {
      setIsLoadingTierStatus(true);
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_BASE}/api/tier-status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          credentials: 'include',
        });

        if (!response.ok) return;
        const data = await response.json();
        setTierStatus(data?.data || null);
      } catch {
        setTierStatus(null);
      } finally {
        setIsLoadingTierStatus(false);
      }
    };

    const fetchDueRepetition = async () => {
      setIsLoadingRepetition(true);
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_BASE}/api/spaced-repetition/due?limit=5`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          credentials: 'include',
        });

        if (!response.ok) return;
        const data = await response.json();
        setDueRepetitionItems(Array.isArray(data?.data) ? data.data : []);
      } catch {
        setDueRepetitionItems([]);
      } finally {
        setIsLoadingRepetition(false);
      }
    };

    fetchQuizHistory();
    fetchTierStatus();
    fetchDueRepetition();
    if (!cacheIsFresh) {
      fetchSuggestions();
    }
  }, [user?.id, session?.access_token]);

  const handleMarkReviewed = async (itemId) => {
    if (!session?.access_token || !itemId) return;
    setReviewingQueueIds((prev) => ({ ...prev, [itemId]: true }));

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_BASE}/api/spaced-repetition/${itemId}/reviewed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) return;
      setDueRepetitionItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch {
      // Keep UI stable
    } finally {
      setReviewingQueueIds((prev) => {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      });
    }
  };

  const handleViewQuiz = (quiz) => {
    sessionStorage.setItem(`quiz_${quiz.id}`, JSON.stringify(quiz));
    navigate(`/quiz/${quiz.id}`);
  };

  // Metric Computations
  const { masteredCount, totalTopics, masteryRate } = useMemo(() => {
    const topicScores = {};
    quizzes.forEach((quiz) => {
      const quizTitle = quiz.title || 'General Topic';
      const correctCount = Array.isArray(quiz.quiz) ? quiz.quiz.filter((q) => q.isCorrect).length : 0;
      const totalCount = Array.isArray(quiz.quiz) ? quiz.quiz.length : 0;
      const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
      if (!topicScores[quizTitle] || topicScores[quizTitle] < score) {
        topicScores[quizTitle] = score;
      }
    });
    const mastered = Object.values(topicScores).filter((score) => score === 100).length;
    const total = Object.keys(topicScores).length;
    const rate = total > 0 ? Math.round((mastered / total) * 100) : 0;
    return { masteredCount: mastered, totalTopics: total, masteryRate: rate };
  }, [quizzes]);

  const streak = useMemo(() => {
    if (!quizzes.length) return 0;
    const toLocalDayKey = (value) => {
      const d = new Date(value);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const quizDays = new Set(quizzes.map((q) => toLocalDayKey(q.created_at)));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toLocalDayKey(today);
    const checkDate = new Date(today);
    if (!quizDays.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    let currentStreak = 0;
    while (quizDays.has(toLocalDayKey(checkDate))) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return currentStreak;
  }, [quizzes]);

  const averageScore = useMemo(() => {
    if (!quizzes.length) return 0;
    const scores = quizzes.map((q) => {
      const correct = Array.isArray(q.quiz) ? q.quiz.filter((x) => x.isCorrect).length : 0;
      const total = Array.isArray(q.quiz) ? q.quiz.length : 0;
      return total > 0 ? Math.round((correct / total) * 100) : 0;
    });
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [quizzes]);

  const { chartLabels, chartCounts, totalWeeklyQuizzes } = useMemo(() => {
    const weeks = Array.from({ length: 6 }, (_, i) => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const dayOfWeek = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - dayOfWeek - (5 - i) * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { start, end };
    });

    const counts = weeks.map(
      ({ start, end }) =>
        quizzes.filter((q) => {
          const d = new Date(q.created_at);
          return d >= start && d < end;
        }).length
    );

    const labels = weeks.map(({ start }) =>
      start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );

    const totalThisWeek = counts[counts.length - 1] || 0;
    return { chartLabels: labels, chartCounts: counts, totalWeeklyQuizzes: totalThisWeek };
  }, [quizzes]);

  const quotas = Array.isArray(tierStatus?.quotas) ? tierStatus.quotas : [];
  const isUnlimited = Boolean(tierStatus?.isUnlimited);

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Completed Quizzes',
        data: chartCounts,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#121214',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#18181b',
        titleColor: '#f0f0ee',
        bodyColor: '#a1a1a6',
        borderColor: '#2e2e33',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: (context) => `${context.parsed.y} quiz${context.parsed.y === 1 ? '' : 'zes'} completed`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#a1a1a6',
          font: { size: 11, family: 'monospace' },
          stepSize: 1,
          precision: 0,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: {
          color: '#a1a1a6',
          font: { size: 11 },
        },
        border: { display: false },
      },
    },
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121214] text-[#f0f0ee]">
        <div className="card-standard p-8 text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-[#f0f0ee] mb-2">Session Required</h1>
          <p className="text-xs text-[#a1a1a6] mb-5">Please sign in to access your dashboard and study analytics.</p>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary w-full"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="main-content sidebar-page-shell min-h-screen lg:h-screen bg-[#121214] text-[#f0f0ee] flex flex-col font-sans overflow-y-auto lg:overflow-hidden select-none">
      {/* ── TOP APP HEADER ── */}
      <header className="shrink-0 h-16 border-b border-[#2e2e33] bg-[#121214]/90 backdrop-blur-md pl-14 sm:pl-16 md:px-6 px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[10px] bg-[#18181b] border border-[#2e2e33] flex items-center justify-center text-[#f0f0ee]">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-semibold text-[#f0f0ee] tracking-tight">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}’s Dashboard
              </h1>
              <span className="badge-standard hidden sm:inline-block">
                Active
              </span>
            </div>
            <p className="text-xs text-[#a1a1a6] hidden sm:block">Academic study performance &amp; cognitive diagnostics</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/Learningpage"
            id="btn-new-study-session"
            className="btn-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Session</span>
          </Link>

          <Link
            to="/Profile"
            className="w-8 h-8 rounded-full bg-[#18181b] hover:border-[#f0f0ee]/40 border border-[#2e2e33] text-[#f0f0ee] flex items-center justify-center text-xs font-medium transition-colors"
            title="Account Profile"
          >
            {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </Link>
        </div>
      </header>

      {/* ── MAIN ONE-PAGE CONTENT CONTAINER ── */}
      <div className="flex-1 p-4 sm:p-5 flex flex-col gap-4 min-h-0 max-w-[1600px] w-full mx-auto">
        {/* ── UNIFIED PERFORMANCE METRIC STRIP (Consolidated, Zero Box Clutter) ── */}
        <div className="shrink-0 bg-[#18181b] border border-[#2e2e33] rounded-xl p-3 sm:px-6 sm:py-4 grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-0 lg:divide-x divide-[#2e2e33]/70">
          {/* Metric 1: Streak (Yellow) */}
          <div className="flex items-center gap-3.5 lg:pr-6">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Flame className={`w-5 h-5 ${streak > 0 ? 'text-amber-400 fill-amber-400/20' : 'text-[#a1a1aa]'}`} />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold text-amber-300 tracking-tight">{streak}</span>
                <span className="text-xs text-[#d4d4d8] font-medium">{streak === 1 ? 'day' : 'days'} streak</span>
              </div>
              <p className="text-xs text-[#a1a1aa]">
                {streak === 0 ? 'Study today to start' : streak >= 5 ? '★ Consistent habit' : 'Active habit'}
              </p>
            </div>
          </div>

          {/* Metric 2: Mastery (Green) */}
          <div className="flex items-center gap-3.5 lg:px-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold text-emerald-300 tracking-tight">{masteredCount}</span>
                <span className="text-xs text-[#d4d4d8] font-medium">/ {totalTopics} mastered</span>
              </div>
              <div className="w-full max-w-[120px] bg-[#121214] border border-[#2e2e33] h-2 rounded-full overflow-hidden mt-1.5">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, masteryRate)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Metric 3: Average Score (Semantic Green/Yellow/Red) */}
          <div className="flex items-center gap-3.5 lg:px-6">
            <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${
              averageScore >= 80 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              averageScore >= 60 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-semibold tracking-tight ${
                  averageScore >= 80 ? 'text-emerald-300' :
                  averageScore >= 60 ? 'text-amber-300' :
                  'text-red-300'
                }`}>
                  {quizzes.length > 0 ? `${averageScore}%` : '—'}
                </span>
                <span className="text-xs text-[#d4d4d8] font-medium">avg score</span>
              </div>
              <p className="text-xs text-[#a1a1aa]">
                {quizzes.length} assessment{quizzes.length === 1 ? '' : 's'} logged
              </p>
            </div>
          </div>

          {/* Metric 4: Allowance (Blue) */}
          <div className="flex items-center gap-3.5 lg:pl-6">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold text-blue-300 tracking-tight">
                  {isUnlimited ? '∞' : quotas[0] ? quotas[0].remaining : 'Active'}
                </span>
                <span className="text-xs text-[#d4d4d8] font-mono font-medium">
                  {isUnlimited ? 'unlimited' : quotas[0] ? `/ ${quotas[0].limit} left` : 'allowance'}
                </span>
              </div>
              <p className="text-xs text-[#a1a1aa]">Daily quota resets 00:00 UTC</p>
            </div>
          </div>
        </div>

        {/* ── ROW 2: 2 COHESIVE MAIN PANELS (Clean Structure, Zero Nested Box Noise) ── */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
          {/* ── LEFT MASTER PANEL: PROGRESS & RECENT ASSESSMENTS (7 Cols) ── */}
          <div className="lg:col-span-7 card-standard p-0 flex flex-col min-h-0 overflow-hidden">
            {/* Upper Stage: Velocity Chart */}
            <div className="p-4 sm:p-5 border-b border-[#2e2e33] flex flex-col shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-semibold text-[#f0f0ee]">Study Velocity</h2>
                  <span className="text-xs text-[#a1a1aa]">6-Week Activity Trend</span>
                </div>
                <span className="text-xs font-mono font-medium text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  {totalWeeklyQuizzes} quizzes this week
                </span>
              </div>

              <div className="h-[150px] w-full">
                {loading && quizzes.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <Skeleton style={{ height: '80%', width: '95%' }} />
                  </div>
                ) : quizzes.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-xs text-[#a1a1aa]">
                    <p>No study sessions recorded yet.</p>
                  </div>
                ) : (
                  <Line options={chartOptions} data={chartData} />
                )}
              </div>
            </div>

            {/* Lower Stage: Recent Quizzes Table */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#131519]/40">
              <div className="px-4 sm:px-5 py-3 border-b border-[#2e2e33] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#f0f0ee]">Recent Assessments</h3>
                </div>
                <span className="text-xs text-[#d4d4d8] font-mono font-medium">
                  {quizzes.length} total completed
                </span>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                {loading && quizzes.length === 0 ? (
                  <div className="p-4 space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} style={{ height: '2rem', width: '100%' }} rounded="6px" />
                    ))}
                  </div>
                ) : error ? (
                  <div className="p-4 text-xs sm:text-sm text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                ) : quizzes.length === 0 ? (
                  <div className="p-6 text-center text-xs sm:text-sm text-[#a1a1aa]">
                    <p>No assessment history available.</p>
                    <Link
                      to="/Learningpage"
                      className="mt-2 inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium text-xs hover:underline"
                    >
                      <span>Start a session now</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead className="bg-[#121214]/80 text-[#d4d4d8] sticky top-0 z-10 border-b border-[#2e2e33]">
                      <tr>
                        <th className="px-4 sm:px-5 py-2.5 font-semibold text-xs text-[#e4e4e7]">Topic / Title</th>
                        <th className="px-3 py-2.5 font-semibold text-xs text-[#e4e4e7] hidden sm:table-cell">Date</th>
                        <th className="px-3 py-2.5 font-semibold text-xs text-[#e4e4e7] text-center">Score</th>
                        <th className="px-4 sm:px-5 py-2.5 font-semibold text-xs text-[#e4e4e7] text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2e2e33]/50 text-[#f0f0ee]">
                      {quizzes.slice(0, 8).map((quiz) => {
                        const correctCount = Array.isArray(quiz.quiz) ? quiz.quiz.filter((q) => q.isCorrect).length : 0;
                        const totalCount = Array.isArray(quiz.quiz) ? quiz.quiz.length : 0;
                        const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

                        return (
                          <tr key={quiz.id} className="hover:bg-[#18181b] transition-colors">
                            <td className="px-4 sm:px-5 py-3">
                              <span className="font-medium text-[#f0f0ee] line-clamp-1 text-xs sm:text-sm">{quiz.title || 'Untitled Assessment'}</span>
                            </td>
                            <td className="px-3 py-3 text-[#d4d4d8] font-mono text-xs hidden sm:table-cell">
                              {new Date(quiz.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold ${
                                  score >= 80
                                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                    : score >= 60
                                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                    : 'bg-red-500/15 text-red-300 border border-red-500/30'
                                }`}
                              >
                                {score}%
                              </span>
                            </td>
                            <td className="px-4 sm:px-5 py-3 text-right">
                              <button
                                onClick={() => handleViewQuiz(quiz)}
                                className="btn-secondary px-3 py-1 text-xs font-medium hover:bg-[#282830]"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT MASTER PANEL: ACTIONABLE STUDY PRIORITIES (5 Cols) ── */}
          <div className="lg:col-span-5 card-standard p-0 flex flex-col min-h-0 overflow-hidden">
            {/* Header */}
            <div className="px-4 sm:px-5 py-3 border-b border-[#2e2e33] flex items-center justify-between shrink-0 bg-[#131519]/60">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-semibold text-[#f0f0ee]">Study Priorities &amp; Actions</h2>
              </div>
              <span className={`text-xs font-mono font-medium px-2.5 py-0.5 rounded-md border ${
                dueRepetitionItems.length > 0 ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}>
                {dueRepetitionItems.length} due
              </span>
            </div>

            <div className="flex-1 p-4 sm:p-5 overflow-y-auto min-h-0 space-y-5">
              {/* Section 1: Spaced Repetition Due Queue */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Interval Reviews Due</span>
                  </span>
                  <span className="text-xs text-[#a1a1aa]">Scheduled repetitions</span>
                </div>

                {isLoadingRepetition ? (
                  <div className="space-y-2">
                    <Skeleton style={{ height: '2.5rem', width: '100%' }} rounded="6px" />
                    <Skeleton style={{ height: '2.5rem', width: '100%' }} rounded="6px" />
                  </div>
                ) : dueRepetitionItems.length === 0 ? (
                  <div className="p-3.5 bg-[#131519] border border-[#2e2e33] rounded-lg text-center text-xs sm:text-sm text-[#d4d4d8] flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-emerald-300 font-medium">All spaced repetitions up to date</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dueRepetitionItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-[#131519] border border-amber-500/30 rounded-lg flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-[#f0f0ee] truncate">{item.topic_label || 'Study Item'}</p>
                          <p className="text-xs text-amber-300 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Interval review due</span>
                          </p>
                        </div>
                        <button
                          onClick={() => handleMarkReviewed(item.id)}
                          disabled={Boolean(reviewingQueueIds[item.id])}
                          className="btn-secondary px-3 py-1 text-xs font-medium shrink-0 border-amber-500/30 hover:bg-amber-500/10 text-amber-300"
                        >
                          {reviewingQueueIds[item.id] ? 'Saving...' : 'Mark Done'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: Vela Diagnostic Guidance */}
              <div className="pt-3 border-t border-[#2e2e33]">
                <div className="flex items-center gap-2 mb-2.5">
                  <Vela size={18} />
                  <span className="text-xs font-semibold text-blue-300">Vela Error Diagnostic Focus</span>
                </div>

                {isLoadingSuggestions ? (
                  <div className="space-y-2">
                    <Skeleton style={{ height: '1.4rem', width: '80%' }} rounded="6px" />
                    <Skeleton style={{ height: '2.8rem', width: '100%' }} rounded="6px" />
                  </div>
                ) : suggestions?.suggestions?.urgentAreas?.[0] ? (
                  <div className="space-y-2.5">
                    {[0, 1].map((index) => {
                      const topicName = suggestions.analysisData?.lowestScoringAreas?.[index];
                      const urgentArea = suggestions.suggestions.urgentAreas[index];
                      const studyAction = suggestions.suggestions.studyPlan[index];
                      if (!topicName && !urgentArea) return null;

                      const isSevere = index === 0;

                      return (
                        <div key={index} className={`p-3 bg-[#131519] border rounded-lg ${
                          isSevere ? 'border-red-500/30' : 'border-amber-500/30'
                        }`}>
                          <div className="text-xs sm:text-sm font-medium text-[#f0f0ee] flex items-center justify-between gap-2">
                            <span className="truncate font-semibold">{topicName || urgentArea}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium shrink-0 border ${
                              isSevere ? 'bg-red-500/10 text-red-300 border-red-500/30' : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            }`}>
                              {isSevere ? 'Priority 1' : 'Priority 2'}
                            </span>
                          </div>
                          {studyAction && (
                            <p className="text-xs text-[#d4d4d8] mt-1.5 leading-relaxed line-clamp-2">
                              {studyAction}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3.5 bg-[#131519] border border-[#2e2e33] rounded-lg text-center text-xs sm:text-sm text-[#d4d4d8]">
                    <p className="text-emerald-300 font-medium">✓ No critical error clusters detected</p>
                    <p className="text-xs mt-0.5 text-[#a1a1aa]">Take more quizzes to build longitudinal profile.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

