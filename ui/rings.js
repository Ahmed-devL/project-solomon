import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { scene, sceneGroup, camera, registerFrameCallback } from './main.js';

// ═══════════════════════════════════════════════════════════════
// rings.js — THE 10 RINGS (PROJECT SOLOMON · Phase 3)
// ═══════════════════════════════════════════════════════════════

const gsap = window.gsap;
const DEG = Math.PI / 180;

export const rings = [];
export const ringDict = {};

const SPECS = [
  { id: 'almadel', name: 'Ars Almadel', domain: 'Voice and Listening',
    radius: 28, tube: 0.6, tiltX: 70, tiltY: 15, orbitSpeed: 0.008,
    color: '#D4845A', emissive: '#8A3A10', peakEmissive: 4.0,
    metalness: 0.7, roughness: 0.15, clearcoat: 1.0 },
  { id: 'notoria', name: 'Ars Notoria', domain: 'Memory and Recall',
    radius: 34, tube: 0.5, tiltX: 65, tiltY: -20, orbitSpeed: 0.006,
    color: '#C9D4A8', emissive: '#606B30', peakEmissive: 5.0,
    metalness: 0.4, roughness: 0.2, transmission: 0.3 },
  { id: 'paulina', name: 'Ars Paulina', domain: 'Browser and Automation',
    radius: 40, tube: 0.6, tiltX: 75, tiltY: 30, orbitSpeed: 0.005,
    activeOrbitSpeed: 0.022,
    color: '#5AB8D4', emissive: '#1A5A70', peakEmissive: 4.5,
    metalness: 0.6, roughness: 0.1, clearcoat: 0.8 },
  { id: 'goetia', name: 'Ars Goetia', domain: 'Inference and Reasoning',
    radius: 46, tube: 0.7, tiltX: 80, tiltY: -10, orbitSpeed: 0.007,
    activeOrbitSpeed: 0.014,
    color: '#9B7FD4', emissive: '#4A2A8A', peakEmissive: 5.5,
    metalness: 0.8, roughness: 0.1, clearcoat: 1.0, transmission: 0.15 },
  { id: 'theurgia', name: 'Ars Theurgia', domain: 'System Awareness',
    radius: 52, tube: 0.55, tiltX: 60, tiltY: 45, orbitSpeed: 0.004,
    color: '#5AB87A', emissive: '#2A6A3A', peakEmissive: 6.0,
    metalness: 0.6, roughness: 0.15, alwaysVisible: true },
  { id: 'almiras', name: 'Ars Almiras', domain: 'Biometric Gate',
    radius: 58, tube: 0.65, tiltX: 85, tiltY: -35, orbitSpeed: 0.006,
    color: '#D45A5A', emissive: '#6A1A1A', idleEmissive: 0.8,
    metalness: 0.9, roughness: 0.1 },
  { id: 'verum', name: 'Ars Verum', domain: 'File and Knowledge',
    radius: 64, tube: 0.6, tiltX: 70, tiltY: 55, orbitSpeed: 0.005,
    activeOrbitSpeed: -0.003,
    color: '#C9A87A', emissive: '#6A4A20', peakEmissive: 3.5,
    metalness: 0.75, roughness: 0.25 },
  { id: 'ephesia', name: 'Ars Ephesia', domain: 'Network and Fetch',
    radius: 70, tube: 0.55, tiltX: 65, tiltY: -50, orbitSpeed: 0.009,
    color: '#5A8AD4', emissive: '#1A3A7A', peakEmissive: 4.0,
    metalness: 0.5, roughness: 0.15, transmission: 0.2 },
  { id: 'fulcanelli', name: 'Ars Fulcanelli', domain: 'Task Orchestration',
    radius: 76, tube: 0.7, tiltX: 75, tiltY: 10, orbitSpeed: 0.006,
    color: '#D4975A', emissive: '#7A3A05', peakEmissive: 5.0,
    metalness: 0.85, roughness: 0.1 },
  { id: 'regalis', name: 'Ars Regalis', domain: 'Master Control',
    radius: 82, tube: 1.0, tiltX: 60, tiltY: 0, orbitSpeed: 0.002,
    color: '#C9A84C', emissive: '#8A6010', idleEmissive: 2.5,
    metalness: 1.0, roughness: 0.05, clearcoat: 1.0, hasInnerCrown: true }
];

