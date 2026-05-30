/* ═══════════════════════════════════════════════════════════════════════════
   SOLOMON — Phase 3: The Ten Rings of Solomon
   ═══════════════════════════════════════════════════════════════════════════ */
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

// ═══════════════════════════════════════
// SECTION 2 — CONSTANTS
// ═══════════════════════════════════════
const RING_MAIN_RADIUS = 28;
const RAIL_TUBE        = 1.4;
const BAND_HALF_DEPTH  = 3.8;
const BAND_TUBE        = 3.6;
const STONE_RADIUS     = 2.2;
const BAND_INNER_R     = RING_MAIN_RADIUS - BAND_TUBE;
const BAND_OUTER_R     = RING_MAIN_RADIUS + BAND_TUBE;

// ═══════════════════════════════════════
// SECTION 3 — MATERIAL FACTORIES
// ═══════════════════════════════════════
const ringGlowMaterials = [];

function makeBandMaterial(hexColor, emissiveHex) {
  const mat = new THREE.MeshStandardMaterial({
    color:             new THREE.Color(hexColor),
    emissive:          new THREE.Color(emissiveHex),
    emissiveIntensity: 0.9,
    metalness:         0.55,
    roughness:         0.45,
    side:              THREE.DoubleSide,
  });
  mat.userData.baseEmissiveIntensity  = 0.9;
  mat.userData.hoverEmissiveIntensity = 2.0;
  mat.userData.isRingGlowMat          = true;
  ringGlowMaterials.push(mat);
  return mat;
}

function makeRailMaterial(hexColor, emissiveHex) {
  const mat = new THREE.MeshStandardMaterial({
    color:             new THREE.Color(hexColor),
    emissive:          new THREE.Color(emissiveHex),
    emissiveIntensity: 0.6,
    metalness:         0.92,
    roughness:         0.12,
    side:              THREE.DoubleSide,
  });
  mat.userData.baseEmissiveIntensity  = 0.6;
  mat.userData.hoverEmissiveIntensity = 1.6;
  mat.userData.isRingGlowMat          = true;
  ringGlowMaterials.push(mat);
  return mat;
}

function makeDetailMat(hexColor, emissiveHex, metalness, roughness) {
  const mat = new THREE.MeshStandardMaterial({
    color:             new THREE.Color(hexColor),
    emissive:          new THREE.Color(emissiveHex),
    emissiveIntensity: 0.7,
    metalness:         metalness !== undefined ? metalness : 0.65,
    roughness:         roughness !== undefined ? roughness : 0.35,
    side:              THREE.DoubleSide,
  });
  mat.userData.baseEmissiveIntensity  = 0.7;
  mat.userData.hoverEmissiveIntensity = 1.8;
  mat.userData.isRingGlowMat          = true;
  ringGlowMaterials.push(mat);
  return mat;
}

function makeStoneMaterial(hexColor) {
  const mat = new THREE.MeshStandardMaterial({
    color:             new THREE.Color(hexColor),
    emissive:          new THREE.Color(hexColor),
    emissiveIntensity: 2.2,
    metalness:         0.1,
    roughness:         0.05,
  });
  mat.userData.baseEmissiveIntensity  = 2.2;
  mat.userData.hoverEmissiveIntensity = 3.5;
  mat.userData.isRingGlowMat          = true;
  ringGlowMaterials.push(mat);
  return mat;
}

// ═══════════════════════════════════════
// SECTION 6 — SHARED DETAIL HELPERS
// ═══════════════════════════════════════
function placeOnBand(mesh, angle, radius) {
  mesh.position.set(
    Math.cos(angle) * radius,
    Math.sin(angle) * radius,
    0
  );
  mesh.rotation.z = angle - Math.PI / 2;
}

function chordLength(R, N) {
  return 2 * R * Math.sin(Math.PI / N);
}

