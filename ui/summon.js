import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { scene, sceneGroup } from './main.js';
import { rings, ringDict } from './rings.js';
import { sigilGroup, forgeLight, filaments } from './sigil.js';

// ═══════════════════════════════════════════════════════════════
// summon.js — EXPLOSIVE ENTRANCE (PROJECT SOLOMON · Phase 3)
// ═══════════════════════════════════════════════════════════════

export function runSummonSequence() {
  const gsap = window.gsap;
  if (!gsap) return;

  const tl = gsap.timeline({ delay: 0.5 });

  // ─── PHASE A: SHOCKWAVE BURST ──────────────────────────────
  rings.forEach((r, i) => {
    if (r.spec.alwaysVisible) return; // theurgia already visible

    const burstDelay = i * 0.04;

    tl.to(r.group.scale, {
      x: 1.4, y: 1.4, z: 1.4,
      duration: 0.35,
      ease: 'power4.out',
      delay: burstDelay
    }, 0)

    .to(r.material, {
      opacity: 0.9,
      duration: 0.25,
      ease: 'power3.out',
      delay: burstDelay
    }, 0)

    // ─── PHASE B: SETTLE ───────────────────────────────────────
    .to(r.group.scale, {
      x: 1.0, y: 1.0, z: 1.0,
      duration: 0.5,
      ease: 'elastic.out(1.2, 0.5)',
      delay: burstDelay + 0.35
    }, 0);
  });

  // ─── PHASE C: SHOCKWAVE RING ─────────────────────────────────
  const shockGeo = new THREE.TorusGeometry(5, 0.5, 4, 64);
  const shockMat = new THREE.MeshBasicMaterial({
    color: '#F0D060',
    transparent: true,
    opacity: 0.8
  });
  const shockwave = new THREE.Mesh(shockGeo, shockMat);
  shockwave.rotation.x = Math.PI / 2;
  sceneGroup.add(shockwave);

  tl.to(shockwave.scale, {
    x: 25, y: 25, z: 25,
    duration: 1.2,
    ease: 'power2.out'
  }, 0)
  .to(shockMat, {
    opacity: 0,
    duration: 1.2,
    ease: 'power2.in',
    onComplete: () => {
      sceneGroup.remove(shockwave);
      shockGeo.dispose();
      shockMat.dispose();
    }
  }, 0);

  // ─── PHASE D: SIGIL PULSE ────────────────────────────────────
  tl.to(forgeLight, {
    intensity: 18.0,
    duration: 0.15,
    ease: 'power4.out'
  }, 0)
  .to(forgeLight, {
    intensity: 7.0,
    duration: 0.8,
    ease: 'power2.out'
  }, 0.15);

  // ─── PHASE E: NAME FADE IN ───────────────────────────────────
  tl.call(() => {
    const nameEl = document.getElementById('solomon-name');
    const statusEl = document.getElementById('status-line');
    if (nameEl) gsap.to(nameEl, { opacity: 1, duration: 0.8 });
    if (statusEl) {
      statusEl.textContent = 'I am here.';
      gsap.to(statusEl, { opacity: 1, duration: 0.6 });
      setTimeout(() => {
        statusEl.textContent = 'Awaiting Command.';
      }, 2000);
    }
  }, [], '+=0.4');

  return tl;
}
