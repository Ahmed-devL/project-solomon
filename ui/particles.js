import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { scene, sceneGroup, registerFrameCallback } from './main.js';

// ═══════════════════════════════════════════════════════════════
// particles.js — THE LIVING VOID (PROJECT SOLOMON · Phase 2)
// Star field, nebula atmosphere, geometric dust
// ═══════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════
// ELEMENT 1 — STAR FIELD
// ═════════════════════════════════════════════════════════════

const starCount = 6000;
const starPositions = new Float32Array(starCount * 3);
const starRadius = 800;

for (let i = 0; i < starCount; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const idx = i * 3;
  starPositions[idx]     = starRadius * Math.sin(phi) * Math.cos(theta);
  starPositions[idx + 1] = starRadius * Math.sin(phi) * Math.sin(theta);
  starPositions[idx + 2] = starRadius * Math.cos(phi);
}

const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

const starMat = new THREE.PointsMaterial({
  color: 0xC8D4E8,
  size: 0.9,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.75
});

const starField = new THREE.Points(starGeo, starMat);
scene.add(starField);

// ═════════════════════════════════════════════════════════════
// ELEMENT 2 — NEBULA ATMOSPHERE
// ═════════════════════════════════════════════════════════════

const nebulaData = [];

function createNebulaTexture(type) {
  const size = 256;
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);

  if (type === 'cold') {
    gradient.addColorStop(0, 'rgba(15, 10, 48, 0.9)');
    gradient.addColorStop(0.5, 'rgba(8, 12, 35, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else {
    gradient.addColorStop(0, 'rgba(35, 18, 4, 0.8)');
    gradient.addColorStop(0.5, 'rgba(20, 10, 2, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

const nebulaConfigs = [
  { type: 'cold', pos: [0, 160, -220],    rot: [-1.2, 0, 0],      opacity: 0.06 },
  { type: 'cold', pos: [0, 0, -320],      rot: [0, 0, 0],         opacity: 0.09 },
  { type: 'cold', pos: [-60, -40, -190],  rot: [0.35, 0.28, 0],   opacity: 0.07 },
  { type: 'warm', pos: [40, 80, -140],    rot: [-0.8, -0.35, 0],  opacity: 0.08 },
  { type: 'warm', pos: [0, 20, -110],     rot: [0.5, 0.6, 0],     opacity: 0.06 }
];

nebulaConfigs.forEach((cfg) => {
  const texture = createNebulaTexture(cfg.type);
  const geo = new THREE.PlaneGeometry(380, 380);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    opacity: cfg.opacity
  });

  const plane = new THREE.Mesh(geo, mat);
  plane.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
  plane.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
  sceneGroup.add(plane);

  nebulaData.push({
    mesh: plane,
    driftSpeed: 0.00012 + Math.random() * 0.00013,
    driftOffset: Math.random() * Math.PI * 2
  });
});

// ═════════════════════════════════════════════════════════════
// ELEMENT 3 — GEOMETRIC DUST
// ═════════════════════════════════════════════════════════════

const dustCount = 2000;
const dustPositions = new Float32Array(dustCount * 3);
const dustVelocities = new Float32Array(dustCount * 3);
const dustRadius = 180;

for (let i = 0; i < dustCount; i++) {
  const r = dustRadius * Math.cbrt(Math.random());
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const idx = i * 3;
  dustPositions[idx]     = r * Math.sin(phi) * Math.cos(theta);
  dustPositions[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
  dustPositions[idx + 2] = r * Math.cos(phi);

  dustVelocities[idx]     = (Math.random() - 0.5) * 0.03;
  dustVelocities[idx + 1] = (Math.random() - 0.5) * 0.03;
  dustVelocities[idx + 2] = (Math.random() - 0.5) * 0.03;
}

const dustGeometry = new THREE.BufferGeometry();
dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));

const dustMat = new THREE.PointsMaterial({
  color: 0x8A7A5A,
  size: 0.4,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.35
});

const dustField = new THREE.Points(dustGeometry, dustMat);
sceneGroup.add(dustField);

// ═════════════════════════════════════════════════════════════
// FRAME ANIMATION
// ═════════════════════════════════════════════════════════════

registerFrameCallback((elapsed, delta) => {
  // Star field rotation
  starField.rotation.y += 0.00006;
  starField.rotation.x += 0.000022;

  // Nebula drift
  for (let i = 0; i < nebulaData.length; i++) {
    const n = nebulaData[i];
    n.mesh.position.x += Math.cos(elapsed * n.driftSpeed + n.driftOffset) * 0.006;
    n.mesh.position.y += Math.sin(elapsed * n.driftSpeed * 0.6 + n.driftOffset) * 0.004;
  }

  // Geometric dust update
  const pos = dustGeometry.attributes.position.array;
  for (let i = 0; i < dustCount; i++) {
    const idx = i * 3;
    pos[idx]     += dustVelocities[idx];
    pos[idx + 1] += dustVelocities[idx + 1];
    pos[idx + 2] += dustVelocities[idx + 2];

    const dist = Math.sqrt(pos[idx] * pos[idx] + pos[idx + 1] * pos[idx + 1] + pos[idx + 2] * pos[idx + 2]);
    if (dist > dustRadius) {
      dustVelocities[idx]     *= -1;
      dustVelocities[idx + 1] *= -1;
      dustVelocities[idx + 2] *= -1;
    }
  }
  dustGeometry.attributes.position.needsUpdate = true;
});

// ═════════════════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════════════════

export { dustGeometry, dustPositions, dustVelocities };
