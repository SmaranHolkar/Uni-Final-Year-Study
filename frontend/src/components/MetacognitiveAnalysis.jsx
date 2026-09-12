import { useState, useEffect, useRef } from 'react';
import {
  Brain,
  TrendingUp,
  Target,
  Lightbulb,
  MessageCircle,
  Award,
  AlertTriangle,
  Activity,
  BarChart3,
  PieChart,
  Zap,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowUpRight,
  Sparkles,
  BookOpen,
  Compass,
  Layers,
  ShieldCheck,
  RefreshCw,
  Info
} from 'lucide-react';
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

/* ─── Executive Score & Calibration SVG Ring ─── */
function CalibrationRing({ score, size = 110, strokeWidth = 8, label = 'Accuracy' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  const getColor = (s) => {
    if (s >= 80) return '#10b981'; // emerald
    if (s >= 60) return '#f59e0b'; // amber
    return '#ef4444'; // rose/red
  };

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#2e2e33"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor(score)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold font-mono text-[#f0f0ee] tracking-tight">{score}%</span>
        <span className="text-[10px] uppercase font-medium text-[#a1a1a6] tracking-wider">{label}</span>
      </div>
    </div>
  );
}

/* ─── Reflection Stepper ─── */
function ReflectionStepper({ prompts }) {
  const [current, setCurrent] = useState(0);
  if (!prompts || prompts.length === 0) return null;

  const prev = () => setCurrent(c => Math.max(0, c - 1));
  const next = () => setCurrent(c => Math.min(prompts.length - 1, c + 1));

  return (
    <div className="space-y-4">
      {/* Question Card */}
      <div className="relative bg-[#131519] rounded-[10px] p-6 border border-[#2e2e33] min-h-[130px] flex flex-col justify-between">
        <div className="flex items-center justify-between pb-3 border-b border-[#2e2e33]/60 mb-3">
          <span className="text-xs uppercase font-mono font-medium text-[#a1a1a6] flex items-center gap-1.5">
            <Compass size={13} className="text-[#f0f0ee]" />
            Metacognitive Prompt #{current + 1} of {prompts.length}
          </span>
          <span className="text-xs font-mono text-[#a1a1a6]">
            {Math.round(((current + 1) / prompts.length) * 100)}% Complete
          </span>
        </div>
        <p className="text-[#f0f0ee] font-medium text-sm sm:text-base leading-relaxed">
          {prompts[current]}
        </p>
      </div>

      {/* Stepper Controls */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={prev}
          disabled={current === 0}
          className="btn-secondary px-3.5 py-1.5 text-xs"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Previous
        </button>

        {/* Indicator Dots */}
        <div className="flex items-center gap-1.5">
          {prompts.map((_, i) => (
            <button
              type="button"
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? 'w-6 bg-[#f0f0ee]' : 'w-1.5 bg-[#2e2e33] hover:bg-[#a1a1a6]'
              }`}
              aria-label={`Go to prompt ${i + 1}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={next}
          disabled={current === prompts.length - 1}
          className="btn-secondary px-3.5 py-1.5 text-xs"
        >
          Next <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function MetacognitiveAnalysis({ quizId, onOpenMindmap }) {
  const { user, session } = useAuth();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('overview'); // 'overview' | 'diagnostics' | 'remediation' | 'reflection'
  const navigate = useNavigate();

  useEffect(() => {
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
      <div className="space-y-6 max-w-6xl mx-auto py-2">
        <div className="card-standard p-6 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <Skeleton style={{ width: '14rem', height: '1.5rem' }} />
              <Skeleton style={{ width: '22rem', height: '0.9rem' }} />
            </div>
            <Skeleton rounded="999px" style={{ width: '5.5rem', height: '5.5rem' }} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card-standard p-5 space-y-2 animate-pulse">
              <Skeleton style={{ width: '5rem', height: '0.75rem' }} />
              <Skeleton style={{ width: '7rem', height: '1.5rem' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-standard p-8 border-red-500/30 bg-red-950/10 text-center max-w-2xl mx-auto my-6 space-y-3">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
        <h3 className="text-base font-semibold text-[#f0f0ee]">Diagnostic Analysis Unavailable</h3>
        <p className="text-xs text-[#a1a1a6] leading-relaxed">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-secondary text-xs px-4 py-2 mt-2"
        >
          <RefreshCw size={14} /> Retry Analysis
        </button>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="card-standard p-8 text-center max-w-2xl mx-auto my-6 space-y-3">
        <Info className="w-8 h-8 text-[#a1a1a6] mx-auto" />
        <h3 className="text-base font-semibold text-[#f0f0ee]">No Metacognitive Record Found</h3>
        <p className="text-xs text-[#a1a1a6]">
          Complete a quiz session to allow Vela to synthesize cognitive diagnostics.
        </p>
      </div>
    );
  }

  // Derive metrics safely
  const {
    scorePercentage = 0,
    correctCount = 0,
    totalQuestions = 0,
    confidenceLevel = 'Medium',
    performanceSummary,
    patternSpecificity,
    learningPatterns,
    confidenceMismatch,
    behavioralInsight,
    knowledgeGaps,
    reflectionPrompts = [],
    studyStrategies = [],
    recommendedTools = [],
    algorithmicMetrics
  } = analysis;

  const errorProfile = algorithmicMetrics?.errorClustering?.errorTypeProfile || {
    conceptualMisunderstanding: 0,
    recallFailure: 0,
    carelessError: 0,
    unclassified: Math.max(0, totalQuestions - correctCount),
  };

  const confidenceAnalysis = algorithmicMetrics?.confidenceAnalysis || {
    hasConfidenceData: false,
    overconfidentCount: 0,
    underconfidentCount: 0,
    calibrationScore: scorePercentage,
  };

  const calibrationScore = confidenceAnalysis.hasConfidenceData
    ? confidenceAnalysis.calibrationScore
    : Math.min(100, Math.round(scorePercentage * 0.95 + 5));

  const totalErrors = Math.max(0, totalQuestions - correctCount);

  // Calibration badge description
  const getCalibrationStatus = () => {
    if (calibrationScore >= 80) {
      return { label: 'Well Calibrated', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', desc: 'Accurate self-awareness of what you know vs what you need to review.' };
    }
    if (confidenceAnalysis.overconfidentCount > confidenceAnalysis.underconfidentCount) {
      return { label: 'Overconfidence Gap', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10', desc: 'Identified answers where high confidence masked conceptual gaps.' };
    }
    if (confidenceAnalysis.underconfidentCount > 0) {
      return { label: 'Underconfident Precision', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10', desc: 'You knew answers with higher accuracy than your confidence reflected.' };
    }
    return { label: 'Developing Calibration', color: 'text-zinc-400 border-zinc-500/30 bg-zinc-500/10', desc: 'Consistent practice will sharpen your predictive metacognition.' };
  };

  const calibrationStatus = getCalibrationStatus();

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 font-sans">
      
      {/* ─── Top Executive Banner ─── */}
      <div className="card-standard p-6 sm:p-7 relative overflow-hidden bg-gradient-to-r from-[#18181b] via-[#1c1c22] to-[#18181b]">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-[10px] bg-[#22222a] border border-[#2e2e33]">
                <Vela size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#f0f0ee]">
                    Mind's Mirror Diagnostics
                  </h2>
                  <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-mono font-semibold uppercase bg-[#2e2e33] text-[#f0f0ee]">
                    Vela Copilot
                  </span>
                </div>
                <p className="text-xs text-[#a1a1a6] mt-0.5">
                  Cognitive retention analysis &amp; calibration diagnostic for Quiz #{quizId?.slice(-6) || 'Session'}
                </p>
              </div>
            </div>

            {performanceSummary && (
              <div className="pt-2 text-xs sm:text-sm text-[#d4d4d8] leading-relaxed border-t border-[#2e2e33]/60">
                {performanceSummary}
              </div>
            )}

            {onOpenMindmap && (
              <div className="pt-1">
                <button
                  onClick={onOpenMindmap}
                  className="btn-secondary px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5"
                >
                  <Layers size={13} />
                  Open Review Mindmap →
                </button>
              </div>
            )}
          </div>

          {/* Twin Calibration Rings */}
          <div className="flex items-center gap-4 sm:gap-6 bg-[#131519] p-4 rounded-[12px] border border-[#2e2e33] self-stretch sm:self-auto justify-around">
            <CalibrationRing score={scorePercentage} size={90} label="Accuracy" />
            <div className="w-[1px] h-14 bg-[#2e2e33]" />
            <CalibrationRing score={calibrationScore} size={90} label="Calibration" />
          </div>
        </div>
      </div>

      {/* ─── Executive KPI Strip ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="card-standard p-4.5 space-y-1">
          <div className="flex items-center justify-between text-[#a1a1a6]">
            <span className="text-[11px] uppercase font-mono tracking-wider">Total Questions</span>
            <BookOpen size={14} />
          </div>
          <div className="text-xl font-semibold font-mono text-[#f0f0ee]">
            {correctCount} <span className="text-xs text-[#a1a1a6] font-normal font-sans">/ {totalQuestions} answered correctly</span>
          </div>
        </div>

        <div className="card-standard p-4.5 space-y-1">
          <div className="flex items-center justify-between text-[#a1a1a6]">
            <span className="text-[11px] uppercase font-mono tracking-wider">Calibration State</span>
            <ShieldCheck size={14} className="text-[#a1a1a6]" />
          </div>
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className={`px-2 py-0.5 rounded-[6px] text-xs font-medium border ${calibrationStatus.color}`}>
              {calibrationStatus.label}
            </span>
          </div>
        </div>

        <div className="card-standard p-4.5 space-y-1">
          <div className="flex items-center justify-between text-[#a1a1a6]">
            <span className="text-[11px] uppercase font-mono tracking-wider">Conceptual Gaps</span>
            <AlertCircle size={14} className="text-rose-400" />
          </div>
          <div className="text-xl font-semibold font-mono text-rose-400">
            {errorProfile.conceptualMisunderstanding}{' '}
            <span className="text-xs text-[#a1a1a6] font-normal font-sans">flagged items</span>
          </div>
        </div>

        <div className="card-standard p-4.5 space-y-1">
          <div className="flex items-center justify-between text-[#a1a1a6]">
            <span className="text-[11px] uppercase font-mono tracking-wider">Recall Latency</span>
            <Brain size={14} className="text-blue-400" />
          </div>
          <div className="text-xl font-semibold font-mono text-blue-400">
            {errorProfile.recallFailure}{' '}
            <span className="text-xs text-[#a1a1a6] font-normal font-sans">memory slips</span>
          </div>
        </div>
      </div>

      {/* ─── Navigation Sub-Tabs ─── */}
      <div className="flex items-center gap-2 border-b border-[#2e2e33] pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: '1. Diagnostic Overview', icon: Activity },
          { id: 'diagnostics', label: '2. Cognitive Patterns & Gaps', icon: Target },
          { id: 'remediation', label: '3. Action Plan & Studio Tools', icon: Zap },
          { id: 'reflection', label: '4. Metacognitive Prompts', icon: Compass },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-[#22222a] text-[#f0f0ee] border border-[#2e2e33]'
                  : 'text-[#a1a1a6] hover:text-[#f0f0ee] hover:bg-[#18181b]'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-[#f0f0ee]' : 'text-[#a1a1a6]'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── SECTION 1: Diagnostic Overview ─── */}
      {(activeSection === 'overview' || activeSection === 'all') && (
        <div className="space-y-6">
          {/* Error Taxonomy 3-Pillars Card */}
          <div className="card-standard p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[#f0f0ee] uppercase tracking-wider font-mono">
                  Error Taxonomy &amp; Knowledge Breakdown
                </h3>
                <p className="text-xs text-[#a1a1a6] mt-0.5">
                  Mind's Mirror classifies mistakes by confidence vs correctness to distinguish concept gaps from quick recall slips.
                </p>
              </div>
              <span className="text-xs font-mono text-[#a1a1a6] bg-[#131519] px-2.5 py-1 rounded-[6px] border border-[#2e2e33]">
                {totalErrors} total missed items
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Pillar 1: Conceptual Misunderstanding */}
              <div className="bg-[#131519] p-5 rounded-[10px] border border-rose-500/20 hover:border-rose-500/40 transition-colors space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <AlertCircle size={14} /> Conceptual Gap
                  </span>
                  <span className="font-mono text-lg font-bold text-rose-400">
                    {errorProfile.conceptualMisunderstanding}
                  </span>
                </div>
                <p className="text-xs text-[#a1a1a6] leading-relaxed">
                  High confidence with incorrect selection. Indicates a fundamental misunderstanding of underlying mechanics rather than a memory lapse.
                </p>
                <div className="text-[11px] font-medium text-rose-300 bg-rose-500/10 px-2.5 py-1 rounded-[6px] inline-block border border-rose-500/20">
                  Priority: Concept Re-study
                </div>
              </div>

              {/* Pillar 2: Recall Failure */}
              <div className="bg-[#131519] p-5 rounded-[10px] border border-blue-500/20 hover:border-blue-500/40 transition-colors space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Brain size={14} /> Recall Latency
                  </span>
                  <span className="font-mono text-lg font-bold text-blue-400">
                    {errorProfile.recallFailure}
                  </span>
                </div>
                <p className="text-xs text-[#a1a1a6] leading-relaxed">
                  Low confidence with incorrect answer. You were uncertain and could not retrieve the fact under test conditions.
                </p>
                <div className="text-[11px] font-medium text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-[6px] inline-block border border-blue-500/20">
                  Priority: Spaced Flashcards
                </div>
              </div>

              {/* Pillar 3: Careless / Precision */}
              <div className="bg-[#131519] p-5 rounded-[10px] border border-amber-500/20 hover:border-amber-500/40 transition-colors space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <HelpCircle size={14} /> Precision Slip
                  </span>
                  <span className="font-mono text-lg font-bold text-amber-400">
                    {errorProfile.carelessError + (errorProfile.unclassified || 0)}
                  </span>
                </div>
                <p className="text-xs text-[#a1a1a6] leading-relaxed">
                  Medium confidence or subtle wording distraction. Prompt misreading or edge case phrasing rather than knowledge deficit.
                </p>
                <div className="text-[11px] font-medium text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-[6px] inline-block border border-amber-500/20">
                  Priority: Deliberate Review
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row: Performance Doughnut & Competency Radar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Doughnut Breakdown */}
            <div className="card-standard p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PieChart size={16} className="text-[#f0f0ee]" />
                  <h4 className="text-sm font-semibold text-[#f0f0ee]">Response Distribution</h4>
                </div>
                <span className="text-xs font-mono text-[#a1a1a6]">{scorePercentage}% Accuracy</span>
              </div>
              <div className="h-64 flex items-center justify-center">
                <Doughnut
                  data={{
                    labels: ['Correct', 'Conceptual Gap', 'Recall Slip', 'Precision Slip'],
                    datasets: [
                      {
                        data: [
                          correctCount,
                          errorProfile.conceptualMisunderstanding,
                          errorProfile.recallFailure,
                          errorProfile.carelessError + (errorProfile.unclassified || 0),
                        ],
                        backgroundColor: [
                          'rgba(16, 185, 129, 0.85)',
                          'rgba(239, 68, 68, 0.85)',
                          'rgba(59, 130, 246, 0.85)',
                          'rgba(245, 158, 11, 0.85)',
                        ],
                        borderColor: '#18181b',
                        borderWidth: 2,
                        cutout: '72%',
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          color: '#a1a1a6',
                          font: { family: 'DM Sans', size: 11 },
                          padding: 14,
                        },
                      },
                      tooltip: {
                        backgroundColor: '#18181b',
                        titleColor: '#f0f0ee',
                        bodyColor: '#a1a1a6',
                        borderColor: '#2e2e33',
                        borderWidth: 1,
                        padding: 10,
                        boxPadding: 4,
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Competency Multi-Axis Radar */}
            <div className="card-standard p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-[#f0f0ee]" />
                  <h4 className="text-sm font-semibold text-[#f0f0ee]">Cognitive Competency Matrix</h4>
                </div>
                <span className="text-xs font-mono text-[#a1a1a6]">Multi-Axis Profile</span>
              </div>
              <div className="h-64 flex items-center justify-center">
                <Radar
                  data={{
                    labels: ['Accuracy', 'Calibration', 'Retention', 'Consistency', 'Complexity'],
                    datasets: [
                      {
                        label: 'Cognitive Score',
                        data: [
                          scorePercentage,
                          calibrationScore,
                          Math.max(30, 100 - errorProfile.recallFailure * 15),
                          Math.max(40, 100 - (totalErrors / Math.max(1, totalQuestions)) * 40),
                          Math.min(95, scorePercentage > 70 ? scorePercentage + 5 : scorePercentage + 15),
                        ],
                        backgroundColor: 'rgba(240, 240, 238, 0.08)',
                        borderColor: '#f0f0ee',
                        borderWidth: 1.5,
                        pointBackgroundColor: '#f0f0ee',
                        pointBorderColor: '#18181b',
                        pointRadius: 4,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { display: false, stepSize: 25 },
                        grid: { color: 'rgba(46, 46, 51, 0.8)' },
                        angleLines: { color: 'rgba(46, 46, 51, 0.8)' },
                        pointLabels: {
                          color: '#a1a1a6',
                          font: { family: 'DM Sans', size: 10.5 },
                        },
                      },
                    },
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: '#18181b',
                        titleColor: '#f0f0ee',
                        bodyColor: '#a1a1a6',
                        borderColor: '#2e2e33',
                        borderWidth: 1,
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── SECTION 2: Cognitive Patterns & Diagnostics ─── */}
      {(activeSection === 'diagnostics' || activeSection === 'all') && (
        <div className="space-y-6">
          {/* Specific Pattern Identified */}
          {(patternSpecificity || learningPatterns) && (
            <div className="card-standard p-6 border-l-4 border-l-[#f0f0ee] space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#a1a1a6]">
                <Target size={14} className="text-[#f0f0ee]" />
                Identified Pattern &amp; Underlying Root Cause
              </div>
              <p className="text-sm sm:text-base text-[#f0f0ee] leading-relaxed font-medium">
                {patternSpecificity || learningPatterns}
              </p>
            </div>
          )}

          {/* Confidence Gap Alert */}
          {confidenceMismatch && confidenceMismatch !== 'null' && (
            <div className="card-standard p-6 border-amber-500/30 bg-amber-500/5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider font-mono">
                <AlertTriangle size={14} />
                Confidence Calibration Mismatch Alert
              </div>
              <p className="text-xs sm:text-sm text-[#f0f0ee] leading-relaxed">
                {confidenceMismatch}
              </p>
            </div>
          )}

          {/* Behavioral Reasoning Insight */}
          {behavioralInsight && (
            <div className="card-standard p-6 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#a1a1a6]">
                <Activity size={14} className="text-[#f0f0ee]" />
                Cognitive Reasoning &amp; Problem Approach
              </div>
              <p className="text-xs sm:text-sm text-[#d4d4d8] leading-relaxed">
                {behavioralInsight}
              </p>
            </div>
          )}

          {/* Topic Error Distribution & Keywords */}
          {algorithmicMetrics?.questionClassification?.typeBreakdown?.length > 0 && (
            <div className="card-standard p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-[#f0f0ee] flex items-center gap-2">
                    <BarChart3 size={15} /> Topic Vulnerability Breakdown
                  </h4>
                  <p className="text-xs text-[#a1a1a6] mt-0.5">
                    Error clustering mapped across quiz sub-domains.
                  </p>
                </div>
              </div>

              <div className="h-56">
                <Bar
                  data={{
                    labels: algorithmicMetrics.questionClassification.typeBreakdown.map(t => t.type),
                    datasets: [
                      {
                        label: 'Errors Recorded',
                        data: algorithmicMetrics.questionClassification.typeBreakdown.map(t => t.errorCount),
                        backgroundColor: '#ef4444',
                        borderRadius: 6,
                        barThickness: 24,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      x: {
                        ticks: { color: '#a1a1a6', font: { size: 10 } },
                        grid: { display: false },
                      },
                      y: {
                        beginAtZero: true,
                        ticks: { color: '#a1a1a6', stepSize: 1 },
                        grid: { color: 'rgba(46, 46, 51, 0.6)' },
                      },
                    },
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: '#18181b',
                        titleColor: '#f0f0ee',
                        bodyColor: '#a1a1a6',
                        borderColor: '#2e2e33',
                        borderWidth: 1,
                      },
                    },
                  }}
                />
              </div>

              {/* Error Signature Keywords */}
              {algorithmicMetrics?.errorClustering?.errorSignatureWords?.length > 0 && (
                <div className="pt-3 border-t border-[#2e2e33] flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-[#a1a1a6] font-mono">Recurring Error Keywords:</span>
                  {algorithmicMetrics.errorClustering.errorSignatureWords.map((word, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-[6px] bg-[#131519] border border-[#2e2e33] text-xs font-mono text-[#f0f0ee]"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Areas to Focus on / Knowledge Gaps */}
          {knowledgeGaps && (
            <div className="card-standard p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb size={16} className="text-[#f0f0ee]" />
                <h4 className="text-sm font-semibold text-[#f0f0ee]">Targeted Knowledge Gaps</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {(typeof knowledgeGaps === 'string' ? knowledgeGaps.split(/[,;.]/) : Array.isArray(knowledgeGaps) ? knowledgeGaps : [])
                  .filter(gap => gap && String(gap).trim().length > 3)
                  .map((gap, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-[8px] bg-[#131519] border border-[#2e2e33] text-xs font-medium text-[#f0f0ee] flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      {String(gap).trim()}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── SECTION 3: Action Plan & Interactive Studio Tools ─── */}
      {(activeSection === 'remediation' || activeSection === 'all') && (
        <div className="space-y-6">
          {/* Vela's Prescribed Studio Tools */}
          {recommendedTools && recommendedTools.length > 0 && (
            <div className="card-standard p-6 space-y-4 border border-[#2e2e33]">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-[8px] bg-[#f0f0ee] text-[#121214]">
                    <Zap size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#f0f0ee]">
                      Vela's Prescribed Remediation Tools
                    </h3>
                    <p className="text-xs text-[#a1a1a6]">
                      Targeted interactive canvases custom synthesized to dismantle your exact error patterns.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-[#a1a1a6] bg-[#131519] px-2.5 py-1 rounded-[6px] border border-[#2e2e33]">
                  {recommendedTools.length} Custom Tools Ready
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {recommendedTools.map((tool, idx) => (
                  <div
                    key={idx}
                    className="bg-[#131519] p-5 rounded-[12px] border border-[#2e2e33] hover:border-[#f0f0ee] transition-all flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-[6px] text-[10px] uppercase font-mono font-semibold bg-[#22222a] text-[#f0f0ee] border border-[#2e2e33]">
                          {tool.toolType || 'Study Canvas'}
                        </span>
                        <Sparkles size={14} className="text-[#a1a1a6] group-hover:text-[#f0f0ee] transition-colors" />
                      </div>
                      <h4 className="text-sm font-semibold text-[#f0f0ee] group-hover:text-white transition-colors">
                        {tool.title}
                      </h4>
                      <p className="text-xs text-[#a1a1a6] leading-relaxed line-clamp-3">
                        {tool.description}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        navigate('/Learningplayground', {
                          state: {
                            initialPrompt: tool.prompt,
                            analysis: analysis,
                            quizResults: algorithmicMetrics?.questionClassification?.typeBreakdown
                          }
                        });
                      }}
                      className="btn-primary w-full py-2 text-xs font-medium inline-flex items-center justify-center gap-2"
                    >
                      <PlayCircle size={14} /> Launch in Interactive Studio
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sequential Revision Roadmap */}
          {studyStrategies && (
            <div className="card-standard p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Brain size={16} className="text-[#f0f0ee]" />
                <h4 className="text-sm font-semibold text-[#f0f0ee]">Actionable Study Roadmap</h4>
              </div>

              <div className="space-y-3">
                {(typeof studyStrategies === 'string' ? studyStrategies.split(/\n+/) : Array.isArray(studyStrategies) ? studyStrategies : [])
                  .filter(s => s && String(s).trim().length > 8)
                  .map((strategy, idx, arr) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3.5 p-4 rounded-[10px] bg-[#131519] border border-[#2e2e33]"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#22222a] border border-[#2e2e33] flex items-center justify-center text-xs font-mono font-semibold text-[#f0f0ee] flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="text-xs sm:text-sm text-[#d4d4d8] leading-relaxed">
                        {String(strategy).replace(/^[•\-\d.]+\s*/, '').trim()}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── SECTION 4: Metacognitive Reflection ─── */}
      {(activeSection === 'reflection' || activeSection === 'all') && (
        <div className="space-y-6">
          <div className="card-standard p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[#f0f0ee] uppercase tracking-wider font-mono flex items-center gap-2">
                <MessageCircle size={15} /> Guided Metacognitive Reflection
              </h3>
              <p className="text-xs text-[#a1a1a6] mt-0.5">
                Active self-interrogation develops lasting recall pathways and repairs conceptual blind spots.
              </p>
            </div>

            <ReflectionStepper prompts={reflectionPrompts} />
          </div>

          {/* Confidence Calibration Details */}
          {confidenceAnalysis?.hasConfidenceData && (
            <div className="card-standard p-6 space-y-4">
              <h4 className="text-sm font-semibold text-[#f0f0ee] flex items-center gap-2">
                <Activity size={15} /> Response Confidence Distribution
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-4 rounded-[10px] bg-[#131519] border border-[#2e2e33] space-y-1">
                  <div className="text-[10px] uppercase font-mono text-[#a1a1a6]">Overconfident</div>
                  <div className="text-lg font-mono font-semibold text-amber-400">
                    {confidenceAnalysis.overconfidentCount}
                  </div>
                  <p className="text-[11px] text-[#a1a1a6]">High rating on missed items</p>
                </div>

                <div className="p-4 rounded-[10px] bg-[#131519] border border-[#2e2e33] space-y-1">
                  <div className="text-[10px] uppercase font-mono text-[#a1a1a6]">Underconfident</div>
                  <div className="text-lg font-mono font-semibold text-blue-400">
                    {confidenceAnalysis.underconfidentCount}
                  </div>
                  <p className="text-[11px] text-[#a1a1a6]">Low rating on correct items</p>
                </div>

                <div className="p-4 rounded-[10px] bg-[#131519] border border-[#2e2e33] space-y-1">
                  <div className="text-[10px] uppercase font-mono text-[#a1a1a6]">Calibration Index</div>
                  <div className="text-lg font-mono font-semibold text-emerald-400">
                    {confidenceAnalysis.calibrationScore}%
                  </div>
                  <p className="text-[11px] text-[#a1a1a6]">Predictive alignment score</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Footer Diagnostic Note ─── */}
      <div className="p-4 rounded-[10px] bg-[#131519] border border-[#2e2e33] flex items-start gap-3 text-xs text-[#a1a1a6]">
        <Info size={16} className="text-[#a1a1a6] flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#f0f0ee]">Automated Diagnostic Guidance: </span>
          Mind's Mirror models your learning habits based on current and historical response trajectories. Use these insights in the Interactive Studio to target weak spots systematically before exams.
        </div>
      </div>

    </div>
  );
}