function makeTangentConnector(angle, nextAngle, R, tubeRad, mat, ringGroup) {
  const midAngle = (angle + nextAngle) / 2;
  const chord    = chordLength(R, Math.round(Math.PI * 2 / (nextAngle - angle)));
  const geo = new THREE.CylinderGeometry(tubeRad, tubeRad, chord * 0.88, 5);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(
    Math.cos(midAngle) * R,
    Math.sin(midAngle) * R,
    0
  );
  mesh.rotation.z = midAngle;
  ringGroup.add(mesh);
}

// ═══════════════════════════════════════
// SECTION 7 — 10 DETAIL BUILDER FUNCTIONS
// ═══════════════════════════════════════
function buildCrossStruts(ringGroup, R, cols) {
  const N       = 14;
  const strutMat = makeDetailMat(
    cols.mid.getHex(),
    cols.mid.clone().multiplyScalar(0.5).getHex(),
    0.7, 0.3
  );
  const braceMat = makeDetailMat(
    cols.dark.getHex(),
    cols.dark.clone().multiplyScalar(0.6).getHex(),
    0.5, 0.5
  );

  for (let i = 0; i < N; i++) {
    const angle     = (i / N) * Math.PI * 2;
    const nextAngle = ((i + 1) / N) * Math.PI * 2;
    const midAngle  = (angle + nextAngle) / 2;

    const strutLen = BAND_TUBE * 1.7;
    const strutGeo = new THREE.CylinderGeometry(0.28, 0.28, strutLen, 6);
    const strut    = new THREE.Mesh(strutGeo, strutMat);
    placeOnBand(strut, angle, R);
    ringGroup.add(strut);

    const braceLen = chordLength(R, N) * 0.75;
    const braceGeo = new THREE.CylinderGeometry(0.16, 0.16, braceLen, 5);
    const brace    = new THREE.Mesh(braceGeo, braceMat);
    brace.position.set(
      Math.cos(midAngle) * R,
      Math.sin(midAngle) * R,
      0.6
    );
    brace.rotation.z = midAngle;
    ringGroup.add(brace);
  }
}

function buildHexNodes(ringGroup, R, cols) {
  const N       = 8;
  const nodeMat = makeDetailMat(
    cols.accent.getHex(),
    cols.accent.clone().multiplyScalar(0.7).getHex(),
    0.5, 0.15
  );
  const connMat = makeDetailMat(
    cols.dark.getHex(),
    cols.dark.clone().multiplyScalar(0.5).getHex(),
    0.7, 0.4
  );

  for (let i = 0; i < N; i++) {
    const angle     = (i / N) * Math.PI * 2;
    const nextAngle = ((i + 1) / N) * Math.PI * 2;

    const nodeGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.7, 6);
    const node    = new THREE.Mesh(nodeGeo, nodeMat);
    placeOnBand(node, angle, R);
    node.rotateX(Math.PI / 2);
    ringGroup.add(node);

    makeTangentConnector(angle, nextAngle, R, 0.18, connMat, ringGroup);

    const midAngle = (angle + nextAngle) / 2;
    [-0.3, 0.3].forEach(zOff => {
      const vLen = chordLength(R, N) * 0.4;
      const vGeo = new THREE.CylinderGeometry(0.12, 0.12, vLen, 4);
      const v    = new THREE.Mesh(vGeo, connMat);
      v.position.set(
        Math.cos(midAngle) * R,
        Math.sin(midAngle) * R,
        zOff * BAND_TUBE
      );
      v.rotation.z = midAngle;
      ringGroup.add(v);
    });
  }
}

function buildAngularBrackets(ringGroup, R, cols) {
  const N      = 6;
  const armMat = makeDetailMat(
    cols.light.getHex(),
    cols.light.clone().multiplyScalar(0.55).getHex(),
    0.8, 0.18
  );
  const connMat = makeDetailMat(
    cols.mid.getHex(),
    cols.mid.clone().multiplyScalar(0.4).getHex(),
    0.65, 0.4
  );

  for (let i = 0; i < N; i++) {
    const angle     = (i / N) * Math.PI * 2;
    const nextAngle = ((i + 1) / N) * Math.PI * 2;

    const armLen = BAND_TUBE * 1.5;
    [-0.6, 0.6].forEach(tilt => {
      const armGeo = new THREE.CylinderGeometry(0.28, 0.28, armLen, 5);
      const arm    = new THREE.Mesh(armGeo, armMat);
      placeOnBand(arm, angle, R);
      arm.rotateZ(tilt);
      ringGroup.add(arm);
    });

    makeTangentConnector(angle, nextAngle, R + BAND_TUBE * 0.4,
      0.15, connMat, ringGroup);
  }
}

