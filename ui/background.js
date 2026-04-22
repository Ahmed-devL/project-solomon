import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

// ═══════════════════════════════════════════════════════════════
// background.js — THE QUANTUM CITADEL (PROJECT SOLOMON · Phase 1)
// Palace architecture: floor, pillars, arches, shards, nebula, stars
// ═══════════════════════════════════════════════════════════════

import { scene, sceneGroup, registerFrameCallback } from './main.js';

// Master palace group — everything except stars lives here
const palaceGroup = new THREE.Group();
sceneGroup.add(palaceGroup);

// Storage for animation references
const pillarCapitals = [];
const pillarGlowLights = [];
const shardData = [];
const nebulaPlanes = [];
const pillarWorldPositions = [];

// Palace clockwork state (tweened by activatePalaceClockwork)
const palaceState = { rotationSpeed: 0.00015 };

// ═════════════════════════════════════════════════════════════
// LAYER 1 — THE GRAND FLOOR
// ═════════════════════════════════════════════════════════════

function createFloor() {
  // Procedural floor pattern via CanvasTexture (2048×2048)
  const size = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  // Background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);

  const strokeColor = 'rgba(201, 168, 76, 0.15)';
  ctx.strokeStyle = strokeColor;

  // 12 concentric circles (spacing 80px)
  ctx.lineWidth = 0.5;
  for (let i = 1; i <= 12; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, i * 80, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 8 radial lines from center to edge
  ctx.lineWidth = 0.3;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * size, cy + Math.sin(angle) * size);
    ctx.stroke();
  }

  // Outer octagon
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const octRadius = 960;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 8;
    const px = cx + Math.cos(angle) * octRadius;
    const py = cy + Math.sin(angle) * octRadius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();

  // 4 intersecting diagonal lines creating a large X
  ctx.lineWidth = 0.3;
  // Diagonal 1: top-left to bottom-right
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size, size);
  ctx.stroke();
  // Diagonal 2: top-right to bottom-left
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(0, size);
  ctx.stroke();
  // Diagonal 3: mid-left to mid-right (horizontal cross)
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(size, cy);
  ctx.stroke();
  // Diagonal 4: mid-top to mid-bottom (vertical cross)
  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, size);
  ctx.stroke();

  const floorTexture = new THREE.CanvasTexture(canvas);
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;

  const floorGeo = new THREE.PlaneGeometry(1200, 1200);
  const floorMat = new THREE.MeshPhysicalMaterial({
    color: 0x080818,
    metalness: 0.95,
    roughness: 0.05,
    reflectivity: 1.0,
    envMapIntensity: 2.0,
    opacity: 0.85,
    transparent: true,
    map: floorTexture
  });

  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -130, -100);
  floor.receiveShadow = true;
  palaceGroup.add(floor);
}

// ═════════════════════════════════════════════════════════════
// LAYER 2 — THE EIGHT PILLARS
// ═════════════════════════════════════════════════════════════

function createPillars() {
  const pillarCount = 8;
  const octagonRadius = 220;

  for (let i = 0; i < pillarCount; i++) {
    const angle = (i / pillarCount) * Math.PI * 2;
    const x = Math.cos(angle) * octagonRadius;
    const z = Math.sin(angle) * octagonRadius - 80;

    const pillarGroup = new THREE.Group();
    pillarGroup.position.set(x, -130, z);

    // ── SHAFT ──────────────────────────────────────────────
    const shaftGeo = new THREE.CylinderGeometry(2.5, 4.0, 420, 6);
    const shaftMat = new THREE.MeshPhysicalMaterial({
      color: 0x0A1428,
      emissive: 0x0A1428,
      emissiveIntensity: 0.2,
      metalness: 0.9,
      roughness: 0.05,
      transmission: 0.7,
      thickness: 8.0,
      ior: 1.65,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      envMapIntensity: 3.5,
      opacity: 0.55,
      transparent: true
    });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.y = 210; // base at group origin (floor level)
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    pillarGroup.add(shaft);

    // ── WIREFRAME OVERLAY ──────────────────────────────────
    const wireGeo = new THREE.EdgesGeometry(shaftGeo);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x3A5A9A,
      opacity: 0.25,
      transparent: true
    });
    const wireframe = new THREE.LineSegments(wireGeo, wireMat);
    wireframe.position.y = 210;
    pillarGroup.add(wireframe);

    // ── CAPITAL (top ornament) ─────────────────────────────
    const capitalGeo = new THREE.OctahedronGeometry(8, 0);
    const capitalMat = new THREE.MeshPhysicalMaterial({
      color: 0x0A1428,
      metalness: 0.9,
      roughness: 0.05,
      transmission: 0.7,
      thickness: 8.0,
      ior: 1.65,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      envMapIntensity: 3.5,
      opacity: 0.4,
      transparent: true
    });
    const capital = new THREE.Mesh(capitalGeo, capitalMat);
    capital.position.y = 420; // top of shaft
    pillarGroup.add(capital);
    pillarCapitals.push(capital);

    // ── PILLAR INNER GLOW ──────────────────────────────────
    const glowLight = new THREE.PointLight(0xC9A84C, 0.4, 80);
    glowLight.position.y = 210; // mid-shaft
    pillarGroup.add(glowLight);
    pillarGlowLights.push(glowLight);

    palaceGroup.add(pillarGroup);

    // Store world position for getPillarPositions()
    pillarWorldPositions.push(new THREE.Vector3(x, -130, z));
  }
}

