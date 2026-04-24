/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SOLOMON â€” Phase 3: The Ten Rings of Solomon
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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

// 4. RING MATERIAL FACTORY (replaces makeRopeMaterial)
const ringGlowMaterials = [];

function makeRingMaterial(hexColor, options) {
  const col = new THREE.Color(hexColor);
  const emissiveCol = col.clone().multiplyScalar(options.emissiveMultiplier || 0.5);
  const mat = new THREE.MeshStandardMaterial({
    color: col,
    emissive: emissiveCol,
    emissiveIntensity: 0.8,
    metalness: options.metalness !== undefined ? options.metalness : 0.6,
    roughness: options.roughness !== undefined ? options.roughness : 0.35,
    transparent: options.transparent || false,
    opacity: options.opacity !== undefined ? options.opacity : 1.0,
    side: THREE.DoubleSide,
  });
  mat.userData.baseEmissiveIntensity = 0.8;
  mat.userData.hoverEmissiveIntensity = 1.8;
  mat.userData.isRingGlowMat = true;
  return mat;
}

// 5. BAND DETAIL HELPERS
function placeOnRing(mesh, angle, radius) {
  mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
  mesh.rotation.z = angle - Math.PI / 2;
}

function makeDetailMat(hexOrColor, emMult, metal, rough) {
  var c = (hexOrColor instanceof THREE.Color) ? hexOrColor.getHex() : hexOrColor;
  var m = makeRingMaterial(c, { emissiveMultiplier: emMult, metalness: metal, roughness: rough });
  ringGlowMaterials.push(m);
  return m;
}

// DETAIL: crossStruts (index 0)
function buildCrossStruts(ringGroup, R, TR, cols) {
  var N = 12, strutLen = TR * 1.8, strutRad = 0.35;
  var crossMat = makeDetailMat(cols.mid, 0.6, 0.7, 0.3);
  var braceMat = makeDetailMat(cols.dark, 0.3, 0.5, 0.5);
  for (var i = 0; i < N; i++) {
    var angle = (i / N) * Math.PI * 2;
    var sg = new THREE.CylinderGeometry(strutRad, strutRad, strutLen, 6);
    var s = new THREE.Mesh(sg, crossMat);
    placeOnRing(s, angle, R);
    ringGroup.add(s);
    var na = ((i + 1) / N) * Math.PI * 2;
    var ma = (angle + na) / 2;
    var arcLen = 2 * R * Math.sin(Math.PI / N);
    var bg = new THREE.CylinderGeometry(0.2, 0.2, arcLen * 0.7, 5);
    var b = new THREE.Mesh(bg, braceMat);
    b.position.set(Math.cos(ma) * R, Math.sin(ma) * R, 0);
    b.rotation.z = ma;
    ringGroup.add(b);
  }
}

// DETAIL: hexNodes (index 1)
function buildHexNodes(ringGroup, R, TR, cols) {
  var N = 8, nodeRad = 1.6, nodeH = 0.8;
  var nodeMat = makeDetailMat(cols.accent, 0.8, 0.5, 0.2);
  var connMat = makeDetailMat(cols.dark, 0.3, 0.7, 0.4);
  for (var i = 0; i < N; i++) {
    var angle = (i / N) * Math.PI * 2;
    var ng = new THREE.CylinderGeometry(nodeRad, nodeRad, nodeH, 6);
    var n = new THREE.Mesh(ng, nodeMat);
    placeOnRing(n, angle, R);
    ringGroup.add(n);
    var na = ((i + 1) / N) * Math.PI * 2;
    var ma = (angle + na) / 2;
    var chord = 2 * R * Math.sin(Math.PI / N);
    var cg = new THREE.CylinderGeometry(0.18, 0.18, chord * 0.85, 5);
    var cn = new THREE.Mesh(cg, connMat);
    cn.position.set(Math.cos(ma) * R, Math.sin(ma) * R, 0);
    cn.rotation.z = ma;
    ringGroup.add(cn);
  }
}