function buildWoundCoils(ringGroup, R, cols) {
  const N        = 10;
  const coilMat  = makeDetailMat(
    cols.mid.getHex(),
    cols.mid.clone().multiplyScalar(0.6).getHex(),
    0.5, 0.3
  );
  const coilMat2 = makeDetailMat(
    cols.light.getHex(),
    cols.light.clone().multiplyScalar(0.5).getHex(),
    0.6, 0.25
  );
  const rodMat = makeDetailMat(
    cols.dark.getHex(),
    cols.dark.clone().multiplyScalar(0.5).getHex(),
    0.7, 0.45
  );

  for (let i = 0; i < N; i++) {
    const angle     = (i / N) * Math.PI * 2;
    const nextAngle = ((i + 1) / N) * Math.PI * 2;
    const zOff      = (i % 2 === 0 ? 1 : -1) * 1.4;

    const coilGeo = new THREE.TorusGeometry(BAND_TUBE * 0.5, 0.32, 8, 20);
    const coil    = new THREE.Mesh(coilGeo, i % 2 === 0 ? coilMat : coilMat2);
    coil.position.set(
      Math.cos(angle) * R,
      Math.sin(angle) * R,
      zOff
    );
    coil.rotation.set(0, Math.PI / 2, angle + Math.PI / 2);
    ringGroup.add(coil);

    makeTangentConnector(angle, nextAngle, R, 0.16, rodMat, ringGroup);
  }
}

function buildCrystalFacets(ringGroup, R, cols) {
  const N         = 9;
  const crystalMat = makeDetailMat(
    cols.accent.getHex(),
    cols.accent.clone().multiplyScalar(0.8).getHex(),
    0.3, 0.06
  );
  const rodMat = makeDetailMat(
    cols.dark.getHex(),
    cols.dark.clone().multiplyScalar(0.5).getHex(),
    0.7, 0.5
  );

  for (let i = 0; i < N; i++) {
    const angle     = (i / N) * Math.PI * 2;
    const nextAngle = ((i + 1) / N) * Math.PI * 2;

    const cGeo    = new THREE.OctahedronGeometry(1.7, 0);
    const crystal = new THREE.Mesh(cGeo, crystalMat);
    crystal.position.set(
      Math.cos(angle) * R,
      Math.sin(angle) * R,
      0
    );
    crystal.rotation.set(angle * 0.4, angle * 0.6, angle);
    ringGroup.add(crystal);

    if (i % 2 === 0) {
      makeTangentConnector(angle, nextAngle, R, 0.14, rodMat, ringGroup);
    }
  }
}

function buildLadderRungs(ringGroup, R, cols) {
  const N       = 16;
  const innerR  = R - BAND_TUBE * 0.55;
  const outerR  = R + BAND_TUBE * 0.55;
  const railMat = makeDetailMat(
    cols.mid.getHex(),
    cols.mid.clone().multiplyScalar(0.5).getHex(),
    0.6, 0.4
  );
  const rungMat = makeDetailMat(
    cols.light.getHex(),
    cols.light.clone().multiplyScalar(0.6).getHex(),
    0.7, 0.25
  );

  const iRailGeo = new THREE.TorusGeometry(innerR, 0.25, 8, 100);
  ringGroup.add(new THREE.Mesh(iRailGeo, railMat));

  const oRailGeo = new THREE.TorusGeometry(outerR, 0.25, 8, 100);
  ringGroup.add(new THREE.Mesh(oRailGeo, railMat.clone()));

  const rungLen = outerR - innerR;
  for (let i = 0; i < N; i++) {
    const angle  = (i / N) * Math.PI * 2;
    const midR   = (innerR + outerR) / 2;
    const rungGeo = new THREE.CylinderGeometry(0.2, 0.2, rungLen, 5);
    const rung    = new THREE.Mesh(rungGeo, rungMat);
    placeOnBand(rung, angle, midR);
    ringGroup.add(rung);
  }
}

