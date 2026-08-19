import { useState, useEffect, useRef, useCallback } from 'react';
import { Brain, TrendingUp, Target, Lightbulb, MessageCircle, Award, AlertTriangle, Activity, BarChart3, PieChart, Zap, PlayCircle, ChevronDown, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
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
import { Skeleton } from './Skeleton';

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

/* â”€â”€ Animated SVG Score Ring â”€â”€ */
function ScoreRing({ score, size = 120, strokeWidth = 10 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const target = circumference - (score / 100) * circumference;

  const getColor = (s) => {
    if (s >= 80) return '#4ade80';
    if (s >= 60) return '#fbbf24';
    return '#f87171';
  };

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        <circle
          className="meta-ring-track"
          cx={size / 2} cy={size / 2} r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className="meta-ring-fill"
          cx={size / 2} cy={size / 2} r={radius}
          strokeWidth={strokeWidth}
          stroke={getColor(score)}
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{
            '--ring-circumference': circumference,
            '--ring-target': target,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center meta-ring-text">
        <span className="text-3xl font-bold text-[var(--foreground)]">{score}%</span>
      </div>
    </div>
  );
}

/* â”€â”€ Custom Accordion â”€â”€ */
function Accordion({ title, icon: Icon, iconColor, children, defaultOpen = false, accentBorder = false, transparent = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyRef = useRef(null);
  const [maxH, setMaxH] = useState(defaultOpen ? 'none' : '0px');

  useEffect(() => {
    if (!bodyRef.current) return;
    if (open) {
      setMaxH(`${bodyRef.current.scrollHeight}px`);
      // After transition, remove max-height so content can resize
      const timer = setTimeout(() => setMaxH('none'), 360);
      return () => clearTimeout(timer);
    } else {
      // First set explicit height, then collapse
      setMaxH(`${bodyRef.current.scrollHeight}px`);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setMaxH('0px'));
      });
    }
  }, [open]);

  const wrapperClasses = transparent
    ? 'rounded-lg'
    : `bg-[var(--card)] rounded-lg border ${accentBorder ? 'border-[var(--primary)]/30' : 'border-[var(--border)]'} meta-card`;

  return (
    <div className={wrapperClasses}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-[var(--muted)]/10 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className={`w-5 h-5 ${iconColor || 'text-[var(--primary)]'}`} />}
          <span className="font-semibold text-lg text-[var(--foreground)]">{title}</span>
        </div>
        <ChevronDown
          className="meta-chevron w-5 h-5 text-[var(--muted-foreground)]"
          data-open={String(open)}
        />
      </button>
      <div
        ref={bodyRef}
        className="meta-accordion-body"
        data-open={String(open)}
        style={{ maxHeight: maxH }}
      >
        <div className="px-5 pb-5">
          {children}
        </div>
      </div>
    </div>
  );
}