// DETAIL: angularBrackets (index 2)
function buildAngularBrackets(ringGroup, R, TR, cols) {
  var N = 6, armLen = TR * 1.5, armRad = 0.3;
  var armMat = makeDetailMat(cols.light, 0.7, 0.8, 0.2);
  for (var i = 0; i < N; i++) {
    var angle = (i / N) * Math.PI * 2;
    [-0.5, 0.5].forEach(function(side) {
      var ag = new THREE.CylinderGeometry(armRad, armRad, armLen, 5);
      var arm = new THREE.Mesh(ag, armMat);
      placeOnRing(arm, angle, R);
      arm.rotateZ(side * 0.52);
      ringGroup.add(arm);
    });
  }
}

// DETAIL: woundCoils (index 3)
function buildWoundCoils(ringGroup, R, TR, cols) {
  var N = 10, coilR = TR * 0.6, coilTube = 0.4;
  var coilMat = makeDetailMat(cols.mid, 0.6, 0.5, 0.35);
  var coilMat2 = makeDetailMat(cols.light, 0.5, 0.6, 0.25);
  for (var i = 0; i < N; i++) {
    var angle = (i / N) * Math.PI * 2;
    var cg = new THREE.TorusGeometry(coilR, coilTube, 8, 24);
    var coil = new THREE.Mesh(cg, i % 2 === 0 ? coilMat : coilMat2);
    coil.position.set(Math.cos(angle) * R, Math.sin(angle) * R, 0);
    coil.rotation.set(0, Math.PI / 2, angle + Math.PI / 2);
    ringGroup.add(coil);
  }
}

// DETAIL: crystalFacets (index 4)
function buildCrystalFacets(ringGroup, R, TR, cols) {
  var N = 9, crystalRad = 1.8;
  var crystalMat = makeDetailMat(cols.accent, 0.9, 0.3, 0.05);
  var rodMat = makeDetailMat(cols.dark, 0.3, 0.7, 0.5);
  for (var i = 0; i < N; i++) {
    var angle = (i / N) * Math.PI * 2;
    var cg = new THREE.OctahedronGeometry(crystalRad, 0);
    var crystal = new THREE.Mesh(cg, crystalMat);
    crystal.position.set(Math.cos(angle) * R, Math.sin(angle) * R, 0);
    crystal.rotation.set(angle * 0.3, angle * 0.5, angle);
    ringGroup.add(crystal);
    if (i % 2 === 0) {
      var na = ((i + 1) / N) * Math.PI * 2;
      var ma = (angle + na) / 2;
      var chord = 2 * R * Math.sin(Math.PI / N);
      var rg = new THREE.CylinderGeometry(0.15, 0.15, chord * 0.9, 4);
      var rod = new THREE.Mesh(rg, rodMat);
      rod.position.set(Math.cos(ma) * R, Math.sin(ma) * R, 0);
      rod.rotation.z = ma;
      ringGroup.add(rod);
    }
  }
}

// DETAIL: ladderRungs (index 5)
function buildLadderRungs(ringGroup, R, TR, cols) {
  var N = 14;
  var railMat = makeDetailMat(cols.mid, 0.5, 0.6, 0.4);
  var rungMat = makeDetailMat(cols.light, 0.7, 0.7, 0.25);
  var innerRailR = R - TR * 0.45, outerRailR = R + TR * 0.45;
  var irg = new THREE.TorusGeometry(innerRailR, 0.3, 8, 100);
  var org = new THREE.TorusGeometry(outerRailR, 0.3, 8, 100);
  ringGroup.add(new THREE.Mesh(irg, railMat));
  ringGroup.add(new THREE.Mesh(org, railMat.clone()));
  var rungLen = outerRailR - innerRailR;
  for (var i = 0; i < N; i++) {
    var angle = (i / N) * Math.PI * 2;
    var midR = (innerRailR + outerRailR) / 2;
    var rg = new THREE.CylinderGeometry(0.22, 0.22, rungLen, 5);
    var rung = new THREE.Mesh(rg, rungMat);
    placeOnRing(rung, angle, midR);
    ringGroup.add(rung);
  }
}

