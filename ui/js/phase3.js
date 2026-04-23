/* ═══════════════════════════════════════════════════════════════
   SOLOMON — Phase 3: The Ten Rings of Solomon
   ═══════════════════════════════════════════════════════════════ */

// 1. DEPENDENCY GUARD
if (
  !window.solomonRenderer ||
  !window.solomonScene    ||
  !window.solomonCamera   ||
  !window.solomonComposer ||
  !window.solomonSigilGroup
) {
  console.error(
    '[Solomon Phase 3] Required globals missing. ' +
    'phase1.js and phase2.js must be fully loaded and executed first. ' +
    'Missing one or more of: solomonRenderer, solomonScene, solomonCamera, ' +
    'solomonComposer, solomonSigilGroup.'
  );
  throw new Error('[Solomon Phase 3] Aborting — prerequisite globals not found.');
}
console.log('[Solomon Phase 3] Prerequisites confirmed. Building rings.');

// 2. LOCAL ALIASES
const renderer   = window.solomonRenderer;
const scene      = window.solomonScene;
const camera     = window.solomonCamera;
const composer   = window.solomonComposer;
const sigilGroup = window.solomonSigilGroup;

// 3. Phase 3 update placeholder
window.solomonPhase3Update = null;

// 4. SHARED MATERIAL HELPERS
function makeFrameMaterial(hexColor) {
  return new THREE.MeshStandardMaterial({
    color: hexColor, metalness: 0.92, roughness: 0.18, envMapIntensity: 1.0,
  });
}
function makeClaspMaterial(hexColor) {
  return new THREE.MeshStandardMaterial({
    color: hexColor, metalness: 0.85, roughness: 0.28,
  });
}

// 5. ROPE BAND SHADER
function makeRopeMaterial(options) {
  const bandColorVec = new THREE.Color(options.bandColor);
  const accentColorVec = new THREE.Color(options.accentColor);
  const vertexShader = [
    'varying vec2 vUv;',
    'varying vec3 vNormal;',
    'varying vec3 vWorldPos;',
    'void main() {',
    '  vUv = uv;',
    '  vNormal = normalize(normalMatrix * normal);',
    '  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
  ].join('\n');
  const fragmentShader = [
    'uniform vec3  uBandColor;',
    'uniform vec3  uAccentColor;',
    'uniform int   uRopeType;',
    'uniform float uStrandCount;',
    'uniform float uTime;',
    'varying vec2  vUv;',
    'varying vec3  vNormal;',
    'varying vec3  vWorldPos;',
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
    '    float layerDepth = step(0.5, mod(uv.x * uStrandCount + uv.y * uStrandCount, 1.0));',
    '    groove *= 0.8 + 0.2 * layerDepth;',
    '  } else {',
    '    float a = strandPattern(uv, uStrandCount, 0.85);',
    '    groove = a * 0.75;',
    '  }',
    '  vec3 lightDir = normalize(vec3(0.3, 1.0, 0.8));',
    '  float diff = max(dot(vNormal, lightDir), 0.0) * 0.5 + 0.5;',
    '  vec3 baseCol   = uBandColor * diff;',
    '  vec3 accentCol = uAccentColor;',
    '  vec3 finalCol  = mix(baseCol * 0.55, accentCol, groove * 0.6);',
    '  finalCol += uBandColor * diff * (1.0 - groove * 0.5);',
    '  float rimDot = abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));',
    '  float rim = pow(1.0 - rimDot, 3.0) * 0.35;',
    '  finalCol += uBandColor * rim;',
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
    },
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
  });
}

