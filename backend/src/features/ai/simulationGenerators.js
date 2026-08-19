/**
 * simulationGenerators.js
 * Dedicated, 100% reliable interactive HTML engine generators for Chemistry, Physics, and 3D simulations.
 */

export function generateChemistrySimulatorHtml(title = 'Chemistry Lab Simulator', description = 'Interactive Chemistry Reaction & Titration Simulator', items = []) {
  const itemsJson = JSON.stringify(items);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    /* INJECT_THEME_CSS */
    body { background: #08090e; color: #f4f4f6; font-family: system-ui, -apple-system, sans-serif; }
    .glass-card { background: rgba(18, 20, 31, 0.85); border: 1px solid rgba(255, 255, 255, 0.09); backdrop-filter: blur(12px); border-radius: 1rem; }
    .btn-action { transition: all 0.2s ease; }
    .btn-action:hover { transform: translateY(-1px); }
  </style>
</head>
<div id="app" class="min-h-screen flex flex-col p-4 gap-4 max-w-7xl mx-auto">
  <header id="app-header" class="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-3">
    <div>
      <h1 class="text-xl font-bold text-white flex items-center gap-2">
        <span class="text-indigo-400">🧪</span> ${title}
      </h1>
      <p class="text-xs text-zinc-400 mt-0.5">${description}</p>
    </div>
    <div id="app-progress" class="flex items-center gap-3">
      <span class="px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-semibold">
        pH: <strong id="ph-display" class="text-emerald-400 text-sm">7.0</strong>
      </span>
      <span class="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold">
        Temp: <strong id="temp-display" class="text-amber-400 text-sm">25.0 °C</strong>
      </span>
      <span class="px-3 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-mono font-semibold">
        Volume: <strong id="vol-display" class="text-sky-400 text-sm">0 mL</strong>
      </span>
    </div>
  </header>

  <main id="app-main" class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[500px]">
    
    <!-- Left Reagent & Tools Shelf (4 cols) -->
    <div class="lg:col-span-4 glass-card p-4 flex flex-col gap-4">
      <h3 class="text-xs font-bold text-indigo-300 uppercase tracking-wider">Reagent & Chemical Shelf</h3>
      
      <div class="space-y-2">
        <label class="text-xs text-zinc-300 font-semibold block">Select Chemical Reagent</label>
        <select id="reagent-select" class="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500">
          <option value="hcl">Hydrochloric Acid (HCl - Acid, pH 1.0)</option>
          <option value="naoh">Sodium Hydroxide (NaOH - Base, pH 13.0)</option>
          <option value="h2so4">Sulfuric Acid (H2SO4 - Strong Acid, pH 0.5)</option>
          <option value="cuso4">Copper Sulfate (CuSO4 - Blue Solution, pH 5.5)</option>
          <option value="agno3">Silver Nitrate (AgNO3 - Precipitate Agent)</option>
          <option value="zn">Zinc Metal Granules (Zn - Displacement)</option>
          <option value="water">Pure Distilled Water (H2O - Neutral pH 7.0)</option>
        </select>
      </div>

      <div class="space-y-2">
        <label class="text-xs text-zinc-300 font-semibold block">Indicator Choice</label>
        <select id="indicator-select" class="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500">
          <option value="universal">Universal Indicator (Full rainbow pH spectrum)</option>
          <option value="phenolphthalein">Phenolphthalein (Pink in Base pH > 8.2)</option>
          <option value="litmus">Litmus Paper Solution (Red in Acid, Blue in Base)</option>
        </select>
      </div>

      <div class="grid grid-cols-2 gap-2 pt-2">
        <div>
          <label class="text-[11px] text-zinc-400 block mb-1">Pour Dose (mL)</label>
          <input type="number" id="dose-input" value="20" min="5" max="100" class="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg p-2 text-xs text-center" />
        </div>
        <div>
          <label class="text-[11px] text-zinc-400 block mb-1">Heat Target (°C)</label>
          <input type="number" id="heat-input" value="25" min="20" max="100" class="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg p-2 text-xs text-center" />
        </div>
      </div>

      <div class="flex flex-col gap-2 pt-2">
        <button id="btn-pour" class="btn-action w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2">
          <span>💧 Pour Reagent into Beaker</span>
        </button>
        <button id="btn-heat" class="btn-action w-full py-2.5 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center justify-center gap-2">
          <span>🔥 Apply Bunsen Heater</span>
        </button>
        <button id="btn-reset" class="btn-action w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold">
          <span>↺ Empty & Reset Beaker</span>
        </button>
      </div>
    </div>

    <!-- Center Interactive Reaction Flask Canvas (5 cols) -->
    <div class="lg:col-span-5 glass-card p-4 flex flex-col items-center justify-center relative overflow-hidden">
      <div class="absolute top-3 left-4 text-xs font-bold text-indigo-300">Reaction Vessel</div>
      
      <canvas id="flaskCanvas" width="340" height="360" class="w-full max-w-[340px] h-[360px] select-none"></canvas>

      <!-- Status Indicator Pill -->
      <div id="vessel-status" class="mt-2 px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono text-center">
        Vessel Ready — Select a reagent and click Pour
      </div>
    </div>

    <!-- Right Observation & Reaction Telemetry (3 cols) -->
    <div class="lg:col-span-3 glass-card p-4 flex flex-col gap-3">
      <h3 class="text-xs font-bold text-indigo-300 uppercase tracking-wider">Observation Log</h3>

      <!-- pH Color Scale Gauge -->
      <div>
        <div class="flex justify-between text-[10px] text-zinc-400 mb-1 font-mono">
          <span>pH 0 (Acid)</span>
          <span>7.0</span>
          <span>pH 14 (Base)</span>
        </div>
        <div class="h-3 w-full rounded-full bg-gradient-to-r from-red-500 via-yellow-400 via-green-500 via-blue-500 to-purple-600 relative overflow-hidden border border-zinc-700">
          <div id="ph-indicator-pin" class="w-2 h-full bg-white shadow-md absolute top-0 transition-all duration-300 rounded-full" style="left: 50%;"></div>
        </div>
      </div>

      <!-- Live Chemical Equation Balancer -->
      <div class="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs">
        <div class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Active Chemical Equation</div>
        <div id="equation-display" class="font-mono text-emerald-300 font-bold text-xs break-words">
          H2O(l) (Neutral Base Solution)
        </div>
      </div>

      <!-- Real-time Reaction Log -->
      <div class="flex-1 flex flex-col">
        <div class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Lab Events & Reactions</div>
        <div id="reaction-log" class="flex-1 bg-zinc-950/90 border border-zinc-800/80 rounded-xl p-2.5 text-[11px] font-mono text-zinc-300 overflow-y-auto max-h-[220px] space-y-1.5">
          <div class="text-zinc-500 italic">Initialized clean glassware with 50mL neutral H2O.</div>
        </div>
      </div>
    </div>

  </main>

  <footer id="app-footer" class="glass-card p-3 flex items-center justify-between text-xs text-zinc-400">
    <div>HydrusLearn Interactive Chemistry Engine</div>
    <div id="quiz-prompt" class="text-indigo-300 font-semibold">Test Neutralization: Mix 20mL HCl with 20mL NaOH</div>
  </footer>
</div>

<script>
  const DATA = ${itemsJson};

  const state = {
    volume: 50,
    pH: 7.0,
    temp: 25.0,
    reagentsAdded: ['water'],
    indicator: 'universal',
    bubbles: [],
    precipitate: false
  };

  const REAGENTS = {
    hcl: { name: 'HCl (Hydrochloric Acid)', type: 'acid', pH: 1.0, color: 'rgba(239, 68, 68, 0.75)' },
    h2so4: { name: 'H2SO4 (Sulfuric Acid)', type: 'acid', pH: 0.5, color: 'rgba(220, 38, 38, 0.85)' },
    naoh: { name: 'NaOH (Sodium Hydroxide)', type: 'base', pH: 13.0, color: 'rgba(59, 130, 246, 0.75)' },
    cuso4: { name: 'CuSO4 (Copper Sulfate)', type: 'salt', pH: 5.5, color: 'rgba(6, 182, 212, 0.85)' },
    agno3: { name: 'AgNO3 (Silver Nitrate)', type: 'salt', pH: 6.0, color: 'rgba(244, 244, 245, 0.85)' },
    zn: { name: 'Zn (Zinc Metal Granules)', type: 'metal', pH: 7.0, color: 'rgba(148, 163, 184, 0.9)' },
    water: { name: 'H2O (Distilled Water)', type: 'neutral', pH: 7.0, color: 'rgba(56, 189, 248, 0.4)' }
  };

  function getFluidColor(pH, indicator) {
    if (indicator === 'phenolphthalein') {
      return pH >= 8.2 ? 'rgba(236, 72, 153, 0.75)' : 'rgba(240, 240, 240, 0.35)';
    }
    if (indicator === 'litmus') {
      return pH < 7 ? 'rgba(239, 68, 68, 0.75)' : 'rgba(37, 99, 235, 0.75)';
    }
    // Universal Indicator Scale
    if (pH <= 2) return 'rgba(239, 68, 68, 0.8)';
    if (pH <= 4) return 'rgba(249, 115, 22, 0.8)';
    if (pH <= 6) return 'rgba(234, 179, 8, 0.8)';
    if (pH <= 7.5) return 'rgba(34, 197, 94, 0.7)';
    if (pH <= 10) return 'rgba(14, 165, 233, 0.8)';
    if (pH <= 12) return 'rgba(59, 130, 246, 0.8)';
    return 'rgba(147, 51, 234, 0.85)';
  }

  function pourReagent() {
    const key = document.getElementById('reagent-select').value;
    const amount = parseInt(document.getElementById('dose-input').value) || 20;
    const r = REAGENTS[key];
    if (!r) return;

    const prevPH = state.pH;
    state.reagentsAdded.push(key);

    // Weighted average pH simulation
    const totalVol = state.volume + amount;
    state.pH = parseFloat(((state.pH * state.volume + r.pH * amount) / totalVol).toFixed(1));
    state.volume = Math.min(260, totalVol);

    // Trigger Reaction Checks
    checkReactions(key, prevPH);
    updateUI();
  }

  function checkReactions(latestKey, prevPH) {
    const logEl = document.getElementById('reaction-log');
    const eqEl = document.getElementById('equation-display');
    const hasAcid = state.reagentsAdded.some(k => REAGENTS[k]?.type === 'acid');
    const hasBase = state.reagentsAdded.some(k => REAGENTS[k]?.type === 'base');
    const hasZn = state.reagentsAdded.includes('zn');
    const hasAgNO3 = state.reagentsAdded.includes('agno3');
    const hasHCl = state.reagentsAdded.includes('hcl');

    if (hasAcid && hasBase && Math.abs(state.pH - 7.0) <= 1.5) {
      state.temp += 7.5;
      addBubbles(20);
      eqEl.textContent = 'HCl(aq) + NaOH(aq) → NaCl(aq) + H2O(l) [Neutralization ΔH = -57kJ/mol]';
      addLog('🔥 Neutralization Reaction! Acid + Base produced Salt (NaCl) + Water. Temp increased +7.5°C.');
    } else if (hasZn && hasAcid) {
      addBubbles(35);
      eqEl.textContent = 'Zn(s) + 2HCl(aq) → ZnCl2(aq) + H2(g)↑ [Displacement]';
      addLog('⚡ Rapid Effervescence! Zinc metal displaced Hydrogen gas (H2↑ bubbles rising).');
    } else if (hasAgNO3 && hasHCl) {
      state.precipitate = true;
      eqEl.textContent = 'AgNO3(aq) + HCl(aq) → AgCl(s)↓ + HNO3(aq) [Precipitation]';
      addLog('☁️ White Precipitate Formed! Insoluble Silver Chloride (AgCl↓) settling at bottom.');
    } else {
      eqEl.textContent = \`Mixed \${REAGENTS[latestKey]?.name || latestKey}. Volume: \${state.volume}mL.\`;
      addLog(\`Added \${REAGENTS[latestKey]?.name || latestKey}. pH adjusted to \${state.pH.toFixed(1)}.\`);
    }
  }

  function addBubbles(count) {
    for (let i = 0; i < count; i++) {
      state.bubbles.push({
        x: 110 + Math.random() * 120,
        y: 260 - Math.random() * 40,
        r: 2 + Math.random() * 4,
        speed: 1 + Math.random() * 2
      });
    }
  }

  function applyHeat() {
    const target = parseInt(document.getElementById('heat-input').value) || 60;
    state.temp = Math.min(100, Math.max(state.temp, target));
    addLog(\`🔥 Applied Bunsen Burner heat. Temperature raised to \${state.temp.toFixed(1)}°C.\`);
    if (state.temp > 70) addBubbles(15);
    updateUI();
  }

  function resetFlask() {
    state.volume = 50;
    state.pH = 7.0;
    state.temp = 25.0;
    state.reagentsAdded = ['water'];
    state.bubbles = [];
    state.precipitate = false;
    document.getElementById('equation-display').textContent = 'H2O(l) (Neutral Base Solution)';
    const logEl = document.getElementById('reaction-log');
    logEl.innerHTML = '<div class="text-zinc-500 italic">Rinsed and reset flask with 50mL neutral H2O.</div>';
    updateUI();
  }

  function addLog(msg) {
    const logEl = document.getElementById('reaction-log');
    const item = document.createElement('div');
    item.className = 'text-emerald-400 font-semibold';
    item.textContent = \`[\${new Date().toLocaleTimeString().split(' ')[0]}] \${msg}\`;
    logEl.prepend(item);
  }

  function updateUI() {
    document.getElementById('ph-display').textContent = state.pH.toFixed(1);
    document.getElementById('temp-display').textContent = state.temp.toFixed(1) + ' °C';
    document.getElementById('vol-display').textContent = state.volume + ' mL';
    document.getElementById('indicator-select').value = state.indicator;

    // Pin indicator position (pH 0 = 0%, pH 14 = 100%)
    const pinPct = Math.max(0, Math.min(100, (state.pH / 14) * 100));
    document.getElementById('ph-indicator-pin').style.left = pinPct + '%';

    renderFlaskCanvas();
  }

  function renderFlaskCanvas() {
    const canvas = document.getElementById('flaskCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Bunsen Burner Flame if temp > 35°C
    if (state.temp > 35) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.8)';
      ctx.beginPath();
      ctx.moveTo(150, 310); ctx.lineTo(170, 270); ctx.lineTo(190, 310);
      ctx.closePath(); ctx.fill();
    }

    // Draw Flask Glass Contour
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(130, 40); ctx.lineTo(130, 100); ctx.lineTo(60, 240);
    ctx.arcTo(60, 270, 90, 270, 20); ctx.lineTo(250, 270);
    ctx.arcTo(280, 270, 280, 240, 20); ctx.lineTo(210, 100);
    ctx.lineTo(210, 40);
    ctx.stroke();

    // Draw Fluid Fill
    if (state.volume > 0) {
      const liquidH = Math.min(170, (state.volume / 260) * 170);
      const yTop = 260 - liquidH;
      ctx.fillStyle = getFluidColor(state.pH, state.indicator);
      ctx.beginPath();
      ctx.moveTo(70, 260);
      ctx.lineTo(70 + (170 - liquidH) * 0.4, yTop);
      ctx.lineTo(270 - (170 - liquidH) * 0.4, yTop);
      ctx.lineTo(270, 260);
      ctx.closePath();
      ctx.fill();
    }

    // Draw Precipitate at Bottom
    if (state.precipitate) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(80, 252, 180, 8);
    }

    // Animate & Render Bubbles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    state.bubbles.forEach((b, idx) => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      b.y -= b.speed;
      if (b.y < 120) state.bubbles.splice(idx, 1);
    });
  }

  // Event Listeners
  document.getElementById('btn-pour').addEventListener('click', pourReagent);
  document.getElementById('btn-heat').addEventListener('click', applyHeat);
  document.getElementById('btn-reset').addEventListener('click', resetFlask);
  document.getElementById('indicator-select').addEventListener('change', (e) => {
    state.indicator = e.target.value;
    updateUI();
  });

  // Animation Loop for Canvas Liquids & Bubbles
  function animLoop() {
    renderFlaskCanvas();
    requestAnimationFrame(animLoop);
  }

  window.addEventListener('DOMContentLoaded', () => {
    updateUI();
    animLoop();
  });
</script>
</html>`;
}

export function generate3DSimulationHtml(title = '3D Interactive Model', description = '3D WebGL Model Viewer & Simulation', items = []) {
  const itemsJson = JSON.stringify(items);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
  <style>
    /* INJECT_THEME_CSS */
    body { background: #07080c; color: #f4f4f6; font-family: system-ui, -apple-system, sans-serif; overflow: hidden; }
    .glass-panel { background: rgba(18, 20, 31, 0.85); border: 1px solid rgba(255, 255, 255, 0.09); backdrop-filter: blur(12px); border-radius: 1rem; }
  </style>
</head>
<div id="app" class="h-screen w-screen flex flex-col relative overflow-hidden">
  
  <!-- Header Overlay -->
  <header id="app-header" class="absolute top-4 left-4 right-4 z-20 glass-panel p-4 flex items-center justify-between pointer-events-auto">
    <div>
      <h1 class="text-lg font-bold text-white flex items-center gap-2">
        <span class="text-indigo-400">🌐</span> ${title}
      </h1>
      <p class="text-xs text-zinc-400 mt-0.5">${description}</p>
    </div>
    <div class="flex items-center gap-2">
      <button id="btn-toggle-spin" class="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-semibold">
        ⏸ Pause Rotation
      </button>
      <button id="btn-reset-cam" class="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold">
        ↺ Reset View
      </button>
    </div>
  </header>

  <!-- 3D Canvas Viewport -->
  <div id="three-container" class="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing"></div>

  <!-- Footer Telemetry Overlay -->
  <footer id="app-footer" class="absolute bottom-4 left-4 right-4 z-20 glass-panel p-3 flex items-center justify-between text-xs text-zinc-400 pointer-events-auto">
    <div>Click & Drag to rotate 3D view | Scroll to zoom</div>
    <div id="app-progress" class="text-indigo-300 font-mono">3D WebGL Engine Active</div>
  </footer>
</div>

<script>
  const DATA = ${itemsJson};
  let scene, camera, renderer, controls;
  let isSpinning = true;
  const animatedObjects = [];

  function init() {
    const container = document.getElementById('three-container');
    if (!container) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07080c);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 6, 14);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(10, 20, 15);
    scene.add(dirLight);

    build3DModel();

    window.addEventListener('resize', onWindowResize);
    document.getElementById('btn-toggle-spin').addEventListener('click', () => {
      isSpinning = !isSpinning;
      document.getElementById('btn-toggle-spin').textContent = isSpinning ? '⏸ Pause Rotation' : '▶ Resume Rotation';
    });
    document.getElementById('btn-reset-cam').addEventListener('click', () => {
      camera.position.set(0, 6, 14);
      controls.reset();
    });

    animate();
  }

  function build3DModel() {
    // Core Central Sphere (Nucleus / Sun / Central Node)
    const coreGeo = new THREE.SphereGeometry(2.2, 32, 32);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.5, roughness: 0.2 });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // Orbital Ring System
    const ringGeo = new THREE.RingGeometry(5.8, 6.0, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.35 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    scene.add(ringMesh);

    // Orbiting Satellites / Electrons / Planets
    const orbitGroup = new THREE.Group();
    const satColors = [0x38bdf8, 0x818cf8, 0x34d399, 0xf43f5e];
    
    for (let i = 0; i < 4; i++) {
      const satGeo = new THREE.SphereGeometry(0.7, 24, 24);
      const satMat = new THREE.MeshStandardMaterial({ color: satColors[i % satColors.length], roughness: 0.3 });
      const satMesh = new THREE.Mesh(satGeo, satMat);
      const angle = (i / 4) * Math.PI * 2;
      satMesh.position.x = 6 * Math.cos(angle);
      satMesh.position.z = 6 * Math.sin(angle);
      orbitGroup.add(satMesh);
    }
    scene.add(orbitGroup);
    animatedObjects.push({ obj: orbitGroup, rotY: 0.012 });
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();

    if (isSpinning) {
      animatedObjects.forEach(item => {
        if (item.obj) item.obj.rotation.y += item.rotY;
      });
    }

    renderer.render(scene, camera);
  }

  function onWindowResize() {
    if (!renderer || !camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener('DOMContentLoaded', init);
</script>
</html>`;
}
