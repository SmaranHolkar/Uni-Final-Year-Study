import { useState, useEffect } from 'react';
import { Brain, TrendingUp, Target, Lightbulb, MessageCircle, Award, AlertTriangle, Activity, BarChart3, PieChart, Zap, PlayCircle } from 'lucide-react';
import Vela from './Vela';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Doughnut, Bar, Radar, Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler
);

const ANALYSIS_CACHE_TTL_MS = 60 * 60 * 1000;

const getAnalysisCacheKey = (userId, quizId) => `metacognitive_analysis_${userId}_${quizId}`;

const readAnalysisCache = (cacheKey) => {
  try {
    const raw = sessionStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.analysis || typeof parsed.fetchedAt !== 'number') {
      sessionStorage.removeItem(cacheKey);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(cacheKey);
    return null;
  }
};

const writeAnalysisCache = (cacheKey, analysis) => {
  try {
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({
        analysis,
        fetchedAt: Date.now(),
      })
    );
  } catch {
    // Ignore storage write failures.
  }
};

// Handles MetacognitiveAnalysis logic.
export default function MetacognitiveAnalysis({ quizId }) {
  const { user, session } = useAuth();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Handles fetchAnalysis logic.
    const fetchAnalysis = async () => {
      if (!quizId || !session?.access_token) return;

      const cacheKey = getAnalysisCacheKey(user?.id || 'anonymous', quizId);
      const cached = readAnalysisCache(cacheKey);
      const cacheIsFresh = Boolean(cached && Date.now() - cached.fetchedAt < ANALYSIS_CACHE_TTL_MS);

      if (cached?.analysis) {
        setAnalysis(cached.analysis);
        setLoading(false);
      }

      if (cacheIsFresh) {
        setError(null);
        return;
      }

      if (!cached?.analysis) {
        setLoading(true);
      }
      setError(null);

      try {
        const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const response = await fetch(
          `${API_BASE}/api/metacognitive-analysis/${quizId}?token=${encodeURIComponent(session.access_token)}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            credentials: 'include'
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch metacognitive analysis');
        }

        const data = await response.json();
        console.log('Metacognitive analysis data:', data.analysis);
        setAnalysis(data.analysis);
        writeAnalysisCache(cacheKey, data.analysis);
      } catch (err) {
        console.error('Error fetching metacognitive analysis:', err);
        setError("Unable to load learning insights. Please try again");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [quizId, session?.access_token, user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
          <p className="text-[var(--muted-foreground)]">Generating your learning insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--destructive)]/10 border border-[var(--destructive)] rounded-lg p-6">
        <p className="text-[var(--destructive)] font-medium">Error loading analysis: {error}</p>
        <p className="text-sm text-[var(--muted-foreground)] mt-2">
          Please try refreshing the page or contact support if the problem persists.
        </p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-[var(--muted)] rounded-lg p-6 text-center">
        <p className="text-[var(--muted-foreground)]">No analysis available for this quiz.</p>
      </div>
    );
  }

  // Handles getConfidenceColor logic.
  const getConfidenceColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'high':
        return 'text-[var(--chart-2)] bg-[var(--chart-2)]/10';
      case 'medium':
        return 'text-[var(--chart-3)] bg-[var(--chart-3)]/10';
      case 'low':
        return 'text-[var(--chart-5)] bg-[var(--chart-5)]/10';
      default:
        return 'text-[var(--muted-foreground)] bg-[var(--muted)]';
    }
  };

  // Handles getScoreColor logic.
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-[var(--chart-2)]';
    if (score >= 60) return 'text-[var(--chart-3)]';
    return 'text-[var(--chart-5)]';
  };

  console.log('Rendering with analysis:', analysis);

  return (
    <div className="space-y-6">
      
      {/* Header with Score Overview */}
      <div className="bg-gradient-to-r from-[var(--primary)]/10 to-[var(--accent)] rounded-xl p-6 border border-[var(--border)]">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Vela size={48} />
              <h2 className="text-2xl font-bold text-[var(--foreground)]">
                Vela's Mind's Mirror
              </h2>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              Understanding your learning process helps you learn better
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-[var(--muted-foreground)]">Your Score</p>
            <p className={`text-4xl font-bold ${getScoreColor(analysis.scorePercentage)}`}>
              {analysis.scorePercentage}%
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {analysis.correctCount}/{analysis.totalQuestions} correct
            </p>
          </div>
        </div>
      </div>

      {/* Score Visualization and Confidence Level */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Doughnut Chart */}
        <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)]">
          <div className="flex items-center gap-3 mb-4">
            <PieChart className="w-5 h-5 text-[var(--primary)]" />
            <h3 className="font-semibold text-lg text-[var(--foreground)]">Score Breakdown</h3>
          </div>
          <div className="flex items-center justify-center h-64">
            <Doughnut
              data={{
                labels: ['Correct', 'Incorrect'],
                datasets: [{
                  data: [analysis.correctCount, analysis.totalQuestions - analysis.correctCount],
                  backgroundColor: [
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                  ],
                  borderColor: [
                    'rgba(34, 197, 94, 1)',
                    'rgba(239, 68, 68, 1)'
                  ],
                  borderWidth: 2,
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      color: 'rgb(156, 163, 175)',
                      font: {
                        size: 12
                      }
                    }
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ${value} (${percentage}%)`;
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Confidence Level */}
        <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)]">
          <div className="flex items-center gap-3 mb-3">
            <Award className="w-5 h-5 text-[var(--primary)]" />
            <h3 className="font-semibold text-lg text-[var(--foreground)]">Confidence Level</h3>
          </div>
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <span className={`inline-block px-6 py-3 rounded-full font-medium text-lg ${getConfidenceColor(analysis.confidenceLevel)}`}>
              {analysis.confidenceLevel || 'Medium'} Confidence
            </span>
            <p className="text-sm text-[var(--muted-foreground)] text-center">
              Based on your response patterns and accuracy
            </p>
            {/* Confidence Gauge Visualization */}
            <div className="w-full max-w-xs">
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between text-xs">
                  <span className="text-[var(--muted-foreground)]">Low</span>
                  <span className="text-[var(--muted-foreground)]">Medium</span>
                  <span className="text-[var(--muted-foreground)]">High</span>
                </div>
                <div className="overflow-hidden h-3 text-xs flex rounded-full bg-[var(--muted)]">
                  <div 
                    style={{ 
                      width: `${
                        analysis.confidenceLevel?.toLowerCase() === 'high' ? '100%' : 
                        analysis.confidenceLevel?.toLowerCase() === 'medium' ? '60%' : '30%'
                      }` 
                    }}
                    className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${
                      analysis.confidenceLevel?.toLowerCase() === 'high' ? 'bg-green-500' : 
                      analysis.confidenceLevel?.toLowerCase() === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Dimensions Radar Chart */}
      <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-[var(--chart-1)]" />
          <h3 className="font-semibold text-lg text-[var(--foreground)]">Learning Profile</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 flex items-center justify-center">
            <Radar
              data={{
                labels: ['Accuracy', 'Confidence', 'Speed', 'Consistency', 'Comprehension'],
                datasets: [{
                  label: 'Your Performance',
                  data: [
                    analysis.scorePercentage,
                    analysis.confidenceLevel?.toLowerCase() === 'high' ? 85 : 
                    analysis.confidenceLevel?.toLowerCase() === 'medium' ? 60 : 35,
                    analysis.totalQuestions >= 10 ? 75 : 50,
                    100 - (analysis.totalQuestions > 0 ? ((analysis.totalQuestions - analysis.correctCount) / analysis.totalQuestions * 30) : 0),
                    analysis.scorePercentage > 70 ? analysis.scorePercentage : analysis.scorePercentage + 10
                  ],
                  backgroundColor: 'rgba(99, 102, 241, 0.2)',
                  borderColor: 'rgba(99, 102, 241, 1)',
                  borderWidth: 2,
                  pointBackgroundColor: 'rgba(99, 102, 241, 1)',
                  pointBorderColor: '#fff',
                  pointHoverBackgroundColor: '#fff',
                  pointHoverBorderColor: 'rgba(99, 102, 241, 1)'
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                      color: 'rgb(156, 163, 175)',
                      backdropColor: 'transparent',
                      stepSize: 20
                    },
                    grid: {
                      color: 'rgba(156, 163, 175, 0.2)'
                    },
                    pointLabels: {
                      color: 'rgb(156, 163, 175)',
                      font: {
                        size: 12
                      }
                    }
                  }
                },
                plugins: {
                  legend: {
                    display: false
                  }
                }
              }}
            />
          </div>
          <div className="space-y-3">
            <div className="bg-[var(--muted)]/30 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--muted-foreground)]">Accuracy</span>
                <span className="text-lg font-bold text-[var(--foreground)]">{analysis.scorePercentage}%</span>
              </div>
              <div className="w-full bg-[var(--muted)] rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{width: `${analysis.scorePercentage}%`}}></div>
              </div>
            </div>
            <div className="bg-[var(--muted)]/30 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--muted-foreground)]">Confidence</span>
                <span className="text-lg font-bold text-[var(--foreground)]">{analysis.confidenceLevel || 'Medium'}</span>
              </div>
              <div className="w-full bg-[var(--muted)] rounded-full h-2">
                <div className={`h-2 rounded-full ${
                  analysis.confidenceLevel?.toLowerCase() === 'high' ? 'bg-green-500' : 
                  analysis.confidenceLevel?.toLowerCase() === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                }`} style={{width: `${
                  analysis.confidenceLevel?.toLowerCase() === 'high' ? '85%' : 
                  analysis.confidenceLevel?.toLowerCase() === 'medium' ? '60%' : '35%'
                }`}}></div>
              </div>
            </div>
            <div className="bg-[var(--muted)]/30 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--muted-foreground)]">Questions Answered</span>
                <span className="text-lg font-bold text-[var(--foreground)]">{analysis.totalQuestions}</span>
              </div>
            </div>
          </div>
        </div>
        {analysis.performanceSummary && (
          <details className="mt-4">
            <summary className="text-sm text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--foreground)] transition-colors">View detailed summary</summary>
            <p className="text-sm text-[var(--card-foreground)] mt-2 p-3 bg-[var(--muted)]/20 rounded">
              {analysis.performanceSummary}
            </p>
          </details>
        )}
      </div>

      {/* Pattern Specificity - ELITE INSIGHT */}
      {(analysis.patternSpecificity || analysis.learningPatterns) && (
        <div className="bg-gradient-to-r from-[var(--primary)]/5 via-[var(--primary)]/10 to-[var(--primary)]/5 rounded-xl p-6 border-2 border-[var(--primary)]/30 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-6 h-6 text-[var(--primary)]" />
            <div>
              <h3 className="font-bold text-xl text-[var(--foreground)]">Cognitive Patterns</h3>
              <p className="text-xs text-[var(--muted-foreground)]">Key insights from your error patterns</p>
            </div>
          </div>
          <details open>
            <summary className="text-sm font-medium text-[var(--primary)] cursor-pointer mb-3">View Analysis</summary>
            <div className="bg-[var(--card)] rounded-lg p-4 border border-[var(--border)]">
              <p className="text-sm text-[var(--foreground)] leading-relaxed">
                {analysis.patternSpecificity || analysis.learningPatterns}
              </p>
            </div>
          </details>
        </div>
      )}

      {/* Confidence Mismatch Warning - ELITE INSIGHT */}
      {analysis.confidenceMismatch && analysis.confidenceMismatch !== 'null' && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl p-6 border-2 border-amber-500/40 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-amber-900 dark:text-amber-100 mb-2">
                ⚠️ Confidence Gap Alert
              </h3>
              <details open>
                <summary className="text-sm font-medium text-amber-700 dark:text-amber-300 cursor-pointer mb-2">View details</summary>
                <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                  {analysis.confidenceMismatch}
                </p>
              </details>
              <div className="mt-3 px-3 py-2 bg-amber-100 dark:bg-amber-900/30 rounded text-xs text-amber-700 dark:text-amber-300">
                💡 Hidden misconceptions may need addressing
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proactive Tools - VELA'S RECOMMENDATIONS */}
      {analysis.recommendedTools && analysis.recommendedTools.length > 0 && (
        <div className="bg-gradient-to-br from-[var(--primary)]/10 via-[var(--accent)]/5 to-transparent rounded-xl p-8 border-2 border-[var(--primary)] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Zap className="w-32 h-32 text-[var(--primary)]" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-[var(--primary)] p-3 rounded-xl shadow-lg shadow-[var(--primary)]/20">
                <Zap className="w-6 h-6 text-[var(--primary-foreground)]" />
              </div>
              <div>
                <h3 className="font-bold text-2xl text-[var(--foreground)]">Vela's Action Plan</h3>
                <p className="text-[var(--muted-foreground)]">I've designed these specific tools to target your knowledge gaps</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.recommendedTools.map((tool, idx) => (
                <div key={idx} className="bg-[var(--card)] p-5 rounded-xl border border-[var(--border)] hover:border-[var(--primary)] transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <span className="px-3 py-1 bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-bold rounded-full uppercase tracking-wider">
                      {tool.toolType}
                    </span>
                  </div>
                  <h4 className="font-bold text-lg text-[var(--foreground)] mb-2 group-hover:text-[var(--primary)] transition-colors">
                    {tool.title}
                  </h4>
                  <p className="text-sm text-[var(--muted-foreground)] mb-6 line-clamp-2">
                    {tool.description}
                  </p>
                  <button 
                    onClick={() => {
                      navigate('/Learningplayground', { 
                        state: { 
                          initialPrompt: tool.prompt,
                          analysis: analysis,
                          quizResults: analysis.algorithmicMetrics?.questionClassification?.typeBreakdown
                        } 
                      });
                    }}
                    className="w-full py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
                  >
                    <PlayCircle className="w-4 h-4" />
                    Launch in Playground
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Behavioral Insight - ELITE INSIGHT */}
      {analysis.behavioralInsight && (
        <div className="bg-[var(--card)] rounded-xl p-6 border-2 border-[var(--chart-2)]/30 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-6 h-6 text-[var(--chart-2)]" />
            <div>
              <h3 className="font-bold text-xl text-[var(--foreground)]">Behavioral Patterns</h3>
              <p className="text-xs text-[var(--muted-foreground)]">How you approach different question types</p>
            </div>
          </div>
          <details open>
            <summary className="text-sm font-medium text-[var(--chart-2)] cursor-pointer mb-3">View Insight</summary>
            <div className="bg-gradient-to-r from-[var(--chart-2)]/5 to-[var(--chart-4)]/5 rounded-lg p-4 border border-[var(--chart-2)]/20">
              <p className="text-sm text-[var(--foreground)] leading-relaxed">
                {analysis.behavioralInsight}
              </p>
            </div>
          </details>
        </div>
      )}

      {/* Knowledge Gaps - Visual Tags */}
      <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Lightbulb className="w-5 h-5 text-[var(--chart-3)]" />
          <h3 className="font-semibold text-lg text-[var(--foreground)]">Areas to Focus On</h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {(typeof analysis.knowledgeGaps === 'string' ? analysis.knowledgeGaps.split(/[,;.]/) : Array.isArray(analysis.knowledgeGaps) ? analysis.knowledgeGaps : []).filter(gap => gap && String(gap).trim().length > 3).slice(0, 8).map((gap, idx) => (
            <span key={idx} className="px-4 py-2 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-full text-sm font-medium border border-amber-500/30 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {String(gap).trim().replace(/^(you|your|the|and|but|or|needs?|should|may|might)/gi, '').trim()}
            </span>
          ))}
        </div>
        <details>
          <summary className="text-sm text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--foreground)] transition-colors">View detailed analysis</summary>
          <p className="text-sm text-[var(--card-foreground)] mt-2 p-3 bg-[var(--muted)]/20 rounded">
            {typeof analysis.knowledgeGaps === 'string' ? analysis.knowledgeGaps : Array.isArray(analysis.knowledgeGaps) ? analysis.knowledgeGaps.join(', ') : ''}
          </p>
        </details>
      </div>

      {/* Self-Reflection Prompts */}
      <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <MessageCircle className="w-5 h-5 text-[var(--chart-4)]" />
          <h3 className="font-semibold text-lg text-[var(--foreground)]">
            Reflection Questions
          </h3>
        </div>
        <p className="text-sm text-[var(--muted-foreground)] mb-4">
          Take a moment to reflect on these questions to improve your learning:
        </p>
        <div className="space-y-3">
          {analysis.reflectionPrompts?.map((prompt, idx) => (
            <div
              key={idx}
              className="bg-[var(--muted)]/50 rounded-lg p-4 border-l-4 border-[var(--primary)]"
            >
              <p className="text-[var(--foreground)] font-medium">
                {idx + 1}. {prompt}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Study Strategies - Visual Cards */}
      <div className="bg-gradient-to-br from-[var(--primary)]/5 to-[var(--accent)] rounded-lg p-6 border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-5 h-5 text-[var(--primary)]" />
          <h3 className="font-semibold text-lg text-[var(--foreground)]">
            Personalized Study Strategies
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          {(typeof analysis.studyStrategies === 'string' ? analysis.studyStrategies.split(/\n+/) : Array.isArray(analysis.studyStrategies) ? analysis.studyStrategies : []).filter(s => s && String(s).trim().length > 10).slice(0, 6).map((strategy, idx) => (
            <div key={idx} className="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)] hover:border-[var(--primary)] transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] font-bold text-sm">
                  {idx + 1}
                </div>
                <p className="text-sm text-[var(--foreground)] flex-1">
                  {String(strategy).replace(/^[•\-\d.]+\s*/, '').trim()}
                </p>
              </div>
            </div>
          ))}
        </div>
        <details>
          <summary className="text-sm text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--foreground)] transition-colors">View all strategies</summary>
          <p className="text-sm text-[var(--card-foreground)] mt-2 p-3 bg-[var(--muted)]/20 rounded whitespace-pre-line">
            {typeof analysis.studyStrategies === 'string' ? analysis.studyStrategies : Array.isArray(analysis.studyStrategies) ? analysis.studyStrategies.join('\n') : ''}
          </p>
        </details>
      </div>

      {/* Algorithmic Metrics Panel - Shows the computational analysis underneath */}
      {analysis.algorithmicMetrics && (
        <details className="bg-[var(--muted)]/30 rounded-lg border border-[var(--border)]">
          <summary className="cursor-pointer p-4 font-semibold text-[var(--foreground)] hover:bg-[var(--muted)]/50 transition-colors">
            🔬 View Computational Analysis Details
          </summary>
          <div className="p-4 space-y-6 border-t border-[var(--border)]">
            {/* Question Type Performance Chart */}
            {analysis.algorithmicMetrics.questionClassification?.typeBreakdown && 
             analysis.algorithmicMetrics.questionClassification.typeBreakdown.length > 0 && (
              <div className="bg-[var(--card)] p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-[var(--primary)]" />
                  <h4 className="text-sm font-semibold text-[var(--foreground)]">Errors by Topic</h4>
                </div>
                <div className="h-64">
                  <Bar
                    data={{
                      labels: analysis.algorithmicMetrics.questionClassification.typeBreakdown.map(t => t.type),
                      datasets: [
                        {
                          label: 'Error Count',
                          data: analysis.algorithmicMetrics.questionClassification.typeBreakdown.map(t => t.errorCount),
                          backgroundColor: 'rgba(239, 68, 68, 0.7)',
                          borderColor: 'rgba(239, 68, 68, 1)',
                          borderWidth: 1,
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        x: {
                          ticks: {
                            color: 'rgb(156, 163, 175)',
                            font: { size: 10 }
                          },
                          grid: {
                            color: 'rgba(156, 163, 175, 0.1)'
                          }
                        },
                        y: {
                          beginAtZero: true,
                          ticks: {
                            color: 'rgb(156, 163, 175)',
                            stepSize: 1
                          },
                          grid: {
                            color: 'rgba(156, 163, 175, 0.1)'
                          }
                        }
                      },
                      plugins: {
                        legend: {
                          labels: {
                            color: 'rgb(156, 163, 175)',
                            font: { size: 11 }
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Confidence Calibration Chart */}
            {analysis.algorithmicMetrics.confidenceAnalysis?.hasConfidenceData && (
              <div className="bg-[var(--card)] p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-[var(--chart-2)]" />
                  <h4 className="text-sm font-semibold text-[var(--foreground)]">Confidence Calibration</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-48">
                    <Pie
                      data={{
                        labels: ['Overconfident', 'Well Calibrated', 'Underconfident'],
                        datasets: [{
                          data: [
                            analysis.algorithmicMetrics.confidenceAnalysis.overconfidentCount,
                            analysis.totalQuestions - analysis.algorithmicMetrics.confidenceAnalysis.overconfidentCount - analysis.algorithmicMetrics.confidenceAnalysis.underconfidentCount,
                            analysis.algorithmicMetrics.confidenceAnalysis.underconfidentCount
                          ],
                          backgroundColor: [
                            'rgba(251, 191, 36, 0.8)',
                            'rgba(34, 197, 94, 0.8)',
                            'rgba(59, 130, 246, 0.8)'
                          ],
                          borderColor: [
                            'rgba(251, 191, 36, 1)',
                            'rgba(34, 197, 94, 1)',
                            'rgba(59, 130, 246, 1)'
                          ],
                          borderWidth: 2,
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: {
                              color: 'rgb(156, 163, 175)',
                              font: { size: 10 }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-col justify-center space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <span className="text-[var(--muted-foreground)]">Overconfident:</span>
                      <span className="font-semibold text-[var(--foreground)]">
                        {analysis.algorithmicMetrics.confidenceAnalysis.overconfidentCount}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-[var(--muted-foreground)]">Underconfident:</span>
                      <span className="font-semibold text-[var(--foreground)]">
                        {analysis.algorithmicMetrics.confidenceAnalysis.underconfidentCount}
                      </span>
                    </div>
                    <div className="mt-3 p-2 bg-[var(--muted)] rounded">
                      <p className="text-xs text-[var(--muted-foreground)]">Calibration Score</p>
                      <p className="text-lg font-bold text-[var(--chart-2)]">
                        {analysis.algorithmicMetrics.confidenceAnalysis.calibrationScore}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Type Profile */}
            {analysis.algorithmicMetrics.errorClustering?.errorTypeProfile && (
              <div className="bg-[var(--card)] p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-[var(--destructive)]" />
                  <h4 className="text-sm font-semibold text-[var(--foreground)]">Error Type Profile</h4>
                </div>
                {(() => {
                  const ep = analysis.algorithmicMetrics.errorClustering.errorTypeProfile;
                  const labels = ['Conceptual Misunderstanding', 'Recall Failure', 'Careless Error', 'Unclassified'];
                  const values = [ep.conceptualMisunderstanding, ep.recallFailure, ep.carelessError, ep.unclassified];
                  const colors = ['rgba(239,68,68,0.75)', 'rgba(59,130,246,0.75)', 'rgba(251,191,36,0.75)', 'rgba(156,163,175,0.75)'];
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="h-48">
                        <Pie
                          data={{
                            labels,
                            datasets: [{ data: values, backgroundColor: colors, borderWidth: 2 }]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'bottom',
                                labels: { color: 'rgb(156,163,175)', font: { size: 10 } }
                              }
                            }
                          }}
                        />
                      </div>
                      <div className="flex flex-col justify-center space-y-2 text-sm">
                        {[
                          { label: 'Conceptual', desc: 'High confidence + wrong', val: ep.conceptualMisunderstanding, color: 'text-red-500' },
                          { label: 'Recall', desc: 'Low confidence + wrong', val: ep.recallFailure, color: 'text-blue-500' },
                          { label: 'Careless', desc: 'Uncertain + wrong', val: ep.carelessError, color: 'text-amber-500' },
                          { label: 'Unclassified', desc: 'No confidence data', val: ep.unclassified, color: 'text-gray-400' },
                        ].map(({ label, desc, val, color }) => (
                          <div key={label} className="flex items-center justify-between">
                            <div>
                              <span className={`font-semibold ${color}`}>{label}</span>
                              <span className="text-xs text-[var(--muted-foreground)] ml-1">({desc})</span>
                            </div>
                            <span className="font-mono font-bold text-[var(--foreground)]">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Classification Method */}
            <div className="bg-[var(--card)] p-3 rounded">
              <p className="text-sm font-semibold text-[var(--foreground)] mb-1">Topic Error Breakdown</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Method: <span className="font-mono text-[var(--primary)]">{analysis.algorithmicMetrics.questionClassification?.method}</span>
              </p>
              <div className="mt-2 space-y-1">
                {analysis.algorithmicMetrics.questionClassification?.typeBreakdown?.map((type, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="text-[var(--foreground)]">{type.type}</span>
                    <span className="font-mono text-[var(--destructive)]">{type.errorCount} error{type.errorCount !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Error Clustering */}
            {analysis.algorithmicMetrics.errorClustering && (
              <div className="bg-[var(--card)] p-3 rounded">
                <p className="text-sm font-semibold text-[var(--foreground)] mb-1">Error Clustering Analysis</p>
                <div className="space-y-2 text-xs text-[var(--muted-foreground)]">
                  {analysis.algorithmicMetrics.errorClustering.mostProblematicType && (
                    <p>
                      Most Problematic: <span className="font-semibold text-[var(--destructive)]">
                        {analysis.algorithmicMetrics.errorClustering.mostProblematicType}
                      </span>
                    </p>
                  )}
                  <p>
                    Repeated Patterns: <span className="font-mono">{analysis.algorithmicMetrics.errorClustering.repeatedErrorPatterns}</span>
                  </p>
                  {analysis.algorithmicMetrics.errorClustering.errorSignatureWords?.length > 0 && (
                    <div>
                      <p className="mb-1">Error Signature Keywords:</p>
                      <div className="flex flex-wrap gap-1">
                        {analysis.algorithmicMetrics.errorClustering.errorSignatureWords.map((word, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-[var(--destructive)]/10 text-[var(--destructive)] rounded font-mono text-xs">
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Confidence Analysis */}
            {analysis.algorithmicMetrics.confidenceAnalysis && (
              <div className="bg-[var(--card)] p-3 rounded">
                <p className="text-sm font-semibold text-[var(--foreground)] mb-1">Confidence Calibration</p>
                <div className="space-y-1 text-xs text-[var(--muted-foreground)]">
                  {analysis.algorithmicMetrics.confidenceAnalysis.hasConfidenceData ? (
                    <>
                      <p>
                        Overconfident Answers: <span className="font-mono text-amber-600">{analysis.algorithmicMetrics.confidenceAnalysis.overconfidentCount}</span>
                      </p>
                      <p>
                        Underconfident Answers: <span className="font-mono text-blue-600">{analysis.algorithmicMetrics.confidenceAnalysis.underconfidentCount}</span>
                      </p>
                      <p>
                        Calibration Score: <span className="font-mono text-[var(--chart-2)]">{analysis.algorithmicMetrics.confidenceAnalysis.calibrationScore}%</span>
                      </p>
                    </>
                  ) : (
                    <p className="text-amber-600 italic">
                      💡 Enable per-question confidence ratings for deeper analysis
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </details>
      )}

      {/* Encouragement */}
      {analysis.encouragement && (
        <div className="bg-gradient-to-r from-[var(--chart-2)]/10 to-[var(--chart-4)]/10 rounded-lg p-6 border border-[var(--chart-2)]/20 text-center">
          <p className="text-lg font-medium text-[var(--foreground)] italic">
            "{analysis.encouragement}"
          </p>
        </div>
      )}

      {/* Accuracy Warning Banner */}
      <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-100 text-sm">
              Important Notice
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
              This analysis is generated automatically based on your quiz responses and may not fully represent 
              your overall understanding. Use these insights as guidance to support your learning, not as a
              definitive judgement of your ability. Always reflect on your own knowledge and explore additional 
              resources where needed. While we aim to provide accurate and meaningful feedback, automated
               analysis may occasionally contain limitations or inaccuracies.
            </p>
          </div>
        </div>
      </div>
    </div>

  );
}