// DETAIL: spiralWraps (index 6)
function buildSpiralWraps(ringGroup, R, TR, cols) {
  var N = 16, discRad = TR * 0.75, discH = 0.25;
  var d6m = makeDetailMat(cols.mid, 0.6, 0.5, 0.3);
  var d6m2 = makeDetailMat(cols.light, 0.8, 0.4, 0.2);
  for (var i = 0; i < N; i++) {
    var angle = (i / N) * Math.PI * 2;
    var tiltAcc = (i / N) * Math.PI;
    var dg = new THREE.CylinderGeometry(discRad, discRad, discH, 8);
    var disc = new THREE.Mesh(dg, i % 3 === 0 ? d6m2 : d6m);
    placeOnRing(disc, angle, R);
    disc.rotateY(tiltAcc);
    ringGroup.add(disc);
  }
}

// DETAIL: thorns (index 7)
function buildThorns(ringGroup, R, TR, cols) {
  var N = 11;
  var thornMat = makeDetailMat(cols.accent, 0.8, 0.6, 0.15);
  var thornMat2 = makeDetailMat(cols.mid, 0.5, 0.5, 0.30);
  for (var i = 0; i < N; i++) {
    var angle = (i / N) * Math.PI * 2;
    var isTall = i % 2 === 0;
    var height = isTall ? TR * 1.6 : TR * 0.9;
    var baseR = isTall ? 0.55 : 0.38;
    var tg = new THREE.CylinderGeometry(0.05, baseR, height, 6);
    var thorn = new THREE.Mesh(tg, isTall ? thornMat : thornMat2);
    placeOnRing(thorn, angle, R);
    ringGroup.add(thorn);
  }
}

// DETAIL: nestedArcs (index 8)
function buildNestedArcs(ringGroup, R, TR, cols) {
  var N = 7;
  var arcMat = makeDetailMat(cols.light, 0.7, 0.5, 0.3);
  var arcMat2 = makeDetailMat(cols.accent, 0.9, 0.4, 0.2);
  for (var i = 0; i < N; i++) {
    var angle = (i / N) * Math.PI * 2;
    [1.2, 2.1].forEach(function(miniR, j) {
      var mg = new THREE.TorusGeometry(miniR, 0.28, 6, 18);
      var mini = new THREE.Mesh(mg, j === 0 ? arcMat : arcMat2);
      mini.position.set(Math.cos(angle) * R, Math.sin(angle) * R, 0);
      mini.rotation.set(0, Math.PI / 2, angle + Math.PI / 2);
      ringGroup.add(mini);
    });
  }
}

// DETAIL: segmentedPlates (index 9)
function buildSegmentedPlates(ringGroup, R, TR, cols) {
  var N = 10;
  var plateW = TR * 1.6;
  var plateH = 2 * Math.PI * R / N * 0.72;
  var plateD = 0.5;
  var plateMat = makeDetailMat(cols.mid, 0.6, 0.7, 0.25);
  var plateMat2 = makeDetailMat(cols.light, 0.8, 0.6, 0.2);
  for (var i = 0; i < N; i++) {
    var angle = (i / N) * Math.PI * 2;
    var pg = new THREE.BoxGeometry(plateD, plateH, plateW);
    var plate = new THREE.Mesh(pg, i % 2 === 0 ? plateMat : plateMat2);
    plate.position.set(Math.cos(angle) * R, Math.sin(angle) * R, 0);
    plate.rotation.z = angle;
    ringGroup.add(plate);
  }
}