// 6. RING BUILDER
function buildRing(spec) {
  const ringGroup = new THREE.Group();
  ringGroup.name = spec.name;
  const outerRadius = spec.diameter;
  const tubeRadius  = spec.tubeRadius;

  // A) Rope band
  const bandGeo = new THREE.TorusGeometry(outerRadius, tubeRadius, 24, 160);
  const ropeMat = makeRopeMaterial({
    bandColor: spec.bandColor, accentColor: spec.accentColor,
    ropeType: spec.ropeType, strandCount: spec.strandCount,
  });
  const bandMesh = new THREE.Mesh(bandGeo, ropeMat);
  bandMesh.name = 'band';
  ringGroup.add(bandMesh);

  // B) Frame rails
  const frameThickness = 0.55;
  const outerFrameGeo = new THREE.TorusGeometry(outerRadius, tubeRadius + frameThickness, 12, 120);
  const innerFrameGeo = new THREE.TorusGeometry(outerRadius, tubeRadius - frameThickness * 0.6, 12, 120);
  const frameMat = makeFrameMaterial(spec.frameColor);
  const outerRail = new THREE.Mesh(outerFrameGeo, frameMat);
  outerRail.name = 'outerRail';
  ringGroup.add(outerRail);
  const innerRail = new THREE.Mesh(innerFrameGeo, frameMat.clone());
  innerRail.name = 'innerRail';
  ringGroup.add(innerRail);

  // C) Clasps
  const claspMat = makeClaspMaterial(spec.frameColor);
  const claspCount = spec.claspCount;
  const claspRadius = tubeRadius * 1.35;
  const claspHeight = tubeRadius * 0.45;
  for (let i = 0; i < claspCount; i++) {
    const angle = (i / claspCount) * Math.PI * 2;
    const claspX = Math.cos(angle) * outerRadius;
    const claspY = Math.sin(angle) * outerRadius;
    const claspGeo = new THREE.CylinderGeometry(claspRadius, claspRadius, claspHeight, 12);
    const claspMesh = new THREE.Mesh(claspGeo, claspMat.clone());
    claspMesh.position.set(claspX, claspY, 0);
    claspMesh.rotation.z = angle + Math.PI / 2;
    claspMesh.name = 'clasp_' + i;
    ringGroup.add(claspMesh);
  }
  return { group: ringGroup, ropeMat, frameMat, spec };
}

