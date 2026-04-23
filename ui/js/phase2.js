/* ═══════════════════════════════════════════════════════════════
   SOLOMON — Phase 2: Central Sigil + Bloom Composer
   Core sphere, gyroscope rings, wireframe icosahedra,
   uranus rings, orbital particles, CSS halos, UnrealBloomPass.
   ═══════════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════════════════════
// 1. DEPENDENCY GUARD
// ═══════════════════════════════════════════════════════════════
if (
  !window.solomonRenderer ||
  !window.solomonScene    ||
  !window.solomonCamera   ||
  !window.solomonUpdateStars    ||
  !window.solomonUpdateParticles ||
  !window.solomonNebulaMaterial
) {
  console.error(
    '[Solomon Phase 2] Required Phase 1 globals are missing. ' +
    'Ensure phase1.js is fully loaded and executed before phase2.js. ' +
    'Check that phase1.js exposes: solomonRenderer, solomonScene, ' +
    'solomonCamera, solomonUpdateStars, solomonUpdateParticles, solomonNebulaMaterial.'
  );
  throw new Error('[Solomon Phase 2] Aborting — Phase 1 globals not found.');
}

console.log('[Solomon Phase 2] Phase 1 globals confirmed. Initializing sigil.');

// ═══════════════════════════════════════════════════════════════
// 2. LOCAL ALIASES
// ═══════════════════════════════════════════════════════════════
const renderer = window.solomonRenderer;
const scene    = window.solomonScene;
const camera   = window.solomonCamera;

// ═══════════════════════════════════════════════════════════════
// 3. STOP PHASE 1 FROM RENDERING
// ═══════════════════════════════════════════════════════════════
window.solomonPhase1Active = false;

// ═══════════════════════════════════════════════════════════════
// 4. BLOOM COMPOSER SETUP
// ═══════════════════════════════════════════════════════════════
if (!THREE.EffectComposer || !THREE.RenderPass || !THREE.UnrealBloomPass) {
  console.error('[Solomon Phase 2] Postprocessing classes missing from THREE.*. ' +
    'Check that EffectComposer.js, RenderPass.js, UnrealBloomPass.js CDN ' +
    'scripts loaded successfully in index.html before phase2.js.');
  throw new Error('[Solomon Phase 2] Postprocessing unavailable.');
}

const composer = new THREE.EffectComposer(renderer);

const renderPass = new THREE.RenderPass(scene, camera);
renderPass.renderToScreen = false;
composer.addPass(renderPass);

const bloomPass = new THREE.UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.4,    // strength — how intense the bloom glow is
  0.6,    // radius — how far bloom spreads
  0.28    // threshold — only objects brighter than this bloom
);
composer.addPass(bloomPass);

// Resize handler for composer
window.addEventListener('resize', () => {
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ═══════════════════════════════════════════════════════════════
// 5. LIGHTING
// ═══════════════════════════════════════════════════════════════
const ambientLight = new THREE.AmbientLight(0x111122, 1.2);
scene.add(ambientLight);

const sigilLight = new THREE.PointLight(0xff9d00, 4.0, 400);
sigilLight.position.set(0, 0, 80);
scene.add(sigilLight);

const rimLight = new THREE.PointLight(0x4488ff, 1.5, 350);
rimLight.position.set(0, 0, -120);
scene.add(rimLight);

// ═══════════════════════════════════════════════════════════════
// 6. SIGIL GROUP
// ═══════════════════════════════════════════════════════════════
const sigilGroup = new THREE.Group();
sigilGroup.position.set(0, 0, 0);
scene.add(sigilGroup);

// ═══════════════════════════════════════════════════════════════
// 7. COMPONENT 1 — CORE SPHERE
// ═══════════════════════════════════════════════════════════════
const coreGeo = new THREE.SphereGeometry(9, 32, 32);
const coreMat = new THREE.MeshStandardMaterial({
  color:             0xff9d00,
  emissive:          0xff9d00,
  emissiveIntensity: 3.5,
  metalness:         0.0,
  roughness:         1.0,
});
const coreMesh = new THREE.Mesh(coreGeo, coreMat);
coreMesh.position.set(0, 0, 0);
sigilGroup.add(coreMesh);

// ═══════════════════════════════════════════════════════════════
// 8. COMPONENT 2 — GYROSCOPE RINGS (3 tori)
// ═══════════════════════════════════════════════════════════════
function makeGyroMat() {
  return new THREE.MeshStandardMaterial({
    color:             0xc9933a,
    emissive:          0xc9933a,
    emissiveIntensity: 0.8,
    metalness:         1.0,
    roughness:         0.15,
  });
}

// GYRO RING A — XY plane
const gyroGeoA = new THREE.TorusGeometry(30, 0.7, 16, 80);
const gyroMatA = makeGyroMat();
const gyroA    = new THREE.Mesh(gyroGeoA, gyroMatA);
gyroA.rotation.set(0, 0, 0);
sigilGroup.add(gyroA);

// GYRO RING B — XZ plane
const gyroGeoB = new THREE.TorusGeometry(30, 0.7, 16, 80);
const gyroMatB = makeGyroMat();
const gyroB    = new THREE.Mesh(gyroGeoB, gyroMatB);
gyroB.rotation.set(Math.PI / 2, 0, 0);
sigilGroup.add(gyroB);

// GYRO RING C — diagonal
const gyroGeoC = new THREE.TorusGeometry(30, 0.7, 16, 80);
const gyroMatC = makeGyroMat();
const gyroC    = new THREE.Mesh(gyroGeoC, gyroMatC);
gyroC.rotation.set(Math.PI / 4, 0, Math.PI / 4);
sigilGroup.add(gyroC);

// ═══════════════════════════════════════════════════════════════
// 9. COMPONENT 3 — WIREFRAME ICOSAHEDRA (2 meshes)
// ═══════════════════════════════════════════════════════════════
const icoGeo = new THREE.IcosahedronGeometry(24, 1);

const icoMatA = new THREE.MeshBasicMaterial({
  color:       0xffcc44,
  wireframe:   true,
  transparent: true,
  opacity:     0.35,
});
const icoA = new THREE.Mesh(icoGeo, icoMatA);
icoA.rotation.set(0, 0, 0);
sigilGroup.add(icoA);

const icoMatB = new THREE.MeshBasicMaterial({
  color:       0xff9900,
  wireframe:   true,
  transparent: true,
  opacity:     0.22,
});
const icoB = new THREE.Mesh(icoGeo, icoMatB);
icoB.rotation.set(
  THREE.MathUtils.degToRad(30),
  THREE.MathUtils.degToRad(45),
  THREE.MathUtils.degToRad(15)
);
sigilGroup.add(icoB);

// ═══════════════════════════════════════════════════════════════
// 10. COMPONENT 4 — URANUS RINGS (5 thin orbital planes)
// ═══════════════════════════════════════════════════════════════
const uranusRingDefs = [
  { radius: 38, tube: 0.35, rotX: 1.20, rotY: 0.00, rotZ: 0.30,
    spinAxis: 'y', spinSpeed:  0.0008, opacity: 0.30 },
  { radius: 48, tube: 0.28, rotX: 0.40, rotY: 1.05, rotZ: 0.00,
    spinAxis: 'x', spinSpeed: -0.0006, opacity: 0.22 },
  { radius: 56, tube: 0.30, rotX: 0.80, rotY: 0.00, rotZ: 0.70,
    spinAxis: 'z', spinSpeed:  0.0010, opacity: 0.18 },
  { radius: 64, tube: 0.25, rotX: 0.20, rotY: 0.60, rotZ: 1.10,
    spinAxis: 'y', spinSpeed: -0.0007, opacity: 0.14 },
  { radius: 72, tube: 0.22, rotX: 1.50, rotY: 0.30, rotZ: 0.50,
    spinAxis: 'x', spinSpeed:  0.0005, opacity: 0.10 },
];

const uranusRings = [];

uranusRingDefs.forEach(def => {
  const geo = new THREE.TorusGeometry(def.radius, def.tube, 8, 120);
  const mat = new THREE.MeshBasicMaterial({
    color:       0xffd070,
    transparent: true,
    opacity:     def.opacity,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.set(def.rotX, def.rotY, def.rotZ);
  sigilGroup.add(mesh);
  uranusRings.push({ mesh, def });
});

// ═══════════════════════════════════════════════════════════════
// 11. COMPONENT 5 — ORBITAL ENERGY PARTICLES
// ═══════════════════════════════════════════════════════════════
const ORBITAL_COUNT = 60;
const orbPositions  = new Float32Array(ORBITAL_COUNT * 3);
const orbColors     = new Float32Array(ORBITAL_COUNT * 3);

const orbData = [];

for (let i = 0; i < ORBITAL_COUNT; i++) {
  const orbitRadius = 32 + Math.random() * 22;
  const inclination = Math.random() * Math.PI;
  const azimuth     = Math.random() * Math.PI * 2;
  const speed       = 0.004 + Math.random() * 0.008;
  const noiseAmp    = 2.0 + Math.random() * 3.0;
  const noiseFreqX  = 0.3 + Math.random() * 0.5;
  const noiseFreqY  = 0.3 + Math.random() * 0.5;
  const noisePhaseX = Math.random() * Math.PI * 2;
  const noisePhaseY = Math.random() * Math.PI * 2;

  orbData.push({
    orbitRadius, inclination, azimuth,
    speed, noiseAmp, noiseFreqX, noiseFreqY, noisePhaseX, noisePhaseY
  });

  orbPositions[i * 3]     = 0;
  orbPositions[i * 3 + 1] = 0;
  orbPositions[i * 3 + 2] = 0;

  const t = Math.random();
  orbColors[i * 3]     = 1.0;
  orbColors[i * 3 + 1] = 0.75 + t * 0.25;
  orbColors[i * 3 + 2] = 0.2  + t * 0.4;
}

const orbGeo = new THREE.BufferGeometry();
orbGeo.setAttribute('position', new THREE.BufferAttribute(orbPositions, 3));
orbGeo.setAttribute('color',    new THREE.BufferAttribute(orbColors, 3));

const orbMat = new THREE.PointsMaterial({
  size:         2.2,
  vertexColors: true,
  transparent:  true,
  opacity:      0.85,
  sizeAttenuation: true,
});

const orbPoints = new THREE.Points(orbGeo, orbMat);
sigilGroup.add(orbPoints);

function updateOrbitalParticles(time) {
  for (let i = 0; i < ORBITAL_COUNT; i++) {
    const d = orbData[i];
    d.azimuth += d.speed;

    const sinInc = Math.sin(d.inclination);
    const cosInc = Math.cos(d.inclination);
    const sinAz  = Math.sin(d.azimuth);
    const cosAz  = Math.cos(d.azimuth);

    let x = d.orbitRadius * sinInc * cosAz;
    let y = d.orbitRadius * cosInc;
    let z = d.orbitRadius * sinInc * sinAz;

    x += Math.sin(time * d.noiseFreqX + d.noisePhaseX) * d.noiseAmp;
    y += Math.sin(time * d.noiseFreqY + d.noisePhaseY) * d.noiseAmp;
    z += Math.cos(time * d.noiseFreqX + d.noisePhaseX) * d.noiseAmp;

    orbPositions[i * 3]     = x;
    orbPositions[i * 3 + 1] = y;
    orbPositions[i * 3 + 2] = z;
  }
  orbGeo.attributes.position.needsUpdate = true;
}

// ═══════════════════════════════════════════════════════════════
// 12. HALO CSS CIRCLES
// ═══════════════════════════════════════════════════════════════
const haloStyle = document.createElement('style');
haloStyle.textContent = `
  @keyframes sigilHaloPulse {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50%       { opacity: 1.0; transform: scale(1.04); }
  }
`;
document.head.appendChild(haloStyle);

const haloData = [
  { size: 260, opacity: 0.18, duration: 3.2 },
  { size: 310, opacity: 0.10, duration: 4.0 },
  { size: 370, opacity: 0.05, duration: 5.1 },
];

const haloContainer = document.createElement('div');
haloContainer.id = 'sigil-halos';
haloContainer.style.cssText = [
  'position: fixed',
  'top: 50%',
  'left: 50%',
  'transform: translate(-50%, -50%)',
  'pointer-events: none',
  'z-index: 2',
  'width: 0',
  'height: 0',
].join(';');

haloData.forEach(h => {
  const halo = document.createElement('div');
  halo.style.cssText = [
    `position: absolute`,
    `width: ${h.size}px`,
    `height: ${h.size}px`,
    `top: ${-h.size / 2}px`,
    `left: ${-h.size / 2}px`,
    `border-radius: 50%`,
    `border: 1px solid rgba(201, 147, 58, ${h.opacity})`,
    `animation: sigilHaloPulse ${h.duration}s ease-in-out infinite`,
  ].join(';');
  haloContainer.appendChild(halo);
});

document.body.appendChild(haloContainer);

// ═══════════════════════════════════════════════════════════════
// 13. PHASE 2 ANIMATION LOOP
// ═══════════════════════════════════════════════════════════════
let p2Time = 0;

function phase2Loop() {
  requestAnimationFrame(phase2Loop);
  p2Time += 0.01;

  // ── Phase 1 updates (background stays alive) ──────────────
  window.solomonNebulaMaterial.uniforms.uTime.value = p2Time;
  window.solomonUpdateStars(p2Time);
  window.solomonUpdateParticles();

  // ── Core sphere pulse ─────────────────────────────────────
  const corePulse = 0.5 + 0.5 * Math.sin(p2Time * 2.856);
  coreMesh.scale.setScalar(0.88 + 0.24 * corePulse);
  coreMat.emissiveIntensity = 2.8 + 1.4 * corePulse;

  // ── Gyroscope rings ───────────────────────────────────────
  gyroA.rotation.y += 0.004;
  gyroB.rotation.z -= 0.0028;
  gyroC.rotation.x += 0.0055;

  // ── Wireframe icosahedra ──────────────────────────────────
  icoA.rotation.x += 0.0015;
  icoA.rotation.y += 0.0022;
  icoA.rotation.z += 0.0018;

  icoB.rotation.x -= 0.0020;
  icoB.rotation.y -= 0.0015;
  icoB.rotation.z += 0.0025;

  // ── Uranus rings ──────────────────────────────────────────
  uranusRings.forEach(({ mesh, def }) => {
    mesh.rotation[def.spinAxis] += def.spinSpeed;
  });

  // ── Orbital particles ─────────────────────────────────────
  updateOrbitalParticles(p2Time);

  // ── Render via bloom composer ─────────────────────────────
  composer.render();
}

phase2Loop();

// ═══════════════════════════════════════════════════════════════
// 15. GLOBALS EXPOSED FOR PHASE 3
// ═══════════════════════════════════════════════════════════════
window.solomonComposer   = composer;
window.solomonSigilGroup = sigilGroup;
window.solomonP2Time     = () => p2Time;

console.log('[Solomon Phase 2] Sigil initialized. Composer running.');