// BAND DETAIL DISPATCHER
function buildBandDetail(spec, ringGroup, R, TR) {
  var baseCol = new THREE.Color(spec.bandColor);
  var accentCol = new THREE.Color(spec.accentColor);
  var lightCol = baseCol.clone().lerp(new THREE.Color(0xffffff), 0.25);
  var darkCol = baseCol.clone().multiplyScalar(0.45);
  var midCol = baseCol.clone().lerp(accentCol, 0.5);
  var cols = { base: baseCol, accent: accentCol, light: lightCol, dark: darkCol, mid: midCol };
  switch (spec.detailType) {
    case 'crossStruts':      buildCrossStruts(ringGroup, R, TR, cols);     break;
    case 'hexNodes':         buildHexNodes(ringGroup, R, TR, cols);        break;
    case 'angularBrackets':  buildAngularBrackets(ringGroup, R, TR, cols); break;
    case 'woundCoils':       buildWoundCoils(ringGroup, R, TR, cols);      break;
    case 'crystalFacets':    buildCrystalFacets(ringGroup, R, TR, cols);   break;
    case 'ladderRungs':      buildLadderRungs(ringGroup, R, TR, cols);     break;
    case 'spiralWraps':      buildSpiralWraps(ringGroup, R, TR, cols);     break;
    case 'thorns':           buildThorns(ringGroup, R, TR, cols);          break;
    case 'nestedArcs':       buildNestedArcs(ringGroup, R, TR, cols);      break;
    case 'segmentedPlates':  buildSegmentedPlates(ringGroup, R, TR, cols); break;
    default: console.warn('[Solomon P3] Unknown detailType:', spec.detailType);
  }
}
// 5. RING BUILDER
function buildRing(spec) {
  var ringGroup = new THREE.Group();
  ringGroup.name = spec.name;
  var R = spec.diameter, TR = spec.tubeRadius;

  // A) OUTER FRAME ARC
  var outerFrameGeo = new THREE.TorusGeometry(R, 0.9, 12, 140);
  var outerFrameMat = makeRingMaterial(spec.bandColor, { emissiveMultiplier: 0.7, metalness: 0.7, roughness: 0.25 });
  ringGlowMaterials.push(outerFrameMat);
  var outerFrame = new THREE.Mesh(outerFrameGeo, outerFrameMat);
  outerFrame.name = 'outerFrame';
  ringGroup.add(outerFrame);

  // B) INNER FRAME ARC
  var innerColor = new THREE.Color(spec.bandColor).multiplyScalar(0.65);
  var innerFrameGeo = new THREE.TorusGeometry(R, 0.55, 10, 140);
  var innerFrameMat = makeRingMaterial(innerColor.getHex(), { emissiveMultiplier: 0.4, metalness: 0.6, roughness: 0.40 });
  ringGlowMaterials.push(innerFrameMat);
  var innerFrame = new THREE.Mesh(innerFrameGeo, innerFrameMat);
  innerFrame.name = 'innerFrame';
  ringGroup.add(innerFrame);

  // C) GEOMETRIC BAND DETAIL
  buildBandDetail(spec, ringGroup, R, TR);

  // D) STONE
  var stoneAngle = spec.stoneAngle;
  var stoneX = Math.cos(stoneAngle) * R;
  var stoneY = Math.sin(stoneAngle) * R;
  var stoneGeo = new THREE.SphereGeometry(2.8, 16, 16);
  var stoneMat = makeRingMaterial(spec.stoneColor, { emissiveMultiplier: 1.0, metalness: 0.2, roughness: 0.1 });
  ringGlowMaterials.push(stoneMat);
  stoneMat.userData.baseEmissiveIntensity = 1.4;
  stoneMat.userData.hoverEmissiveIntensity = 2.5;
  var stone = new THREE.Mesh(stoneGeo, stoneMat);
  stone.position.set(stoneX, stoneY, 0);
  stone.name = 'stone';
  ringGroup.add(stone);

  return { group: ringGroup, spec: spec };
}

