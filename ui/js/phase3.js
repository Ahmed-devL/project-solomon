/* ═══════════════════════════════════════════════════════════════
   SOLOMON — Phase 3: The Ten Rings of Solomon
   ═══════════════════════════════════════════════════════════════ */
(function () {
'use strict';

// 1. DEPENDENCY GUARD
if (!window.solomonRenderer || !window.solomonScene || !window.solomonCamera ||
    !window.solomonComposer || !window.solomonSigilGroup) {
  console.error('[Solomon Phase 3] Required globals missing. phase1.js and phase2.js must be fully loaded first.');
  throw new Error('[Solomon Phase 3] Aborting.');
}
console.log('[Solomon Phase 3] Prerequisites confirmed. Building rings.');

// 2. LOCAL ALIASES
const renderer   = window.solomonRenderer;
const scene      = window.solomonScene;
const camera     = window.solomonCamera;
const composer   = window.solomonComposer;
const sigilGroup = window.solomonSigilGroup;

// 3. COMPOSER PATCH PLACEHOLDER
window.solomonPhase3Update = null;

// 4. ROPE SHADER MATERIAL FACTORY
function makeRopeMaterial(options) {
  const bandColor   = new THREE.Color(options.bandColor);
  const accentColor = new THREE.Color(options.accentColor);

  const vertexShader = [
    'varying vec2 vUv;',
    'varying vec3 vNormal;',
    'varying vec3 vViewDir;',
    'void main() {',
    '  vUv = uv;',
    '  vNormal = normalize(normalMatrix * normal);',
    '  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);',
    '  vViewDir = normalize(-mvPos.xyz);',
    '  gl_Position = projectionMatrix * mvPos;',
    '}'
  ].join('\n');

  const fragmentShader = [
    'uniform vec3  uBandColor;',
    'uniform vec3  uAccentColor;',
    'uniform int   uRopeType;',
    'uniform float uStrandCount;',
    'uniform float uGlow;',
    'varying vec2  vUv;',
    'varying vec3  vNormal;',
    'varying vec3  vViewDir;',
    'void main() {',
    '  float tubeAngle = vUv.x * 6.2832;',
    '  vec3 lightA = normalize(vec3(-0.4, 0.8, 0.6));',
    '  vec3 lightB = normalize(vec3(0.6, -0.3, 0.4));',
    '  float diffA = max(dot(vNormal, lightA), 0.0);',
    '  float diffB = max(dot(vNormal, lightB), 0.0) * 0.35;',
    '  float diff = diffA + diffB;',
    '  float ambient = 0.22;',
    '  float lighting = ambient + diff * (1.0 - ambient);',
    '  float rim = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.8) * 0.5;',
    '  float groove = 0.0;',
    '  if (uRopeType == 1) {',
    '    float diagA = fract((vUv.y * uStrandCount) + (vUv.x * 1.8));',
    '    float diagB = fract((vUv.y * uStrandCount) - (vUv.x * 1.8));',
    '    float strandA = 1.0 - smoothstep(0.0, 0.18, diagA) - smoothstep(0.82, 1.0, diagA);',
    '    float strandB = 1.0 - smoothstep(0.0, 0.18, diagB) - smoothstep(0.82, 1.0, diagB);',
    '    float whichTop = step(0.5, fract(vUv.x * uStrandCount * 0.5));',
    '    groove = mix(strandA, strandB, whichTop) * 0.85;',
    '  } else {',
    '    float diag = fract((vUv.y * uStrandCount) + (vUv.x * 2.2));',
    '    float strand = 1.0 - smoothstep(0.0, 0.22, diag) - smoothstep(0.78, 1.0, diag);',
    '    groove = strand * 0.85;',
    '  }',
    '  vec3 litBase = uBandColor * lighting;',
    '  vec3 creviceColor = uBandColor * 0.12;',
    '  vec3 peakColor = mix(litBase, uAccentColor * lighting * 1.3, 0.55);',
    '  vec3 ropeColor = mix(creviceColor, peakColor, smoothstep(0.3, 0.75, groove));',
    '  ropeColor += uAccentColor * rim * 0.6;',
    '  ropeColor = mix(ropeColor, uAccentColor * 0.9, uGlow * 0.4);',
    '  gl_FragColor = vec4(ropeColor, 1.0);',
    '}'
  ].join('\n');

  return new THREE.ShaderMaterial({
    uniforms: {
      uBandColor:   { value: bandColor },
      uAccentColor: { value: accentColor },
      uRopeType:    { value: options.ropeType === 'braided' ? 1 : 0 },
      uStrandCount: { value: parseFloat(options.strandCount) },
      uGlow:        { value: 0.15 },
      uTime:        { value: 0.0 },
    },
    vertexShader, fragmentShader,
    side: THREE.DoubleSide,
  });
}

// 5. RING BUILDER — no clasps
function buildRing(spec) {
  const ringGroup = new THREE.Group();
  ringGroup.name = spec.name;
  const R = spec.diameter;
  const T = spec.tubeRadius;

  const bandGeo = new THREE.TorusGeometry(R, T, 32, 180);
  const ropeMat = makeRopeMaterial({
    bandColor: spec.bandColor, accentColor: spec.accentColor,
    ropeType: spec.ropeType, strandCount: spec.strandCount,
  });
  const bandMesh = new THREE.Mesh(bandGeo, ropeMat);
  bandMesh.name = 'band';
  ringGroup.add(bandMesh);

  const railThickness = 0.4;
  const outerRailGeo = new THREE.TorusGeometry(R, T + railThickness, 10, 120);
  const innerRailGeo = new THREE.TorusGeometry(R, T - railThickness * 0.5, 10, 120);
  const frameMat = new THREE.MeshStandardMaterial({
    color: spec.frameColor,
    emissive: new THREE.Color(spec.frameColor).multiplyScalar(0.25),
    emissiveIntensity: 1.0,
    metalness: 0.95, roughness: 0.15,
  });
  const outerRail = new THREE.Mesh(outerRailGeo, frameMat);
  outerRail.name = 'outerRail';
  ringGroup.add(outerRail);
  const innerRail = new THREE.Mesh(innerRailGeo, frameMat.clone());
  innerRail.name = 'innerRail';
  ringGroup.add(innerRail);

  return { group: ringGroup, ropeMat, frameMat, spec };
}

// 6. RING DATA TABLE
const RING_DATA = [
  { index:0, name:'Ars Almadel', diameter:28, tubeRadius:4.5, bandColor:0x8B0000, accentColor:0xBB2020, frameColor:0x6B4423, ropeType:'braided', strandCount:8,
    homePos: new THREE.Vector3(0, 200, -15), initRot: new THREE.Euler(0.8, 0.3, 0.2) },
  { index:1, name:'Ars Notoria', diameter:28, tubeRadius:4.5, bandColor:0x1a1a6e, accentColor:0x3535BB, frameColor:0xC0C0C0, ropeType:'twisted', strandCount:6,
    homePos: new THREE.Vector3(Math.sin(1*Math.PI*2/10)*200, Math.cos(1*Math.PI*2/10)*200, 10), initRot: new THREE.Euler(0.3, 0.9, 0.1) },
  { index:2, name:'Ars Paulina', diameter:28, tubeRadius:4.5, bandColor:0xB8860B, accentColor:0xE8C040, frameColor:0x8B6914, ropeType:'twisted', strandCount:7,
    homePos: new THREE.Vector3(Math.sin(2*Math.PI*2/10)*200, Math.cos(2*Math.PI*2/10)*200, -5), initRot: new THREE.Euler(1.1, 0.2, 0.5) },
  { index:3, name:'Ars Goetia', diameter:28, tubeRadius:4.5, bandColor:0x553333, accentColor:0x994444, frameColor:0x4a4a4f, ropeType:'braided', strandCount:10,
    homePos: new THREE.Vector3(Math.sin(3*Math.PI*2/10)*200, Math.cos(3*Math.PI*2/10)*200, 20), initRot: new THREE.Euler(0.2, 0.7, 0.8) },
  { index:4, name:'Ars Theurgia', diameter:28, tubeRadius:4.5, bandColor:0x008B8B, accentColor:0x20CCCC, frameColor:0x7d5a3c, ropeType:'braided', strandCount:9,
    homePos: new THREE.Vector3(Math.sin(4*Math.PI*2/10)*200, Math.cos(4*Math.PI*2/10)*200, -20), initRot: new THREE.Euler(0.6, 0.4, 0.3) },
  { index:5, name:'Ars Almiras', diameter:28, tubeRadius:4.5, bandColor:0x1a4a1a, accentColor:0x3A8A3A, frameColor:0x4a7a6a, ropeType:'twisted', strandCount:6,
    homePos: new THREE.Vector3(Math.sin(5*Math.PI*2/10)*200, Math.cos(5*Math.PI*2/10)*200, 5), initRot: new THREE.Euler(0.9, 0.1, 0.6) },
  { index:6, name:'Ars Verum', diameter:28, tubeRadius:4.5, bandColor:0xF5F0E0, accentColor:0xFFFFFF, frameColor:0xE8E8E8, ropeType:'braided', strandCount:8,
    homePos: new THREE.Vector3(Math.sin(6*Math.PI*2/10)*200, Math.cos(6*Math.PI*2/10)*200, -10), initRot: new THREE.Euler(0.4, 0.8, 0.2) },
  { index:7, name:'Ars Ephesia', diameter:28, tubeRadius:4.5, bandColor:0xFF8C00, accentColor:0xFFCC44, frameColor:0xDAA520, ropeType:'twisted', strandCount:7,
    homePos: new THREE.Vector3(Math.sin(7*Math.PI*2/10)*200, Math.cos(7*Math.PI*2/10)*200, 15), initRot: new THREE.Euler(0.7, 0.3, 0.9) },
  { index:8, name:'Ars Fulcanelli', diameter:28, tubeRadius:4.5, bandColor:0x2d0050, accentColor:0x7020AA, frameColor:0xE5E4E2, ropeType:'braided', strandCount:9,
    homePos: new THREE.Vector3(Math.sin(8*Math.PI*2/10)*200, Math.cos(8*Math.PI*2/10)*200, -8), initRot: new THREE.Euler(0.2, 0.6, 0.4) },
  { index:9, name:'Ars Regalis', diameter:28, tubeRadius:4.5, bandColor:0x4B0082, accentColor:0xFFD700, frameColor:0xFFD700, ropeType:'twisted', strandCount:8,
    homePos: new THREE.Vector3(Math.sin(9*Math.PI*2/10)*200, Math.cos(9*Math.PI*2/10)*200, 12), initRot: new THREE.Euler(1.0, 0.5, 0.1) },
];

// 7. INSTANTIATE ALL 10 RINGS
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
    currentSpinSpeed: 0,
    allStdMats: [],
    particleSystem: null,
    spinDeltaX: 0, spinDeltaY: 0, spinDeltaZ: 0,
  });
});

