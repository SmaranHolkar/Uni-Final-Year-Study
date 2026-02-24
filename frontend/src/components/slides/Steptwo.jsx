import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../../AuthContext";

export default function StepTwo({ onNext }) {
  const { currentDocumentId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [fetchingMindmap, setFetchingMindmap] = useState(false);
  const [score, setScore] = useState(null);
  const [showScore, setShowScore] = useState(false);
  const [mindmapData, setMindmapData] = useState(undefined);
  const [quizResults, setQuizResults] = useState([]);
  const fetchInProgressRef = useRef(false); // Prevent duplicate requests

  // ✅ helpers go HERE
  const normalize = (v) =>
    String(v ?? "")
      .trim()
      .toLowerCase();

  const getCorrectAnswer = (q) => {
    if (!q) return undefined;
    if (typeof q.answer === "number") return q.choices?.[q.answer];
    if (typeof q.answer === "string" && /^\d+$/.test(q.answer))
      return q.choices?.[Number(q.answer)];
    return q.answer;
  };

  const fetchQuestions = async () => {
    // Prevent duplicate requests
    if (fetchInProgressRef.current) {
      console.log('Request already in progress, skipping duplicate');
      return;
    }

    fetchInProgressRef.current = true;
    setLoading(true);
    setErrorMessage('');
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const resp = await fetch(`${API_BASE}/api/generate-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          queryText: "Generate questions", 
          count: 8,
          documentId: currentDocumentId
        })
      });
      const data = await resp.json();
      if (!resp.ok) {
        const message = data?.error || data?.message || 'Failed to generate questions.';
        setErrorMessage(message);
        setQuestions([]);
        setAnswers([]);
        return;
      }
      setQuestions(data.questions || []);
      setAnswers(Array((data.questions || []).length).fill(null));
    } catch (e) {
      console.error(e);
      setErrorMessage('Network error while loading the quiz.');
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const selectAnswer = (i, c) => {
    const copy = [...answers];
    copy[i] = c;
    setAnswers(copy);
  };

  const handleFinish = async () => {
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

        console.log(`Q${i + 1}: selectedIdx=${selectedIdx}, correctIdx=${correctIdx}, selected=`, selected, 'correct=', correct);

        if (selectedIdx !== -1 && correctIdx !== -1) {
          return selectedIdx !== correctIdx;
        }

        // final fallback to string compare
        return normalize(selected) !== normalize(correct);
    });

    // Construct quiz results object
    const quizResults = questions.map((q, i) => ({
      id: i,
      prompt: q.prompt,
      choices: q.choices,
      userAnswer: answers[i],
      correctAnswer: getCorrectAnswer(q),
      isCorrect: !wrongQs.find(wq => wq === q)
    }));

    const score = questions.length - wrongQs.length;
    setScore(score);
    setShowScore(true);
    setQuizResults(quizResults);

    // Save mindmap (or null) and let user click Next.
    if (wrongQs.length === 0) {
      // perfect score so StepThree can show the perfect UI
      setMindmapData({ _perfect: true });
      return;
    }

    setFetchingMindmap(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_BASE}/api/generate-mindmap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wrongQuestions: wrongQs })
      });

      const data = await res.json();
      setMindmapData(data.mindmap);
      
    } catch (err) {
      console.error("Mindmap failed", err);
      // mark failure so StepThree can show an error instead of an empty "perfect" screen
      setMindmapData({ _failed: true });
    } finally {
      setFetchingMindmap(false);
    }
  };


  if (loading) return <div>Loading Quiz...</div>;
  if (!questions.length) {
    return <div>{errorMessage || 'No questions found.'}</div>;
  }
  //Shows quiz questions
  return (
    <div>
      <h1>Quiz</h1>
      {questions.map((q, i) => (
        <div key={i} style={{marginBottom: 20}}>
          <strong>Q{i+1}.</strong> {q.prompt}
          {(q.choices || []).map((c, idx) => (
             <label key={`${i}-${idx}`} style={{display:'block', margin: '5px 0'}}>
               <input
                 type="radio"
                 name={`q${i}`}
                 value={c}
                 checked={answers[i] === c}
                 onChange={(e) => selectAnswer(i, e.target.value)}
               />
               {c}
             </label>
          ))}
        </div>
      ))}
   {/* Show score when finished */}
      {showScore && (
        <div style={{ margin: '10px 0', padding: '12px', background: 'var(--muted)', borderRadius: 6 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            You scored {score} / {questions.length}
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {quizResults.map((result, idx) => (
              <div
                key={result.id ?? idx}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 10,
                  background: 'var(--card)'
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  Q{idx + 1}. {result.prompt}
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 14 }}>
                  <span style={{ color: result.isCorrect ? 'var(--chart-2)' : 'var(--destructive)' }}>
                    Your Answer: {result.userAnswer ?? 'No answer'}
                  </span>
                  <span style={{ color: 'var(--primary)' }}>
                    Correct Answer: {result.correctAnswer ?? 'Not available'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{display: 'flex', gap: 10, marginTop: 8}}>
        <button onClick={handleFinish} disabled={fetchingMindmap} style={{padding: '10px 20px', background: '#3b82f6', color:'white', borderRadius: 15}}>
          {fetchingMindmap ? 'Creating Mindmap please wait...' : 'Finish Quiz'}
        </button>
      {/* Button to go to the mindmap */}
        {mindmapData !== undefined && (
          <button onClick={() => onNext(mindmapData, quizResults)} style={{padding: '10px 20px', background: '#10b981', color:'white', borderRadius: 4}}>
            Mindmap created press here to view.
          </button>
        )}
      </div>

    </div>
  );
}