// 6. RING DATA TABLE
const RING_DATA = [
  { index:0, name:'Ars Almadel', diameter:28, tubeRadius:4.5, bandColor:0x8B0000, accentColor:0xBB2020, frameColor:0x6B4423, ropeType:'braided', strandCount:8,
    detailType:'crossStruts', stoneAngle:Math.PI/2, stoneColor:0xFF4040,
    homePos: new THREE.Vector3(0, 200, -15), initRot: new THREE.Euler(0.8, 0.3, 0.2) },
  { index:1, name:'Ars Notoria', diameter:28, tubeRadius:4.5, bandColor:0x1a1a6e, accentColor:0x3535BB, frameColor:0xC0C0C0, ropeType:'twisted', strandCount:6,
    detailType:'hexNodes', stoneAngle:0, stoneColor:0x8888FF,
    homePos: new THREE.Vector3(Math.sin(1*Math.PI*2/10)*200, Math.cos(1*Math.PI*2/10)*200, 10), initRot: new THREE.Euler(0.3, 0.9, 0.1) },
  { index:2, name:'Ars Paulina', diameter:28, tubeRadius:4.5, bandColor:0xB8860B, accentColor:0xE8C040, frameColor:0x8B6914, ropeType:'twisted', strandCount:7,
    detailType:'angularBrackets', stoneAngle:-Math.PI/2, stoneColor:0xFFF0A0,
    homePos: new THREE.Vector3(Math.sin(2*Math.PI*2/10)*200, Math.cos(2*Math.PI*2/10)*200, -5), initRot: new THREE.Euler(1.1, 0.2, 0.5) },
  { index:3, name:'Ars Goetia', diameter:28, tubeRadius:4.5, bandColor:0x553333, accentColor:0x994444, frameColor:0x4a4a4f, ropeType:'braided', strandCount:10,
    detailType:'woundCoils', stoneAngle:Math.PI, stoneColor:0xCC3333,
    homePos: new THREE.Vector3(Math.sin(3*Math.PI*2/10)*200, Math.cos(3*Math.PI*2/10)*200, 20), initRot: new THREE.Euler(0.2, 0.7, 0.8) },
  { index:4, name:'Ars Theurgia', diameter:28, tubeRadius:4.5, bandColor:0x008B8B, accentColor:0x20CCCC, frameColor:0x7d5a3c, ropeType:'braided', strandCount:9,
    detailType:'crystalFacets', stoneAngle:Math.PI/4, stoneColor:0xAAFFFF,
    homePos: new THREE.Vector3(Math.sin(4*Math.PI*2/10)*200, Math.cos(4*Math.PI*2/10)*200, -20), initRot: new THREE.Euler(0.6, 0.4, 0.3) },
  { index:5, name:'Ars Almiras', diameter:28, tubeRadius:4.5, bandColor:0x1a4a1a, accentColor:0x3A8A3A, frameColor:0x4a7a6a, ropeType:'twisted', strandCount:6,
    detailType:'ladderRungs', stoneAngle:-Math.PI/4, stoneColor:0x88FF88,
    homePos: new THREE.Vector3(Math.sin(5*Math.PI*2/10)*200, Math.cos(5*Math.PI*2/10)*200, 5), initRot: new THREE.Euler(0.9, 0.1, 0.6) },
  { index:6, name:'Ars Verum', diameter:28, tubeRadius:4.5, bandColor:0xF5F0E0, accentColor:0xFFFFFF, frameColor:0xE8E8E8, ropeType:'braided', strandCount:8,
    detailType:'spiralWraps', stoneAngle:Math.PI*0.75, stoneColor:0xBBDDFF,
    homePos: new THREE.Vector3(Math.sin(6*Math.PI*2/10)*200, Math.cos(6*Math.PI*2/10)*200, -10), initRot: new THREE.Euler(0.4, 0.8, 0.2) },
  { index:7, name:'Ars Ephesia', diameter:28, tubeRadius:4.5, bandColor:0xFF8C00, accentColor:0xFFCC44, frameColor:0xDAA520, ropeType:'twisted', strandCount:7,
    detailType:'thorns', stoneAngle:Math.PI*1.25, stoneColor:0xFF4400,
    homePos: new THREE.Vector3(Math.sin(7*Math.PI*2/10)*200, Math.cos(7*Math.PI*2/10)*200, 15), initRot: new THREE.Euler(0.7, 0.3, 0.9) },
  { index:8, name:'Ars Fulcanelli', diameter:28, tubeRadius:4.5, bandColor:0x2d0050, accentColor:0x7020AA, frameColor:0xE5E4E2, ropeType:'braided', strandCount:9,
    detailType:'nestedArcs', stoneAngle:Math.PI*1.75, stoneColor:0xDD88FF,
    homePos: new THREE.Vector3(Math.sin(8*Math.PI*2/10)*200, Math.cos(8*Math.PI*2/10)*200, -8), initRot: new THREE.Euler(0.2, 0.6, 0.4) },
  { index:9, name:'Ars Regalis', diameter:28, tubeRadius:4.5, bandColor:0x4B0082, accentColor:0xCC44FF, frameColor:0xAA88FF, ropeType:'twisted', strandCount:8,
    detailType:'segmentedPlates', stoneAngle:Math.PI*0.25, stoneColor:0xFF88FF,
    homePos: new THREE.Vector3(Math.sin(9*Math.PI*2/10)*200, Math.cos(9*Math.PI*2/10)*200, 12), initRot: new THREE.Euler(1.0, 0.5, 0.1) },
];