// ═════════════════════════════════════════════════════════════
// RING CONSTRUCTION
// ═════════════════════════════════════════════════════════════

SPECS.forEach(spec => {
  const geo = new THREE.TorusGeometry(spec.radius, spec.tube, 8, 128);
  const matProps = {
    color: spec.color,
    emissive: spec.emissive,
    emissiveIntensity: spec.idleEmissive ?? 0.3,
    metalness: spec.metalness,
    roughness: spec.roughness,
    transparent: true,
    opacity: 0,
    envMapIntensity: 3.5,
    clearcoat: spec.clearcoat ?? 1.0,
    clearcoatRoughness: 0.05
  };
  if (spec.transmission !== undefined) {
    matProps.transmission = spec.transmission;
    matProps.ior = 1.72;
  }
  const mat = new THREE.MeshPhysicalMaterial(matProps);

  const group = new THREE.Group();
  const mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);
  group.rotateX(spec.tiltX * DEG);
  group.rotateY(spec.tiltY * DEG);
  group.scale.set(0.01, 0.01, 0.01);
  sceneGroup.add(group);

  const entry = { id: spec.id, name: spec.name, domain: spec.domain,
                   group, mesh, material: mat, spec, active: false };

  // Theurgia: always visible
  if (spec.alwaysVisible) {
    mat.opacity = 0.7;
    group.scale.set(1, 1, 1);
  }

  // Regalis: inner crown ring
  if (spec.hasInnerCrown) {
    const innerGeo = new THREE.TorusGeometry(82, 0.2, 8, 128);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xC9A84C, transparent: true, opacity: 0.5
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    group.add(innerMesh);
    entry.innerMesh = innerMesh;
  }

  rings.push(entry);
  ringDict[spec.id] = entry;
});

// ═════════════════════════════════════════════════════════════
// THEURGIA COLOR SYSTEM
// ═════════════════════════════════════════════════════════════

function updateTheurgia(r, elapsed) {
  const load = window.solomonState?.rings?.theurgia?.load ?? 0.12;
  const color = new THREE.Color();

  if (load < 0.4) {
    color.lerpColors(new THREE.Color('#5AB87A'), new THREE.Color('#A8C94C'), load / 0.4);
  } else if (load < 0.7) {
    color.lerpColors(new THREE.Color('#A8C94C'), new THREE.Color('#D4975A'), (load - 0.4) / 0.3);
  } else if (load < 0.9) {
    color.lerpColors(new THREE.Color('#D4975A'), new THREE.Color('#D45A5A'), (load - 0.7) / 0.2);
  } else {
    color.set('#D45A5A');
    r.material.emissiveIntensity = 6.0;
  }

  r.material.color.set(color);
  r.material.emissive.set(color);
}

// ═════════════════════════════════════════════════════════════
// PER-FRAME ANIMATION
// ═════════════════════════════════════════════════════════════

registerFrameCallback((elapsed, delta) => {
  rings.forEach(r => {
    r.mesh.rotation.z += r.spec.orbitSpeed;

    if (r.id === 'theurgia') {
      updateTheurgia(r, elapsed);
    }

    if (r.id === 'regalis' && r.innerMesh) {
      r.innerMesh.rotation.z -= 0.001;
    }
  });
});