function buildSpiralWraps(ringGroup, R, cols) {
  const N       = 18;
  const discMat = makeDetailMat(
    cols.mid.getHex(),
    cols.mid.clone().multiplyScalar(0.6).getHex(),
    0.5, 0.28
  );
  const discMat2 = makeDetailMat(
    cols.accent.getHex(),
    cols.accent.clone().multiplyScalar(0.7).getHex(),
    0.4, 0.2
  );

  for (let i = 0; i < N; i++) {
    const angle   = (i / N) * Math.PI * 2;
    const tiltAcc = (i / N) * Math.PI;
    const useMat  = (i % 3 === 0) ? discMat2 : discMat;

    const dGeo = new THREE.CylinderGeometry(
      BAND_TUBE * 0.72, BAND_TUBE * 0.72, 0.22, 8
    );
    const disc = new THREE.Mesh(dGeo, useMat);
    placeOnBand(disc, angle, R);
    disc.rotateY(tiltAcc);
    ringGroup.add(disc);
  }
}

function buildThorns(ringGroup, R, cols) {
  const N        = 12;
  const thornMat = makeDetailMat(
    cols.accent.getHex(),
    cols.accent.clone().multiplyScalar(0.75).getHex(),
    0.6, 0.15
  );
  const thornMat2 = makeDetailMat(
    cols.mid.getHex(),
    cols.mid.clone().multiplyScalar(0.5).getHex(),
    0.55, 0.3
  );

  const baseGeo = new THREE.TorusGeometry(
    R - BAND_TUBE * 0.5, 0.2, 8, 100
  );
  ringGroup.add(new THREE.Mesh(baseGeo, thornMat2.clone()));

  for (let i = 0; i < N; i++) {
    const angle  = (i / N) * Math.PI * 2;
    const isTall = i % 2 === 0;
    const height = isTall ? BAND_TUBE * 1.55 : BAND_TUBE * 0.85;
    const baseR  = isTall ? 0.52 : 0.36;

    const thornGeo = new THREE.CylinderGeometry(0.04, baseR, height, 6);
    const thorn    = new THREE.Mesh(thornGeo, isTall ? thornMat : thornMat2);
    placeOnBand(thorn, angle, R);
    ringGroup.add(thorn);
  }
}

function buildNestedArcs(ringGroup, R, cols) {
  const N      = 7;
  const mat1   = makeDetailMat(
    cols.light.getHex(),
    cols.light.clone().multiplyScalar(0.65).getHex(),
    0.5, 0.28
  );
  const mat2   = makeDetailMat(
    cols.accent.getHex(),
    cols.accent.clone().multiplyScalar(0.85).getHex(),
    0.4, 0.18
  );
  const connMat = makeDetailMat(
    cols.dark.getHex(),
    cols.dark.clone().multiplyScalar(0.45).getHex(),
    0.7, 0.5
  );

  for (let i = 0; i < N; i++) {
    const angle     = (i / N) * Math.PI * 2;
    const nextAngle = ((i + 1) / N) * Math.PI * 2;
    const px = Math.cos(angle) * R;
    const py = Math.sin(angle) * R;

    const outerGeo = new THREE.TorusGeometry(2.0, 0.28, 7, 20);
    const outer    = new THREE.Mesh(outerGeo, mat1);
    outer.position.set(px, py, 0);
    outer.rotation.set(0, Math.PI / 2, angle + Math.PI / 2);
    ringGroup.add(outer);

    const innerGeo = new THREE.TorusGeometry(1.1, 0.22, 6, 16);
    const inner    = new THREE.Mesh(innerGeo, mat2);
    inner.position.set(px, py, 0);
    inner.rotation.set(0, Math.PI / 2, angle + Math.PI / 2);
    ringGroup.add(inner);

    makeTangentConnector(angle, nextAngle, R, 0.16, connMat, ringGroup);
  }
}