// 7. RING DATA TABLE
const RING_DATA = [
  { index:0, name:'Ars Almadel', diameter:42, tubeRadius:7.5, bandColor:0x8B0000, accentColor:0xBB2020, frameColor:0x6B4423, ropeType:'braided', strandCount:8, claspCount:4, homePos:new THREE.Vector3(0,260,-15), initRot:new THREE.Euler(0.8,0.3,0.2), spinAxis:'y', spinSpeed:0.004, driftAmpX:10, driftAmpY:7, driftPhaseX:0.0, driftPhaseY:1.5, driftSpeedX:0.28, driftSpeedY:0.32, tiltAxis:'z', tiltSpeed:0.0008 },
  { index:1, name:'Ars Notoria', diameter:40, tubeRadius:7.0, bandColor:0x1a1a6e, accentColor:0x3535BB, frameColor:0xC0C0C0, ropeType:'twisted', strandCount:6, claspCount:6, homePos:new THREE.Vector3(170,195,10), initRot:new THREE.Euler(0.3,0.9,0.1), spinAxis:'x', spinSpeed:-0.005, driftAmpX:8, driftAmpY:9, driftPhaseX:1.2, driftPhaseY:0.3, driftSpeedX:0.34, driftSpeedY:0.26, tiltAxis:'y', tiltSpeed:-0.0010 },
  { index:2, name:'Ars Paulina', diameter:45, tubeRadius:9.0, bandColor:0xB8860B, accentColor:0xE8C040, frameColor:0x8B6914, ropeType:'twisted', strandCount:7, claspCount:3, homePos:new THREE.Vector3(275,0,-5), initRot:new THREE.Euler(1.1,0.2,0.5), spinAxis:'y', spinSpeed:0.003, driftAmpX:12, driftAmpY:6, driftPhaseX:2.4, driftPhaseY:3.2, driftSpeedX:0.22, driftSpeedY:0.36, tiltAxis:'x', tiltSpeed:0.0007 },
  { index:3, name:'Ars Goetia', diameter:40, tubeRadius:7.0, bandColor:0x0a0a0a, accentColor:0x4a0000, frameColor:0x4a4a4f, ropeType:'braided', strandCount:10, claspCount:8, homePos:new THREE.Vector3(170,-195,20), initRot:new THREE.Euler(0.2,0.7,0.8), spinAxis:'z', spinSpeed:-0.004, driftAmpX:7, driftAmpY:11, driftPhaseX:0.8, driftPhaseY:1.9, driftSpeedX:0.38, driftSpeedY:0.24, tiltAxis:'z', tiltSpeed:-0.0009 },
  { index:4, name:'Ars Theurgia', diameter:41, tubeRadius:7.5, bandColor:0x008B8B, accentColor:0x20CCCC, frameColor:0x7d5a3c, ropeType:'braided', strandCount:9, claspCount:5, homePos:new THREE.Vector3(0,-260,-20), initRot:new THREE.Euler(0.6,0.4,0.3), spinAxis:'x', spinSpeed:0.006, driftAmpX:9, driftAmpY:8, driftPhaseX:3.1, driftPhaseY:0.7, driftSpeedX:0.30, driftSpeedY:0.34, tiltAxis:'y', tiltSpeed:0.0011 },
  { index:5, name:'Ars Almiras', diameter:47, tubeRadius:10.0, bandColor:0x1a4a1a, accentColor:0x3A8A3A, frameColor:0x4a7a6a, ropeType:'twisted', strandCount:6, claspCount:4, homePos:new THREE.Vector3(-170,-195,5), initRot:new THREE.Euler(0.9,0.1,0.6), spinAxis:'y', spinSpeed:-0.003, driftAmpX:11, driftAmpY:7, driftPhaseX:1.7, driftPhaseY:2.5, driftSpeedX:0.26, driftSpeedY:0.30, tiltAxis:'x', tiltSpeed:-0.0008 },
  { index:6, name:'Ars Verum', diameter:38, tubeRadius:6.0, bandColor:0xF5F0E0, accentColor:0xFFFFFF, frameColor:0xE8E8E8, ropeType:'braided', strandCount:8, claspCount:6, homePos:new THREE.Vector3(-275,0,-10), initRot:new THREE.Euler(0.4,0.8,0.2), spinAxis:'z', spinSpeed:0.005, driftAmpX:8, driftAmpY:10, driftPhaseX:4.4, driftPhaseY:0.9, driftSpeedX:0.32, driftSpeedY:0.28, tiltAxis:'z', tiltSpeed:0.0010 },
  { index:7, name:'Ars Ephesia', diameter:41, tubeRadius:7.5, bandColor:0xFF8C00, accentColor:0xFFCC44, frameColor:0xDAA520, ropeType:'twisted', strandCount:7, claspCount:3, homePos:new THREE.Vector3(-170,195,15), initRot:new THREE.Euler(0.7,0.3,0.9), spinAxis:'x', spinSpeed:-0.006, driftAmpX:10, driftAmpY:8, driftPhaseX:0.5, driftPhaseY:3.7, driftSpeedX:0.36, driftSpeedY:0.22, tiltAxis:'y', tiltSpeed:-0.0007 },
  { index:8, name:'Ars Fulcanelli', diameter:40, tubeRadius:7.0, bandColor:0x2d0050, accentColor:0x7020AA, frameColor:0xE5E4E2, ropeType:'braided', strandCount:9, claspCount:7, homePos:new THREE.Vector3(-95,245,-8), initRot:new THREE.Euler(0.2,0.6,0.4), spinAxis:'y', spinSpeed:0.004, driftAmpX:9, driftAmpY:6, driftPhaseX:2.9, driftPhaseY:1.3, driftSpeedX:0.24, driftSpeedY:0.38, tiltAxis:'x', tiltSpeed:0.0009 },
  { index:9, name:'Ars Regalis', diameter:44, tubeRadius:8.0, bandColor:0x4B0082, accentColor:0xFFD700, frameColor:0xFFD700, ropeType:'twisted', strandCount:8, claspCount:5, homePos:new THREE.Vector3(95,245,12), initRot:new THREE.Euler(1.0,0.5,0.1), spinAxis:'x', spinSpeed:-0.005, driftAmpX:7, driftAmpY:9, driftPhaseX:1.1, driftPhaseY:2.1, driftSpeedX:0.30, driftSpeedY:0.34, tiltAxis:'z', tiltSpeed:-0.0011 },
];

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
    if (child.isMesh) {
      raycastTargets.push({ mesh: child, ringIndex: idx });
    }
  });
});
const raycastMeshes = raycastTargets.map(t => t.mesh);

// 14. TOOLTIP AND LABEL DOM
const tooltip = document.getElementById('ring-tooltip');
if (!tooltip.style.position || tooltip.style.position === '') {
  tooltip.style.position = 'fixed';
  tooltip.style.zIndex = '10';
  tooltip.style.pointerEvents = 'none';
  tooltip.style.opacity = '0';
  tooltip.style.transition = 'opacity 0.25s ease';
  tooltip.style.fontFamily = "'Cormorant Garamond', serif";
  tooltip.style.fontStyle = 'italic';
  tooltip.style.fontSize = '13px';
  tooltip.style.letterSpacing = '0.12em';
  tooltip.style.color = '#c9933a';
  tooltip.style.background = 'rgba(1,0,8,0.92)';
  tooltip.style.border = '1px solid rgba(201,147,58,0.3)';
  tooltip.style.padding = '5px 14px';
  tooltip.style.whiteSpace = 'nowrap';
}

