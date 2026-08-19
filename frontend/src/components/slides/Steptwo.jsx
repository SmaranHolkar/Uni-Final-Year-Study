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

      <div style={{ background: 'var(--card)', padding: '30px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', marginBottom: '30px' }} aria-hidden>
        <Skeleton style={{ height: '1.25rem', width: '86%' }} />
        <Skeleton className="mt-3" style={{ height: '1rem', width: '72%' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '22px' }}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={`quiz-option-skeleton-${idx}`} style={{ border: '2px solid var(--border)', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <Skeleton rounded="999px" style={{ width: '1rem', height: '1rem' }} />
              <Skeleton style={{ height: '0.85rem', width: `${84 - idx * 8}%` }} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton rounded="8px" style={{ width: '8rem', height: '2.8rem' }} />
        <Skeleton rounded="8px" style={{ width: '9rem', height: '2.8rem' }} />
      </div>
    </div>
  );

  if (!questions.length) {
    return (
      <div role={errorMessage ? 'alert' : 'status'} aria-live={errorMessage ? 'assertive' : 'polite'}>
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
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} role="dialog" aria-modal="true" aria-labelledby="mindmap-loader-title" aria-describedby="mindmap-loader-desc">
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: '1.5rem', padding: '2.5rem 3rem',
        maxWidth: '480px', width: '90%', textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        {/* Animating face */}
        <div style={{ marginBottom: '1.25rem' }}>
          <Vela size={100} loading={true} />
        </div>
        <h2 id="mindmap-loader-title" style={{ margin: '0 0 0.4rem', fontSize: '1.3rem', fontWeight: 700, color: 'var(--foreground)' }}>
          Building Your Mindmap
        </h2>
        <p id="mindmap-loader-desc" style={{ margin: '0 0 2rem', fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
          This takes 30–60 seconds — we're crafting personalised review nodes for each mistake.
        </p>

        {/* Step list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left', marginBottom: '2rem' }}>
          {mindmapSteps.map((step, idx) => (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.6rem 0.9rem', borderRadius: '0.6rem',
              background: 'var(--background)', border: '1px solid var(--border)',
              animation: `mmFadeIn 0.4s ease ${idx * 0.35}s both`,
            }}>
              <span style={{ fontSize: '1.2rem' }}>{step.icon}</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--foreground)', flex: 1 }}>{step.label}</span>
              <span style={{
                width: '14px', height: '14px', borderRadius: '50%',
                border: '2px solid var(--primary)', borderTopColor: 'transparent',
                animation: `mmSpin 0.9s linear ${idx * 0.35}s infinite`,
                flexShrink: 0,
              }} />
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ background: 'var(--muted)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '999px',
            background: 'linear-gradient(90deg, var(--primary), oklch(0.75 0.15 220))',
            animation: 'mmProgress 40s linear forwards',
          }} />
        </div>

        <style>{`
          @keyframes mmPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
          @keyframes mmSpin  { to{transform:rotate(360deg)} }
          @keyframes mmFadeIn{ from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
          @keyframes mmProgress{ from{width:0%} to{width:95%} }
        `}</style>
      </div>

      <p style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }} role="status" aria-live="polite" aria-atomic="true">
          Building your mindmap. This may take up to one minute.
        </p>
    </div>
  );

  //Shows quiz questions
  const q = questions[currentQuestionIndex];
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {fetchingMindmap && <MindmapLoader />}

      {!showScore ? (
        <div style={{ flex: 1, padding: '20px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          {/* Progress Indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <span style={{ fontWeight: 600, color: 'var(--muted-foreground)' }}>
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {questions.map((_, idx) => (
                <div 
                  key={idx}
                  style={{
                    width: '30px', 
                    height: '4px', 
                    borderRadius: '2px',
                    background: idx === currentQuestionIndex 
                      ? 'var(--primary)' 
                      : answers[idx] 
                        ? 'var(--primary)' 
                        : 'var(--muted)'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Question Card */}
          <div style={{ background: 'var(--card)', padding: '30px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '24px', lineHeight: 1.5 }}>
              {q.prompt}
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(q.choices || []).map((c, idx) => (
                <label 
                  key={idx} 
                  style={{
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '16px', 
                    border: `2px solid ${answers[currentQuestionIndex] === c ? 'var(--primary)' : 'var(--border)'}`, 
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: answers[currentQuestionIndex] === c ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <input
                    type="radio"
                    name={`q${currentQuestionIndex}`}
                    value={c}
                    checked={answers[currentQuestionIndex] === c}
                    onChange={(e) => selectAnswer(currentQuestionIndex, e.target.value)}
                    style={{ marginRight: '16px', transform: 'scale(1.2)' }}
                  />
                  <span style={{ fontSize: '1rem', fontWeight: 500 }}>{c}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button 
              onClick={handlePrev} 
              disabled={currentQuestionIndex === 0}
              style={{
                padding: '12px 24px', 
                borderRadius: '8px', 
                fontWeight: 600,
                opacity: currentQuestionIndex === 0 ? 0.5 : 1,
                cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
                background: 'var(--muted)',
                color: 'var(--foreground)',
                border: 'none'
              }}
            >
              Previous
            </button>

            {currentQuestionIndex < questions.length - 1 ? (
              <button 
                onClick={handleNext}
                style={{
                  padding: '12px 32px', 
                  borderRadius: '8px', 
                  fontWeight: 600,
                  background: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Next Question
              </button>
            ) : (
              <button 
                onClick={handleFinish}
                style={{
                  padding: '12px 32px', 
                  borderRadius: '8px', 
                  fontWeight: 600,
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Finish Quiz
              </button>
            )}
          </div>

          {validationMessage && (
            <div role="alert" style={{ marginTop: '14px', color: 'var(--destructive)', fontWeight: 600 }}>
              {validationMessage}
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '10px' }}>Quiz Complete!</h2>
            <div style={{ fontSize: '1.25rem', color: 'var(--muted-foreground)' }}>
              You scored <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{score}</span> out of {questions.length}
            </div>
          </div>

          {saveStatus && (
             <div role="status" aria-live="polite" aria-atomic="true" style={{ textAlign: 'center', marginBottom: '20px', color: saveStatus.includes('Failed') ? 'var(--destructive)' : 'var(--primary)', fontWeight: 600 }}>
               {saveStatus}
             </div>
          )}

          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '40px', flexWrap: 'wrap' }}>
            <button 
              onClick={handleGoToMindsMirror} 
              style={{
                padding: '14px 28px', 
                background: 'var(--primary)', 
                color:'var(--primary-foreground)', 
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '1.1rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              Go to Mind's Mirror ✨
            </button>
            {mindmapData !== undefined && (
              <button 
                onClick={() => onNext(mindmapData, quizResults)} 
                style={{
                  padding: '14px 28px', 
                  background: 'transparent', 
                  color: 'var(--foreground)', 
                  border: '2px solid var(--border)',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  cursor: 'pointer'
                }}
              >
                Go to Learning Playground →
              </button>
            )}
          </div>

          {/* Results List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Detailed Review</h3>
            {quizResults.map((result, idx) => (
              <div
                key={result.id ?? idx}
                style={{
                  border: `2px solid ${result.isCorrect ? 'var(--chart-2)' : 'var(--destructive)'}`,
                  borderRadius: '12px',
                  padding: '20px',
                  background: 'var(--card)'
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '12px', fontSize: '1.1rem' }}>
                  Q{idx + 1}. {result.prompt}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                  <div style={{ color: result.isCorrect ? 'var(--chart-2)' : 'var(--destructive)', fontWeight: 500 }}>
                    <span style={{ opacity: 0.8, color: 'var(--muted-foreground)' }}>Your Answer:</span> {result.userAnswer ?? 'No answer'}
                  </div>
                  {!result.isCorrect && (
                    <div style={{ color: 'var(--chart-2)', fontWeight: 500 }}>
                      <span style={{ opacity: 0.8, color: 'var(--muted-foreground)' }}>Correct Answer:</span> {result.correctAnswer ?? 'Not available'}
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