rings.forEach(r => {
  r.group.traverse(child => {
    if (child.isMesh && child.material && child.material.isMeshStandardMaterial) {
      r.allStdMats.push(child.material);
    }
  });
});

// 8. PER-RING PARTICLE SYSTEM
function buildRingParticles(ringSpec, ringIndex) {
  const PC = 20;
  const positions = new Float32Array(PC * 3);
  const colors = new Float32Array(PC * 3);
  const particleData = [];
  const bandColor = new THREE.Color(ringSpec.bandColor);
  const goldColor = new THREE.Color(0xff9d00);
  const spreadRadius = (ringSpec.diameter + ringSpec.tubeRadius) * 1.5;

  for (let i = 0; i < PC; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const rad = spreadRadius * (0.4 + Math.random() * 0.6);
    const ox = rad * Math.sin(phi) * Math.cos(theta);
    const oy = rad * Math.sin(phi) * Math.sin(theta);
    const oz = rad * Math.cos(phi);

    particleData.push({
      ox, oy, oz,
      driftAmp: 3.0 + Math.random() * 5.0,
      driftFreqX: 0.15 + Math.random() * 0.25,
      driftFreqY: 0.15 + Math.random() * 0.25,
      driftFreqZ: 0.10 + Math.random() * 0.20,
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      phaseZ: Math.random() * Math.PI * 2,
    });

    positions[i*3] = ringSpec.homePos.x + ox;
    positions[i*3+1] = ringSpec.homePos.y + oy;
    positions[i*3+2] = ringSpec.homePos.z + oz;

    const blendT = Math.random() * 0.4;
    const pc = bandColor.clone().lerp(goldColor, blendT);
    const bright = 0.7 + Math.random() * 0.4;
    colors[i*3]   = Math.min(1.0, pc.r * bright);
    colors[i*3+1] = Math.min(1.0, pc.g * bright);
    colors[i*3+2] = Math.min(1.0, pc.b * bright);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 2.8, vertexColors: true, transparent: true, opacity: 0.75, sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.name = 'ringParticles_' + ringIndex;
  scene.add(points);
  return { points, geo, positions, particleData, mat };
}

rings.forEach((r, idx) => { r.particleSystem = buildRingParticles(r.spec, idx); });

function updateRingParticles(time) {
  rings.forEach(r => {
    const ps = r.particleSystem;
    const pos = ps.positions;
    const pd = ps.particleData;
    const rx = r.group.position.x;
    const ry = r.group.position.y;
    const rz = r.group.position.z;
    for (let i = 0; i < pd.length; i++) {
      const d = pd[i];
      pos[i*3]   = rx + d.ox + Math.sin(time * d.driftFreqX + d.phaseX) * d.driftAmp;
      pos[i*3+1] = ry + d.oy + Math.sin(time * d.driftFreqY + d.phaseY) * d.driftAmp;
      pos[i*3+2] = rz + d.oz + Math.cos(time * d.driftFreqZ + d.phaseZ) * d.driftAmp;
    }
    ps.geo.attributes.position.needsUpdate = true;
  });
}

// 9. RAYCASTER SETUP
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();
let hoveredRingIndex = -1;
let ringAtSigilIndex = -1;

const raycastTargets = [];
rings.forEach((r, idx) => {
  r.group.traverse(child => {
    if (child.isMesh) raycastTargets.push({ mesh: child, ringIndex: idx });
  });
});
const raycastMeshes = raycastTargets.map(t => t.mesh);

// 10. SYNCHRONIZED RADIAL SPIN SYSTEM
const BASE_SPIN = 0.003;
rings.forEach((r, i) => {
  const clockAngle = i * (Math.PI * 2 / 10);
  r.spinDeltaX = Math.cos(clockAngle) * 0.6 * BASE_SPIN;
  r.spinDeltaY = -Math.sin(clockAngle) * BASE_SPIN;
  r.spinDeltaZ = Math.sin(clockAngle * 2) * 0.3 * BASE_SPIN;
});

// 15. TOOLTIP AND LABEL DOM (before hover handler needs them)
const tooltip = document.getElementById('ring-tooltip');
tooltip.style.cssText = 'position:fixed;z-index:10;pointer-events:none;opacity:0;' +
  "transition:opacity 0.25s ease;font-family:'Cormorant Garamond',serif;" +
  'font-style:italic;font-size:13px;letter-spacing:0.12em;color:#c9933a;' +
  'background:rgba(1,0,8,0.92);border:1px solid rgba(201,147,58,0.3);' +
  'padding:5px 14px;white-space:nowrap;';
const activeLabel = document.getElementById('ui-ring-label');
const _tooltipWorldPos = new THREE.Vector3();

function updateTooltipPosition() {
  if (hoveredRingIndex === -1) return;
  rings[hoveredRingIndex].group.getWorldPosition(_tooltipWorldPos);
  _tooltipWorldPos.project(camera);
  const x = (_tooltipWorldPos.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-_tooltipWorldPos.y * 0.5 + 0.5) * window.innerHeight;
  tooltip.style.left = (x - tooltip.offsetWidth / 2) + 'px';
  tooltip.style.top = (y - 60) + 'px';
}
function showTooltip(idx) {
  tooltip.textContent = rings[idx].spec.name;
  tooltip.style.opacity = '1';
}
function hideTooltip() { tooltip.style.opacity = '0'; }
function showActiveLabel(name) {
  activeLabel.textContent = name;
  gsap.to(activeLabel, { opacity: 1, duration: 0.5, ease: 'power1.out' });
}
function hideActiveLabel() {
  gsap.to(activeLabel, { opacity: 0, duration: 0.4, ease: 'power1.in' });
}

// 11. HOVER HANDLER — glow boost only, no emissive on frames
function hoverRing(idx) {
  const r = rings[idx];
  if (r.isTraveling || r.isAtSigil) return;
  gsap.to(r.group.scale, { x:1.12, y:1.12, z:1.12, duration:0.3, ease:'power2.out' });
  gsap.to(r.ropeMat.uniforms.uGlow, { value:0.55, duration:0.3, ease:'power2.out' });
  showTooltip(idx);
}
function unhoverRing(idx) {
  const r = rings[idx];
  if (r.isTraveling) return;
  if (!r.isAtSigil) {
    gsap.to(r.group.scale, { x:1, y:1, z:1, duration:0.3, ease:'power2.out' });
  }
  gsap.to(r.ropeMat.uniforms.uGlow, { value:0.15, duration:0.3, ease:'power2.out' });
  hideTooltip();
}

function onMouseMove(e) {
  mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
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

// 13. SEND RING TO SIGIL — only tween rotation.x and .y to 0, leave .z free
function sendRingToSigil(idx) {
  const r = rings[idx];
  r.isTraveling = true;
  ringAtSigilIndex = idx;
  const innerHole = r.spec.diameter - r.spec.tubeRadius;
  const targetScale = Math.min(1.4, Math.max(0.6, 50 / innerHole));

  gsap.to(r.group.position, { x:0, y:0, z:40, duration:1.2, ease:'power2.inOut' });
  gsap.to(r.group.rotation, { x:0, y:0, duration:1.2, ease:'power2.inOut' });
  gsap.to(r.group.scale, {
    x:targetScale, y:targetScale, z:targetScale,
    duration:1.2, ease:'power2.inOut',
    onComplete: () => {
      r.isTraveling = false;
      r.isAtSigil = true;
      showActiveLabel(r.spec.name);
    }
  });
}

// 14. RETURN RING TO ORIGIN
function returnRingToOrigin(idx, onReturnComplete) {
  const r = rings[idx];
  r.isTraveling = true;
  r.isAtSigil = false;
  if (ringAtSigilIndex === idx) ringAtSigilIndex = -1;
  hideActiveLabel();

  gsap.to(r.group.position, { x:r.spec.homePos.x, y:r.spec.homePos.y, z:r.spec.homePos.z, duration:1.2, ease:'power2.inOut' });
  gsap.to(r.group.rotation, { x:r.spec.initRot.x, y:r.spec.initRot.y, z:r.spec.initRot.z, duration:1.2, ease:'power2.inOut' });
  gsap.to(r.group.scale, {
    x:1, y:1, z:1, duration:1.2, ease:'power2.inOut',
    onComplete: () => {
      r.isTraveling = false;
      if (onReturnComplete) onReturnComplete();
    }
  });
}

// 12. CLICK HANDLER
function onMouseClick(e) {
  mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
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
      returnRingToOrigin(prevIdx, () => { setTimeout(() => sendRingToSigil(clickedIdx), 400); });
    } else {
      sendRingToSigil(clickedIdx);
    }
  }
}
window.addEventListener('click', onMouseClick);