function buildSegmentedPlates(ringGroup, R, cols) {
  const N        = 10;
  const plateMat = makeDetailMat(
    cols.mid.getHex(),
    cols.mid.clone().multiplyScalar(0.55).getHex(),
    0.7, 0.25
  );
  const plateMat2 = makeDetailMat(
    cols.light.getHex(),
    cols.light.clone().multiplyScalar(0.65).getHex(),
    0.6, 0.2
  );

  const segArc   = (2 * Math.PI * R) / N;
  const plateH   = segArc * 0.78;
  const plateW   = BAND_TUBE * 1.6;
  const plateD   = 0.55;

  for (let i = 0; i < N; i++) {
    const angle  = (i / N) * Math.PI * 2;
    const zOff   = (i % 2 === 0 ? 0.8 : -0.8);
    const useMat = (i % 2 === 0) ? plateMat : plateMat2;

    const plateGeo = new THREE.BoxGeometry(plateD, plateH, plateW);
    const plate    = new THREE.Mesh(plateGeo, useMat);

    plate.position.set(
      Math.cos(angle) * R,
      Math.sin(angle) * R,
      zOff
    );
    plate.rotation.z = angle;
    ringGroup.add(plate);
  }
}

function buildBandDetail(spec, ringGroup, R, cols) {
  switch (spec.detailType) {
    case 'crossStruts':     buildCrossStruts(ringGroup, R, cols);     break;
    case 'hexNodes':        buildHexNodes(ringGroup, R, cols);        break;
    case 'angularBrackets': buildAngularBrackets(ringGroup, R, cols); break;
    case 'woundCoils':      buildWoundCoils(ringGroup, R, cols);      break;
    case 'crystalFacets':   buildCrystalFacets(ringGroup, R, cols);  break;
    case 'ladderRungs':     buildLadderRungs(ringGroup, R, cols);     break;
    case 'spiralWraps':     buildSpiralWraps(ringGroup, R, cols);     break;
    case 'thorns':          buildThorns(ringGroup, R, cols);          break;
    case 'nestedArcs':      buildNestedArcs(ringGroup, R, cols);      break;
    case 'segmentedPlates': buildSegmentedPlates(ringGroup, R, cols); break;
    default:
      console.warn('[Solomon P3] Unknown detailType:', spec.detailType);
  }
}