// ═════════════════════════════════════════════════════════════
// RAYCASTING — HOVER EFFECTS
// ═════════════════════════════════════════════════════════════

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const raycastTargets = rings.map(r => r.mesh);
let hoveredRing = null;

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(raycastTargets);

  const hitRing = intersects.length > 0
    ? rings.find(r => r.mesh === intersects[0].object)
    : null;

  if (hitRing && hitRing !== hoveredRing) {
    // Leave previous
    if (hoveredRing) onRingLeave(hoveredRing);
    hoveredRing = hitRing;
    onRingEnter(hitRing, e);
  } else if (!hitRing && hoveredRing) {
    onRingLeave(hoveredRing);
    hoveredRing = null;
  }

  // Update tooltip position
  if (hoveredRing) {
    const tooltip = document.getElementById('ring-tooltip');
    if (tooltip) {
      tooltip.style.left = (e.clientX + 12) + 'px';
      tooltip.style.top = (e.clientY + 12) + 'px';
    }
  }
});

function onRingEnter(r, e) {
  if (!gsap) return;

  // Emissive boost
  gsap.to(r.material, {
    emissiveIntensity: (r.spec.peakEmissive ?? 4.0) * 1.3,
    duration: 0.3
  });

  // Scale pop
  gsap.to(r.group.scale, {
    x: 1.05, y: 1.05, z: 1.05,
    duration: 0.3
  });

  // Ripple effect
  const rippleGeo = new THREE.TorusGeometry(r.spec.radius, r.spec.tube * 0.8, 4, 64);
  const rippleMat = new THREE.MeshBasicMaterial({
    color: 0xC9A84C, transparent: true, opacity: 0.5
  });
  const ripple = new THREE.Mesh(rippleGeo, rippleMat);
  ripple.rotation.copy(r.group.rotation);
  sceneGroup.add(ripple);

  gsap.to(ripple.scale, {
    x: 2.2, y: 2.2, z: 2.2,
    duration: 0.8,
    ease: 'power2.out'
  });
  gsap.to(rippleMat, {
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out',
    onComplete: () => {
      sceneGroup.remove(ripple);
      rippleGeo.dispose();
      rippleMat.dispose();
    }
  });

  // Tooltip
  const tooltip = document.getElementById('ring-tooltip');
  if (tooltip) {
    tooltip.innerHTML = `<strong>${r.name}</strong><br><span>${r.domain}</span>`;
    tooltip.style.left = (e.clientX + 12) + 'px';
    tooltip.style.top = (e.clientY + 12) + 'px';
    gsap.to(tooltip, { opacity: 1, duration: 0.2 });
  }
}

function onRingLeave(r) {
  if (!gsap) return;

  gsap.to(r.material, {
    emissiveIntensity: r.spec.idleEmissive ?? 0.3,
    duration: 0.3
  });

  gsap.to(r.group.scale, {
    x: 1, y: 1, z: 1,
    duration: 0.3
  });

  const tooltip = document.getElementById('ring-tooltip');
  if (tooltip) {
    gsap.to(tooltip, { opacity: 0, duration: 0.2 });
  }
}

// ═════════════════════════════════════════════════════════════
// STATE FUNCTIONS
// ═════════════════════════════════════════════════════════════

export function updateRegalis() {
  const anyActive = rings.some(r => r.active);
  const target = ringDict['regalis'];
  if (!target || !gsap) return;
  gsap.to(target.material, {
    emissiveIntensity: anyActive ? 1.8 : 2.5,
    duration: 1.2
  });
}

export function applyRingState() {
  rings.forEach(r => {
    const s = window.solomonState?.rings?.[r.id];
    if (!s || !gsap) return;
    r.active = s.active;
    if (s.active) {
      gsap.to(r.material, {
        emissiveIntensity: r.spec.peakEmissive ?? 4.0,
        opacity: 1.0,
        duration: 0.6
      });
    } else {
      gsap.to(r.material, {
        emissiveIntensity: r.spec.idleEmissive ?? 0.3,
        opacity: 0.6,
        duration: 0.6
      });
    }
    updateRegalis();
  });
}