// ═════════════════════════════════════════════════════════════
// LAYER 3 — THE GRAND ARCHES
// ═════════════════════════════════════════════════════════════

const archMeshes = [];

function createArches() {
  for (let i = 0; i < 4; i++) {
    const archGeo = new THREE.TorusGeometry(180, 3.5, 4, 32);
    // Render only the top half (arch)
    archGeo.setDrawRange(0, archGeo.index.count / 2);

    const archMat = new THREE.MeshPhysicalMaterial({
      color: 0x080C20,
      metalness: 0.85,
      roughness: 0.1,
      transmission: 0.6,
      thickness: 12.0,
      ior: 1.8,
      clearcoat: 1.0,
      envMapIntensity: 4.0,
      opacity: 0.35,
      transparent: true
    });

    const arch = new THREE.Mesh(archGeo, archMat);
    arch.position.y = 60;
    arch.position.z = (i % 2 === 0) ? -100 : -160;

    // Each arch faces a different direction with slight randomness
    const randomOffset = (Math.random() - 0.5) * 0.3; // ±0.15 rad
    arch.rotation.y = (i * Math.PI / 2) + randomOffset;

    // ── WIREFRAME OVERLAY ──────────────────────────────────
    const edgesGeo = new THREE.EdgesGeometry(archGeo);
    const edgesMat = new THREE.LineBasicMaterial({
      color: 0x5A7AC8,
      opacity: 0.3,
      transparent: true
    });
    const wireframe = new THREE.LineSegments(edgesGeo, edgesMat);
    arch.add(wireframe);

    palaceGroup.add(arch);
    archMeshes.push(arch);
  }
}

// ═════════════════════════════════════════════════════════════
// LAYER 4 — THE FLOATING CRYSTAL SHARDS
// ═════════════════════════════════════════════════════════════

function createShards() {
  const shardColors = [0x0A1428, 0x0D0A20, 0x080C18];
  const shardCount = 22;

  for (let i = 0; i < shardCount; i++) {
    // Random geometry choice
    const radius = 4 + Math.random() * 14;
    const geo = Math.random() > 0.5
      ? new THREE.OctahedronGeometry(radius, 0)
      : new THREE.TetrahedronGeometry(radius, 0);

    const mat = new THREE.MeshPhysicalMaterial({
      color: shardColors[Math.floor(Math.random() * shardColors.length)],
      metalness: 0.7,
      roughness: 0.0,
      transmission: 0.5 + Math.random() * 0.35,
      thickness: 3 + Math.random() * 5,
      ior: 1.5 + Math.random() * 0.6,
      clearcoat: 1.0,
      envMapIntensity: 3.0,
      opacity: 0.2 + Math.random() * 0.35,
      transparent: true
    });

    const shard = new THREE.Mesh(geo, mat);
    shard.position.set(
      (Math.random() - 0.5) * 360,   // X: -180 to +180
      -80 + Math.random() * 280,      // Y: -80 to +200
      -100 - Math.random() * 280      // Z: -100 to -380
    );

    // Random initial rotation
    shard.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    palaceGroup.add(shard);

    // Store animation parameters
    shardData.push({
      mesh: shard,
      driftSpeed: 0.00008 + Math.random() * 0.00022,
      driftAxis: new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize(),
      floatOffset: Math.random() * Math.PI * 2,
      floatSpeed: 0.0003 + Math.random() * 0.0005,
      floatAmplitude: 3 + Math.random() * 9,
      baseY: shard.position.y
    });
  }
}

// ═════════════════════════════════════════════════════════════
// LAYER 5 — NEBULA ATMOSPHERE
// ═════════════════════════════════════════════════════════════

function createNebulaTexture(centerColor) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, centerColor);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

