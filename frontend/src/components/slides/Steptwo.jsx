import React, { useEffect, useState } from "react";

export default function StepTwo({ onNext }) {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [fetchingMindmap, setFetchingMindmap] = useState(false);
  const [score, setScore] = useState(null);
  const [showScore, setShowScore] = useState(false);
  const [mindmapData, setMindmapData] = useState(undefined);

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
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const resp = await fetch(`${API_BASE}/api/generate-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queryText: "Generate questions", topK: 5, count: 5 })
      });
      const data = await resp.json();
      setQuestions(data.questions || []);
      setAnswers(Array((data.questions || []).length).fill(null));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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

    const score = questions.length - wrongQs.length;
    setScore(score);
    setShowScore(true);

    // Do not auto-navigate. Save mindmap (or null) and let user click Next.
    if (wrongQs.length === 0) {
      // perfect score — mark explicitly so StepThree can show the perfect UI
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
  if (!questions.length) return <div>No questions found.</div>;

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

      {showScore && (
        <div style={{margin: '10px 0', padding: '8px', background: 'oklch(0.7162 0.1597 290.3962)', borderRadius: 4}}>
          You scored {score} / {questions.length}
        </div>
      )}

      <div style={{display: 'flex', gap: 10, marginTop: 8}}>
        <button onClick={handleFinish} disabled={fetchingMindmap} style={{padding: '10px 20px', background: '#3b82f6', color:'white', borderRadius: 15}}>
          {fetchingMindmap ? 'Checking...' : 'Finish Quiz'}
        </button>

        {mindmapData !== undefined && (
          <button onClick={() => onNext(mindmapData)} style={{padding: '10px 20px', background: '#10b981', color:'white', borderRadius: 4}}>
            Next
          </button>
        )}
      </div>

    </div>
  );
}