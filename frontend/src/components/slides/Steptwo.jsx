import React, { useCallback, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Vela from "../Vela.jsx";
import { useAuth } from "../../AuthContext";
import { supabase } from "../../supabaseClient";
import { Skeleton } from "../Skeleton.jsx";

// Handles StepTwo logic.
export default function StepTwo({ onNext, retakePayload = null }) {
  const { currentDocumentId, currentDocumentTitle } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [fetchingMindmap, _setFetchingMindmap] = useState(false);
  const [score, setScore] = useState(null);
  const [showScore, setShowScore] = useState(false);
  const [mindmapData, setMindmapData] = useState(undefined);
  const [quizResults, setQuizResults] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState(null);
  const [validationMessage, setValidationMessage] = useState('');
  
  const questionEnterTime = useRef(Date.now());
  const timeSpentOnQuestion = useRef([]); // cumulative time per question
  
  const answerChangeCounts = useRef({}); // i → how many times answer was changed
  const answerTimestamps = useRef({}); // i -> time spent before FIRST answer
  const fetchInProgressRef = useRef(false); // Prevent duplicate requests

  const getQuizCacheKey = useCallback(() => {
    if (retakePayload?.retakeOfQuizId) return `quiz_questions_retake_${retakePayload.retakeOfQuizId}`;
    if (currentDocumentId) return `quiz_questions_doc_${currentDocumentId}`;
    return 'quiz_questions_fallback';
  }, [currentDocumentId, retakePayload?.retakeOfQuizId]);

  const loadQuestionsFromCache = useCallback(() => {
    try {
      const cacheKey = getQuizCacheKey();
      const raw = sessionStorage.getItem(cacheKey);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      const isFresh = Date.now() - Number(parsed?.createdAt || 0) < 10 * 60 * 1000;
      if (!isFresh || !Array.isArray(parsed?.questions) || parsed.questions.length === 0) {
        sessionStorage.removeItem(cacheKey);
        return null;
      }
      return parsed.questions;
    } catch {
      return null;
    }
  }, [getQuizCacheKey]);

  const saveQuestionsToCache = useCallback((nextQuestions) => {
    if (!Array.isArray(nextQuestions) || nextQuestions.length === 0) return;
    try {
      sessionStorage.setItem(
        getQuizCacheKey(),
        JSON.stringify({ questions: nextQuestions, createdAt: Date.now() })
      );
    } catch {
      // Ignore cache write failures (private mode / storage limit)
    }
  }, [getQuizCacheKey]);

  // helpers go HERE
  const normalize = (v) =>
    String(v ?? "")
      .trim()
      .toLowerCase();

  // Handles getCorrectAnswer logic.
  const getCorrectAnswer = (q) => {
    if (!q) return undefined;
    if (typeof q.answer === "number") return q.choices?.[q.answer];
    if (typeof q.answer === "string" && /^\d+$/.test(q.answer))
      return q.choices?.[Number(q.answer)];
    return q.answer;
  };

  // Handles fetchQuestions logic.
  const fetchQuestions = useCallback(async () => {
    // Prevent duplicate requests
    if (fetchInProgressRef.current) {
      return;
    }

    if (Array.isArray(retakePayload?.retakeQuestions) && retakePayload.retakeQuestions.length > 0) {
      const retakeQuestions = retakePayload.retakeQuestions
        .filter((q) => q && q.prompt && Array.isArray(q.choices) && q.choices.length > 1)
        .map((q) => ({
          prompt: q.prompt,
          choices: q.choices,
          answer: q.correctAnswer,
        }));

      if (!retakeQuestions.length) {
        setErrorMessage('Retake data is invalid. Please open the quiz again and retry.');
        return;
      }

      setQuestions(retakeQuestions);
      setAnswers(Array(retakeQuestions.length).fill(null));
      timeSpentOnQuestion.current = Array(retakeQuestions.length).fill(0);
      questionEnterTime.current = Date.now();
      return;
    }

    const cachedQuestions = loadQuestionsFromCache();
    if (cachedQuestions) {
      setQuestions(cachedQuestions);
      setAnswers(Array(cachedQuestions.length).fill(null));
      timeSpentOnQuestion.current = Array(cachedQuestions.length).fill(0);
      questionEnterTime.current = Date.now();
      return;
    }

    fetchInProgressRef.current = true;
    setLoading(true);
    setErrorMessage('');
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setErrorMessage('Your session has expired. Please refresh the page and log in again.');
        setLoading(false);
        fetchInProgressRef.current = false;
        return;
      }

      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const resp = await fetch(`${API_BASE}/api/generate-questions`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        credentials: 'include',
        body: JSON.stringify({ 
          queryText: "Generate questions", 
          count: 15,
          documentId: currentDocumentId
        })
      });
      const data = await resp.json();
      if (!resp.ok) {
        console.error("Question generation error:", data);
        if (resp.status === 429 && data?.errorCode === 'FREE_TIER_LIMIT_REACHED') {
          const limit = Number.isFinite(data?.limit) ? data.limit : 5;
          setErrorMessage(`Daily study-session limit reached (${limit}/${limit} used). Try again tomorrow.`);
        } else {
          setErrorMessage(data?.error || 'Failed to generate questions. Please try again');
        }
        setQuestions([]);
        setAnswers([]);
        return;
      }
      const generatedQuestions = data.questions || [];
      setQuestions(generatedQuestions);
      setAnswers(Array(generatedQuestions.length).fill(null));
      timeSpentOnQuestion.current = Array(generatedQuestions.length).fill(0);
      questionEnterTime.current = Date.now();
      saveQuestionsToCache(generatedQuestions);
    } catch (e) {
      console.error("Quiz loading error:", e);
      setErrorMessage('Unable to load quiz. Please try again');
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [currentDocumentId, retakePayload, loadQuestionsFromCache, saveQuestionsToCache]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Handles selectAnswer logic.
  // Function to accurately update time spent on the current question
  const updateTimeSpent = () => {
    const now = Date.now();
    const elapsed = now - questionEnterTime.current;
    if (typeof timeSpentOnQuestion.current[currentQuestionIndex] !== 'number') {
      timeSpentOnQuestion.current[currentQuestionIndex] = 0;
    }
    timeSpentOnQuestion.current[currentQuestionIndex] += elapsed;
    questionEnterTime.current = now;
  };

  const selectAnswer = (i, c) => {
    const copy = [...answers];
    if (answerTimestamps.current[i] === undefined) {
      updateTimeSpent(); // add elapsed time so far
      answerTimestamps.current[i] = timeSpentOnQuestion.current[i];
    } else {
      answerChangeCounts.current[i] = (answerChangeCounts.current[i] || 0) + 1;
    }
    copy[i] = c;
    setAnswers(copy);
    if (validationMessage) {
      setValidationMessage('');
    }
  };

  const handleNext = () => {
    if (answers[currentQuestionIndex] === null) {
      setValidationMessage('Please select an answer to continue.');
      return;
    }
    setValidationMessage('');
    updateTimeSpent();
    setCurrentQuestionIndex(prev => prev + 1);
  };

  const handlePrev = () => {
    if (validationMessage) {
      setValidationMessage('');
    }
    updateTimeSpent();
    setCurrentQuestionIndex(prev => prev - 1);
  };

  const handleFinish = async () => {
    updateTimeSpent();
    const wrongQs = questions.filter((q, i) => {
      const correct = getCorrectAnswer(q);
        const selected = answers[i];
        const choices = q.choices || [];

        // find selected index by exact normalized match or by starting letter
        let selectedIdx = choices.findIndex((ch) => normalize(ch) === normalize(selected ?? ""));
        if (selectedIdx === -1 && typeof selected === 'string' && selected.trim().length === 1) {
          const letter = selected.trim().toUpperCase();
          selectedIdx = letter.charCodeAt(0) - 65; // 'A' -> 0
        }
        if (selectedIdx === -1) {
          // try matching by first character of choice labels (e.g. "A) ...")
          selectedIdx = choices.findIndex((ch) => {
            const first = String(ch || "").trim().charAt(0).toUpperCase();
            return first && typeof selected === 'string' && selected.trim().toUpperCase() === first;
          });
        }

        // determine correct index similarly
        let correctIdx = -1;
        if (typeof q.answer === 'number') correctIdx = q.answer;
        else if (typeof q.answer === 'string' && /^\d+$/.test(q.answer)) correctIdx = Number(q.answer);
        else if (typeof correct === 'string' && correct.trim().length === 1) {
          correctIdx = correct.trim().toUpperCase().charCodeAt(0) - 65;
        } else {
          correctIdx = choices.findIndex((ch) => normalize(ch) === normalize(correct ?? ""));
          if (correctIdx === -1) {
            // try match where choice starts with the correct token (e.g. 'A.' or 'A)')
            correctIdx = choices.findIndex((ch) => {
              const token = String(correct || "").trim().charAt(0).toUpperCase();
              const first = String(ch || "").trim().charAt(0).toUpperCase();
              return token && first === token;
            });
          }
        }

        if (selectedIdx !== -1 && correctIdx !== -1) {
          return selectedIdx !== correctIdx;
        }

        // final fallback to string compare
        return normalize(selected) !== normalize(correct);
    });

    // Construct quiz results object
    const totalElapsed = timeSpentOnQuestion.current.reduce((a, b) => a + b, 0) / 1000; // sum of all time spent in seconds
    const avgTimePerQ = totalElapsed / questions.length;

    const quizResults = questions.map((q, i) => {
      // Time spent before the FIRST answer
      const firstAnswerTime = answerTimestamps.current[i] !== undefined 
        ? answerTimestamps.current[i] / 1000
        : timeSpentOnQuestion.current[i] / 1000;
      const changes = answerChangeCounts.current[i] || 0;

      // Confidence on 1–5 scale:
      // fast + no changes → 5, slow + changed → 1
      let confidence;
      if (changes >= 2) {
        confidence = 1; // very uncertain — changed mind multiple times
      } else if (changes === 1) {
        confidence = 2; // uncertain — changed once
      } else if (firstAnswerTime <= avgTimePerQ * 0.5) {
        confidence = 5; // very fast, no changes → very confident
      } else if (firstAnswerTime <= avgTimePerQ) {
        confidence = 4; // reasonably fast → confident
      } else if (firstAnswerTime <= avgTimePerQ * 1.75) {
        confidence = 3; // average pace → neutral
      } else {
        confidence = 2; // slow → uncertain
      }

      return {
        id: i,
        prompt: q.prompt,
        choices: q.choices,
        userAnswer: answers[i],
        correctAnswer: getCorrectAnswer(q),
        isCorrect: !wrongQs.find(wq => wq === q),
        confidence,
      };
    });

    const score = questions.length - wrongQs.length;
    setScore(score);
    setShowScore(true);
    setQuizResults(quizResults);

    // Save perfect score state if no wrong questions
    if (wrongQs.length === 0) {
      setMindmapData({ _perfect: true });
    } else {
      setMindmapData({ wrongQuestions: wrongQs });
    }
  };

  const handleGoToMindsMirror = async () => {
    setSaveStatus('Saving quiz...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error("No session");

      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await axios.post(
        `${API_BASE}/api/save-quiz-mindmap`,
        {
          title: retakePayload?.retakeTitle || currentDocumentTitle || `Quiz - ${new Date().toLocaleDateString()}`,
          quizResults: quizResults || [],
          mindmapNodes: { nodes: [], edges: [] }, // Mindmap is not generated yet, it generates on demand in minds mirror or learning playground
          retakeOfQuizId: retakePayload?.retakeOfQuizId || null,
        },
        { headers: { Authorization: `Bearer ${accessToken}` }, withCredentials: true }
      );
      
      const quizId = res.data.data?.id || res.data.id;
      if (quizId) {
        // Prime QuizDetail cache so route load is deterministic.
        const savedQuizPayload = {
          id: quizId,
          title: retakePayload?.retakeTitle || currentDocumentTitle || `Quiz - ${new Date().toLocaleDateString()}`,
          quiz: quizResults || [],
          mindmap: { nodes: [], edges: [] },
          created_at: new Date().toISOString(),
        };
        sessionStorage.setItem(`quiz_${quizId}`, JSON.stringify(savedQuizPayload));

        // Ensure it is visible in history before navigation.
        let existsInHistory = false;
        for (let attempt = 0; attempt < 4; attempt++) {
          try {
            const historyRes = await fetch(
              `${API_BASE}/api/quiz-history`,
              {
                headers: { Authorization: `Bearer ${accessToken}` },
                credentials: 'include',
              }
            );

            if (historyRes.ok) {
              const historyData = await historyRes.json();
              const rows = Array.isArray(historyData?.data) ? historyData.data : [];
              existsInHistory = rows.some((row) => Number(row?.id) === Number(quizId));
              if (existsInHistory) break;
            }
          } catch {
            // Keep trying for a short bounded window.
          }

          await new Promise((resolve) => setTimeout(resolve, 350));
        }

        if (!existsInHistory) {
          setSaveStatus('Saved, finalizing your session...');
        }

        navigate(`/quiz/${quizId}`);
      } else {
        throw new Error("No quiz ID returned");
      }
    } catch (err) {
      console.error("Failed to save quiz for Mind's Mirror:", err);
      setSaveStatus('Failed to open Mind\'s Mirror. Please try again.');
    }
  };

  if (loading) return (
    <div style={{ flex: 1, padding: '20px', maxWidth: '800px', margin: '0 auto', width: '100%' }} role="status" aria-live="polite" aria-atomic="true">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <Skeleton style={{ height: '0.85rem', width: '10rem' }} />
        <div style={{ display: 'flex', gap: '4px' }}>
          {Array.from({ length: 8 }).map((_, idx) => (
            <Skeleton key={`quiz-progress-skeleton-${idx}`} rounded="2px" style={{ width: '30px', height: '4px' }} />
          ))}
        </div>
      </div>

      <div className="card-standard mb-6" aria-hidden>
        <Skeleton style={{ height: '1.25rem', width: '86%' }} />
        <Skeleton className="mt-3" style={{ height: '1rem', width: '72%' }} />

        <div className="flex flex-col gap-3 mt-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={`quiz-option-skeleton-${idx}`} className="border border-[#2e2e33] bg-[#131519] rounded-[10px] p-4 flex items-center gap-3">
              <Skeleton rounded="999px" style={{ width: '1rem', height: '1rem' }} />
              <Skeleton style={{ height: '0.85rem', width: `${84 - idx * 8}%` }} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <Skeleton rounded="10px" style={{ width: '8rem', height: '2.8rem' }} />
        <Skeleton rounded="10px" style={{ width: '9rem', height: '2.8rem' }} />
      </div>
    </div>
  );

  if (!questions.length) {
    return (
      <div className="card-standard max-w-xl mx-auto p-6 text-center text-xs text-[#a1a1a6]" role={errorMessage ? 'alert' : 'status'} aria-live={errorMessage ? 'assertive' : 'polite'}>
        {errorMessage || 'No questions found.'}
      </div>
    );
  }

  // ── Mindmap loading overlay ──────────────────────────────────────────────────
  const mindmapSteps = [
    { label: 'Analysing your incorrect answers', icon: '🔍' },
    { label: 'Searching your study documents', icon: '📄' },
    { label: 'Generating corrective explanations', icon: '🧠' },
    { label: 'Building your mindmap', icon: '🗺️' },
  ];

  const MindmapLoader = () => (
    <div className="fixed inset-0 z-50 bg-[#121214]/80 backdrop-blur-md flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="mindmap-loader-title" aria-describedby="mindmap-loader-desc">
      <div className="card-standard max-w-md w-full p-6 sm:p-8 text-center shadow-2xl border border-[#2e2e33]">
        {/* Animating face */}
        <div className="mb-4 flex justify-center">
          <Vela size={80} loading={true} />
        </div>
        <h2 id="mindmap-loader-title" className="text-lg font-semibold tracking-tight text-[#f0f0ee] mb-1">
          Synthesizing Mind's Mirror
        </h2>
        <p id="mindmap-loader-desc" className="text-xs text-[#a1a1a6] mb-6">
          Personalising review nodes and diagnostic explanations from your study materials.
        </p>

        {/* Step list */}
        <div className="flex flex-col gap-2 text-left mb-6">
          {mindmapSteps.map((step, idx) => (
            <div key={idx} className="flex items-center gap-2.5 p-2.5 rounded-[10px] bg-[#131519] border border-[#2e2e33]">
              <span className="text-base">{step.icon}</span>
              <span className="text-xs text-[#f0f0ee] flex-1">{step.label}</span>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-[#f0f0ee] border-t-transparent animate-spin shrink-0" />
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="bg-[#131519] border border-[#2e2e33] rounded-full h-1.5 overflow-hidden">
          <div className="h-full rounded-full bg-[#f0f0ee] animate-[mmProgress_40s_linear_forwards]" />
        </div>

        <style>{`
          @keyframes mmProgress { from{width:0%} to{width:95%} }
        `}</style>
      </div>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        Building your mindmap. This may take up to one minute.
      </p>
    </div>
  );

  //Shows quiz questions
  const q = questions[currentQuestionIndex];
  
  return (
    <div className="flex flex-col min-h-full">
      {fetchingMindmap && <MindmapLoader />}

      {!showScore ? (
        <div className="flex-1 p-4 max-w-3xl mx-auto w-full">
          {/* Progress Indicator */}
          <div className="flex justify-between items-center mb-6">
            <span className="text-xs font-medium uppercase tracking-wider text-[#a1a1a6]">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <div className="flex gap-1.5">
              {questions.map((_, idx) => (
                <div 
                  key={idx}
                  className={`w-7 h-1 rounded-full transition-colors ${
                    idx === currentQuestionIndex 
                      ? 'bg-[#f0f0ee]' 
                      : answers[idx] 
                        ? 'bg-[#f0f0ee]/60' 
                        : 'bg-[#2e2e33]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Question Card */}
          <div className="card-standard p-6 sm:p-8 mb-6">
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-[#f0f0ee] mb-6 leading-relaxed">
              {q.prompt}
            </h2>
            
            <div className="flex flex-col gap-3">
              {(q.choices || []).map((c, idx) => {
                const isSelected = answers[currentQuestionIndex] === c;
                return (
                  <label 
                    key={idx} 
                    className={`flex items-center p-4 rounded-[10px] border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#f0f0ee] bg-[#131519] text-[#f0f0ee] shadow-sm'
                        : 'border-[#2e2e33] hover:border-[#404047] bg-[#18181b]/50 text-[#a1a1a6]'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q${currentQuestionIndex}`}
                      value={c}
                      checked={isSelected}
                      onChange={(e) => selectAnswer(currentQuestionIndex, e.target.value)}
                      className="mr-3.5 accent-[#f0f0ee]"
                    />
                    <span className="text-sm font-medium">{c}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button 
              onClick={handlePrev} 
              disabled={currentQuestionIndex === 0}
              className="btn-secondary px-5 py-2.5 text-xs disabled:opacity-40"
            >
              Previous
            </button>

            {currentQuestionIndex < questions.length - 1 ? (
              <button 
                onClick={handleNext}
                className="btn-primary px-6 py-2.5 text-xs font-medium"
              >
                Next Question →
              </button>
            ) : (
              <button 
                onClick={handleFinish}
                className="btn-primary px-6 py-2.5 text-xs font-medium !bg-emerald-400 !text-[#121214] hover:!bg-emerald-300"
              >
                Finish Quiz ✓
              </button>
            )}
          </div>

          {validationMessage && (
            <div role="alert" className="mt-4 p-3 rounded-[10px] bg-[#ef4444]/10 border border-[#ef4444]/30 text-xs text-[#f87171]">
              {validationMessage}
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 max-w-3xl mx-auto w-full space-y-8">
          <div className="text-center card-standard p-8">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#f0f0ee] mb-2">Quiz Complete</h2>
            <div className="text-sm text-[#a1a1a6]">
              You scored <span className="text-lg font-semibold text-[#f0f0ee]">{score}</span> out of {questions.length}
            </div>

            {saveStatus && (
               <div role="status" aria-live="polite" aria-atomic="true" className="mt-3 text-xs text-[#a1a1a6]">
                 {saveStatus}
               </div>
            )}

            <div className="flex gap-3 justify-center mt-6 flex-wrap">
              <button 
                onClick={handleGoToMindsMirror} 
                className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs"
              >
                Mind's Mirror Diagnostics ✨
              </button>
              {mindmapData !== undefined && (
                <button 
                  onClick={() => onNext(mindmapData, quizResults)} 
                  className="btn-secondary inline-flex items-center gap-2 px-5 py-2.5 text-xs"
                >
                  Interactive Studio →
                </button>
              )}
            </div>
          </div>

          {/* Results List */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#a1a1a6]">Detailed Review</h3>
            {quizResults.map((result, idx) => (
              <div
                key={result.id ?? idx}
                className={`card-standard p-5 border ${
                  result.isCorrect ? 'border-emerald-500/40 bg-[#18181b]' : 'border-[#ef4444]/40 bg-[#18181b]'
                }`}
              >
                <div className="font-medium text-sm text-[#f0f0ee] mb-3">
                  Q{idx + 1}. {result.prompt}
                </div>
                <div className="space-y-1 text-xs">
                  <div className={result.isCorrect ? 'text-emerald-400 font-medium' : 'text-[#f87171] font-medium'}>
                    <span className="text-[#a1a1a6]">Your Answer:</span> {result.userAnswer ?? 'No answer'}
                  </div>
                  {!result.isCorrect && (
                    <div className="text-emerald-400 font-medium">
                      <span className="text-[#a1a1a6]">Correct Answer:</span> {result.correctAnswer ?? 'Not available'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