// ═══════════════════════════════════════
// SECTION 5 — buildRing() REWRITE
// ═══════════════════════════════════════
function buildRing(spec) {
  const ringGroup = new THREE.Group();
  ringGroup.name  = spec.name;

  const R  = RING_MAIN_RADIUS;
  const BH = BAND_HALF_DEPTH;

  // ── Derive colors ───────────────────────────────────────────────
  const bandCol   = new THREE.Color(spec.bandColor);
  const frameCol  = new THREE.Color(spec.frameColor);
  const accentCol = new THREE.Color(spec.accentColor);

  const railCol  = frameCol.clone().lerp(new THREE.Color(0xffffff), 0.18);
  const railEmit = frameCol.clone().multiplyScalar(0.4);
  const bandEmit = bandCol.clone().multiplyScalar(0.6);

  const cols = {
    band:   bandCol,
    rail:   railCol,
    light:  bandCol.clone().lerp(new THREE.Color(0xffffff), 0.3),
    dark:   bandCol.clone().multiplyScalar(0.4),
    mid:    bandCol.clone().lerp(accentCol, 0.5),
    accent: accentCol.clone(),
  };

  // ── A) FRONT RAIL ───────────────────────────────────────────────
  const railGeo   = new THREE.TorusGeometry(R, RAIL_TUBE, 16, 140);
  const railMat   = makeRailMaterial(
    railCol.getHex(),
    railEmit.getHex()
  );
  const frontRail = new THREE.Mesh(railGeo, railMat);
  frontRail.position.z = BH;
  frontRail.name = 'frontRail';
  ringGroup.add(frontRail);

  // ── B) BACK RAIL ────────────────────────────────────────────────
  const backRail  = new THREE.Mesh(railGeo, railMat.clone());
  ringGlowMaterials.push(backRail.material);
  backRail.material.userData.baseEmissiveIntensity  = 0.6;
  backRail.material.userData.hoverEmissiveIntensity = 1.6;
  backRail.material.userData.isRingGlowMat          = true;
  backRail.position.z = -BH;
  backRail.name = 'backRail';
  ringGroup.add(backRail);

  // ── C) BAND SURFACE ─────────────────────────────────────────────
  const bandGeo  = new THREE.TorusGeometry(R, BAND_TUBE, 20, 140);
  const bandMat  = makeBandMaterial(
    spec.bandColor,
    bandEmit.getHex()
  );
  const bandMesh = new THREE.Mesh(bandGeo, bandMat);
  bandMesh.position.z = 0;
  bandMesh.name = 'band';
  ringGroup.add(bandMesh);

  // ── D) BAND DETAIL ───────────────────────────────────────────────
  buildBandDetail(spec, ringGroup, R, cols);

  // ── E) STONE ─────────────────────────────────────────────────────
  const stoneAngle = spec.stoneAngle;
  const stoneX = Math.cos(stoneAngle) * R;
  const stoneY = Math.sin(stoneAngle) * R;

  const stoneGeo = new THREE.SphereGeometry(STONE_RADIUS, 16, 16);
  const stoneMat = makeStoneMaterial(spec.stoneColor);
  const stone    = new THREE.Mesh(stoneGeo, stoneMat);
  stone.position.set(stoneX, stoneY, BAND_TUBE * 0.2);
  stone.name = 'stone';
  ringGroup.add(stone);

  return { group: ringGroup, spec };
}

