/**
 * templateEngine.js
 *
 * Glassmorphic interactive HTML template generators for educational revision tools.
 * Dispatches by canonical archetype (quiz, flashcards, crossword, matching, etc.).
 */

import { buildCrosswordLayout } from '../layouts/crossword.layout.js';
import { buildWordSearchLayout } from '../layouts/wordsearch.layout.js';
import { resolveCanonicalType } from '../normalizer.js';

export const TOOL_THEME_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  :root {
    --background: #08090e;
    --foreground: #f4f4f6;
    --card: rgba(18, 20, 31, 0.85);
    --card-foreground: #f4f4f6;
    --popover: #12141f;
    --popover-foreground: #f4f4f6;
    --primary: #6366f1;
    --primary-foreground: #ffffff;
    --secondary: #1e2235;
    --secondary-foreground: #c7d2fe;
    --muted: #161826;
    --muted-foreground: #94a3b8;
    --accent: #38bdf8;
    --accent-foreground: #0f172a;
    --destructive: #ef4444;
    --destructive-foreground: #ffffff;
    --border: rgba(255, 255, 255, 0.09);
    --input: #12141f;
    --ring: #6366f1;
    --radius: 0px;
    --font-display: 'Newsreader', 'Lora', 'Georgia', serif;
    --font-sans: 'Plus Jakarta Sans', Inter, -apple-system, sans-serif;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; border-radius: 0 !important; }
  html, body { height: 100%; overflow: hidden; }
  body { background: var(--background); color: var(--foreground); font-family: var(--font-sans); -webkit-font-smoothing: antialiased; }
  #app { display: flex; flex-direction: column; height: 100vh; width: 100vw; background: radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 70%); }
  #app-header { background: rgba(12, 14, 24, 0.9); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); padding: 1.1rem 1.75rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  #app-header h1 { font-size: 1.15rem; font-weight: 700; color: #ffffff; letter-spacing: -0.01em; display: flex; align-items: center; gap: 0.5rem; }
  #app-header p  { font-size: 0.825rem; color: var(--muted-foreground); line-height: 1.4; }
  #app-progress  { font-size: 0.75rem; font-weight: 600; color: var(--accent); background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.25); padding: 0.25rem 0.65rem; border-radius: 0; }
  #app-main { flex: 1; overflow-y: auto; padding: 1.75rem; display: flex; flex-direction: column; align-items: center; gap: 1.25rem; }
  #app-footer { background: rgba(12, 14, 24, 0.9); backdrop-filter: blur(12px); border-top: 1px solid var(--border); padding: 0.85rem 1.75rem; display: flex; justify-content: center; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .card { background: var(--card); backdrop-filter: blur(16px); color: var(--card-foreground); border-radius: var(--radius); border: 1px solid var(--border); padding: 1.5rem; transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s; box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5); }
  .card:hover { border-color: rgba(99, 102, 241, 0.4); transform: translateY(-2px); }
  .btn { border: none; border-radius: var(--radius); padding: 0.6rem 1.35rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; font-size: 0.875rem; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; }
  .btn-primary { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.35); }
  .btn-primary:hover { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5); }
  .btn-secondary { background: var(--secondary); color: var(--secondary-foreground); border: 1px solid var(--border); }
  .btn-secondary:hover { background: rgba(99, 102, 241, 0.15); border-color: rgba(99, 102, 241, 0.4); }
  .btn-ghost { background: transparent; color: var(--muted-foreground); border: 1px solid var(--border); }
  .btn-ghost:hover { background: var(--muted); color: var(--foreground); }
  .btn-destructive { background: var(--destructive); color: var(--destructive-foreground); }
  input, select, textarea { background: var(--input); color: var(--foreground); border: 1px solid var(--border); border-radius: var(--radius); padding: 0.6rem 0.85rem; outline: none; width: 100%; font-size: 0.9rem; transition: border-color 0.2s; }
  input:focus, select:focus, textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25); }
  .badge { background: rgba(99, 102, 241, 0.15); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 0; padding: 0.15rem 0.65rem; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.25rem; }
  .correct { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
  .incorrect { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
  .divider { width: 100%; height: 1px; background: var(--border); margin: 0.75rem 0; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 0; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.25); }
`;

export function injectThemeCss(html) {
  if (!html || typeof html !== 'string') return html;
  if (html.includes('/* INJECT_THEME_CSS */')) {
    return html.replace('/* INJECT_THEME_CSS */', TOOL_THEME_CSS);
  }
  if (html.includes('</head>')) {
    return html.replace('</head>', `<style>${TOOL_THEME_CSS}</style></head>`);
  }
  return html;
}

export function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Builds interactive deterministic HTML apps based on archetype.
 */
export function generateDeterministicFallbackHtml(toolType, title, description, items) {
  const canonical = resolveCanonicalType(toolType);
  const itemsJson = JSON.stringify(items || []);

  // 1. FLASHCARDS
  if (canonical === 'flashcards') {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>/* INJECT_THEME_CSS */
.fc-perspective{perspective:1200px;width:100%;max-width:600px;margin:1.25rem auto;}
.fc-card{position:relative;width:100%;min-height:310px;transform-style:preserve-3d;transition:transform 0.5s cubic-bezier(0.34,1.56,0.64,1);cursor:pointer;border-radius:20px;box-shadow:0 16px 40px -10px rgba(0,0,0,0.5);}
.fc-card.flipped{transform:rotateY(180deg);}
.fc-face{position:absolute;width:100%;height:100%;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:20px;display:flex;flex-direction:column;justify-content:space-between;align-items:flex-start;padding:2rem 2.25rem;box-sizing:border-box;text-align:left;}
.fc-front{background:radial-gradient(circle at 10% 10%, rgba(99,102,241,0.15) 0%, transparent 60%), var(--card);border:1.5px solid var(--border);border-left:4px solid var(--primary);}
.fc-back{background:radial-gradient(circle at 90% 10%, rgba(56,189,248,0.12) 0%, transparent 60%), var(--card);border:1.5px solid var(--border);border-left:4px solid var(--accent);transform:rotateY(180deg);}
.display-question{font-family:var(--font-display);font-size:1.65rem;font-weight:600;line-height:1.35;color:#ffffff;letter-spacing:-0.015em;}
.display-answer{font-family:var(--font-sans);font-size:1.05rem;line-height:1.7;color:#e2e8f0;}
.btn-flip-hero{padding:0.85rem 2.25rem!important;font-size:0.95rem!important;font-weight:700!important;border-radius:14px!important;background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%)!important;color:#ffffff!important;box-shadow:0 4px 18px rgba(99,102,241,0.4)!important;min-width:175px;transform:scale(1.02);}
.btn-flip-hero:hover{transform:scale(1.04) translateY(-1px);box-shadow:0 6px 24px rgba(99,102,241,0.55)!important;}
.btn-nav{padding:0.65rem 1.15rem!important;font-size:0.825rem!important;font-weight:600!important;border-radius:12px!important;background:rgba(255,255,255,0.04)!important;border:1px solid rgba(255,255,255,0.1)!important;color:#94a3b8!important;}
.btn-nav:hover{background:rgba(255,255,255,0.08)!important;color:#fff!important;}
</style></head><body><div id="app"><header id="app-header"><div style="display:flex;align-items:center;gap:0.5rem;justify-content:center;"><span class="badge" style="background:var(--primary);color:white;">🗂️ Interactive Flashcards</span></div><h1 style="margin-top:0.25rem;">${title}</h1><p>${description}</p><span id="app-progress">Card 1 / ${Math.max(items.length, 1)}</span></header><main id="app-main"><div class="fc-perspective"><div class="fc-card" id="fc-main"><div class="fc-face fc-front"><div style="display:flex;justify-content:space-between;width:100%;align-items:center;margin-bottom:0.75rem;"><span class="badge">Question / Term</span><span style="font-size:0.75rem;color:var(--muted-foreground);" id="fc-card-count">Card 1</span></div><div style="flex:1;display:flex;flex-direction:column;justify-content:center;width:100%;"><h2 id="fc-front-text" class="display-question"></h2></div><div style="display:flex;justify-content:space-between;width:100%;align-items:center;margin-top:1rem;padding-top:0.75rem;border-top:1px solid var(--border);"><span class="muted text-xs">Tap or press Space to flip 🔄</span><span style="font-size:0.75rem;color:var(--muted-foreground);">3D Flip</span></div></div><div class="fc-face fc-back"><div style="display:flex;justify-content:space-between;width:100%;align-items:center;margin-bottom:0.75rem;"><span class="badge correct">Explanation / Answer</span><span style="font-size:0.75rem;color:var(--muted-foreground);" id="fc-card-count-back">Card 1</span></div><div style="flex:1;display:flex;flex-direction:column;justify-content:center;width:100%;"><p id="fc-back-text" class="display-answer"></p></div><div style="display:flex;justify-content:space-between;width:100%;align-items:center;margin-top:1rem;padding-top:0.75rem;border-top:1px solid var(--border);"><span class="muted text-xs">Tap to flip back</span><span style="font-size:0.75rem;color:#10b981;">✓ Recall</span></div></div></div></div><div style="display:flex;gap:0.75rem;margin-top:1rem;justify-content:center;align-items:center;"><button class="btn btn-nav" id="fc-prev">← Prev</button><button class="btn btn-flip-hero" id="fc-flip">Flip Card (Space)</button><button class="btn btn-nav" id="fc-next">Next →</button></div><div style="display:flex;gap:0.5rem;margin-top:0.75rem;justify-content:center;"><button class="btn btn-ghost text-xs" id="fc-shuffle">🔀 Shuffle</button></div></main></div><script>let DATA=${itemsJson};let idx=0;let flipped=false;const card=document.getElementById('fc-main');const frontText=document.getElementById('fc-front-text');const backText=document.getElementById('fc-back-text');const progress=document.getElementById('app-progress');const cCount=document.getElementById('fc-card-count');const cCountBack=document.getElementById('fc-card-count-back');function render(){if(!DATA.length)return;flipped=false;card.classList.remove('flipped');const it=DATA[idx]||{};const countStr='Card '+(idx+1)+' / '+DATA.length;progress.textContent=countStr;if(cCount)cCount.textContent=countStr;if(cCountBack)cCountBack.textContent=countStr;frontText.textContent=it.front||it.question||it.term||it.concept||'Card '+(idx+1);backText.textContent=it.back||it.answer||it.definition||it.explanation||'Definition and details.';}function flip(){flipped=!flipped;card.classList.toggle('flipped',flipped);}card.onclick=flip;document.getElementById('fc-flip').onclick=flip;document.getElementById('fc-prev').onclick=()=>{idx=(idx-1+DATA.length)%DATA.length;render();};document.getElementById('fc-next').onclick=()=>{idx=(idx+1)%DATA.length;render();};document.getElementById('fc-shuffle').onclick=()=>{DATA.sort(()=>Math.random()-0.5);idx=0;render();};document.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();flip();}if(e.code==='ArrowRight'){idx=(idx+1)%DATA.length;render();}if(e.code==='ArrowLeft'){idx=(idx-1+DATA.length)%DATA.length;render();}});render();</script></body></html>`;
  }

  // 2. QUIZ
  if (canonical === 'quiz') {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>/* INJECT_THEME_CSS */
      .quiz-card { width: 100%; max-width: 680px; margin: 1rem 0; background: var(--card); border: 1.5px solid var(--border); border-radius: 20px; padding: 2rem; }
      .choice-btn { width: 100%; text-align: left; padding: 1rem 1.25rem; margin-bottom: 0.75rem; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1.5px solid var(--border); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: space-between; font-size: 0.95rem; line-height: 1.5; transition: all 0.15s; }
      .choice-btn:hover { border-color: var(--primary); background: rgba(90,125,153,0.15); transform: translateY(-1px); }
      .choice-btn.correct { background: rgba(16,185,129,0.15)!important; border-color: #10b981!important; color: #34d399!important; box-shadow: 0 0 15px rgba(16,185,129,0.2); }
      .choice-btn.wrong { background: rgba(239,68,68,0.15)!important; border-color: #ef4444!important; color: #f87171!important; }
      .key-pill { font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 6px; background: #21262E; color: #94a3b8; border: 1px solid var(--border); }
      .exp-drawer { margin-top: 1.25rem; padding: 1.25rem; border-radius: 14px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); font-size: 0.9rem; line-height: 1.6; }
    </style></head><body>
      <div id="app">
        <header id="app-header">
          <span class="badge" style="background:#5A7D99;color:white;">Timed Assessment Quiz</span>
          <h1 style="margin-top:0.4rem;">${title}</h1>
          <div style="display:flex;gap:0.75rem;justify-content:center;margin-top:0.5rem;align-items:center;">
            <span class="badge" id="q-counter">Question 1 of ${items.length}</span>
            <span class="badge" id="timer-badge" style="background:rgba(239,68,68,0.2);border-color:#ef4444;color:#f87171;">⏱️ 45s</span>
            <span class="badge" id="score-badge" style="background:rgba(16,185,129,0.2);border-color:#10b981;color:#34d399;">Score: 0</span>
          </div>
        </header>
        <main id="app-main" style="width:100%;display:flex;flex-direction:column;align-items:center;">
          <div class="card quiz-card text-left" id="q-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
              <span class="badge" id="q-topic-tag" style="background:rgba(90,125,153,0.15);color:#5A7D99;border-color:rgba(90,125,153,0.3);">Conceptual Multiple Choice</span>
            </div>
            <h2 id="q-text" class="display-question" style="font-size:1.45rem;margin-bottom:1.25rem;"></h2>
            <div id="choices-box"></div>
            <div id="exp-drawer" class="exp-drawer" style="display:none;">
              <div style="display:flex;align-items:center;gap:0.4rem;font-weight:700;margin-bottom:0.4rem;" id="exp-status"></div>
              <p id="exp-text" style="color:#cbd5e1;"></p>
            </div>
          </div>
          <div id="summary-card" class="card text-center" style="display:none;width:100%;max-width:560px;padding:2.5rem;">
            <span class="badge" style="background:rgba(16,185,129,0.2);color:#34d399;border-color:#10b981;margin-bottom:1rem;">Evaluation Complete</span>
            <h2 style="font-family:var(--font-display);font-size:1.85rem;font-weight:700;color:#fff;margin-bottom:0.5rem;">Assessment Finished! 🎉</h2>
            <p id="final-score" style="font-size:1.25rem;color:#38bdf8;font-weight:700;margin:1.25rem 0;"></p>
            <button class="btn btn-primary" style="padding:0.75rem 2rem;font-size:0.95rem;font-weight:700;" onclick="restartQuiz()">Retake Quiz</button>
          </div>
        </main>
      </div>
      <script>
        const DATA = ${itemsJson};
        let qIdx = 0;
        let score = 0;
        let timer = 45;
        let tInt = null;
        let answered = false;

        function startTimer() {
          clearInterval(tInt);
          timer = 45;
          document.getElementById('timer-badge').textContent = '⏱️ ' + timer + 's';
          tInt = setInterval(() => {
            timer--;
            document.getElementById('timer-badge').textContent = '⏱️ ' + timer + 's';
            if (timer <= 0) {
              clearInterval(tInt);
              if (!answered) handleChoice('', '', null, -1);
            }
          }, 1000);
        }

        function renderQ() {
          if (qIdx >= DATA.length) {
            clearInterval(tInt);
            document.getElementById('q-card').style.display = 'none';
            document.getElementById('summary-card').style.display = 'block';
            document.getElementById('final-score').textContent = 'Mastery Score: ' + score + ' / ' + DATA.length + ' (' + Math.round((score / DATA.length) * 100) + '%)';
            return;
          }

          answered = false;
          const it = DATA[qIdx];
          document.getElementById('q-counter').textContent = 'Question ' + (qIdx + 1) + ' of ' + DATA.length;
          document.getElementById('score-badge').textContent = 'Score: ' + score;
          document.getElementById('q-text').textContent = it.question || it.front || ('What is the key mechanism of ' + (it.concept || it.term || 'this topic') + '?');
          
          const drawer = document.getElementById('exp-drawer');
          drawer.style.display = 'none';

          const cBox = document.getElementById('choices-box');
          cBox.innerHTML = '';
          
          const rawChoices = Array.isArray(it.choices) && it.choices.length >= 2 ? [...it.choices] : [it.answerText || it.answer || 'Correct', 'Alternative option', 'Option C', 'Option D'];
          let correctText = it.answerText || it.choices?.[0] || 'Correct';

          const keys = ['A', 'B', 'C', 'D'];
          rawChoices.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.innerHTML = '<span style="font-weight:500;">' + opt + '</span><span class="key-pill">' + (keys[idx] || (idx + 1)) + '</span>';
            btn.onclick = () => handleChoice(opt, correctText, btn, idx);
            cBox.appendChild(btn);
          });

          startTimer();
        }

        function handleChoice(chosen, correct, btn, chosenIdx) {
          if (answered) return;
          answered = true;
          clearInterval(tInt);
          const it = DATA[qIdx];
          const drawer = document.getElementById('exp-drawer');
          const status = document.getElementById('exp-status');
          const expText = document.getElementById('exp-text');
          drawer.style.display = 'block';

          const chosenLetter = chosenIdx >= 0 ? ['A', 'B', 'C', 'D'][chosenIdx] : '';
          const correctLetter = (it.answer || '').toUpperCase();

          const isMatch = (chosenLetter && correctLetter && chosenLetter === correctLetter) ||
                          (chosen && correct && (chosen.trim().toLowerCase() === correct.trim().toLowerCase() || chosen.includes(correct) || correct.includes(chosen)));

          if (isMatch) {
            if (btn) btn.classList.add('correct');
            score++;
            document.getElementById('score-badge').textContent = 'Score: ' + score;
            status.innerHTML = '<span style="color:#10b981;">✅ Correct!</span> High-Yield Concept Verified';
          } else {
            if (btn) btn.classList.add('wrong');
            document.querySelectorAll('.choice-btn').forEach((b, i) => {
              const letter = ['A', 'B', 'C', 'D'][i];
              if (letter === correctLetter || b.innerText.includes(correct) || (correct && correct.includes(b.innerText.trim()))) {
                b.classList.add('correct');
              }
            });
            status.innerHTML = '<span style="color:#ef4444;">❌ Incorrect.</span> Review Explanation Below';
          }

          expText.innerHTML = '<strong>Correct Answer: ' + (correct || it.answer) + '</strong><br><br>' + (it.explanation || it.back || 'Key concept verified.');

          setTimeout(() => {
            qIdx++;
            renderQ();
          }, 2400);
        }

        function restartQuiz() {
          qIdx = 0;
          score = 0;
          document.getElementById('q-card').style.display = 'block';
          document.getElementById('summary-card').style.display = 'none';
          renderQ();
        }

        renderQ();
      </script>
    </body></html>`;
  }

  // 3. MATCHING
  if (canonical === 'matching') {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>/* INJECT_THEME_CSS */</style></head><body><div id="app"><header id="app-header"><h1>${title}</h1><p>${description}</p><span id="app-progress">Matched 0 / ${items.length}</span></header><main id="app-main"><div class="w-full max-w-4xl" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;" id="match-container"><div id="left-col" style="display:grid;gap:0.5rem;"></div><div id="right-col" style="display:grid;gap:0.5rem;"></div></div></main></div><script>const DATA=${itemsJson};let selectedLeft=null;let matchedCount=0;const leftCol=document.getElementById('left-col');const rightCol=document.getElementById('right-col');const progress=document.getElementById('app-progress');function render(){leftCol.innerHTML='';rightCol.innerHTML='';const rights=[...DATA].map(d=>({id:d.id,text:d.right})).sort(()=>Math.random()-0.5);DATA.forEach(item=>{const btn=document.createElement('button');btn.className='btn btn-secondary text-left';btn.textContent=item.left;btn.dataset.id=item.id;btn.onclick=()=>{if(btn.disabled)return;document.querySelectorAll('#left-col button').forEach(b=>b.style.borderColor='var(--border)');btn.style.borderColor='var(--primary)';selectedLeft=item.id;};leftCol.appendChild(btn);});rights.forEach(item=>{const btn=document.createElement('button');btn.className='btn btn-secondary text-left';btn.textContent=item.text;btn.onclick=()=>{if(!selectedLeft||btn.disabled)return;if(selectedLeft===item.id){matchedCount++;btn.className='btn correct text-left';btn.disabled=true;const leftBtn=leftCol.querySelector('button[data-id="'+item.id+'"]');if(leftBtn){leftBtn.className='btn correct text-left';leftBtn.disabled=true;}selectedLeft=null;progress.textContent='Matched '+matchedCount+' / '+DATA.length;}else{btn.className='btn incorrect text-left';setTimeout(()=>{btn.className='btn btn-secondary text-left';},800);}};rightCol.appendChild(btn);});}render();</script></body></html>`;
  }

  // 4. TIMELINE
  if (canonical === 'timeline') {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>/* INJECT_THEME_CSS */
      .timeline-track-container { position: relative; padding-left: 2.25rem; width: 100%; max-width: 760px; margin: 0 auto; }
      .timeline-vertical-spine { position: absolute; left: 1rem; top: 1rem; bottom: 1rem; width: 2.5px; background: linear-gradient(to bottom, var(--primary), #3D6660, #10b981); opacity: 0.35; border-radius: 2px; }
      .timeline-slot { position: relative; margin-bottom: 0.85rem; }
      .timeline-slot-node { position: absolute; left: -2.25rem; top: 1.15rem; width: 14px; height: 14px; border-radius: 50%; background: var(--background); border: 2.5px solid var(--primary); z-index: 2; transition: all 0.2s; }
      .timeline-slot-node.locked { border-color: #10b981; background: #10b981; box-shadow: 0 0 8px rgba(16,185,129,0.5); }
      .timeline-card { background: var(--card); border: 1.5px solid var(--border); border-radius: 0.85rem; padding: 0.95rem 1.15rem; cursor: grab; user-select: none; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; gap: 0.85rem; position: relative; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
      .timeline-card:hover { border-color: rgba(90,125,153,0.6); transform: translateY(-1px); }
      .timeline-card:active { cursor: grabbing; border-color: var(--primary); }
      .timeline-card.dragging { opacity: 0.35; border: 2px dashed var(--primary); transform: scale(0.98); }
      .timeline-card.correct-order { border-color: #10b981; background: rgba(16,185,129,0.08); box-shadow: 0 0 12px rgba(16,185,129,0.15); }
      .timeline-card.wrong-order { border-color: #ef4444; background: rgba(239,68,68,0.08); }
      .drag-handle { color: #8E8E93; font-size: 1.25rem; cursor: grab; padding: 0 0.2rem; flex-shrink: 0; }
      .order-pill { width: 28px; height: 28px; border-radius: 50%; background: var(--muted); border: 1.5px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; color: var(--primary); flex-shrink: 0; }
      .move-btn { background: #21262E; border: 1px solid var(--border); color: #CDD1D6; border-radius: 0.35rem; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.7rem; transition: all 0.15s; }
      .move-btn:hover { background: var(--primary); color: #fff; border-color: var(--primary); }
      .progress-bar-wrap { width: 100%; max-width: 680px; margin: 0.5rem auto 0 auto; }
      .progress-track { height: 6px; width: 100%; background: rgba(255,255,255,0.08); border-radius: 999px; overflow: hidden; }
      .progress-fill { height: 100%; width: 0%; background: linear-gradient(90deg, #5A7D99, #10b981); transition: width 0.4s ease; border-radius: 999px; }
    </style></head><body>
      <div id="app">
        <header id="app-header">
          <div style="display:flex;align-items:center;gap:0.5rem;justify-content:center;">
            <span class="badge" style="background:#5A7D99;color:white;">⏳ Chronological Timeline Challenge</span>
          </div>
          <h1 style="margin-top:0.25rem;">${title}</h1>
          <p>${description}</p>
          <div class="progress-bar-wrap">
            <div class="progress-track"><div id="prog-fill" class="progress-fill"></div></div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;color:#8E8E93;margin-top:0.4rem;font-weight:600;">
              <span id="prog-count">0 / ${Math.max(items.length, 1)} Events Correct</span>
              <span id="prog-pct" style="color:var(--primary);">0% Accuracy</span>
            </div>
          </div>
        </header>

        <main id="app-main" style="width:100%;display:flex;flex-direction:column;align-items:center;padding-bottom:2rem;">
          <div style="display:flex;gap:0.5rem;justify-content:center;margin-bottom:1.25rem;flex-wrap:wrap;">
            <button class="btn btn-primary" id="btn-check-order">✅ Check Chronological Order</button>
            <button class="btn btn-secondary" id="btn-shuffle-order">🔀 Scramble Sequence</button>
            <button class="btn btn-secondary" id="btn-reveal-timeline">📜 Chronological Story View</button>
          </div>
          <div id="order-feedback" class="card text-center" style="display:none;margin-bottom:1.25rem;padding:0.85rem 1.25rem;width:100%;max-width:760px;border-radius:0.75rem;"></div>
          <div class="timeline-track-container">
            <div class="timeline-vertical-spine"></div>
            <div id="timeline-slots-container" style="display:grid;gap:0.25rem;"></div>
          </div>
        </main>
      </div>

      <script>
        const RAW_DATA = ${itemsJson};
        const ORIGINAL = RAW_DATA.map((it, idx) => ({
          id: it.id || String(idx + 1),
          text: it.text || it.title || it.front || it.concept || ('Event ' + (idx + 1)),
          detail: it.detail || it.back || it.explanation || it.definition || '',
          correctPosition: it.position || (idx + 1)
        }));

        let currentList = [...ORIGINAL].sort(() => Math.random() - 0.5);
        let isChronologicalView = false;
        const container = document.getElementById('timeline-slots-container');
        const fbEl = document.getElementById('order-feedback');
        const progFill = document.getElementById('prog-fill');
        const progCount = document.getElementById('prog-count');
        const progPct = document.getElementById('prog-pct');

        function updateProgress(correctCount) {
          const total = currentList.length;
          const pct = Math.round((correctCount / total) * 100);
          progFill.style.width = pct + '%';
          progCount.textContent = correctCount + ' / ' + total + ' Events Placed Correctly';
          progPct.textContent = pct + '% Accuracy';
        }

        function render() {
          container.innerHTML = '';
          currentList.forEach((item, index) => {
            const slot = document.createElement('div');
            slot.className = 'timeline-slot';

            const node = document.createElement('div');
            node.className = 'timeline-slot-node';
            node.id = 'node-' + index;

            const card = document.createElement('div');
            card.className = 'timeline-card';
            card.draggable = !isChronologicalView;
            card.dataset.index = index;

            card.innerHTML = 
              '<span class="drag-handle" title="Drag to rearrange">⠿</span>' +
              '<div class="order-pill">' + (index + 1) + '</div>' +
              '<div style="flex:1;min-width:0;">' +
                '<h3 style="font-weight:700;font-size:0.95rem;color:var(--foreground);margin-bottom:0.25rem;line-height:1.4;">' + item.text + '</h3>' +
                '<p class="muted" style="font-size:0.825rem;line-height:1.5;margin:0;">' + item.detail + '</p>' +
              '</div>' +
              (!isChronologicalView ? (
                '<div style="display:flex;flex-direction:column;gap:0.25rem;flex-shrink:0;">' +
                  '<button class="move-btn" onclick="moveItem(' + index + ', -1)" title="Move earlier in timeline">▲</button>' +
                  '<button class="move-btn" onclick="moveItem(' + index + ', 1)" title="Move later in timeline">▼</button>' +
                '</div>'
              ) : '');

            card.addEventListener('dragstart', (e) => {
              card.classList.add('dragging');
              e.dataTransfer.setData('text/plain', index);
            });
            card.addEventListener('dragend', () => card.classList.remove('dragging'));
            card.addEventListener('dragover', (e) => {
              e.preventDefault();
              const dragging = document.querySelector('.dragging');
              if (dragging && dragging !== card) {
                const targetIdx = parseInt(card.dataset.index, 10);
                const dragIdx = parseInt(dragging.dataset.index, 10);
                if (targetIdx !== dragIdx) {
                  const moved = currentList.splice(dragIdx, 1)[0];
                  currentList.splice(targetIdx, 0, moved);
                  render();
                }
              }
            });

            slot.appendChild(node);
            slot.appendChild(card);
            container.appendChild(slot);
          });
        }

        window.moveItem = function(fromIdx, dir) {
          const toIdx = fromIdx + dir;
          if (toIdx < 0 || toIdx >= currentList.length) return;
          const temp = currentList[fromIdx];
          currentList[fromIdx] = currentList[toIdx];
          currentList[toIdx] = temp;
          fbEl.style.display = 'none';
          render();
        };

        document.getElementById('btn-check-order').onclick = () => {
          let correctCount = 0;
          const cards = container.querySelectorAll('.timeline-card');
          currentList.forEach((item, i) => {
            const expected = ORIGINAL[i];
            const isMatch = item.text === expected.text;
            if (isMatch) correctCount++;
            if (cards[i]) {
              cards[i].classList.remove('correct-order', 'wrong-order');
              cards[i].classList.add(isMatch ? 'correct-order' : 'wrong-order');
            }
            const node = document.getElementById('node-' + i);
            if (node) {
              node.classList.toggle('locked', isMatch);
            }
          });

          updateProgress(correctCount);
          fbEl.style.display = 'block';
          if (correctCount === currentList.length) {
            fbEl.innerHTML = '<strong style="color:#10b981;font-size:1.05rem;">🎉 Flawless Historical Sequence! (100%)</strong><br><span class="muted text-xs">All milestones are positioned in true chronological sequence.</span>';
          } else {
            fbEl.innerHTML = '<strong style="color:#f59e0b;font-size:0.95rem;">' + correctCount + ' / ' + currentList.length + ' Milestones in Correct Chronological Order</strong>';
          }
        };

        document.getElementById('btn-shuffle-order').onclick = () => {
          isChronologicalView = false;
          fbEl.style.display = 'none';
          currentList.sort(() => Math.random() - 0.5);
          updateProgress(0);
          render();
        };

        document.getElementById('btn-reveal-timeline').onclick = () => {
          isChronologicalView = true;
          fbEl.style.display = 'none';
          currentList = [...ORIGINAL];
          updateProgress(ORIGINAL.length);
          render();
          const cards = container.querySelectorAll('.timeline-card');
          cards.forEach(c => c.classList.add('correct-order'));
          document.querySelectorAll('.timeline-slot-node').forEach(n => n.classList.add('locked'));
        };

        render();
        updateProgress(0);
      </script>
    </body></html>`;
  }

  // 5. CROSSWORD
  if (canonical === 'crossword') {
    const cleanItems = (items || []).filter((it) => (it.word || it.front || it.concept || '').length >= 2);
    const layout = buildCrosswordLayout(cleanItems) || {
      gridRows: 12,
      gridCols: 12,
      words: cleanItems.map((it, i) => ({
        word: String(it.word || it.front || it.concept || 'TERM').toUpperCase().replace(/[^A-Z]/g, ''),
        clue: String(it.clue || it.back || it.detail || it.explanation || 'Key definition'),
        direction: i % 2 === 0 ? 'across' : 'down',
        startRow: (i * 2) % 10 + 1,
        startCol: 1,
        number: i + 1,
      })),
    };
    const layoutJson = JSON.stringify(layout);

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>/* INJECT_THEME_CSS */
.cw-container{display:flex;flex-direction:row;gap:1.5rem;width:100%;max-width:1200px;align-items:flex-start;justify-content:center;flex-wrap:wrap;}
.cw-board-wrapper{flex:1 1 540px;min-width:320px;display:flex;flex-direction:column;align-items:center;}
.cw-board{display:inline-grid;grid-template-columns:repeat(${layout.gridCols},38px);grid-template-rows:repeat(${layout.gridRows},38px);gap:2px;background:transparent;padding:6px;border-radius:0.75rem;margin:0 auto;}
.cw-cell{position:relative;width:38px;height:38px;display:flex;align-items:center;justify-content:center;user-select:none;box-sizing:border-box;}
.cw-cell.empty-cell{visibility:hidden;pointer-events:none;background:transparent;}
.cw-cell.active-cell{background:#ffffff;border:1.5px solid #cbd5e1;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,0.12);transition:all 0.15s;}
.cw-cell.active-cell.highlight{background:#e0e7ff;border-color:#6366f1;box-shadow:0 0 0 2px rgba(99,102,241,0.4);}
.cw-cell-num{position:absolute;top:1px;left:3px;font-size:10px;font-weight:800;color:#64748b;line-height:1;pointer-events:none;}
.cw-cell input{width:100%;height:100%;text-align:center;font-size:18px;font-weight:800;text-transform:uppercase;background:transparent;border:none;outline:none;color:#0f172a;caret-color:#6366f1;padding:0;cursor:pointer;}
.cw-cell.correct{background:#d1fae5!important;border-color:#10b981!important;}
.cw-cell.correct input{color:#065f46!important;}
.cw-cell.wrong{background:#fee2e2!important;border-color:#ef4444!important;}
.cw-cell.wrong input{color:#991b1b!important;}
.cw-sidebar{flex:1 1 360px;min-width:300px;max-width:460px;display:flex;flex-direction:column;gap:1rem;}
.clue-scroll{max-height:360px;overflow-y:auto;display:grid;gap:0.4rem;padding-right:0.35rem;}
.clue-item{padding:0.6rem 0.85rem;border-radius:0.5rem;background:var(--background);border:1px solid var(--border);cursor:pointer;font-size:0.85rem;line-height:1.45;transition:all 0.15s;text-align:left;}
.clue-item:hover,.clue-item.active{border-color:#6366f1;background:rgba(99,102,241,0.12);}
</style></head><body><div id="app"><header id="app-header"><div style="display:flex;align-items:center;gap:0.5rem;justify-content:center;"><span class="badge" style="background:#6366f1;color:white;">🧩 2D Crossword Grid</span></div><h1 style="margin-top:0.25rem;">${title}</h1><p>${description}</p><span id="app-progress">0 / ${layout.words.length} Solved</span></header><main id="app-main"><div class="cw-container"><div class="card cw-board-wrapper"><div style="width:100%;overflow-x:auto;display:flex;justify-content:center;padding:0.5rem 0;"><div class="cw-board" id="board"></div></div><div style="display:flex;gap:0.75rem;margin-top:1.25rem;width:100%;justify-content:center;"><button class="btn btn-primary" id="check-btn">⚡ Check Puzzle</button><button class="btn btn-secondary" id="reveal-btn">Reveal Answers</button></div></div><div class="cw-sidebar"><div class="card text-left" style="padding:1rem;"><div id="active-clue-banner" style="background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.3);padding:0.75rem;border-radius:0.5rem;font-size:0.875rem;line-height:1.4;margin-bottom:0.75rem;"><strong id="banner-label" style="color:#818cf8;">Select a clue to begin:</strong> <span id="banner-text">Click any clue below or tap a grid square to type your answer.</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;"><div class="clue-section"><h4 style="font-weight:700;font-size:0.9rem;color:#818cf8;border-bottom:1px solid var(--border);padding-bottom:0.35rem;margin-bottom:0.4rem;">Across</h4><div class="clue-scroll" id="across-clues"></div></div><div class="clue-section"><h4 style="font-weight:700;font-size:0.9rem;color:#818cf8;border-bottom:1px solid var(--border);padding-bottom:0.35rem;margin-bottom:0.4rem;">Down</h4><div class="clue-scroll" id="down-clues"></div></div></div></div></div></div></main></div><script>const SPEC=${layoutJson};const board=document.getElementById('board');const acrossBox=document.getElementById('across-clues');const downBox=document.getElementById('down-clues');const bannerLabel=document.getElementById('banner-label');const bannerText=document.getElementById('banner-text');const progress=document.getElementById('app-progress');const cellMap=new Map();SPEC.words.forEach(w=>{const dr=w.direction==='down'?1:0;const dc=w.direction==='across'?1:0;for(let i=0;i<w.word.length;i++){const r=w.startRow+dr*i;const c=w.startCol+dc*i;const k=r+','+c;if(!cellMap.has(k)) cellMap.set(k,{r,c,letter:w.word[i],num:i===0?w.number:null,words:[]});cellMap.get(k).words.push(w);if(i===0) cellMap.get(k).num=w.number;}});for(let r=1;r<=SPEC.gridRows;r++){for(let c=1;c<=SPEC.gridCols;c++){const k=r+','+c;const div=document.createElement('div');div.className='cw-cell';if(cellMap.has(k)){const info=cellMap.get(k);div.className='cw-cell active-cell';div.id='cell-'+r+'-'+c;if(info.num){const numSpan=document.createElement('span');numSpan.className='cw-cell-num';numSpan.textContent=info.num;div.appendChild(numSpan);}const input=document.createElement('input');input.maxLength=1;input.dataset.r=r;input.dataset.c=c;input.dataset.ans=info.letter;input.oninput=(e)=>{e.target.value=e.target.value.toUpperCase();if(e.target.value){moveToNext(r,c);}};input.onkeydown=(e)=>{if(e.key==='Backspace' && !input.value){moveToPrev(r,c);}if(e.key==='ArrowRight') moveTo(r,c+1);if(e.key==='ArrowLeft') moveTo(r,c-1);if(e.key==='ArrowDown') moveTo(r+1,c);if(e.key==='ArrowUp') moveTo(r-1,c);};input.onfocus=()=>{highlightWordForCell(info.words[0]);};div.appendChild(input);}else{div.className='cw-cell empty-cell';}board.appendChild(div);}}function renderClues(){SPEC.words.forEach(w=>{const el=document.createElement('div');el.className='clue-item';el.id='clue-'+w.number+'-'+w.direction;el.innerHTML='<strong>'+w.number+'.</strong> '+w.clue+' <span style="color:#94a3b8;font-size:0.75rem;font-weight:700;">('+w.word.length+')</span>';el.onclick=()=>focusWord(w);if(w.direction==='across') acrossBox.appendChild(el); else downBox.appendChild(el);});}function focusWord(w){document.querySelectorAll('.clue-item').forEach(c=>c.classList.remove('active'));const clueEl=document.getElementById('clue-'+w.number+'-'+w.direction);if(clueEl) clueEl.classList.add('active');bannerLabel.textContent=w.number+' '+w.direction.toUpperCase()+' ('+w.word.length+' letters):';bannerText.textContent=w.clue;highlightWord(w);moveTo(w.startRow,w.startCol);}let currentActiveWord=null;function highlightWord(w){currentActiveWord=w;document.querySelectorAll('.cw-cell').forEach(c=>c.classList.remove('highlight'));const dr=w.direction==='down'?1:0;const dc=w.direction==='across'?1:0;for(let i=0;i<w.word.length;i++){const cell=document.getElementById('cell-'+(w.startRow+dr*i)+'-'+(w.startCol+dc*i));if(cell) cell.classList.add('highlight');}}function highlightWordForCell(w){if(w) highlightWord(w);}function moveTo(r,c){const nextInput=document.querySelector('input[data-r="'+r+'"][data-c="'+c+'"]');if(nextInput) nextInput.focus();}function moveToNext(r,c){if(!currentActiveWord) return;const dr=currentActiveWord.direction==='down'?1:0;const dc=currentActiveWord.direction==='across'?1:0;moveTo(r+dr,c+dc);}function moveToPrev(r,c){if(!currentActiveWord) return;const dr=currentActiveWord.direction==='down'?1:0;const dc=currentActiveWord.direction==='across'?1:0;moveTo(r-dr,c-dc);}document.getElementById('check-btn').onclick=()=>{let solvedWords=0;SPEC.words.forEach(w=>{const dr=w.direction==='down'?1:0;const dc=w.direction==='across'?1:0;let wordCorrect=true;for(let i=0;i<w.word.length;i++){const r=w.startRow+dr*i;const c=w.startCol+dc*i;const inp=document.querySelector('input[data-r="'+r+'"][data-c="'+c+'"]');const cell=document.getElementById('cell-'+r+'-'+c);if(inp){if(inp.value.toUpperCase()===w.word[i]){cell.classList.add('correct');cell.classList.remove('wrong');}else{cell.classList.add('wrong');cell.classList.remove('correct');wordCorrect=false;}}}if(wordCorrect) solvedWords++;});progress.textContent=solvedWords+' / '+SPEC.words.length+' Solved';};document.getElementById('reveal-btn').onclick=()=>{SPEC.words.forEach(w=>{const dr=w.direction==='down'?1:0;const dc=w.direction==='across'?1:0;for(let i=0;i<w.word.length;i++){const inp=document.querySelector('input[data-r="'+(w.startRow+dr*i)+'"][data-c="'+(w.startCol+dc*i)+'"]');const cell=document.getElementById('cell-'+(w.startRow+dr*i)+'-'+(w.startCol+dc*i));if(inp){inp.value=w.word[i];if(cell){cell.classList.add('correct');cell.classList.remove('wrong');}}}});progress.textContent=SPEC.words.length+' / '+SPEC.words.length+' Solved';};renderClues();if(SPEC.words[0]) focusWord(SPEC.words[0]);</script></body></html>`;
  }

  // 6. 3-IN-1 REVISION KIT
  if (canonical === 'revision-kit') {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>/* INJECT_THEME_CSS */.tab-btn.active{background:#5A7D99;color:white;font-weight:700;}</style></head><body><div id="app"><header id="app-header"><div style="display:flex;align-items:center;gap:0.5rem;justify-content:center;"><span class="badge" style="background:#5A7D99;color:white;">📦 3-in-1 Revision Kit</span></div><h1 style="margin-top:0.25rem;">${title}</h1><p>${description}</p><div style="display:flex;justify-content:center;gap:0.5rem;margin-top:0.75rem;"><button class="btn btn-secondary tab-btn active" id="tab-notes">📑 Cornell Notes</button><button class="btn btn-secondary tab-btn" id="tab-cards">🗂️ Flashcards</button><button class="btn btn-secondary tab-btn" id="tab-quiz">⏱️ Timed Quiz</button></div></header><main id="app-main"><div id="view-notes" class="w-full max-w-3xl text-left" style="display:grid;gap:0.75rem;"></div><div id="view-cards" class="w-full max-w-2xl text-center" style="display:none;"><div class="card" id="kit-card" style="min-height:220px;display:flex;flex-direction:column;justify-content:center;cursor:pointer;"><span class="badge" id="kit-card-badge" style="margin:0 auto 0.5rem auto;">Front</span><h2 id="kit-card-text" style="font-size:1.15rem;font-weight:700;color:var(--foreground);"></h2></div><div style="display:flex;gap:0.5rem;margin-top:0.75rem;justify-content:center;"><button class="btn btn-secondary" id="kit-card-prev">Prev</button><button class="btn btn-primary" id="kit-card-flip">Flip</button><button class="btn btn-secondary" id="kit-card-next">Next</button></div></div><div id="view-quiz" class="w-full max-w-2xl text-left" style="display:none;"><div class="card"><div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;"><span id="quiz-progress-badge" class="badge">Q1</span><span id="timer-badge" class="badge" style="background:#ef4444;color:white;">⏱️ 60s</span></div><h3 id="quiz-q-text" style="font-size:1.1rem;font-weight:700;margin-bottom:0.75rem;color:var(--foreground);"></h3><div id="quiz-choices" style="display:grid;gap:0.5rem;"></div></div></div></main></div><script>const DATA=${itemsJson};let cardIdx=0;let cardFlipped=false;let quizIdx=0;let quizScore=0;let timeLeft=60;let timerInterval=null;const notesView=document.getElementById('view-notes');const cardsView=document.getElementById('view-cards');const quizView=document.getElementById('view-quiz');function showTab(t){document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));notesView.style.display='none';cardsView.style.display='none';quizView.style.display='none';if(t==='notes'){document.getElementById('tab-notes').classList.add('active');notesView.style.display='grid';}else if(t==='cards'){document.getElementById('tab-cards').classList.add('active');cardsView.style.display='block';renderCard();}else if(t==='quiz'){document.getElementById('tab-quiz').classList.add('active');quizView.style.display='block';startQuiz();}}document.getElementById('tab-notes').onclick=()=>showTab('notes');document.getElementById('tab-cards').onclick=()=>showTab('cards');document.getElementById('tab-quiz').onclick=()=>showTab('quiz');DATA.forEach((item,i)=>{const c=document.createElement('div');c.className='card';c.innerHTML='<h3 style="font-weight:700;font-size:1rem;color:var(--primary);margin-bottom:0.35rem;">'+(item.front||item.concept||'Topic '+(i+1))+'</h3><p class="muted" style="font-size:0.875rem;line-height:1.6;">'+(item.back||item.detail||item.explanation||'')+'</p>';notesView.appendChild(c);});function renderCard(){const it=DATA[cardIdx]||{};const b=document.getElementById('kit-card-badge');const txt=document.getElementById('kit-card-text');if(cardFlipped){b.textContent='Back';b.className='badge correct';txt.textContent=it.back||it.answer||'';}else{b.textContent='Front (Click to Flip)';b.className='badge';txt.textContent=it.front||it.concept||it.question||'';}}document.getElementById('kit-card').onclick=()=>{cardFlipped=!cardFlipped;renderCard();};document.getElementById('kit-card-flip').onclick=()=>{cardFlipped=!cardFlipped;renderCard();};document.getElementById('kit-card-prev').onclick=()=>{cardIdx=(cardIdx-1+DATA.length)%DATA.length;cardFlipped=false;renderCard();};document.getElementById('kit-card-next').onclick=()=>{cardIdx=(cardIdx+1)%DATA.length;cardFlipped=false;renderCard();};function startQuiz(){if(!timerInterval){timeLeft=60;timerInterval=setInterval(()=>{timeLeft--;document.getElementById('timer-badge').textContent='⏱️ '+timeLeft+'s';if(timeLeft<=0){clearInterval(timerInterval);alert('Time is up! Quiz finished.');}},1000);}renderQuizItem();}function renderQuizItem(){const it=DATA[quizIdx%DATA.length]||{};document.getElementById('quiz-progress-badge').textContent='Q '+(quizIdx+1)+' of '+DATA.length;document.getElementById('quiz-q-text').textContent=it.question||('What best defines: '+(it.front||it.concept)+'?');const box=document.getElementById('quiz-choices');box.innerHTML='';const correct=it.back||it.answer||'Correct definition';const others=DATA.filter(d=>d!==it).map(d=>d.back||d.answer||d.front).filter(Boolean);const options=[correct,...others.slice(0,3)];while(options.length<4) options.push('Secondary option '+(options.length+1));options.sort(()=>Math.random()-0.5);options.forEach(opt=>{const btn=document.createElement('button');btn.className='btn btn-secondary text-left';btn.textContent=opt;btn.onclick=()=>{if(opt===correct){btn.className='btn correct text-left';quizScore++;}else{btn.className='btn incorrect text-left';}setTimeout(()=>{quizIdx++;if(quizIdx>=DATA.length){alert('Quiz completed! Score: '+quizScore+'/'+DATA.length);}else{renderQuizItem();}},1200);};box.appendChild(btn);});}showTab('notes');</script></body></html>`;
  }

  // 7. STUDY NOTES (DEFAULT / FALLBACK)
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>/* INJECT_THEME_CSS */</style></head><body><div id="app"><header id="app-header"><h1>${title}</h1><p>${description}</p><span id="app-progress">${items.length} Topics</span></header><main id="app-main"><div class="w-full max-w-3xl" style="margin-bottom:1rem;"><input type="text" id="search-input" placeholder="🔍 Search study notes..." /></div><div class="w-full max-w-3xl text-left" id="notes-container" style="display:grid;gap:0.75rem;"></div></main></div><script>const DATA=${itemsJson};const container=document.getElementById('notes-container');const input=document.getElementById('search-input');function render(filter=''){container.innerHTML='';const q=filter.toLowerCase().trim();DATA.forEach((item)=>{if(q && !item.front.toLowerCase().includes(q) && !item.back.toLowerCase().includes(q)) return;const card=document.createElement('div');card.className='card';card.innerHTML='<h3 style="font-weight:700;font-size:1.05rem;color:var(--primary);margin-bottom:0.5rem;">'+item.front+'</h3><p class="muted" style="font-size:0.9rem;line-height:1.6;white-space:pre-wrap;">'+item.back+'</p>';container.appendChild(card);});}input.addEventListener('input',e=>render(e.target.value));render();</script></body></html>`;
}

/**
 * Renders interactive SVG diagram to HTML with narrative step controls.
 */
export function renderDiagramToHtml(spec, title, description) {
  const nodes = Array.isArray(spec?.nodes) ? spec.nodes : [];
  const edges = Array.isArray(spec?.edges) ? spec.edges : [];
  const narrative = Array.isArray(spec?.narrativeFlow) ? spec.narrativeFlow : [];
  const bgImg = spec?.bgImageUrl || '';
  const viewBox = spec?.viewBox || '0 0 800 600';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg: #0d1117;
      --card-bg: #161b22;
      --border: #30363d;
      --text: #e6edf3;
      --text-muted: #8b949e;
      --primary: #58a6ff;
      --primary-glow: rgba(88, 166, 255, 0.3);
      --accent: #238636;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background: var(--bg); color: var(--text); height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    header { padding: 12px 20px; background: var(--card-bg); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; z-index: 10; flex-shrink: 0; }
    header h1 { font-size: 15px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px; }
    header p { font-size: 11px; color: var(--text-muted); }
    .container { flex: 1; display: flex; position: relative; overflow: hidden; }
    .canvas-pane { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at center, #161b22 0%, #0d1117 100%); overflow: hidden; }
    svg { width: 100%; height: 100%; max-height: 100%; }
    .node-group { cursor: pointer; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
    .node-group:hover { transform: scale(1.06); }
    .node-group.active circle { stroke: #58a6ff; stroke-width: 4; filter: drop-shadow(0 0 12px var(--primary-glow)); }
    .node-group.active text { font-weight: 800; fill: #58a6ff; }
    .edge-path { stroke: #30363d; stroke-width: 2.5; stroke-dasharray: 6 4; animation: dash 30s linear infinite; fill: none; }
    .edge-path.active { stroke: #58a6ff; stroke-width: 3.5; stroke-dasharray: none; filter: drop-shadow(0 0 8px var(--primary-glow)); }
    @keyframes dash { to { stroke-dashoffset: -1000; } }
    .sidebar { width: 320px; background: var(--card-bg); border-left: 1px solid var(--border); display: flex; flex-direction: column; padding: 16px; gap: 14px; z-index: 10; overflow-y: auto; flex-shrink: 0; }
    .step-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: rgba(88, 166, 255, 0.15); color: #58a6ff; width: fit-content; }
    .info-card { background: #0d1117; border: 1px solid var(--border); border-radius: 12px; padding: 14px; }
    .info-title { font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 6px; }
    .info-role { font-size: 11px; color: var(--primary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
    .section-label { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-top: 10px; margin-bottom: 4px; }
    .info-desc { font-size: 12px; color: var(--text); line-height: 1.5; }
    .controls { display: flex; align-items: center; gap: 8px; margin-top: auto; padding-top: 12px; border-top: 1px solid var(--border); }
    .btn { flex: 1; padding: 8px 12px; background: #21262d; border: 1px solid var(--border); color: #fff; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s ease; text-align: center; }
    .btn:hover { background: #30363d; border-color: #8b949e; }
    .btn-primary { background: #238636; border-color: rgba(240,246,252,0.1); }
    .btn-primary:hover { background: #2ea043; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>✨ ${escapeHtml(title || 'Interactive Diagram')}</h1>
      <p>${escapeHtml(description || 'Click any component to inspect or use the narrative player below.')}</p>
    </div>
    <span class="step-badge" id="step-indicator">Step 1 of ${narrative.length || nodes.length || 1}</span>
  </header>
  <div class="container">
    <div class="canvas-pane">
      <svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="nodeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1f2937" />
            <stop offset="100%" stop-color="#111827" />
          </linearGradient>
        </defs>
        ${bgImg ? `<image href="${bgImg}" x="50" y="50" width="700" height="500" opacity="0.15" preserveAspectRatio="xMidYMid meet"/>` : ''}
        <g id="edges-layer"></g>
        <g id="nodes-layer"></g>
      </svg>
    </div>
    <div class="sidebar">
      <div class="info-card" id="detail-card">
        <div class="info-role" id="card-role">INTERACTIVE EXPLORER</div>
        <div class="info-title" id="card-title">Select a Component</div>
        <div class="section-label">What it does</div>
        <div class="info-desc" id="card-what">Click any node or step through the process to discover how each component functions.</div>
        <div class="section-label">Scientific mechanism & why it works</div>
        <div class="info-desc" id="card-why">Detailed mechanism explanations will appear here.</div>
      </div>
      <div class="controls">
        <button class="btn" id="prev-btn" onclick="prevStep()">◀ Prev</button>
        <button class="btn btn-primary" id="next-btn" onclick="nextStep()">Next ▶</button>
      </div>
    </div>
  </div>

  <script>
    const NODES = ${JSON.stringify(nodes)};
    const EDGES = ${JSON.stringify(edges)};
    const NARRATIVE = ${JSON.stringify(narrative)};
    let currentStep = 0;
    let activeNodeId = NODES[0]?.id || null;

    function renderSvg() {
      const edgesLayer = document.getElementById('edges-layer');
      const nodesLayer = document.getElementById('nodes-layer');

      edgesLayer.innerHTML = EDGES.map((edge, idx) => {
        const fromNode = NODES.find(n => n.id === edge.from) || { x: 150 + idx * 100, y: 300 };
        const toNode = NODES.find(n => n.id === edge.to) || { x: 250 + idx * 100, y: 300 };
        const midX = (fromNode.x + toNode.x) / 2;
        const midY = (fromNode.y + toNode.y) / 2 - 20;
        return \`
          <path id="edge-\${idx}" class="edge-path" d="M \${fromNode.x} \${fromNode.y} Q \${midX} \${midY} \${toNode.x} \${toNode.y}" />
          \${edge.label ? \`<text x="\${midX}" y="\${midY - 8}" fill="#8b949e" font-size="10" font-weight="600" text-anchor="middle">\${edge.label}</text>\` : ''}
        \`;
      }).join('');

      nodesLayer.innerHTML = NODES.map(node => {
        const r = node.radius || 42;
        return \`
          <g id="node-\${node.id}" class="node-group \${node.id === activeNodeId ? 'active' : ''}" onclick="selectNode('\${node.id}')" transform="translate(\${node.x}, \${node.y})">
            <circle cx="0" cy="0" r="\${r}" fill="url(#nodeGrad)" stroke="#388bfd" stroke-width="2.5" />
            <text x="0" y="4" fill="#f0f6fc" font-size="11" font-weight="700" text-anchor="middle" pointer-events="none">\${node.label || node.id}</text>
          </g>
        \`;
      }).join('');
    }

    function selectNode(id) {
      activeNodeId = id;
      document.querySelectorAll('.node-group').forEach(el => el.classList.remove('active'));
      const el = document.getElementById('node-' + id);
      if (el) el.classList.add('active');

      const node = NODES.find(n => n.id === id);
      if (node) {
        document.getElementById('card-title').innerText = node.label || node.id;
        document.getElementById('card-role').innerText = node.role || 'ACTIVE STAGE';
        document.getElementById('card-what').innerText = node.whatItDoes || node.description || 'Core stage of the process.';
        document.getElementById('card-why').innerText = node.whyItWorks || node.why || 'Operating according to scientific mechanisms.';
      }
    }

    function applyStep(stepIdx) {
      if (NARRATIVE.length > 0) {
        const step = NARRATIVE[stepIdx];
        if (step) {
          document.getElementById('step-indicator').innerText = \`Step \${step.step || stepIdx + 1} of \${NARRATIVE.length}\`;
          document.getElementById('card-title').innerText = step.title || \`Stage \${stepIdx + 1}\`;
          document.getElementById('card-role').innerText = 'NARRATIVE FLOW';
          document.getElementById('card-what').innerText = step.narration || '';
          document.getElementById('card-why').innerText = step.why || '';
          if (step.activeNodeId) selectNode(step.activeNodeId);
        }
      } else if (NODES[stepIdx]) {
        selectNode(NODES[stepIdx].id);
        document.getElementById('step-indicator').innerText = \`Node \${stepIdx + 1} of \${NODES.length}\`;
      }
    }

    function nextStep() {
      const max = NARRATIVE.length || NODES.length;
      if (max === 0) return;
      currentStep = (currentStep + 1) % max;
      applyStep(currentStep);
    }

    function prevStep() {
      const max = NARRATIVE.length || NODES.length;
      if (max === 0) return;
      currentStep = (currentStep - 1 + max) % max;
      applyStep(currentStep);
    }

    renderSvg();
    if (NARRATIVE.length > 0) applyStep(0);
    else if (NODES.length > 0) selectNode(NODES[0].id);
  </script>
</body>
</html>`;
}