// 7. INSTANTIATE ALL 10 RINGS
const rings = [];
RING_DATA.forEach(spec => {
  const { group } = buildRing(spec);
  group.position.copy(spec.homePos);
  group.rotation.copy(spec.initRot);
  scene.add(group);
  rings.push({
    group, spec,
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

// 15. TOOLTIP AND LABEL DOM
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

// 11. HOVER HANDLER â€” emissiveIntensity boost on all std mats
function hoverRing(idx) {
  const r = rings[idx];
  if (r.isTraveling || r.isAtSigil) return;
  gsap.to(r.group.scale, { x:1.12, y:1.12, z:1.12, duration:0.3, ease:'power2.out' });
  r.allStdMats.forEach(mat => {
    gsap.to(mat, { emissiveIntensity: mat.userData.hoverEmissiveIntensity || 1.8, duration:0.3, ease:'power2.out' });
  });
  showTooltip(idx);
}
function unhoverRing(idx) {
  const r = rings[idx];
  if (r.isTraveling) return;
  gsap.to(r.group.scale, { x:1, y:1, z:1, duration:0.3, ease:'power2.out' });
  r.allStdMats.forEach(mat => {
    gsap.to(mat, { emissiveIntensity: mat.userData.baseEmissiveIntensity || 0.8, duration:0.3, ease:'power2.out' });
  });
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

// 13. SEND RING TO SIGIL
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
    onComplete: () => { r.isTraveling = false; r.isAtSigil = true; showActiveLabel(r.spec.name); }
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
    onComplete: () => { r.isTraveling = false; if (onReturnComplete) onReturnComplete(); }
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
    if (r.isTraveling) { r.group.rotation.z += r.spinDeltaZ * 2.0; return; }
    if (r.isAtSigil) { r.group.rotation.z += 0.0006; return; }
    r.group.rotation.x += r.spinDeltaX;
    r.group.rotation.y += r.spinDeltaY;
    r.group.rotation.z += r.spinDeltaZ;
    const phaseX = idx * 1.13;
    const phaseY = idx * 0.87;
    const driftX = Math.sin(p3Time * 0.28 + phaseX) * 10;
    const driftY = Math.sin(p3Time * 0.32 + phaseY) * 8;
    r.group.position.x = r.spec.homePos.x + driftX;
    r.group.position.y = r.spec.homePos.y + driftY;
    r.group.position.z = r.spec.homePos.z;
  });
  // Pulse all ring glow materials
  rings.forEach((r, idx) => {
    const pulsePhase = idx * 0.63;
    const pulse = 0.7 + 0.3 * Math.sin(p3Time * 1.2 + pulsePhase);
    r.allStdMats.forEach(mat => {
      if (mat.userData.isRingGlowMat && !r.isAtSigil && !r.isTraveling) {
        mat.emissiveIntensity = mat.userData.baseEmissiveIntensity * pulse;
      }
    });
  });
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