// ═══════════════════════════════════════
// SECTION 8 — RING_DATA
// ═══════════════════════════════════════
const RING_DATA = [
  { index:0, name:'Ars Almadel', diameter:28, tubeRadius:4.5, bandColor:0x8B0000, accentColor:0xBB2020, frameColor:0x6B4423, ropeType:'braided', strandCount:8,
    detailType:'crossStruts', stoneAngle:Math.PI/2, stoneColor:0xFF5555,
    homePos: new THREE.Vector3(0, 200, -15), initRot: new THREE.Euler(0.8, 0.3, 0.2) },
  { index:1, name:'Ars Notoria', diameter:28, tubeRadius:4.5, bandColor:0x1a1a6e, accentColor:0x3535BB, frameColor:0xC0C0C0, ropeType:'twisted', strandCount:6,
    detailType:'hexNodes', stoneAngle:0, stoneColor:0x9999FF,
    homePos: new THREE.Vector3(Math.sin(1*Math.PI*2/10)*200, Math.cos(1*Math.PI*2/10)*200, 10), initRot: new THREE.Euler(0.3, 0.9, 0.1) },
  { index:2, name:'Ars Paulina', diameter:28, tubeRadius:4.5, bandColor:0xB8860B, accentColor:0xE8C040, frameColor:0x8B6914, ropeType:'twisted', strandCount:7,
    detailType:'angularBrackets', stoneAngle:-Math.PI/2, stoneColor:0xFFFAAA,
    homePos: new THREE.Vector3(Math.sin(2*Math.PI*2/10)*200, Math.cos(2*Math.PI*2/10)*200, -5), initRot: new THREE.Euler(1.1, 0.2, 0.5) },
  { index:3, name:'Ars Goetia', diameter:28, tubeRadius:4.5, bandColor:0x553333, accentColor:0x994444, frameColor:0x4a4a4f, ropeType:'braided', strandCount:10,
    detailType:'woundCoils', stoneAngle:Math.PI, stoneColor:0xDD4444,
    homePos: new THREE.Vector3(Math.sin(3*Math.PI*2/10)*200, Math.cos(3*Math.PI*2/10)*200, 20), initRot: new THREE.Euler(0.2, 0.7, 0.8) },
  { index:4, name:'Ars Theurgia', diameter:28, tubeRadius:4.5, bandColor:0x008B8B, accentColor:0x20CCCC, frameColor:0x7d5a3c, ropeType:'braided', strandCount:9,
    detailType:'crystalFacets', stoneAngle:Math.PI/4, stoneColor:0xAAFFFF,
    homePos: new THREE.Vector3(Math.sin(4*Math.PI*2/10)*200, Math.cos(4*Math.PI*2/10)*200, -20), initRot: new THREE.Euler(0.6, 0.4, 0.3) },
  { index:5, name:'Ars Almiras', diameter:28, tubeRadius:4.5, bandColor:0x1a4a1a, accentColor:0x3A8A3A, frameColor:0x4a7a6a, ropeType:'twisted', strandCount:6,
    detailType:'ladderRungs', stoneAngle:-Math.PI/4, stoneColor:0x88FF88,
    homePos: new THREE.Vector3(Math.sin(5*Math.PI*2/10)*200, Math.cos(5*Math.PI*2/10)*200, 5), initRot: new THREE.Euler(0.9, 0.1, 0.6) },
  { index:6, name:'Ars Verum', diameter:28, tubeRadius:4.5, bandColor:0xF5F0E0, accentColor:0xFFFFFF, frameColor:0xE8E8E8, ropeType:'braided', strandCount:8,
    detailType:'spiralWraps', stoneAngle:Math.PI*0.75, stoneColor:0xAADDFF,
    homePos: new THREE.Vector3(Math.sin(6*Math.PI*2/10)*200, Math.cos(6*Math.PI*2/10)*200, -10), initRot: new THREE.Euler(0.4, 0.8, 0.2) },
  { index:7, name:'Ars Ephesia', diameter:28, tubeRadius:4.5, bandColor:0xFF8C00, accentColor:0xFFCC44, frameColor:0xDAA520, ropeType:'twisted', strandCount:7,
    detailType:'thorns', stoneAngle:Math.PI*1.25, stoneColor:0xFF5500,
    homePos: new THREE.Vector3(Math.sin(7*Math.PI*2/10)*200, Math.cos(7*Math.PI*2/10)*200, 15), initRot: new THREE.Euler(0.7, 0.3, 0.9) },
  { index:8, name:'Ars Fulcanelli', diameter:28, tubeRadius:4.5, bandColor:0x2d0050, accentColor:0x7020AA, frameColor:0xE5E4E2, ropeType:'braided', strandCount:9,
    detailType:'nestedArcs', stoneAngle:Math.PI*1.75, stoneColor:0xDD88FF,
    homePos: new THREE.Vector3(Math.sin(8*Math.PI*2/10)*200, Math.cos(8*Math.PI*2/10)*200, -8), initRot: new THREE.Euler(0.2, 0.6, 0.4) },
  { index:9, name:'Ars Regalis', diameter:28, tubeRadius:4.5, bandColor:0x4B0082, accentColor:0xCC44FF, frameColor:0xAA88FF, ropeType:'twisted', strandCount:8,
    detailType:'segmentedPlates', stoneAngle:Math.PI*0.25, stoneColor:0xFF88FF,
    homePos: new THREE.Vector3(Math.sin(9*Math.PI*2/10)*200, Math.cos(9*Math.PI*2/10)*200, 12), initRot: new THREE.Euler(1.0, 0.5, 0.1) },
];

// ═══════════════════════════════════════
// SECTION 9 — INSTANTIATION UPDATE
// ═══════════════════════════════════════
const rings = [];

