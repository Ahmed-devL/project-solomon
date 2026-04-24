/* ═══════════════════════════════════════════════════════════════
   SOLOMON — Phase 3: The Ten Rings of Solomon
   ═══════════════════════════════════════════════════════════════ */
(function () {
'use strict';

// 1. DEPENDENCY GUARD
if (!window.solomonRenderer || !window.solomonScene || !window.solomonCamera ||
    !window.solomonComposer || !window.solomonSigilGroup) {
  console.error('[Solomon Phase 3] Required globals missing.');
  throw new Error('[Solomon Phase 3] Aborting — prerequisite globals not found.');
}
console.log('[Solomon Phase 3] Prerequisites confirmed. Building rings.');

// 2. LOCAL ALIASES
const renderer   = window.solomonRenderer;
const scene      = window.solomonScene;
const camera     = window.solomonCamera;
const composer   = window.solomonComposer;
const sigilGroup = window.solomonSigilGroup;

window.solomonPhase3Update = null;

// 4. SHARED MATERIAL HELPERS
function makeFrameMaterial(hexColor, glowColor) {
  return new THREE.MeshStandardMaterial({
    color: hexColor, metalness: 0.92, roughness: 0.18,
    emissive: new THREE.Color(glowColor), emissiveIntensity: 0.35,
  });
}

// 5. ROPE BAND SHADER — with emissive self-glow
function makeRopeMaterial(options) {
  const bandColorVec = new THREE.Color(options.bandColor);
  const accentColorVec = new THREE.Color(options.accentColor);
  const vertexShader = [
    'varying vec2 vUv;',
    'varying vec3 vNormal;',
    'void main() {',
    '  vUv = uv;',
    '  vNormal = normalize(normalMatrix * normal);',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
  ].join('\n');
  const fragmentShader = [
    'uniform vec3  uBandColor;',
    'uniform vec3  uAccentColor;',
    'uniform int   uRopeType;',
    'uniform float uStrandCount;',
    'uniform float uTime;',
    'uniform float uGlow;',
    'varying vec2  vUv;',
    'varying vec3  vNormal;',
    'float strandPattern(vec2 uv, float count, float angle) {',
    '  float diagonal = uv.x * cos(angle) + uv.y * sin(angle) * count;',
    '  float strand = abs(fract(diagonal) - 0.5) * 2.0;',
    '  return smoothstep(0.72, 0.62, strand);',
    '}',
    'void main() {',
    '  vec2 uv = vUv;',
    '  float groove = 0.0;',
    '  if (uRopeType == 1) {',
    '    float a = strandPattern(uv, uStrandCount,  0.9);',
    '    float b = strandPattern(uv, uStrandCount, -0.9);',
    '    groove = max(a, b) * 0.7;',
    '    float ld = step(0.5, mod(uv.x*uStrandCount+uv.y*uStrandCount, 1.0));',
    '    groove *= 0.8 + 0.2 * ld;',
    '  } else {',
    '    groove = strandPattern(uv, uStrandCount, 0.85) * 0.75;',
    '  }',
    '  vec3 lightDir = normalize(vec3(0.3, 1.0, 0.8));',
    '  float diff = max(dot(vNormal, lightDir), 0.0) * 0.6 + 0.4;',
    '  vec3 lightDir2 = normalize(vec3(-0.5, -0.3, 0.6));',
    '  float diff2 = max(dot(vNormal, lightDir2), 0.0) * 0.3;',
    '  diff += diff2;',
    '  vec3 baseCol = uBandColor * diff;',
    '  vec3 finalCol = mix(baseCol * 0.6, uAccentColor, groove * 0.55);',
    '  finalCol += uBandColor * diff * (1.0 - groove * 0.4);',
    '  float rimDot = abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));',
    '  float rim = pow(1.0 - rimDot, 3.0) * 0.4;',
    '  finalCol += uAccentColor * rim;',
    '  finalCol += uBandColor * uGlow;',
    '  gl_FragColor = vec4(finalCol, 1.0);',
    '}'
  ].join('\n');
  return new THREE.ShaderMaterial({
    uniforms: {
      uBandColor:   { value: bandColorVec },
      uAccentColor: { value: accentColorVec },
      uRopeType:    { value: options.ropeType === 'braided' ? 1 : 0 },
      uStrandCount: { value: parseFloat(options.strandCount) },
      uTime:        { value: 0.0 },
      uGlow:        { value: 0.4 },
    },
    vertexShader, fragmentShader,
    side: THREE.DoubleSide,
  });
}

// 6. RING BUILDER — no clasps
function buildRing(spec) {
  const ringGroup = new THREE.Group();
  ringGroup.name = spec.name;
  const R = spec.diameter;
  const T = spec.tubeRadius;

  const bandGeo = new THREE.TorusGeometry(R, T, 24, 160);
  const ropeMat = makeRopeMaterial({
    bandColor: spec.bandColor, accentColor: spec.accentColor,
    ropeType: spec.ropeType, strandCount: spec.strandCount,
  });
  const bandMesh = new THREE.Mesh(bandGeo, ropeMat);
  bandMesh.name = 'band';
  ringGroup.add(bandMesh);

  const ft = 0.55;
  const outerGeo = new THREE.TorusGeometry(R, T + ft, 12, 120);
  const innerGeo = new THREE.TorusGeometry(R, T - ft * 0.6, 12, 120);
  const frameMat = makeFrameMaterial(spec.frameColor, spec.bandColor);
  ringGroup.add(new THREE.Mesh(outerGeo, frameMat));
  ringGroup.add(new THREE.Mesh(innerGeo, frameMat.clone()));

  return { group: ringGroup, ropeMat, frameMat, spec };
}

// 7. RING DATA — uniform size, even circular spacing
const ORBIT_RADIUS = 200;
const RING_DIAMETER = 28;
const RING_TUBE = 4.5;
const zStagger = [-12, 8, -5, 15, -18, 3, -8, 12, -3, 10];

const ringDefs = [
  { name:'Ars Almadel',   bandColor:0xCC2222, accentColor:0xFF5544, frameColor:0x8B5533, ropeType:'braided', strandCount:8 },
  { name:'Ars Notoria',   bandColor:0x3344AA, accentColor:0x6688FF, frameColor:0xC0C0C0, ropeType:'twisted', strandCount:6 },
  { name:'Ars Paulina',   bandColor:0xD4A017, accentColor:0xFFDD55, frameColor:0xAA8822, ropeType:'twisted', strandCount:7 },
  { name:'Ars Goetia',    bandColor:0x553333, accentColor:0xAA3333, frameColor:0x6a6a70, ropeType:'braided', strandCount:10 },
  { name:'Ars Theurgia',  bandColor:0x11AAAA, accentColor:0x44EEEE, frameColor:0x8d6a4c, ropeType:'braided', strandCount:9 },
  { name:'Ars Almiras',   bandColor:0x338833, accentColor:0x66CC66, frameColor:0x5a8a7a, ropeType:'twisted', strandCount:6 },
  { name:'Ars Verum',     bandColor:0xE8E0CC, accentColor:0xFFFFFF, frameColor:0xE8E8E8, ropeType:'braided', strandCount:8 },
  { name:'Ars Ephesia',   bandColor:0xFF9922, accentColor:0xFFDD66, frameColor:0xDAA520, ropeType:'twisted', strandCount:7 },
  { name:'Ars Fulcanelli', bandColor:0x6633AA, accentColor:0xAA66EE, frameColor:0xE5E4E2, ropeType:'braided', strandCount:9 },
  { name:'Ars Regalis',   bandColor:0x7733CC, accentColor:0xFFD700, frameColor:0xFFD700, ropeType:'twisted', strandCount:8 },
];

const initRots = [
  [0.8,0.3,0.2],[0.3,0.9,0.1],[1.1,0.2,0.5],[0.2,0.7,0.8],[0.6,0.4,0.3],
  [0.9,0.1,0.6],[0.4,0.8,0.2],[0.7,0.3,0.9],[0.2,0.6,0.4],[1.0,0.5,0.1]
];
const spinAxes  = ['y','x','y','z','x','y','z','x','y','x'];
const spinSpeeds = [0.004,-0.005,0.003,-0.004,0.006,-0.003,0.005,-0.006,0.004,-0.005];
const tiltAxes  = ['z','y','x','z','y','x','z','y','x','z'];
const tiltSpeeds = [0.0008,-0.0010,0.0007,-0.0009,0.0011,-0.0008,0.0010,-0.0007,0.0009,-0.0011];
const driftAX = [10,8,12,7,9,11,8,10,9,7];
const driftAY = [7,9,6,11,8,7,10,8,6,9];
const driftPX = [0.0,1.2,2.4,0.8,3.1,1.7,4.4,0.5,2.9,1.1];
const driftPY = [1.5,0.3,3.2,1.9,0.7,2.5,0.9,3.7,1.3,2.1];
const driftSX = [0.28,0.34,0.22,0.38,0.30,0.26,0.32,0.36,0.24,0.30];
const driftSY = [0.32,0.26,0.36,0.24,0.34,0.30,0.28,0.22,0.38,0.34];

const RING_DATA = [];
for (let i = 0; i < 10; i++) {
  const angle = (i / 10) * Math.PI * 2 + Math.PI / 2;
  const hx = Math.cos(angle) * ORBIT_RADIUS;
  const hy = Math.sin(angle) * ORBIT_RADIUS;
  const d = ringDefs[i];
  RING_DATA.push({
    index: i, name: d.name,
    diameter: RING_DIAMETER, tubeRadius: RING_TUBE,
    bandColor: d.bandColor, accentColor: d.accentColor,
    frameColor: d.frameColor, ropeType: d.ropeType, strandCount: d.strandCount,
    homePos: new THREE.Vector3(hx, hy, zStagger[i]),
    initRot: new THREE.Euler(initRots[i][0], initRots[i][1], initRots[i][2]),
    spinAxis: spinAxes[i], spinSpeed: spinSpeeds[i],
    driftAmpX: driftAX[i], driftAmpY: driftAY[i],
    driftPhaseX: driftPX[i], driftPhaseY: driftPY[i],
    driftSpeedX: driftSX[i], driftSpeedY: driftSY[i],
    tiltAxis: tiltAxes[i], tiltSpeed: tiltSpeeds[i],
  });
}

// 8. INSTANTIATE ALL 10 RINGS
const rings = [];
const ropeShaderMaterials = [];

RING_DATA.forEach(spec => {
  const { group, ropeMat, frameMat } = buildRing(spec);
  group.position.copy(spec.homePos);
  group.rotation.copy(spec.initRot);
  scene.add(group);
  ropeShaderMaterials.push(ropeMat);
  rings.push({
    group, ropeMat, frameMat, spec,
    isAtSigil: false, isTraveling: false,
    currentSpinSpeed: spec.spinSpeed,
    allStdMats: [],
  });
});

rings.forEach(r => {
  r.group.traverse(child => {
    if (child.isMesh && child.material && child.material.isMeshStandardMaterial) {
      r.allStdMats.push(child.material);
    }
  });
});

// 9. RAYCASTER SETUP
const raycaster = new THREE.Raycaster();
const mouseNDC  = new THREE.Vector2();
let hoveredRingIndex = -1;
let ringAtSigilIndex = -1;

const raycastTargets = [];
rings.forEach((r, idx) => {
  r.group.traverse(child => {
    if (child.isMesh) raycastTargets.push({ mesh: child, ringIndex: idx });
  });
});
const raycastMeshes = raycastTargets.map(t => t.mesh);

// 14. TOOLTIP AND LABEL DOM
const tooltip = document.getElementById('ring-tooltip');
tooltip.style.cssText = 'position:fixed;z-index:10;pointer-events:none;opacity:0;' +
  "transition:opacity 0.25s ease;font-family:'Cormorant Garamond',serif;" +
  'font-style:italic;font-size:13px;letter-spacing:0.12em;color:#c9933a;' +
  'background:rgba(1,0,8,0.92);border:1px solid rgba(201,147,58,0.3);' +
  'padding:5px 14px;white-space:nowrap;';

function showTooltip(idx) {
  tooltip.textContent = rings[idx].spec.name;
  tooltip.style.opacity = '1';
}
function hideTooltip() { tooltip.style.opacity = '0'; }

const _twp = new THREE.Vector3();
function updateTooltipPosition() {
  if (hoveredRingIndex === -1) return;
  rings[hoveredRingIndex].group.getWorldPosition(_twp);
  _twp.project(camera);
  const x = (_twp.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-_twp.y * 0.5 + 0.5) * window.innerHeight;
  tooltip.style.left = (x - tooltip.offsetWidth / 2) + 'px';
  tooltip.style.top  = (y - 60) + 'px';
}

const activeLabel = document.getElementById('ui-ring-label');
function showActiveLabel(name) {
  activeLabel.textContent = name;
  gsap.to(activeLabel, { opacity: 1, duration: 0.5, ease: 'power1.out' });
}
function hideActiveLabel() {
  gsap.to(activeLabel, { opacity: 0, duration: 0.4, ease: 'power1.in' });
}

// 10. HOVER — guards prevent interference with travel tweens
function hoverRing(idx) {
  const r = rings[idx];
  if (r.isTraveling || r.isAtSigil) return;
  gsap.to(r.group.scale, { x:1.12, y:1.12, z:1.12, duration:0.3, ease:'power2.out' });
  r.allStdMats.forEach(mat => {
    mat.emissive.setHex(0x886633);
    gsap.to(mat, { emissiveIntensity: 0.7, duration: 0.3, ease: 'power2.out' });
  });
  r.ropeMat.uniforms.uGlow.value = 0.7;
  showTooltip(idx);
}
function unhoverRing(idx) {
  const r = rings[idx];
  if (!r.isTraveling && !r.isAtSigil) {
    gsap.to(r.group.scale, { x:1, y:1, z:1, duration:0.3, ease:'power2.out' });
  }
  r.allStdMats.forEach(mat => {
    gsap.to(mat, { emissiveIntensity: 0.35, duration: 0.3, ease: 'power2.out' });
  });
  r.ropeMat.uniforms.uGlow.value = 0.4;
  hideTooltip();
}

function onMouseMove(e) {
  mouseNDC.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouseNDC, camera);
  const hits = raycaster.intersectObjects(raycastMeshes, false);
  let newHoverIndex = -1;
  if (hits.length > 0) {
    const target = raycastTargets.find(t => t.mesh === hits[0].object);
    if (target) newHoverIndex = target.ringIndex;
  }
  if (newHoverIndex !== hoveredRingIndex) {
    if (hoveredRingIndex !== -1) unhoverRing(hoveredRingIndex);
    if (newHoverIndex !== -1) hoverRing(newHoverIndex);
    hoveredRingIndex = newHoverIndex;
  }
}
window.addEventListener('mousemove', onMouseMove);

// 12. RING TRAVEL TO SIGIL — onComplete on position tween (safe from hover overwrite)
function sendRingToSigil(idx) {
  const r = rings[idx];
  r.isTraveling = true;
  ringAtSigilIndex = idx;
  const innerHole = r.spec.diameter - r.spec.tubeRadius;
  const targetScale = Math.min(1.4, Math.max(0.6, 50 / innerHole));
  gsap.to(r.group.position, {
    x:0, y:0, z:40, duration:1.2, ease:'power2.inOut',
    onComplete: () => {
      r.isTraveling = false;
      r.isAtSigil = true;
      r.currentSpinSpeed = 0;
      showActiveLabel(r.spec.name);
    }
  });
  gsap.to(r.group.rotation, { x:0, y:0, z:0, duration:1.2, ease:'power2.inOut' });
  gsap.to(r.group.scale, { x:targetScale, y:targetScale, z:targetScale, duration:1.2, ease:'power2.inOut' });
}

// 13. RING RETURN TO ORIGIN — onComplete on position tween
function returnRingToOrigin(idx, onReturnComplete) {
  const r = rings[idx];
  r.isTraveling = true;
  r.isAtSigil = false;
  if (ringAtSigilIndex === idx) ringAtSigilIndex = -1;
  hideActiveLabel();
  gsap.to(r.group.position, {
    x:r.spec.homePos.x, y:r.spec.homePos.y, z:r.spec.homePos.z,
    duration:1.2, ease:'power2.inOut',
    onComplete: () => {
      r.isTraveling = false;
      r.currentSpinSpeed = r.spec.spinSpeed;
      if (onReturnComplete) onReturnComplete();
    }
  });
  gsap.to(r.group.rotation, { x:r.spec.initRot.x, y:r.spec.initRot.y, z:r.spec.initRot.z, duration:1.2, ease:'power2.inOut' });
  gsap.to(r.group.scale, { x:1, y:1, z:1, duration:1.2, ease:'power2.inOut' });
}

// 11. CLICK HANDLER
function onMouseClick(e) {
  mouseNDC.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouseNDC, camera);
  const hits = raycaster.intersectObjects(raycastMeshes, false);
  if (hits.length === 0) return;
  const target = raycastTargets.find(t => t.mesh === hits[0].object);
  if (!target) return;
  const clickedIdx = target.ringIndex;
  const clickedRing = rings[clickedIdx];
  if (clickedRing.isTraveling) return;
  if (clickedRing.isAtSigil) {
    returnRingToOrigin(clickedIdx);
  } else {
    if (ringAtSigilIndex !== -1 && ringAtSigilIndex !== clickedIdx) {
      const prevIdx = ringAtSigilIndex;
      returnRingToOrigin(prevIdx, () => {
        setTimeout(() => sendRingToSigil(clickedIdx), 400);
      });
    } else {
      sendRingToSigil(clickedIdx);
    }
  }
}
window.addEventListener('click', onMouseClick);