function showTooltip(idx) {
  const r = rings[idx];
  tooltip.textContent = r.spec.name;
  tooltip.style.opacity = '1';
}
function hideTooltip() {
  tooltip.style.opacity = '0';
}

const _tooltipWorldPos = new THREE.Vector3();
function updateTooltipPosition() {
  if (hoveredRingIndex === -1) return;
  const r = rings[hoveredRingIndex];
  r.group.getWorldPosition(_tooltipWorldPos);
  _tooltipWorldPos.project(camera);
  const x = ( _tooltipWorldPos.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-_tooltipWorldPos.y * 0.5 + 0.5) * window.innerHeight;
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

// 10. HOVER HANDLER
function hoverRing(idx) {
  const r = rings[idx];
  if (r.isTraveling) return;
  gsap.to(r.group.scale, { x:1.12, y:1.12, z:1.12, duration:0.3, ease:'power2.out', overwrite:true });
  r.allStdMats.forEach(mat => {
    gsap.to(mat, { emissiveIntensity:0.55, duration:0.3, ease:'power2.out', overwrite:true });
    mat.emissive.setHex(0x886633);
  });
  showTooltip(idx);
}
function unhoverRing(idx) {
  const r = rings[idx];
  gsap.to(r.group.scale, { x:1, y:1, z:1, duration:0.3, ease:'power2.out', overwrite:true });
  r.allStdMats.forEach(mat => {
    gsap.to(mat, { emissiveIntensity:0.0, duration:0.3, ease:'power2.out', overwrite:true });
  });
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

// 12. RING TRAVEL TO SIGIL
function sendRingToSigil(idx) {
  const r = rings[idx];
  r.isTraveling = true;
  ringAtSigilIndex = idx;
  const innerHole = r.spec.diameter - r.spec.tubeRadius;
  const targetScale = Math.min(1.4, Math.max(0.6, 50 / innerHole));
  gsap.to(r.group.position, { x:0, y:0, z:40, duration:1.2, ease:'power2.inOut' });
  gsap.to(r.group.rotation, { x:0, y:0, z:0, duration:1.2, ease:'power2.inOut' });
  gsap.to(r.group.scale, {
    x:targetScale, y:targetScale, z:targetScale,
    duration:1.2, ease:'power2.inOut',
    onComplete: () => {
      r.isTraveling = false;
      r.isAtSigil = true;
      r.currentSpinSpeed = 0;
      showActiveLabel(r.spec.name);
    }
  });
}

// 13. RING RETURN TO ORIGIN
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
      r.currentSpinSpeed = r.spec.spinSpeed;
      if (onReturnComplete) onReturnComplete();
    }
  });
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
  rings.forEach((r) => {
    if (r.isTraveling) return;
    if (r.isAtSigil) {
      r.group.rotation.z += 0.0006;
      return;
    }
    r.group.rotation[r.spec.spinAxis] += r.currentSpinSpeed;
    r.group.rotation[r.spec.tiltAxis] += r.spec.tiltSpeed;
    const driftX = Math.sin(p3Time * r.spec.driftSpeedX + r.spec.driftPhaseX) * r.spec.driftAmpX;
    const driftY = Math.sin(p3Time * r.spec.driftSpeedY + r.spec.driftPhaseY) * r.spec.driftAmpY;
    r.group.position.x = r.spec.homePos.x + driftX;
    r.group.position.y = r.spec.homePos.y + driftY;
    r.group.position.z = r.spec.homePos.z;
  });
  ropeShaderMaterials.forEach(mat => {
    mat.uniforms.uTime.value = p3Time;
  });
  updateTooltipPosition();
}

// 16. PATCH PHASE 2 LOOP
const _origRender = composer.render.bind(composer);
composer.render = function() {
  if (window.solomonPhase3Update) {
    window.solomonPhase3Update();
  }
  _origRender();
};

// 17. GLOBALS EXPOSED
window.solomonPhase3Update = phase3Update;
window.solomonRings        = rings;
window.solomonP3Time       = () => p3Time;

console.log('[Solomon Phase 3] All 10 rings initialized. Scene complete.');