RING_DATA.forEach(spec => {
  const { group } = buildRing(spec);
  group.position.copy(spec.homePos);
  group.rotation.copy(spec.initRot);
  scene.add(group);
  rings.push({
    group,
    spec,
    isAtSigil:        false,
    isTraveling:      false,
    currentSpinSpeed: 0,
    allStdMats:       [],
    particleSystem:   null,
    spinDeltaX:       0,
    spinDeltaY:       0,
    spinDeltaZ:       0,
  });
});

rings.forEach(r => {
  r.group.traverse(child => {
    if (
      child.isMesh &&
      child.material &&
      child.material.isMeshStandardMaterial
    ) {
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

// 11. HOVER HANDLER — emissiveIntensity boost on all std mats
function hoverRing(idx) {
  const r = rings[idx];
  if (r.isTraveling || r.isAtSigil) return;
  gsap.to(r.group.scale, {
    x: 1.12, y: 1.12, z: 1.12,
    duration: 0.3,
    ease: 'power2.out',
  });
  r.allStdMats.forEach(mat => {
    gsap.to(mat, {
      emissiveIntensity: mat.userData.hoverEmissiveIntensity || 1.8,
      duration: 0.3,
      ease: 'power2.out',
    });
  });
  showTooltip(idx);
}

function unhoverRing(idx) {
  const r = rings[idx];
  if (r.isTraveling) return;
  gsap.to(r.group.scale, {
    x: 1.0, y: 1.0, z: 1.0,
    duration: 0.3,
    ease: 'power2.out',
  });
  r.allStdMats.forEach(mat => {
    gsap.to(mat, {
      emissiveIntensity: mat.userData.baseEmissiveIntensity || 0.8,
      duration: 0.3,
      ease: 'power2.out',
    });
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

// 13a. SEND RING TO SIGIL + NOTIFY BACKEND OF PERSONALITY CHANGE
function sendRingToSigilAndNotify(idx) {
  sendRingToSigil(idx);

  // Index 0 = Ars Almadel — warp ring, not a personality switch
  if (idx === 0) return;

  const ringIdMap = window.solomonRingIdMap;
  if (!ringIdMap || !ringIdMap[idx]) return;

  const ringId = ringIdMap[idx];

  // Update active ring so next user_message uses this personality
  if (window.solomonWS) {
    window.solomonWS.activeRingId = ringId;
    window.solomonWS.send('ring_selected', { ring_id: ringId });
  }
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

  // Ars Almadel (index 0) — warp toggle takes priority over all other logic.
  // Pass the event so warp.js can detect clicks that originated from the
  // invocation UI and ignore them (prevents textarea clicks triggering warp-in).
  if (clickedIdx === 0 && typeof window.solomonHandleAlmadelClick === 'function') {
    window.solomonHandleAlmadelClick(e);
    return;
  }

  // All other rings are locked out while warp mode is active.
  if (window.solomonWarpActive) return;

  if (clickedRing.isAtSigil) {
    returnRingToOrigin(clickedIdx);
  } else {
    if (ringAtSigilIndex !== -1 && ringAtSigilIndex !== clickedIdx) {
      const prevIdx = ringAtSigilIndex;
      returnRingToOrigin(prevIdx, () => { setTimeout(() => sendRingToSigilAndNotify(clickedIdx), 400); });
    } else {
      sendRingToSigilAndNotify(clickedIdx);
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

  rings.forEach((r, idx) => {
    if (r.isTraveling || r.isAtSigil) return;
    const phase = idx * 0.628;   // spread across rings
    const pulse = 0.7 + 0.3 * Math.sin(p3Time * 1.1 + phase);
    r.allStdMats.forEach(mat => {
      if (mat.userData.isRingGlowMat) {
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
window.solomonPhase3Update       = phase3Update;
window.solomonRings               = rings;
window.solomonP3Time              = () => p3Time;
window.solomonSendRingToSigil    = sendRingToSigil;
window.solomonReturnRingToOrigin = returnRingToOrigin;

console.log('[Solomon Phase 3] Rewrite complete. 10 rings active.');
})();