// 16. PHASE 3 PER-FRAME UPDATE
let p3Time = 0;

function phase3Update() {
  p3Time += 0.01;

  rings.forEach((r, idx) => {
    if (r.isTraveling) {
      r.group.rotation.z += r.spinDeltaZ * 2.0;
      return;
    }
    if (r.isAtSigil) {
      r.group.rotation.z += 0.0006;
      return;
    }

    // Synchronized radial spin
    r.group.rotation.x += r.spinDeltaX;
    r.group.rotation.y += r.spinDeltaY;
    r.group.rotation.z += r.spinDeltaZ;

    // Idle position drift
    const phaseX = idx * 1.13;
    const phaseY = idx * 0.87;
    const driftX = Math.sin(p3Time * 0.28 + phaseX) * 10;
    const driftY = Math.sin(p3Time * 0.32 + phaseY) * 8;
    r.group.position.x = r.spec.homePos.x + driftX;
    r.group.position.y = r.spec.homePos.y + driftY;
    r.group.position.z = r.spec.homePos.z;
  });

  ropeShaderMaterials.forEach(mat => { mat.uniforms.uTime.value = p3Time; });
  updateRingParticles(p3Time);
  updateTooltipPosition();
}

// 17. COMPOSER PATCH
const _origRender = composer.render.bind(composer);
composer.render = function() {
  if (window.solomonPhase3Update) window.solomonPhase3Update();
  _origRender();
};

// 18. GLOBALS
window.solomonPhase3Update = phase3Update;
window.solomonRings = rings;
window.solomonP3Time = () => p3Time;

console.log('[Solomon Phase 3] Rewrite complete. 10 rings active.');
})();
