import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { scene, sceneGroup, registerFrameCallback } from './main.js';

// ═══════════════════════════════════════════════════════════════
// sigil.js — THE WARM FORGE (PROJECT SOLOMON · Phase 2)
// Core sigil: icosahedron, filaments, glyph planes, lights, bloom
// ═══════════════════════════════════════════════════════════════

const sigilGroup = new THREE.Group();
sigilGroup.position.set(0, 0, 0);
sceneGroup.add(sigilGroup);

// ═════════════════════════════════════════════════════════════
// COMPONENT 1 — INNER CORE
// ═════════════════════════════════════════════════════════════

const innerCoreGeo = new THREE.IcosahedronGeometry(6, 1);
const innerCoreMat = new THREE.MeshPhysicalMaterial({
  color: 0xC9A84C,
  emissive: 0x8A4A08,
  emissiveIntensity: 3.5,
  metalness: 1.0,
  roughness: 0.04,
  clearcoat: 1.0,
  clearcoatRoughness: 0.02,
  envMapIntensity: 2.0,
  wireframe: true
});
const innerCore = new THREE.Mesh(innerCoreGeo, innerCoreMat);
sigilGroup.add(innerCore);

// ═════════════════════════════════════════════════════════════
// COMPONENT 2 — OUTER SHELL
// ═════════════════════════════════════════════════════════════

const outerShellGeo = new THREE.IcosahedronGeometry(9, 0);
const outerShellMat = new THREE.MeshPhysicalMaterial({
  color: 0xC9A84C,
  emissive: 0x6A3A05,
  emissiveIntensity: 1.2,
  metalness: 1.0,
  roughness: 0.08,
  transmission: 0.3,
  clearcoat: 1.0,
  envMapIntensity: 2.5,
  opacity: 0.45,
  transparent: true,
  wireframe: true
});
const outerShell = new THREE.Mesh(outerShellGeo, outerShellMat);
sigilGroup.add(outerShell);

// ═════════════════════════════════════════════════════════════
// COMPONENT 3 — ORBITAL FILAMENTS
// ═════════════════════════════════════════════════════════════

const filaments = [];
const filamentSpeeds = [0.004, 0.006, 0.008, 0.007, 0.005, 0.009];

for (let i = 0; i < 6; i++) {
  const torusGeo = new THREE.TorusGeometry(12, 0.08, 3, 64);
  const torusMat = new THREE.MeshBasicMaterial({
    color: 0xC9A84C,
    transparent: true,
    opacity: 0
  });
  const filament = new THREE.Mesh(torusGeo, torusMat);
  filament.rotateY(i * Math.PI / 6);
  filament.rotateX(i * 0.15);
  sigilGroup.add(filament);
  filaments.push(filament);
}

// ═════════════════════════════════════════════════════════════
// COMPONENT 4 — SIGIL GLYPH PLANES
// ═════════════════════════════════════════════════════════════

// Plane 0: triangle + inscribed circle + median lines
function createGlyphTexture0() {
  const size = 512;
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(201, 168, 76, 0.45)';
  ctx.lineWidth = 0.8;

  const cx = size / 2;
  const cy = size / 2;
  const r = 200;

  // Equilateral triangle vertices
  const v0x = cx;
  const v0y = cy - r;
  const v1x = cx - r * Math.cos(Math.PI / 6);
  const v1y = cy + r * Math.sin(Math.PI / 6);
  const v2x = cx + r * Math.cos(Math.PI / 6);
  const v2y = cy + r * Math.sin(Math.PI / 6);

  ctx.beginPath();
  ctx.moveTo(v0x, v0y);
  ctx.lineTo(v1x, v1y);
  ctx.lineTo(v2x, v2y);
  ctx.closePath();
  ctx.stroke();

  // Inscribed circle (inradius = R/2 for equilateral triangle)
  const incX = cx;
  const incY = (v0y + v1y + v2y) / 3;
  const inradius = r / 2;
  ctx.beginPath();
  ctx.arc(incX, incY, inradius, 0, Math.PI * 2);
  ctx.stroke();

  // Median lines: vertex to opposite midpoint
  const m0x = (v1x + v2x) / 2; const m0y = (v1y + v2y) / 2;
  const m1x = (v0x + v2x) / 2; const m1y = (v0y + v2y) / 2;
  const m2x = (v0x + v1x) / 2; const m2y = (v0y + v1y) / 2;

  ctx.beginPath(); ctx.moveTo(v0x, v0y); ctx.lineTo(m0x, m0y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(v1x, v1y); ctx.lineTo(m1x, m1y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(v2x, v2y); ctx.lineTo(m2x, m2y); ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

// Plane 1: outer octagon + inner rotated octagon + connecting lines + center circle
function createGlyphTexture1() {
  const size = 512;
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(201, 168, 76, 0.45)';
  ctx.lineWidth = 0.8;

  const cx = size / 2;
  const cy = size / 2;
  const outerR = 200;
  const innerR = 140;

  // Outer octagon
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const px = cx + Math.cos(a) * outerR;
    const py = cy + Math.sin(a) * outerR;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();

  // Inner octagon rotated 22.5°
  const innerOffset = 22.5 * Math.PI / 180;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2 + innerOffset;
    const px = cx + Math.cos(a) * innerR;
    const py = cy + Math.sin(a) * innerR;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();

  // 8 connecting lines
  for (let i = 0; i < 8; i++) {
    const outerA = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const innerA = (i / 8) * Math.PI * 2 - Math.PI / 2 + innerOffset;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(outerA) * outerR, cy + Math.sin(outerA) * outerR);
    ctx.lineTo(cx + Math.cos(innerA) * innerR, cy + Math.sin(innerA) * innerR);
    ctx.stroke();
  }

  // Center circle
  ctx.beginPath();
  ctx.arc(cx, cy, 40, 0, Math.PI * 2);
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

// Plane 2: concentric circles + radial lines + random arcs
function createGlyphTexture2() {
  const size = 512;
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(201, 168, 76, 0.45)';
  ctx.lineWidth = 0.8;

  const cx = size / 2;
  const cy = size / 2;
  const radii = [60, 120, 180, 220];

  // 4 concentric circles
  for (let i = 0; i < radii.length; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, radii[i], 0, Math.PI * 2);
    ctx.stroke();
  }

  // 12 radial lines
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * 240, cy + Math.sin(a) * 240);
    ctx.stroke();
  }

  // Irregular arc segments between circles
  for (let ring = 0; ring < radii.length - 1; ring++) {
    const midR = (radii[ring] + radii[ring + 1]) / 2;
    const arcCount = 3 + Math.floor(Math.random() * 3);
    for (let a = 0; a < arcCount; a++) {
      const startAngle = Math.random() * Math.PI * 2;
      const endAngle = startAngle + 0.8;
      ctx.beginPath();
      ctx.arc(cx, cy, midR, startAngle, endAngle);
      ctx.stroke();
    }
  }

  return new THREE.CanvasTexture(canvas);
}

