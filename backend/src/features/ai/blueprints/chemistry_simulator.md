# Chemistry Simulator Blueprint Specification

## Overview
This blueprint guides the AI to build a fully functional, self-contained interactive **Chemistry Laboratory & Reaction Simulator**.

CRITICAL DIRECTIVE:
- DO NOT WRITE PLACEHOLDER COMMENTS (e.g. `// update graph here`, `// add reaction logic`, `// TODO`).
- EVERY JAVASCRIPT FUNCTION MUST CONTAIN COMPLETE, EXECUTABLE CODE LOGIC.

## Workbench UI & Layout Requirements
- **Top / Sidebar (Reagent Shelf)**:
  - Acids: HCl, H2SO4, HNO3
  - Bases: NaOH, KOH, NH3
  - Salt Solutions: CuSO4, AgNO3
  - Indicators: Phenolphthalein, Universal Indicator, Litmus
- **Center Canvas**: `<canvas id="flaskCanvas" width="400" height="300">`
  - Liquid container with surface animation, dynamic liquid color based on pH/indicator, and animated gas bubbles.
- **Controls Panel**:
  - `Volume Slider (10mL - 100mL)`
  - `Temperature Slider (20°C - 100°C)`
  - `Pour Reagent Button`
  - `Stir / Heat Toggle Buttons`
  - `Reset Flask Button`
- **Dashboard**:
  - Balanced Equation Text: `HCl(aq) + NaOH(aq) → NaCl(aq) + H2O(l)`
  - Live pH Meter (0 - 14) with color gauge
  - Temperature Gauge (°C) & Reaction Log

## Required Complete JavaScript Engine Harness
You MUST implement complete, working JavaScript functions matching this logic structure (NO PLACEHOLDERS):

```javascript
const state = {
  volume: 0,
  pH: 7.0,
  temp: 25,
  reagentA: null,
  reagentB: null,
  indicator: 'universal',
  bubbles: [],
  reactionLog: []
};

// Chemical Database
const REAGENTS = {
  hcl: { name: 'Hydrochloric Acid (HCl)', type: 'acid', pH: 1.0, color: '#ef4444' },
  naoh: { name: 'Sodium Hydroxide (NaOH)', type: 'base', pH: 13.0, color: '#3b82f6' },
  cuso4: { name: 'Copper Sulfate (CuSO4)', type: 'salt', pH: 5.5, color: '#06b6d4' },
  water: { name: 'Pure Water (H2O)', type: 'neutral', pH: 7.0, color: '#38bdf8' }
};

function getIndicatorColor(pH, indicator) {
  if (indicator === 'phenolphthalein') {
    return pH >= 8.3 ? 'rgba(236, 72, 153, 0.7)' : 'rgba(240, 240, 240, 0.4)';
  }
  // Universal Indicator color scale
  if (pH < 3) return 'rgba(239, 68, 68, 0.7)';
  if (pH < 6) return 'rgba(245, 158, 11, 0.7)';
  if (pH <= 7.5) return 'rgba(16, 185, 129, 0.7)';
  if (pH < 11) return 'rgba(59, 130, 246, 0.7)';
  return 'rgba(139, 92, 246, 0.7)';
}

function pourReagent(reagentKey, amount = 20) {
  const r = REAGENTS[reagentKey];
  if (!r) return;
  
  if (state.volume === 0) {
    state.pH = r.pH;
    state.reagentA = reagentKey;
  } else {
    // Mixture pH formula approximation
    state.pH = (state.pH * state.volume + r.pH * amount) / (state.volume + amount);
    state.reagentB = reagentKey;
    triggerReaction(state.reagentA, reagentKey);
  }
  state.volume = Math.min(250, state.volume + amount);
  updateUI();
}

function triggerReaction(a, b) {
  if ((a === 'hcl' && b === 'naoh') || (a === 'naoh' && b === 'hcl')) {
    state.temp += 8;
    addBubbles(15);
    logEvent('Neutralization Reaction: HCl + NaOH → NaCl + H2O (Exothermic, ΔT = +8°C)');
  } else {
    logEvent(`Mixed ${REAGENTS[a]?.name || a} with ${REAGENTS[b]?.name || b}`);
  }
}

function updateUI() {
  document.getElementById('ph-value').textContent = state.pH.toFixed(1);
  document.getElementById('temp-value').textContent = state.temp.toFixed(1) + ' °C';
  document.getElementById('volume-value').textContent = state.volume + ' mL';
  renderFlaskCanvas();
}

function renderFlaskCanvas() {
  const canvas = document.getElementById('flaskCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw Flask Outline
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(150, 50); ctx.lineTo(150, 100); ctx.lineTo(80, 240);
  ctx.arcTo(80, 270, 110, 270, 20); ctx.lineTo(290, 270);
  ctx.arcTo(320, 270, 320, 240, 20); ctx.lineTo(250, 100);
  ctx.lineTo(250, 50); ctx.closePath();
  ctx.stroke();

  // Draw Fluid Level
  if (state.volume > 0) {
    const liquidHeight = Math.min(160, (state.volume / 250) * 160);
    const yTop = 260 - liquidHeight;
    ctx.fillStyle = getIndicatorColor(state.pH, state.indicator);
    ctx.beginPath();
    ctx.moveTo(90, 260);
    ctx.lineTo(90 + (160 - liquidHeight) * 0.4, yTop);
    ctx.lineTo(310 - (160 - liquidHeight) * 0.4, yTop);
    ctx.lineTo(310, 260);
    ctx.closePath();
    ctx.fill();
  }
}
```
