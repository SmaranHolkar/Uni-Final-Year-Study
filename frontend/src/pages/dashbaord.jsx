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
import { Compass } from 'lucide-react';
import Vela from '../components/Vela.jsx';

export default function Dashboard() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(2);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState(null);

useEffect(() => {
    if (!user?.id || !session?.access_token) return
    
    const fetchQuizHistory = async () => {
      setLoading(true)
      setError(null)
      try {
        const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000"
        
        const response = await fetch(`${API_BASE}/api/quiz-history?token=${encodeURIComponent(session.access_token)}`, {
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
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    const fetchSuggestions = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const res = await fetch(`${API_BASE}/api/suggestions?token=${encodeURIComponent(session.access_token)}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          credentials: 'include'
        });
        
        if (!res.ok) {
          console.warn(`Suggestions API returned ${res.status}:`, await res.text());
          return;
        }
        
        const data = await res.json();
        console.log('Suggestions fetched:', data);
        setSuggestions(data);
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
      }
    };
    
    fetchQuizHistory();
    fetchSuggestions();
  }, [user?.id, session?.access_token])

  const handleViewQuiz = (quiz) => {
    // Store quiz data in sessionStorage to pass to detail page
    sessionStorage.setItem(`quiz_${quiz.id}`, JSON.stringify(quiz))
    navigate(`/quiz/${quiz.id}`)
  }

  // Calculate topics mastered (>= 80% score)
  const calculateTopicsMastered = () => {
    const topicScores = {}
    
    quizzes.forEach((quiz) => {
      const quizTitle = quiz.title || 'Unknown Topic'
      const correctCount = Array.isArray(quiz.quiz) ? quiz.quiz.filter(q => q.isCorrect).length : 0
      const totalCount = Array.isArray(quiz.quiz) ? quiz.quiz.length : 0
      const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
      
      // Track best score for each topic
      if (!topicScores[quizTitle] || topicScores[quizTitle] < score) {
        topicScores[quizTitle] = score
      }
    })
    
    // Count topics with 80%+ mastery
    const masteredCount = Object.values(topicScores).filter(score => score >= 80).length
    const totalTopics = Object.keys(topicScores).length
    
    return { masteredCount, totalTopics }
  }

  const { masteredCount, totalTopics } = calculateTopicsMastered()
  const weeklyGoal = 3 // For future pro feature
  const weeklyProgress = Math.min((masteredCount % weeklyGoal) / weeklyGoal * 100, 100)

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);


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
        backgroundColor: 'var(--popover)',
        titleColor: 'var(--popover-foreground)',
        bodyColor: 'var(--muted-foreground)',
        borderColor: 'var(--border)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: function(context) {
            return 'Grade: ' + context.parsed.y + '%';
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { 
          color: 'var(--border)',
          drawBorder: false
        },
        ticks: { 
          color: 'var(--muted-foreground)',
          font: { family: 'var(--font-sans)' }
        },
        border: { display: false }
      },
      x: {
        grid: { display: false },
        ticks: { 
          color: 'var(--muted-foreground)',
          font: { family: 'var(--font-sans)' }
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

  const chartData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
    datasets: [
      {
        label: 'Average Grade',
        data: [65, 72, 70, 81, 86, 95],
        borderColor: 'var(--chart-5)',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(229, 91, 135, 0.3)');
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          return gradient;
        },
        fill: true,
        pointBackgroundColor: 'var(--primary)',
        pointBorderColor: 'var(--primary)',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointHoverBorderWidth: 3,
        pointHoverBackgroundColor: 'var(--primary)'
      },
    ],
  };


  return (
    <main className="main-content min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)', fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <header 
        className="sticky top-0 z-20 backdrop-blur-lg border-b"
        style={{ 
          background: 'color-mix(in srgb, var(--background) 80%, transparent)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div className="px-8 sm:px-10 lg:px-12 py-6 flex flex-wrap gap-4 justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Your'} Dashboard
            </h1>
            <p className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
              Welcome back, let's keep up the momentum! 
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90 flex items-center gap-2"
              style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              <span>+</span><Link to="/Learningpage">New Session</Link>
            </button>
            <button 
              className="p-2 rounded-full relative transition-all border"
              style={{ background: 'var(--accent)', borderColor: 'var(--border)' }}
              onClick={() => setNotifications(0)}
            >
              
            </button>
            <div 
              className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg border-2 transition-all cursor-pointer"
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

      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full">

        {/* Cards Section - 3 cards in a row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {/* Study Streak Card */}
          <div
            className="rounded-xl p-6 border transition-all cursor-pointer hover:-translate-y-1"
            style={{
              background: 'var(--card)',
              borderColor: 'var(--border)',
              boxShadow: 'var(--shadow)',
              borderLeft: `4px solid var(--chart-5)`
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
                  Study Streak
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: 'var(--card-foreground)' }}>
                  5 Days
                </p>
                <p className="text-sm mt-2 font-medium" style={{ color: 'var(--chart-4)' }}>
                  ↗ Personal best!
                </p>
              </div>
              <div className="text-4xl opacity-20">🔥</div>
            </div>
          </div>

          {/* Topics Mastered Card */}
          <div
            className="rounded-xl p-6 border transition-all cursor-pointer hover:-translate-y-1"
            style={{
              background: 'var(--card)',
              borderColor: 'var(--border)',
              boxShadow: 'var(--shadow)',
              borderLeft: `4px solid var(--chart-4)`
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
                  Topics Mastered
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: 'var(--card-foreground)' }}>
                  {masteredCount}<span className="text-lg text-[var(--muted-foreground)])">/{totalTopics}</span>
                </p>
              </div>
              <div className="text-4xl opacity-20">🎯</div>
            </div>
          </div>

          {/* Weekly Goal Card */}
          <div
            className="rounded-xl p-6 border transition-all cursor-pointer hover:-translate-y-1"
            style={{
              background: 'var(--card)',
              borderColor: 'var(--border)',
              boxShadow: 'var(--shadow)',
              borderLeft: `4px solid var(--chart-2)`
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--muted-foreground)' }}>
              Weekly Goal
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs" style={{ color: 'var(--muted-foreground)' }}>
                <span>Progress</span>
                <span className="font-semibold">{masteredCount % weeklyGoal}/{weeklyGoal}</span>
              </div>
              <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${weeklyProgress}%`,
                    background: 'var(--chart-4)'
                  }}
                ></div>
              </div>
              <p className="text-xs font-medium" style={{ color: 'var(--chart-4)' }}>
                {masteredCount >= weeklyGoal ? 'Goal reached!' : `${weeklyGoal - (masteredCount % weeklyGoal)} more to go!`}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Grid - Left: Progress + Quiz History stacked, Right: Suggestions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left Column - Progress Chart and Quiz History stacked */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Chart */}
            <div 
              className="rounded-xl p-6 border"
              style={{ background: 'var(--card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
            >
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--foreground)' }}>Progress</h2>
              <div className="relative h-48 w-full">
                <Line options={chartOptions} data={chartData} />
              </div>
            </div>

            {/* Quiz History */}
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden" style={{ boxShadow: 'var(--shadow)' }}>
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-lg font-bold text-[var(--foreground)]">Recent Quizzes</h2>
            </div>
            {loading && <p className="text-[var(--muted-foreground)] px-6 py-4">Loading...</p>}
            {error && <p className="text-red-500 px-6 py-4">Error: {error}</p>}
            {!loading && (!quizzes || quizzes.length === 0) && (
              <p className="text-[var(--muted-foreground)] px-6 py-4">No quizzes yet</p>
            )}
            {!loading && quizzes.length > 0 && (
              <div className="overflow-auto max-h-[300px]">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-[var(--muted)] text-[var(--muted-foreground)] text-xs uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Title</th>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold text-center">Score</th>
                      <th className="px-4 py-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {quizzes.slice(0, 5).map((quiz) => {
                      const correctCount = Array.isArray(quiz.quiz) ? quiz.quiz.filter(q => q.isCorrect).length : 0;
                      const totalCount = Array.isArray(quiz.quiz) ? quiz.quiz.length : 0;
                      const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
                      
                      return (
                        <tr key={quiz.id} className="hover:bg-[var(--muted)]/50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-medium text-[var(--foreground)] line-clamp-1">{quiz.title}</span>
                          </td>
                          <td className="px-4 py-3 text-[var(--muted-foreground)] text-xs">
                            {new Date(quiz.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              score >= 80 ? 'bg-green-500/20 text-green-500' : 
                              score >= 60 ? 'bg-yellow-500/20 text-yellow-500' : 
                              'bg-red-500/20 text-red-500'
                            }`}>
                              {score}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button 
                              onClick={() => handleViewQuiz(quiz)}
                              className="text-xs px-3 py-1 rounded-lg font-medium transition-all hover:scale-105"
                              style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </div>

          {/* Right Column - Learning Suggestions */}
          {suggestions?.suggestions?.urgentAreas?.[0] ? (
            <div className="rounded-xl p-6 border h-fit"
              style={{ background: `var(--primary)`, color: 'var(--background)', borderColor: 'var(--border)' }}
            >
                <div className="flex items-center gap-3 mb-4">
                  <div>
                    <h3 className="text-lg font-bold uppercase tracking-wider opacity-90">
                     <Vela /> Vela's Suggestions
                    </h3>
                </div>
            </div>
              
              {/* Top 3 Suggestions List with Descriptions */}
              <div className="space-y-4 mb-4">
                {[0, 1, 2].map((index) => {
                  const topicName = suggestions.analysisData.lowestScoringAreas[index];
                  const urgentArea = suggestions.suggestions.urgentAreas[index];
                  const studyAction = suggestions.suggestions.studyPlan[index];
                  
                  return (
                    <div key={index} className="opacity-90 border-b border-white/20 pb-3 last:border-0 last:pb-0">
                      <p className="font-bold mb-2 text-sm">
                        {index + 1}. {topicName || urgentArea || 'General Review'}
                      </p>
                      <p className="text-xs opacity-80 italic leading-relaxed">
                        {studyAction || 'Review fundamentals and practice problems'}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Score Progress Bar */}
              <div className="flex items-center gap-3 pt-3 border-t border-white/20">
                <div className="flex-1 h-2 bg-white/20 rounded-full">
                  <div className="h-full bg-white/80 rounded-full" 
                    style={{ width: `${suggestions.analysisData.averageScore}%` }}></div>
                </div>
                <span className="text-sm font-bold">{suggestions.analysisData.averageScore}%</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl p-6 border bg-gray-100 border-gray-300 opacity-50 h-fit" style={{ color: 'var(--foreground)' }}>
              <p className="text-sm">Loading suggestions...</p>
            </div>
          )}
        </div>
      </div>
      
    </main>
  );
}