/* â”€â”€ Reflection Stepper â”€â”€ */
function ReflectionStepper({ prompts }) {
  const [current, setCurrent] = useState(0);
  if (!prompts || prompts.length === 0) return null;

  const prev = () => setCurrent(c => Math.max(0, c - 1));
  const next = () => setCurrent(c => Math.min(prompts.length - 1, c + 1));

  return (
    <div className="space-y-4">
      {/* Card */}
      <div className="relative bg-gradient-to-br from-[var(--primary)]/8 to-[var(--accent)]/8 rounded-lg p-6 border border-[var(--primary)]/20 min-h-[120px] flex items-center">
        <div className="absolute top-3 right-3 text-xs text-[var(--muted-foreground)] font-mono">
          {current + 1} / {prompts.length}
        </div>
        <p className="text-[var(--foreground)] font-medium text-base leading-relaxed pr-8" key={current}>
          {prompts[current]}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prev}
          disabled={current === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all meta-btn-press"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        {/* Dots */}
        <div className="flex items-center gap-2">
          {prompts.map((_, i) => (
            <button
              type="button"
              key={i}
              onClick={() => setCurrent(i)}
              className={`meta-dot ${i === current ? 'active' : ''}`}
              aria-label={`Go to reflection ${i + 1}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={next}
          disabled={current === prompts.length - 1}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all meta-btn-press"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* â”€â”€ Doughnut Center Label Plugin â”€â”€ */
const doughnutCenterPlugin = {
  id: 'doughnutCenterLabel',
  afterDraw(chart) {
    const { ctx, chartArea: { top, bottom, left, right } } = chart;
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    const datasets = chart.data.datasets[0].data;
    const total = datasets.reduce((a, b) => a + b, 0);
    if (total === 0) return;
    const pct = Math.round((datasets[0] / total) * 100);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 22px "DM Sans", sans-serif';
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim() || '#CDD1D6';
    ctx.fillText(`${pct}%`, centerX, centerY - 6);
    ctx.font = '12px "DM Sans", sans-serif';
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#6E7580';
    ctx.fillText('correct', centerX, centerY + 14);
    ctx.restore();
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
          `${API_BASE}/api/metacognitive-analysis/${quizId}`,
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
      <div className="space-y-6" aria-hidden>
        <div className="rounded-xl p-6 border border-[var(--border)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton rounded="999px" style={{ width: '3rem', height: '3rem' }} />
              <div className="space-y-2">
                <Skeleton style={{ width: '12rem', height: '1.1rem' }} />
                <Skeleton style={{ width: '16rem', height: '0.75rem' }} />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton style={{ width: '5rem', height: '0.7rem' }} />
              <Skeleton style={{ width: '4rem', height: '2rem' }} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-lg p-6 border border-[var(--border)]">
            <Skeleton style={{ width: '10rem', height: '1rem' }} />
            <Skeleton className="mt-4" rounded="999px" style={{ width: '12rem', height: '12rem', margin: '1rem auto 0' }} />
          </div>
          <div className="rounded-lg p-6 border border-[var(--border)] space-y-3">
            <Skeleton style={{ width: '9rem', height: '1rem' }} />
            <Skeleton style={{ width: '100%', height: '0.8rem' }} />
            <Skeleton style={{ width: '94%', height: '0.8rem' }} />
            <Skeleton style={{ width: '86%', height: '0.8rem' }} />
          </div>
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
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  const confidencePercent =
    analysis.confidenceLevel?.toLowerCase() === 'high' ? 85 :
    analysis.confidenceLevel?.toLowerCase() === 'medium' ? 60 : 35;

  // Helper: stagger delay for each rendered section
  let staggerIdx = 0;
  const stagger = () => ({ animationDelay: `${(staggerIdx++) * 0.07}s` });

  return (
    <div className="space-y-6">
      
      {/* â”€â”€ Header with Animated Score Ring â”€â”€ */}
      <div className="meta-stagger-item bg-gradient-to-r from-[var(--primary)]/10 to-[var(--accent)] rounded-xl p-6 border border-[var(--border)] meta-card" style={stagger()}>
        <div className="flex items-center justify-between flex-wrap gap-4">
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
          <div className="flex flex-col items-center">
            <ScoreRing score={analysis.scorePercentage} size={110} strokeWidth={9} />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              {analysis.correctCount}/{analysis.totalQuestions} correct
            </p>
          </div>
        </div>
      </div>

      {/* â”€â”€ Score Doughnut + Confidence Level â”€â”€ */}
      <div className="meta-stagger-item grid grid-cols-1 lg:grid-cols-2 gap-6" style={stagger()}>
        {/* Score Doughnut Chart with Center Label */}
        <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] meta-card">
          <div className="flex items-center gap-3 mb-4">
            <PieChart className="w-5 h-5 text-[var(--primary)]" />
            <h3 className="font-semibold text-lg text-[var(--foreground)]">Score Breakdown</h3>
          </div>
          <div className="flex items-center justify-center h-64">
            <Doughnut
              plugins={[doughnutCenterPlugin]}
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
                  cutout: '68%',
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                  animateRotate: true,
                  duration: 1200,
                  easing: 'easeOutQuart',
                },
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      color: 'rgb(156, 163, 175)',
                      font: { size: 12 },
                      padding: 16,
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

        {/* Confidence Level with animated gauge */}
        <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] meta-card">
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
            {/* Animated Confidence Gauge */}
            <div className="w-full max-w-xs">
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between text-xs">
                  <span className="text-[var(--muted-foreground)]">Low</span>
                  <span className="text-[var(--muted-foreground)]">Medium</span>
                  <span className="text-[var(--muted-foreground)]">High</span>
                </div>
                <div className="overflow-hidden h-3 text-xs flex rounded-full bg-[var(--muted)]">
                  <div 
                    style={{ width: `${confidencePercent}%` }}
                    className={`meta-bar-fill shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
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

      {/* â”€â”€ Learning Profile Radar â”€â”€ */}
      <div className="meta-stagger-item bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] meta-card" style={stagger()}>
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
                    confidencePercent,
                    analysis.totalQuestions >= 10 ? 75 : 50,
                    100 - (analysis.totalQuestions > 0 ? ((analysis.totalQuestions - analysis.correctCount) / analysis.totalQuestions * 30) : 0),
                    analysis.scorePercentage > 70 ? analysis.scorePercentage : analysis.scorePercentage + 10
                  ],
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  borderColor: 'rgba(99, 102, 241, 1)',
                  borderWidth: 2,
                  pointBackgroundColor: 'rgba(99, 102, 241, 1)',
                  pointBorderColor: '#fff',
                  pointHoverBackgroundColor: '#fff',
                  pointHoverBorderColor: 'rgba(99, 102, 241, 1)',
                  pointRadius: 5,
                  pointHoverRadius: 7,
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                  duration: 1400,
                  easing: 'easeOutQuart',
                },
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
                      color: 'rgba(156, 163, 175, 0.15)'
                    },
                    pointLabels: {
                      color: 'rgb(156, 163, 175)',
                      font: { size: 12 }
                    }
                  }
                },
                plugins: {
                  legend: { display: false }
                }
              }}
            />
          </div>
          <div className="space-y-3">
            {/* Accuracy bar */}
            <div className="bg-[var(--muted)]/30 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--muted-foreground)]">Accuracy</span>
                <span className="text-lg font-bold text-[var(--foreground)]">{analysis.scorePercentage}%</span>
              </div>
              <div className="w-full bg-[var(--muted)] rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full meta-bar-fill" style={{width: `${analysis.scorePercentage}%`}}></div>
              </div>
            </div>
            {/* Confidence bar */}
            <div className="bg-[var(--muted)]/30 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--muted-foreground)]">Confidence</span>
                <span className="text-lg font-bold text-[var(--foreground)]">{analysis.confidenceLevel || 'Medium'}</span>
              </div>
              <div className="w-full bg-[var(--muted)] rounded-full h-2">
                <div className={`h-2 rounded-full meta-bar-fill ${
                  analysis.confidenceLevel?.toLowerCase() === 'high' ? 'bg-green-500' : 
                  analysis.confidenceLevel?.toLowerCase() === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                }`} style={{width: `${confidencePercent}%`}}></div>
              </div>
            </div>
            {/* Questions count */}
            <div className="bg-[var(--muted)]/30 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--muted-foreground)]">Questions Answered</span>
                <span className="text-lg font-bold text-[var(--foreground)]">{analysis.totalQuestions}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Performance Summary â€” separate section */}
      {analysis.performanceSummary && (
        <div className="meta-stagger-item" style={stagger()}>
          <Accordion title="Detailed Summary" icon={BarChart3} defaultOpen={false}>
            <p className="text-sm text-[var(--card-foreground)] leading-relaxed p-3 bg-[var(--muted)]/20 rounded">
              {analysis.performanceSummary}
            </p>
          </Accordion>
        </div>
      )}

      {/* â”€â”€ Cognitive Patterns â€” ELITE INSIGHT â”€â”€ */}
      {(analysis.patternSpecificity || analysis.learningPatterns) && (
        <div className="meta-stagger-item bg-gradient-to-r from-[var(--primary)]/5 via-[var(--primary)]/10 to-[var(--primary)]/5 rounded-xl border-2 border-[var(--primary)]/30 meta-card" style={stagger()}>
          <Accordion
            title="Cognitive Patterns"
            icon={Target}
            iconColor="text-[var(--primary)]"
            defaultOpen={true}
            transparent
          >
            <p className="text-xs text-[var(--muted-foreground)] mb-3">Key insights from your error patterns</p>
            <div className="bg-[var(--card)] rounded-lg p-4 border border-[var(--border)]">
              <p className="text-sm text-[var(--foreground)] leading-relaxed">
                {analysis.patternSpecificity || analysis.learningPatterns}
              </p>
            </div>
          </Accordion>
        </div>
      )}

      {/* â”€â”€ Confidence Mismatch Warning â€” ELITE INSIGHT â”€â”€ */}
      {analysis.confidenceMismatch && analysis.confidenceMismatch !== 'null' && (
        <div className="meta-stagger-item bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl border-2 border-amber-500/40 meta-card" style={stagger()}>
          <Accordion
            title="âš ï¸ Confidence Gap Alert"
            icon={AlertTriangle}
            iconColor="text-amber-600 dark:text-amber-400"
            defaultOpen={true}
            transparent
          >
            <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
              {analysis.confidenceMismatch}
            </p>
            <div className="mt-3 px-3 py-2 bg-amber-100 dark:bg-amber-900/30 rounded text-xs text-amber-700 dark:text-amber-300">
              ðŸ’¡ Hidden misconceptions may need addressing
            </div>
          </Accordion>
        </div>
      )}

      {/* â”€â”€ Proactive Tools â€” VELA'S RECOMMENDATIONS â”€â”€ */}
      {analysis.recommendedTools && analysis.recommendedTools.length > 0 && (
        <div className="meta-stagger-item bg-gradient-to-br from-[var(--primary)]/10 via-[var(--accent)]/5 to-transparent rounded-xl p-8 border-2 border-[var(--primary)] relative overflow-hidden meta-card" style={stagger()}>
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
                <div key={idx} className="bg-[var(--card)] p-5 rounded-xl border border-[var(--border)] hover:border-[var(--primary)] transition-all duration-200 group meta-card">
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
                    className="w-full py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all meta-btn-press"
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

      {/* â”€â”€ Behavioral Insight â€” ELITE INSIGHT â”€â”€ */}
      {analysis.behavioralInsight && (
        <div className="meta-stagger-item rounded-xl border-2 border-[var(--chart-2)]/30 meta-card" style={stagger()}>
          <Accordion
            title="Behavioral Patterns"
            icon={Activity}
            iconColor="text-[var(--chart-2)]"
            defaultOpen={true}
            transparent
          >
            <p className="text-xs text-[var(--muted-foreground)] mb-3">How you approach different question types</p>
            <div className="bg-gradient-to-r from-[var(--chart-2)]/5 to-[var(--chart-4)]/5 rounded-lg p-4 border border-[var(--chart-2)]/20">
              <p className="text-sm text-[var(--foreground)] leading-relaxed">
                {analysis.behavioralInsight}
              </p>
            </div>
          </Accordion>
        </div>
      )}

      {/* â”€â”€ Knowledge Gaps â€” Interactive Tags with pulse â”€â”€ */}
      <div className="meta-stagger-item bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] meta-card" style={stagger()}>
        <div className="flex items-center gap-3 mb-4">
          <Lightbulb className="w-5 h-5 text-[var(--chart-3)]" />
          <h3 className="font-semibold text-lg text-[var(--foreground)]">Areas to Focus On</h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {(typeof analysis.knowledgeGaps === 'string' ? analysis.knowledgeGaps.split(/[,;.]/) : Array.isArray(analysis.knowledgeGaps) ? analysis.knowledgeGaps : []).filter(gap => gap && String(gap).trim().length > 3).slice(0, 8).map((gap, idx) => (
            <span 
              key={idx} 
              className="meta-gap-tag px-4 py-2 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-full text-sm font-medium border border-amber-500/30 flex items-center gap-2 cursor-default hover:bg-amber-500/20 hover:border-amber-500/50 transition-all duration-200"
              style={{ animationDelay: `${idx * 150}ms` }}
              title="Focus area identified from your quiz performance"
            >
              <AlertTriangle className="w-4 h-4" />
              {String(gap).trim().replace(/^(you|your|the|and|but|or|needs?|should|may|might)/gi, '').trim()}
            </span>
          ))}
        </div>
        <Accordion title="Detailed Analysis" icon={Lightbulb} iconColor="text-[var(--chart-3)]" transparent>
          <p className="text-sm text-[var(--card-foreground)] p-3 bg-[var(--muted)]/20 rounded">
            {typeof analysis.knowledgeGaps === 'string' ? analysis.knowledgeGaps : Array.isArray(analysis.knowledgeGaps) ? analysis.knowledgeGaps.join(', ') : ''}
          </p>
        </Accordion>
      </div>

      {/* â”€â”€ Reflection Prompts â€” Sequential Stepper â”€â”€ */}
      <div className="meta-stagger-item bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] meta-card" style={stagger()}>
        <div className="flex items-center gap-3 mb-4">
          <MessageCircle className="w-5 h-5 text-[var(--chart-4)]" />
          <h3 className="font-semibold text-lg text-[var(--foreground)]">
            Reflection Questions
          </h3>
        </div>
        <p className="text-sm text-[var(--muted-foreground)] mb-4">
          Take a moment to reflect on these questions to improve your learning:
        </p>
        <ReflectionStepper prompts={analysis.reflectionPrompts} />
      </div>

      {/* â”€â”€ Study Strategies â€” Vertical Timeline â”€â”€ */}
      <div className="meta-stagger-item bg-gradient-to-br from-[var(--primary)]/5 to-[var(--accent)] rounded-lg p-6 border border-[var(--border)] meta-card" style={stagger()}>
        <div className="flex items-center gap-3 mb-6">
          <Brain className="w-5 h-5 text-[var(--primary)]" />
          <h3 className="font-semibold text-lg text-[var(--foreground)]">
            Personalized Study Strategies
          </h3>
        </div>
        <div className="space-y-0">
          {(typeof analysis.studyStrategies === 'string' ? analysis.studyStrategies.split(/\n+/) : Array.isArray(analysis.studyStrategies) ? analysis.studyStrategies : []).filter(s => s && String(s).trim().length > 10).slice(0, 6).map((strategy, idx, arr) => (
            <div key={idx} className="relative flex gap-4 pb-6 last:pb-0 group">
              {/* Timeline connector line */}
              {idx < arr.length - 1 && (
                <div className="absolute left-[15px] top-[36px] bottom-0 w-[2px] bg-gradient-to-b from-[var(--primary)]/40 to-[var(--border)]" />
              )}
              {/* Step circle */}
              <div className="relative z-10 flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary)]/15 border-2 border-[var(--primary)]/40 flex items-center justify-center text-[var(--primary)] font-bold text-xs group-hover:bg-[var(--primary)]/25 group-hover:border-[var(--primary)] transition-all duration-200">
                {idx + 1}
              </div>
              {/* Strategy content */}
              <div className="flex-1 bg-[var(--card)] p-4 rounded-lg border border-[var(--border)] group-hover:border-[var(--primary)]/40 transition-all duration-200">
                <p className="text-sm text-[var(--foreground)]">
                  {String(strategy).replace(/^[â€¢\-\d.]+\s*/, '').trim()}
                </p>
              </div>
            </div>
          ))}
        </div>
        <Accordion title="View All Strategies" icon={Brain} transparent>
          <p className="text-sm text-[var(--card-foreground)] p-3 bg-[var(--muted)]/20 rounded whitespace-pre-line">
            {typeof analysis.studyStrategies === 'string' ? analysis.studyStrategies : Array.isArray(analysis.studyStrategies) ? analysis.studyStrategies.join('\n') : ''}
          </p>
        </Accordion>
      </div>

      {/* â”€â”€ Algorithmic Metrics Panel â”€â”€ */}
      {analysis.algorithmicMetrics && (
        <div className="meta-stagger-item" style={stagger()}>
          <Accordion
            title="ðŸ”¬ Computational Analysis Details"
            icon={BarChart3}
            defaultOpen={false}
          >
            <div className="space-y-6">
              {/* Question Type Performance Chart */}
              {analysis.algorithmicMetrics.questionClassification?.typeBreakdown && 
               analysis.algorithmicMetrics.questionClassification.typeBreakdown.length > 0 && (
                <div className="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)]">
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
                            borderRadius: 4,
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: {
                          duration: 1000,
                          easing: 'easeOutQuart',
                        },
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
                <div className="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)]">
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
                          animation: {
                            duration: 1000,
                            easing: 'easeOutQuart',
                          },
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
                <div className="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)]">
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
                              animation: { duration: 1000, easing: 'easeOutQuart' },
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
              <div className="bg-[var(--card)] p-3 rounded border border-[var(--border)]">
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
                <div className="bg-[var(--card)] p-3 rounded border border-[var(--border)]">
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
                <div className="bg-[var(--card)] p-3 rounded border border-[var(--border)]">
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
                        ðŸ’¡ Enable per-question confidence ratings for deeper analysis
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Accordion>
        </div>
      )}

      {/* â”€â”€ Encouragement â”€â”€ */}
      {analysis.encouragement && (
        <div className="meta-stagger-item bg-gradient-to-r from-[var(--chart-2)]/10 to-[var(--chart-4)]/10 rounded-lg p-6 border border-[var(--chart-2)]/20 text-center meta-card" style={stagger()}>
          <p className="text-lg font-medium text-[var(--foreground)] italic">
            "{analysis.encouragement}"
          </p>
        </div>
      )}

      {/* â”€â”€ Accuracy Warning Banner â”€â”€ */}
      <div className="meta-stagger-item bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800" style={stagger()}>
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