// 15. PHASE 3 PER-FRAME UPDATE
let p3Time = 0;
function phase3Update() {
  p3Time += 0.01;
  rings.forEach(r => {
    if (r.isTraveling) return;
    if (r.isAtSigil) { r.group.rotation.z += 0.0006; return; }
    r.group.rotation[r.spec.spinAxis] += r.currentSpinSpeed;
    r.group.rotation[r.spec.tiltAxis] += r.spec.tiltSpeed;
    const dx = Math.sin(p3Time * r.spec.driftSpeedX + r.spec.driftPhaseX) * r.spec.driftAmpX;
    const dy = Math.sin(p3Time * r.spec.driftSpeedY + r.spec.driftPhaseY) * r.spec.driftAmpY;
    r.group.position.x = r.spec.homePos.x + dx;
    r.group.position.y = r.spec.homePos.y + dy;
    r.group.position.z = r.spec.homePos.z;
  });
  ropeShaderMaterials.forEach(mat => { mat.uniforms.uTime.value = p3Time; });
  updateTooltipPosition();
}

// 16. PATCH PHASE 2 LOOP
const _origRender = composer.render.bind(composer);
composer.render = function() {
  if (window.solomonPhase3Update) window.solomonPhase3Update();
  _origRender();
};

// 17. GLOBALS
window.solomonPhase3Update = phase3Update;
window.solomonRings        = rings;
window.solomonP3Time       = () => p3Time;

console.log('[Solomon Phase 3] All 10 rings initialized. Scene complete.');
})();
