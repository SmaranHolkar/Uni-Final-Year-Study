# Physics Simulation Blueprint Specification

## Overview
This blueprint guides the AI to build a rich, interactive **Physics Laboratory & Simulation Sandbox**.

CRITICAL DIRECTIVE:
- DO NOT WRITE PLACEHOLDER COMMENTS (e.g. `// calculate physics here`, `// draw canvas here`, `// TODO`).
- EVERY JAVASCRIPT FUNCTION MUST CONTAIN COMPLETE, EXECUTABLE CODE LOGIC.

## Required Complete JavaScript Physics Harness Template
You MUST implement complete, working JavaScript functions matching this logic structure:

```javascript
const physicsState = {
  time: 0,
  dt: 0.016,
  running: true,
  mass: 2.0,       // kg
  length: 1.5,     // m
  gravity: 9.81,   // m/s^2
  damping: 0.02,
  angle: Math.PI / 4, // radians
  angleVelocity: 0.0,
  angleAccel: 0.0
};

function updatePhysics() {
  if (!physicsState.running) return;

  // Pendulum equation of motion: alpha = (-g / L) * sin(theta) - damping * omega
  physicsState.angleAccel = (-physicsState.gravity / physicsState.length) * Math.sin(physicsState.angle) - physicsState.damping * physicsState.angleVelocity;
  physicsState.angleVelocity += physicsState.angleAccel * physicsState.dt;
  physicsState.angle += physicsState.angleVelocity * physicsState.dt;
  physicsState.time += physicsState.dt;

  renderPhysicsCanvas();
  updateTelemetryUI();
  requestAnimationFrame(updatePhysics);
}

function renderPhysicsCanvas() {
  const canvas = document.getElementById('physicsCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const pivotX = canvas.width / 2;
  const pivotY = 60;
  const scale = 120; // 1m = 120px
  const bobX = pivotX + physicsState.length * scale * Math.sin(physicsState.angle);
  const bobY = pivotY + physicsState.length * scale * Math.cos(physicsState.angle);

  // Draw Pivot & Rod
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY);
  ctx.lineTo(bobX, bobY);
  ctx.stroke();

  // Draw Bob
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(bobX, bobY, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0284c7';
  ctx.stroke();
}

function updateTelemetryUI() {
  const h = physicsState.length * (1 - Math.cos(physicsState.angle));
  const v = physicsState.length * physicsState.angleVelocity;
  const ke = 0.5 * physicsState.mass * v * v;
  const pe = physicsState.mass * physicsState.gravity * h;

  document.getElementById('val-ke').textContent = ke.toFixed(2) + ' J';
  document.getElementById('val-pe').textContent = pe.toFixed(2) + ' J';
  document.getElementById('val-total').textContent = (ke + pe).toFixed(2) + ' J';
}

// Start physics loop on load
window.addEventListener('DOMContentLoaded', () => {
  requestAnimationFrame(updatePhysics);
});
```