function createNebulaPlanes() {
  // Configuration: [centerColor, position, rotation, opacity]
  const configs = [
    // Cold ceiling/walls (planes 1-3)
    {
      color: 'rgba(10, 14, 42, 0.8)',
      pos: [0, 160, -200],
      rot: [-70 * Math.PI / 180, 0, 0],
      opacity: 0.08
    },
    {
      color: 'rgba(26, 16, 64, 0.8)',
      pos: [0, 0, -300],
      rot: [0, 0, 0],
      opacity: 0.06
    },
    {
      color: 'rgba(10, 14, 42, 0.7)',
      pos: [0, -60, -180],
      rot: [20 * Math.PI / 180, 15 * Math.PI / 180, 0],
      opacity: 0.07
    },
    // Inner warm (planes 4-6)
    {
      color: 'rgba(26, 12, 0, 0.8)',
      pos: [0, 80, -120],
      rot: [-45 * Math.PI / 180, -20 * Math.PI / 180, 0],
      opacity: 0.10
    },
    {
      color: 'rgba(26, 12, 0, 0.6)',
      pos: [0, 40, -260],
      rot: [10 * Math.PI / 180, 35 * Math.PI / 180, 0],
      opacity: 0.05
    },
    {
      color: 'rgba(26, 12, 0, 0.7)',
      pos: [0, -40, -150],
      rot: [30 * Math.PI / 180, -40 * Math.PI / 180, 0],
      opacity: 0.07
    }
  ];

  configs.forEach((cfg, i) => {
    const texture = createNebulaTexture(cfg.color);
    const geo = new THREE.PlaneGeometry(350, 350);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      opacity: cfg.opacity,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const plane = new THREE.Mesh(geo, mat);
    plane.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
    plane.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);

    palaceGroup.add(plane);

    nebulaPlanes.push({
      mesh: plane,
      speed: 0.02 + i * 0.008,
      offset: i * 1.3
    });
  });
}

// ═════════════════════════════════════════════════════════════
// LAYER 6 — BACKGROUND STAR FIELD
// ═════════════════════════════════════════════════════════════

let starField = null;

function createStarField() {
  const starCount = 6000;
  const positions = new Float32Array(starCount * 3);
  const radius = 800;

  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const idx = i * 3;
    positions[idx] = radius * Math.sin(phi) * Math.cos(theta);
    positions[idx + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[idx + 2] = radius * Math.cos(phi);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xC8D4E8,
    size: 0.8,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.7
  });

  starField = new THREE.Points(geo, mat);

  // Add directly to scene (not sceneGroup) — infinite backdrop,
  // unaffected by palace rotation
  scene.add(starField);
}

// ═════════════════════════════════════════════════════════════
// CONSTRUCTION
// ═════════════════════════════════════════════════════════════

createFloor();
createPillars();
createArches();
createShards();
createNebulaPlanes();
createStarField();

// ═════════════════════════════════════════════════════════════
// FRAME ANIMATION
// ═════════════════════════════════════════════════════════════

registerFrameCallback((elapsed, delta) => {
  // Palace clockwork — slow overall rotation
  palaceGroup.rotation.y += palaceState.rotationSpeed;

  // Pillar capitals — slow individual rotation
  for (let i = 0; i < pillarCapitals.length; i++) {
    pillarCapitals[i].rotation.y += 0.002;
  }

  // Arch oscillation
  for (let i = 0; i < archMeshes.length; i++) {
    archMeshes[i].rotation.z = Math.sin(elapsed * 0.08 + i * 0.8) * 0.015;
  }

  // Shard drift and float
  for (let i = 0; i < shardData.length; i++) {
    const s = shardData[i];
    s.mesh.rotation.x += s.driftSpeed * Math.sin(elapsed * 0.5 + i);
    s.mesh.rotation.y += s.driftSpeed;
    s.mesh.position.y = s.baseY +
      Math.sin(elapsed * s.floatSpeed + s.floatOffset) * s.floatAmplitude * 0.001;
  }

  // Nebula drift — unique slow elliptical paths
  for (let i = 0; i < nebulaPlanes.length; i++) {
    const n = nebulaPlanes[i];
    n.mesh.position.x += Math.cos(elapsed * n.speed + n.offset) * 0.008;
    n.mesh.position.y += Math.sin(elapsed * n.speed * 0.7 + n.offset) * 0.005;
  }

  // Star field — slow independent rotation
  if (starField) {
    starField.rotation.y += 0.00006;
    starField.rotation.x += 0.000025;
  }
});

// ═════════════════════════════════════════════════════════════
// PALACE CLOCKWORK STATE (called by summon.js in Phase 3)
// ═════════════════════════════════════════════════════════════

function activatePalaceClockwork() {
  const gsapRef = window.gsap;
  if (!gsapRef) return;

  // Speed up palace rotation
  gsapRef.to(palaceState, {
    rotationSpeed: 0.0004,
    duration: 3,
    ease: 'power2.inOut'
  });

  // Intensify pillar inner glows with stagger
  pillarGlowLights.forEach((light, i) => {
    gsapRef.to(light, {
      intensity: 0.9,
      duration: 2,
      delay: i * 0.2,
      ease: 'power2.out'
    });
  });

  // Brighten crystal shards
  shardData.forEach((s, i) => {
    gsapRef.to(s.mesh.material, {
      opacity: Math.min(s.mesh.material.opacity + 0.15, 1.0),
      duration: 2,
      delay: i * 0.05,
      ease: 'power2.out'
    });
  });
}

// ═════════════════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════════════════

function getPillarPositions() {
  return pillarWorldPositions.slice(); // defensive copy
}

export { palaceGroup, getPillarPositions, activatePalaceClockwork };
