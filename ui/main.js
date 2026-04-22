import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';


// ═══════════════════════════════════════════════════════════════
// main.js — SCENE FOUNDATION (PROJECT SOLOMON · Phase 1)
// Single source of truth: renderer, scene, camera, core loop
// No other file may create a renderer, scene, or camera.
// ═══════════════════════════════════════════════════════════════

// ─── RENDERER ────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x020108, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// ─── SCENE ───────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = null; // void — CSS handles #020108
scene.fog = new THREE.FogExp2(0x020108, 0.0015);



// ─── CAMERA ──────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  3000
);
camera.position.set(0, 85, 320);
camera.lookAt(0, 0, 0);

// ─── PASSIVE PARALLAX ────────────────────────────────────────
const mouseNorm = { x: 0, y: 0 };
window.addEventListener('mousemove', (e) => {
  mouseNorm.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouseNorm.y = (e.clientY / window.innerHeight) * 2 - 1;
});

// ─── LIGHTING ────────────────────────────────────────────────
// Ambient
const ambientLight = new THREE.AmbientLight(0x0A0812, 0.3);
scene.add(ambientLight);

// Core (intensity 0 — sigil owns this in Phase 2, declared now for reference)
const coreLightRef = new THREE.PointLight(0xF0D060, 0, 250);
coreLightRef.position.set(0, 0, 0);
scene.add(coreLightRef);

// Palace cold blues
const palaceLeft = new THREE.PointLight(0x1A2A6A, 2.0);
palaceLeft.position.set(-200, 80, -160);
scene.add(palaceLeft);

const palaceRight = new THREE.PointLight(0x1A2A6A, 2.0);
palaceRight.position.set(200, 80, -160);
scene.add(palaceRight);

// Inner warm gold
const innerWarm = new THREE.PointLight(0xC9A84C, 3.5);
innerWarm.position.set(0, 40, -60);
scene.add(innerWarm);

// God-ray spotlights
const godRayLeft = new THREE.SpotLight(0xC8D4E8, 3.0);
godRayLeft.position.set(-300, 400, -200);
godRayLeft.target.position.set(0, 0, 0);
godRayLeft.angle = 0.12;
godRayLeft.penumbra = 0.9;
godRayLeft.decay = 1.8;
godRayLeft.castShadow = true;
scene.add(godRayLeft);
scene.add(godRayLeft.target);

const godRayRight = new THREE.SpotLight(0xC8D4E8, 3.0);
godRayRight.position.set(300, 400, -200);
godRayRight.target.position.set(0, 0, 0);
godRayRight.angle = 0.12;
godRayRight.penumbra = 0.9;
godRayRight.decay = 1.8;
godRayRight.castShadow = true;
scene.add(godRayRight);
scene.add(godRayRight.target);

// ─── SCENE GROUP ─────────────────────────────────────────────
// All subsequent modules add objects to sceneGroup, not scene directly.
const sceneGroup = new THREE.Group();
scene.add(sceneGroup);

// ─── FRAME CALLBACK REGISTRY ────────────────────────────────
const frameCallbacks = [];
function registerFrameCallback(fn) {
  frameCallbacks.push(fn);
}

// ─── RENDER LOOP ─────────────────────────────────────────────
const clock = new THREE.Clock();
let prevElapsed = 0;

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();
  const delta = elapsed - prevElapsed;
  prevElapsed = elapsed;

  // Passive parallax — lerp camera toward mouse-driven target
  camera.position.x += (mouseNorm.x * 18 - camera.position.x) * 0.025;
  camera.position.y += (-mouseNorm.y * 12 + 40 - camera.position.y) * 0.025;
  camera.lookAt(0, 0, 0);

  // Execute all registered frame callbacks
  for (let i = 0; i < frameCallbacks.length; i++) {
    frameCallbacks[i](elapsed, delta);
  }

  renderer.render(scene, camera);
}
animate();

// ─── RESIZE HANDLER ──────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── EXPORTS ─────────────────────────────────────────────────
export { scene, sceneGroup, camera, renderer, registerFrameCallback, coreLightRef };
