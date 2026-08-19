# 3D Three.js Simulation Blueprint Specification

## Overview
This blueprint guides the AI to build high-performance **3D Interactive Visualizations and 3D Models** using **Three.js** via CDN.

CRITICAL DIRECTIVE:
- DO NOT WRITE PLACEHOLDER COMMENTS (e.g. `// setup Three.js here`, `// add lighting`, `// TODO`).
- EVERY JAVASCRIPT FUNCTION MUST CONTAIN COMPLETE, EXECUTABLE CODE LOGIC.

## Head Script Tags Required
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
```

## Required Complete JavaScript Three.js Harness Template
You MUST implement complete, working JavaScript functions matching this logic structure:

```javascript
let scene, camera, renderer, controls;
let animatedObjects = [];

function initThreeScene() {
  const container = document.getElementById('three-container');
  if (!container) return;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080c);

  // Camera
  camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(0, 5, 12);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Controls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(10, 20, 15);
  scene.add(dirLight);

  // Build Model Meshes
  buildModel();

  // Resize Handler
  window.addEventListener('resize', onWindowResize);

  // Animation Loop
  animate();
}

function buildModel() {
  // Center Sphere (e.g. Sun or Nucleus)
  const mainGeo = new THREE.SphereGeometry(2, 32, 32);
  const mainMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.4 });
  const mainMesh = new THREE.Mesh(mainGeo, mainMat);
  scene.add(mainMesh);

  // Orbiting Object
  const orbitGroup = new THREE.Group();
  const subGeo = new THREE.SphereGeometry(0.8, 24, 24);
  const subMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 });
  const subMesh = new THREE.Mesh(subGeo, subMat);
  subMesh.position.x = 6;
  orbitGroup.add(subMesh);
  scene.add(orbitGroup);

  animatedObjects.push({ obj: orbitGroup, rotY: 0.015 });
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  animatedObjects.forEach(item => {
    if (item.obj && item.rotY) item.obj.rotation.y += item.rotY;
  });

  renderer.render(scene, camera);
}

function onWindowResize() {
  const container = document.getElementById('three-container');
  if (!container || !renderer || !camera) return;
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

window.addEventListener('DOMContentLoaded', initThreeScene);
```