const glyphTextures = [createGlyphTexture0(), createGlyphTexture1(), createGlyphTexture2()];
const glyphZOffsets = [-2, 0, 2];
const glyphPlanes = [];

for (let i = 0; i < 3; i++) {
  const geo = new THREE.PlaneGeometry(22, 22);
  const mat = new THREE.MeshBasicMaterial({
    map: glyphTextures[i],
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const plane = new THREE.Mesh(geo, mat);
  plane.position.z = glyphZOffsets[i];
  sigilGroup.add(plane);
  glyphPlanes.push(plane);
}

// ═════════════════════════════════════════════════════════════
// COMPONENT 5 — CORE LIGHT SYSTEM
// ═════════════════════════════════════════════════════════════

const forgeLight = new THREE.PointLight(0xF0A030, 5.0, 350, 1.6);
forgeLight.position.set(0, 0, 0);
sigilGroup.add(forgeLight);

const coronaLight = new THREE.PointLight(0xC9A84C, 2.5, 200, 2.0);
coronaLight.position.set(0, 8, 0);
sigilGroup.add(coronaLight);

const underLight = new THREE.PointLight(0x8A4A08, 1.5, 120, 2.0);
underLight.position.set(0, -15, 0);
sigilGroup.add(underLight);

// ═════════════════════════════════════════════════════════════
// COMPONENT 6 — BLOOM SPRITE
// ═════════════════════════════════════════════════════════════

function createBloomTexture() {
  const size = 512;
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  gradient.addColorStop(0, 'rgba(240, 160, 48, 0.6)');
  gradient.addColorStop(0.25, 'rgba(201, 120, 30, 0.3)');
  gradient.addColorStop(0.6, 'rgba(139, 80, 10, 0.1)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

const bloomSpriteMat = new THREE.SpriteMaterial({
  map: createBloomTexture(),
  transparent: true,
  opacity: 0.22,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const bloomSprite = new THREE.Sprite(bloomSpriteMat);
bloomSprite.scale.set(42, 42, 1);
sigilGroup.add(bloomSprite);

// ═════════════════════════════════════════════════════════════
// FRAME ANIMATION
// ═════════════════════════════════════════════════════════════

registerFrameCallback((elapsed, delta) => {
  // Inner core rotation
  innerCore.rotation.x += 0.003;
  innerCore.rotation.y += 0.007;
  innerCore.rotation.z += 0.002;

  // Outer shell counter-rotation
  outerShell.rotation.x -= 0.005;
  outerShell.rotation.y -= 0.003;

  // Orbital filaments
  for (let i = 0; i < filaments.length; i++) {
    filaments[i].rotation.z += filamentSpeeds[i];
    filaments[i].rotation.x += filamentSpeeds[i] * 0.3;
  }

  // Glyph planes
  glyphPlanes[0].rotation.z += 0.0008;
  glyphPlanes[1].rotation.z -= 0.0005;
  glyphPlanes[1].rotation.x += 0.0003;
  glyphPlanes[2].rotation.y += 0.0006;
  glyphPlanes[2].rotation.z += 0.0004;

  // Core light breathing
  forgeLight.intensity = 4.5 + Math.sin(elapsed * 0.9) * 1.2;
  coronaLight.intensity = 2.0 + Math.sin(elapsed * 1.3 + 1.0) * 0.8;
});

// ═════════════════════════════════════════════════════════════
// SUMMON ANIMATION — SIGIL ENTRANCE
// ═════════════════════════════════════════════════════════════

sigilGroup.scale.set(0, 0, 0);

const gsap = window.gsap;
if (gsap) {
  const tl = gsap.timeline();
  tl.to(sigilGroup.scale, {
    x: 1, y: 1, z: 1,
    duration: 1.4,
    ease: 'elastic.out(1, 0.5)',
    delay: 0.3
  })
  .to(filaments[0].material, { opacity: 0.4, duration: 0.3 }, 0.5)
  .to(filaments[1].material, { opacity: 0.4, duration: 0.3 }, 0.65)
  .to(filaments[2].material, { opacity: 0.4, duration: 0.3 }, 0.8)
  .to(filaments[3].material, { opacity: 0.4, duration: 0.3 }, 0.95)
  .to(filaments[4].material, { opacity: 0.4, duration: 0.3 }, 1.1)
  .to(filaments[5].material, { opacity: 0.4, duration: 0.3 }, 1.25);
}

// ═════════════════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════════════════

export { sigilGroup, innerCore, outerShell, filaments, forgeLight };
