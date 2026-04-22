import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { ringDict, rings, updateRegalis, applyRingState } from './rings.js';
import { forgeLight } from './sigil.js';

// ═══════════════════════════════════════════════════════════════
// state.js — SOLOMON STATE MACHINE (PROJECT SOLOMON · Phase 3)
// ═══════════════════════════════════════════════════════════════

const gsap = window.gsap;

export const solomonState = {
  rings: {
    almadel:    { active: false },
    notoria:    { active: false },
    paulina:    { active: false },
    goetia:     { active: false },
    theurgia:   { active: true, load: 0.12 },
    almiras:    { active: false, status: 'idle' },
    verum:      { active: false },
    ephesia:    { active: false },
    fulcanelli: { active: false, chaos: 0 },
    regalis:    { active: true }
  },
  statusText: 'Awaiting Command.',
  view: 'presence',

  update(payload) {
    Object.assign(this.rings, payload.rings || {});
    if (payload.statusText) this.setStatus(payload.statusText);
    applyRingState();
  },

  biometricSuccess() {
    const r = ringDict['almiras'];
    if (!r || !gsap) return;
    gsap.timeline()
      .to(r.material.color, {
        r: 0.35, g: 0.86, b: 0.54, duration: 0.3
      })
      .to(r.material, {
        emissiveIntensity: 6.0, duration: 0.3
      }, 0)
      .to(r.material.color, {
        r: 0.83, g: 0.35, b: 0.35, duration: 0.5, delay: 2.0
      })
      .to(r.material, {
        emissiveIntensity: 0.8, duration: 0.5
      }, '-=0.5');
  },

  biometricFail() {
    const r = ringDict['almiras'];
    if (!r || !gsap) return;
    gsap.timeline()
      .to(r.material.color, {
        r: 1.0, g: 0.12, b: 0.12, duration: 0.1
      })
      .to(r.material, {
        emissiveIntensity: 8.0, duration: 0.1
      }, 0)
      .to(r.group.position, { x: -8, duration: 0.05 })
      .to(r.group.position, { x: 8, duration: 0.05 })
      .to(r.group.position, { x: -6, duration: 0.05 })
      .to(r.group.position, { x: 6, duration: 0.05 })
      .to(r.group.position, { x: -3, duration: 0.05 })
      .to(r.group.position, { x: 3, duration: 0.05 })
      .to(r.group.position, { x: 0, duration: 0.05 })
      .to(r.material.color, {
        r: 0.83, g: 0.35, b: 0.35, duration: 0.5, delay: 2.0
      })
      .to(r.material, {
        emissiveIntensity: 0.8, duration: 0.5
      }, '-=0.5');
  },

  updateSystemLoad(pct) {
    if (this.rings.theurgia) {
      this.rings.theurgia.load = pct;
    }
  },

  updateChaos(level) {
    if (this.rings.fulcanelli) {
      this.rings.fulcanelli.chaos = level;
    }
    const r = ringDict['fulcanelli'];
    if (!r) return;
    r.spec.orbitSpeed = 0.006 + (level * 0.025);
    if (level >= 1.0 && gsap) {
      gsap.to(r.material, {
        emissiveIntensity: 8.0, duration: 0.3
      });
    }
  },

  setStatus(text) {
    this.statusText = text;
    const el = document.getElementById('status-line');
    if (el) el.textContent = text;
  },

  switchView(v) {
    this.view = v;
    const chatLog = document.getElementById('chat-log');
    const nameEl = document.getElementById('solomon-name');
    const statusEl = document.getElementById('status-line');

    if (v === 'dialogue') {
      if (window.__solomon?.sceneGroup) {
        gsap.to(window.__solomon.sceneGroup.scale, {
          x: 0.28, y: 0.28, z: 0.28,
          duration: 0.8, ease: 'cubic.inOut'
        });
        gsap.to(window.__solomon.sceneGroup.position, {
          y: 80, duration: 0.8, ease: 'cubic.inOut'
        });
      }
      if (nameEl) gsap.to(nameEl, { opacity: 0, duration: 0.4 });
      if (statusEl) gsap.to(statusEl, { opacity: 0, duration: 0.4 });
      if (chatLog) {
        chatLog.style.pointerEvents = 'auto';
        gsap.to(chatLog, { opacity: 1, duration: 0.8 });
        if (!chatLog.dataset.initialized) {
          chatLog.dataset.initialized = 'true';
          chatLog.innerHTML =
            '<div class="msg-solomon">' +
            '<span class="msg-label">SOLOMON</span>' +
            '<p class="msg-text">You have called, and I ' +
            'have answered. The rings are bound. The seal ' +
            'is drawn. What would you have of me?</p>' +
            '</div>';
        }
      }
    } else {
      if (window.__solomon?.sceneGroup) {
        gsap.to(window.__solomon.sceneGroup.scale, {
          x: 1, y: 1, z: 1,
          duration: 0.8, ease: 'cubic.inOut'
        });
        gsap.to(window.__solomon.sceneGroup.position, {
          y: 0, duration: 0.8, ease: 'cubic.inOut'
        });
      }
      if (nameEl) gsap.to(nameEl, { opacity: 1, duration: 0.4 });
      if (statusEl) gsap.to(statusEl, { opacity: 1, duration: 0.4 });
      if (chatLog) {
        chatLog.style.pointerEvents = 'none';
        gsap.to(chatLog, { opacity: 0, duration: 0.4 });
      }
    }
  }
};

window.solomonState = solomonState;
