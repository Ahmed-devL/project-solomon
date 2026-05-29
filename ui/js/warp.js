/* ═══════════════════════════════════════════════════════════════════════════
   SOLOMON — Warp Transition System (Ars Almadel Invocation Space)

   Triggered by clicking the red Ars Almadel ring (RING_DATA index 0).
   Implements a cinematic warp-out into an isolated invocation space and
   a warp-in return to the normal orbit view.

   Architecture rules obeyed:
   ─ No new requestAnimationFrame calls. Per-frame logic chains via
     window.solomonPhase3Update (itself wired into the Composer Patch).
   ─ DOM injection follows the Phase 2 halo pattern: create once, destroy
     completely on warp-in completion.
   ─ Camera NEVER moves. All transitions scale 3D objects in world space.
   ─ Background (nebula, stars, particles) stays completely untouched.
   ─ Loaded after phase3.js in index.html. Runs inside its own IIFE.
   ─ Three.js r128 only — no post-r128 geometry or APIs used.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── 1. DEPENDENCY GUARD ───────────────────────────────────────────────
  var required = [
    'solomonRenderer', 'solomonComposer', 'solomonRings',
    'solomonCamera',   'solomonScene',    'solomonSigilGroup',
    'solomonSendRingToSigil', 'solomonReturnRingToOrigin',
    'solomonPhase3Update',
  ];
  var missing = required.filter(function (k) { return !window[k]; });
  if (missing.length) {
    console.error(
      '[Solomon Warp] Missing globals: ' + missing.join(', ') + '. ' +
      'Ensure phase1.js, phase2.js, and phase3.js are fully loaded first.'
    );
    throw new Error('[Solomon Warp] Aborting — prerequisites not met.');
  }
  console.log('[Solomon Warp] Prerequisites confirmed. Initializing warp system.');

  // ── 2. ALIASES ────────────────────────────────────────────────────────
  var camera   = window.solomonCamera;
  var scene    = window.solomonScene;
  var rings    = window.solomonRings;

  // ── 3. STATE ──────────────────────────────────────────────────────────
  window.solomonWarpActive = false;   // public — checked by phase3 click handler
  var isWarping            = false;   // guard against re-entrant triggers
  var warpLateralSpin      = false;   // drives per-frame Y-axis spin in invocation space
  var WARP_RING_SCALE      = 1.75;    // how large Almadel becomes in invocation space

  // ── 5. DOM ELEMENT REFS ───────────────────────────────────────────────
  // These are null until first warp-out and nulled again after warp-in
  // destruction. Never recreated after destroy if warpStyleEl already exists.
  var inputContainer = null;
  var glowBackdrop   = null;
  var textArea       = null;
  var warpStyleEl    = null;  // injected once, lives for the session

  // ── 6. CSS INJECTION (idempotent — runs once per session) ─────────────
  function injectStyles() {
    if (warpStyleEl) return;
    warpStyleEl = document.createElement('style');
    warpStyleEl.id = 'solomon-warp-styles';
    warpStyleEl.textContent = [
      /* ── Ambient glow behind the input panel ── */
      '#solomon-glow-backdrop {',
      '  position: fixed;',
      '  width: 600px;',
      '  height: 200px;',
      '  top: 62%;',
      '  left: 50%;',
      '  pointer-events: none;',
      '  z-index: 8;',
      '  background: radial-gradient(',
      '    ellipse at center,',
      '    rgba(200, 160, 80, 0.12) 0%,',
      '    transparent 70%',
      '  );',
      '}',
      '',
      /* ── Frosted glass input panel ── */
      '#solomon-input-container {',
      '  position: fixed;',
      '  top: 62%;',
      '  left: 50%;',
      '  width: 480px;',
      '  min-height: 56px;',
      '  background: rgba(30, 28, 40, 0.72);',
      '  border: 1px solid rgba(180, 140, 100, 0.25);',
      '  border-radius: 14px;',
      '  backdrop-filter: blur(12px);',
      '  -webkit-backdrop-filter: blur(12px);',
      '  padding: 16px 20px;',
      '  font-family: \'Cormorant Garamond\', serif;',
      '  font-size: 16px;',
      '  color: rgba(230, 220, 210, 0.9);',
      '  z-index: 9;',
      '  pointer-events: auto;',
      '  box-sizing: border-box;',
      '}',
      '',
      /* ── Textarea inside the panel ── */
      '#solomon-input-container textarea {',
      '  background: none;',
      '  border: none;',
      '  outline: none;',
      '  resize: none;',
      '  overflow: hidden;',
      '  width: 100%;',
      '  min-height: 24px;',
      '  display: block;',
      '  font-family: \'Cormorant Garamond\', serif;',
      '  font-size: 16px;',
      '  color: rgba(230, 220, 210, 0.9);',
      '  field-sizing: content;',  /* modern auto-expand */
      '  caret-color: rgba(201, 147, 58, 0.8);',
      '  line-height: 1.5;',
      '}',
      '',
      '#solomon-input-container textarea::placeholder {',
      '  color: rgba(180, 160, 140, 0.4);',
      '}',
    ].join('\n');
    document.head.appendChild(warpStyleEl);
  }

  // ── 7. CREATE INVOCATION UI (idempotent — creates once per warp cycle) ─
  function createInvocationUI() {
    if (inputContainer) return;  // already exists, nothing to do

    injectStyles();

    // Glow backdrop — drifting amber nebula behind the panel
    glowBackdrop    = document.createElement('div');
    glowBackdrop.id = 'solomon-glow-backdrop';
    document.body.appendChild(glowBackdrop);

    // Frosted input panel
    inputContainer    = document.createElement('div');
    inputContainer.id = 'solomon-input-container';
    document.body.appendChild(inputContainer);

    // Textarea
    textArea             = document.createElement('textarea');
    textArea.placeholder = 'speak your invocation\u2026';
    textArea.rows        = 1;
    textArea.spellcheck  = false;

    // Auto-expand fallback for browsers that do not support field-sizing: content
    textArea.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = this.scrollHeight + 'px';
    });

    // Enter key: inert — no submit handler yet
    textArea.addEventListener('keydown', function (e) {
      // Intentionally empty — submission is a future feature
    });

    inputContainer.appendChild(textArea);

    // Set collapsed initial GSAP state (hidden, scaleY=0).
    // xPercent / yPercent own the centering transform so scaleY can run cleanly.
    gsap.set(glowBackdrop, {
      xPercent: -50,
      yPercent: -50,
      opacity:  0,
    });
    gsap.set(inputContainer, {
      xPercent:        -50,
      yPercent:        -50,
      scaleY:          0,
      opacity:         0,
      transformOrigin: 'top center',
    });
  }

  // ── 8. ANIMATE IN INVOCATION UI ───────────────────────────────────────
  function animateInUI() {
    if (!inputContainer) return;

    // Glow backdrop fades in
    gsap.to(glowBackdrop, { opacity: 1, duration: 0.5, ease: 'power1.out' });

    // Drift tweens: X and Y run at deliberately different durations so
    // the motion never feels mechanically periodic — like a nebula breathing.
    gsap.to(glowBackdrop, {
      x:        16,
      duration: 4.8,
      ease:     'sine.inOut',
      yoyo:     true,
      repeat:   -1,
    });
    gsap.to(glowBackdrop, {
      y:        -18,
      duration: 5.6,
      ease:     'sine.inOut',
      yoyo:     true,
      repeat:   -1,
    });

    // Panel unfolds from top center downward
    gsap.to(inputContainer, {
      scaleY:   1,
      opacity:  1,
      duration: 0.5,
      ease:     'power2.out',
      onComplete: function () {
        if (textArea) textArea.focus();
      },
    });
  }

  // ── 9. ANIMATE OUT INVOCATION UI ──────────────────────────────────────
  function animateOutUI(onComplete) {
    if (!inputContainer) {
      if (onComplete) onComplete();
      return;
    }

    // Kill the living drift tweens before reversing
    if (glowBackdrop) {
      gsap.killTweensOf(glowBackdrop);
      gsap.to(glowBackdrop, { opacity: 0, duration: 0.35, ease: 'power1.in' });
    }

    // Panel collapses upward — ring "inhales" it
    gsap.to(inputContainer, {
      scaleY:   0,
      opacity:  0,
      duration: 0.35,
      ease:     'power2.in',
      onComplete: onComplete || function () {},
    });
  }

  // ── 10. DESTROY INVOCATION UI (called at end of warp-in sequence) ─────
  // Removes DOM nodes entirely to clear any stale event listeners.
  function destroyInvocationUI() {
    if (glowBackdrop) {
      gsap.killTweensOf(glowBackdrop);
      if (glowBackdrop.parentNode) glowBackdrop.parentNode.removeChild(glowBackdrop);
    }
    if (inputContainer) {
      gsap.killTweensOf(inputContainer);
      if (inputContainer.parentNode) inputContainer.parentNode.removeChild(inputContainer);
    }
    glowBackdrop   = null;
    inputContainer = null;
    textArea       = null;
  }

  // ── 11. WARP OUT — inner function (pre-flight checks happen in warpOut) ─
  //
  // Choreography with HARD STOPS — nothing fires until the previous step completes:
  //   Step 1 → Ring flies to sigil and fully arrives
  //   Step 2 → Sigil group + rings 1-9 scale down to zero (shrink out of view)
  //   Step 3 → Ring enlarges to WARP_RING_SCALE, drifts to upper position, UI appears
  //
  function doWarpOut() {
    var r = rings[0];  // Ars Almadel
    var sigilGroup = window.solomonSigilGroup;

    // ─── STEP 1: Fly ring to sigil center ──────────────────────────────
    // Replicate sendRingToSigil logic directly so we own the onComplete.
    r.isTraveling = true;
    var innerHole   = r.spec.diameter - r.spec.tubeRadius;
    var targetScale = Math.min(1.4, Math.max(0.6, 50 / innerHole));

    gsap.to(r.group.position, { x: 0, y: 0, z: 40, duration: 1.2, ease: 'power2.inOut' });
    gsap.to(r.group.rotation, { x: 0, y: 0, duration: 1.2, ease: 'power2.inOut' });
    gsap.to(r.group.scale, {
      x: targetScale, y: targetScale, z: targetScale,
      duration: 1.2, ease: 'power2.inOut',
      onComplete: function () {
        r.isTraveling = false;
        r.isAtSigil   = true;

        // Spike emissive to dark red maximum now that ring is seated
        r.allStdMats.forEach(function (mat) {
          gsap.to(mat, {
            emissiveIntensity: mat.userData.hoverEmissiveIntensity || 2.0,
            duration: 0.35, ease: 'power2.out',
          });
        });

        // ─── STEP 2: Scale sigil + rings 1-9 down to zero ──────────────
        // Hide CSS halos alongside the sigil shrink
        var sigilHalos = document.getElementById('sigil-halos');
        if (sigilHalos) {
          gsap.to(sigilHalos, { opacity: 0, duration: 0.8, ease: 'power1.in' });
        }

        // Sigil group shrinks to nothing
        gsap.to(sigilGroup.scale, {
          x: 0, y: 0, z: 0,
          duration: 0.8, ease: 'power2.inOut',
        });

        // All rings except Almadel shrink to nothing
        var shrinkCount   = 0;
        var shrinkExpected = 0;
        rings.forEach(function (ring, i) {
          if (i === 0) return;
          shrinkExpected++;
          gsap.to(ring.group.scale, {
            x: 0, y: 0, z: 0,
            duration: 0.8, ease: 'power2.inOut',
            onComplete: function () {
              ring.group.visible               = false;
              ring.particleSystem.points.visible = false;
              ring.group.scale.set(1, 1, 1);  // reset scale while hidden
              shrinkCount++;
              if (shrinkCount === shrinkExpected) {
                onShrinkComplete();
              }
            },
          });
        });

        // If there are no other rings (defensive), fire immediately
        if (shrinkExpected === 0) onShrinkComplete();

        function onShrinkComplete() {
          // Hide sigil group now that it's at scale 0
          sigilGroup.visible = false;
          sigilGroup.scale.set(1, 1, 1);  // reset scale while hidden

          // ─── STEP 3: Enlarge ring + drift to upper position ────────────
          gsap.to(r.group.scale, {
            x: WARP_RING_SCALE, y: WARP_RING_SCALE, z: WARP_RING_SCALE,
            duration: 0.6, ease: 'power2.out',
          });
          gsap.to(r.group.position, {
            x: 0, y: 40, z: 0,
            duration: 0.6, ease: 'power2.out',
            onComplete: function () {
              // Begin lateral Y-axis spin, reveal invocation UI
              warpLateralSpin = true;
              createInvocationUI();
              animateInUI();

              window.solomonWarpActive = true;
              isWarping               = false;
              console.log('[Solomon Warp] Warp out complete — invocation space active.');
            },
          });
        }
      },
    });
  }

  // ── 12. WARP OUT — public entry point ─────────────────────────────────
  function warpOut() {
    isWarping = true;

    // If a non-Almadel ring is currently at the sigil, clear it first
    // and observe the existing 400 ms stagger convention from Phase 3.
    var otherAtSigil = rings.findIndex(function (r, i) {
      return i !== 0 && r.isAtSigil;
    });

    if (otherAtSigil !== -1) {
      window.solomonReturnRingToOrigin(otherAtSigil, function () {
        setTimeout(doWarpOut, 400);
      });
    } else {
      doWarpOut();
    }
  }

  // ── 13. WARP IN ───────────────────────────────────────────────────────
  //
  // Reverse choreography with HARD STOPS:
  //   Step 1 → UI collapses, ring scales back to 1.0
  //   Step 2 → Sigil + rings 1-9 scale back up from 0 to 1
  //   Step 3 → Ring returns to orbit via existing Phase 3 logic
  //
  function warpIn() {
    isWarping = true;
    var r          = rings[0];
    var sigilGroup = window.solomonSigilGroup;

    // ─── STEP 1: Collapse UI, shrink ring back to normal ────────────────
    animateOutUI(function () {
      destroyInvocationUI();
      warpLateralSpin = false;

      // Brief emissive pulse — ring "charging up"
      r.allStdMats.forEach(function (mat) {
        gsap.to(mat, {
          emissiveIntensity: mat.userData.hoverEmissiveIntensity || 2.0,
          duration: 0.2, ease: 'power2.out',
          yoyo: true, repeat: 1,
        });
      });

      // Shrink ring back to its normal sigil-sitting scale
      var innerHole      = r.spec.diameter - r.spec.tubeRadius;
      var sigilSitScale  = Math.min(1.4, Math.max(0.6, 50 / innerHole));
      gsap.to(r.group.scale, {
        x: sigilSitScale, y: sigilSitScale, z: sigilSitScale,
        duration: 0.5, ease: 'power2.inOut',
        onComplete: function () {

          // Move ring back near sigil center so it looks natural when scene returns
          gsap.to(r.group.position, {
            x: 0, y: 0, z: 40,
            duration: 0.4, ease: 'power2.inOut',
            onComplete: function () {

              // ─── STEP 2: Restore sigil + rings 1-9 ────────────────────────
              // Make them visible at scale 0 first, then animate up
              sigilGroup.visible = true;
              sigilGroup.scale.set(0, 0, 0);
              gsap.to(sigilGroup.scale, {
                x: 1, y: 1, z: 1,
                duration: 0.8, ease: 'power2.inOut',
              });

              // Restore CSS halos
              var sigilHalos = document.getElementById('sigil-halos');
              if (sigilHalos) {
                gsap.to(sigilHalos, { opacity: 1, duration: 0.8, ease: 'power1.out' });
              }

              var restoreCount    = 0;
              var restoreExpected = 0;
              rings.forEach(function (ring, i) {
                if (i === 0) return;
                restoreExpected++;
                ring.group.visible                = true;
                ring.particleSystem.points.visible = true;
                ring.group.scale.set(0, 0, 0);
                gsap.to(ring.group.scale, {
                  x: 1, y: 1, z: 1,
                  duration: 0.8, ease: 'power2.inOut',
                  onComplete: function () {
                    restoreCount++;
                    if (restoreCount === restoreExpected) {
                      onRestoreComplete();
                    }
                  },
                });
              });

              if (restoreExpected === 0) onRestoreComplete();

              function onRestoreComplete() {
                // ─── STEP 3: Return ring to orbit ───────────────────────────
                window.solomonReturnRingToOrigin(0);

                window.solomonWarpActive = false;
                isWarping               = false;
                console.log('[Solomon Warp] Warp in complete — orbit restored.');
              }
            },
          });
        },
      });
    });
  }

  // ── 14. PER-FRAME WARP UPDATE ─────────────────────────────────────────
  // Chained into the existing solomonPhase3Update via the Composer Patch.
  // No new requestAnimationFrame call.
  function warpUpdate() {
    if (!warpLateralSpin) return;
    // Slow continuous Y-axis lateral spin while in invocation space
    rings[0].group.rotation.y += 0.005;
  }

  // ── 15. EXTEND PHASE 3 UPDATE CHAIN ──────────────────────────────────
  var _origP3Update = window.solomonPhase3Update;
  window.solomonPhase3Update = function () {
    _origP3Update();
    warpUpdate();
  };

  // ── 16. PUBLIC ENTRY POINT — called by phase3.js click handler ────────
  window.solomonHandleAlmadelClick = function (e) {
    // Guard: ignore clicks that originated inside the invocation UI itself
    // (e.g. the user clicks in the textarea — we don't want that to trigger
    // warp-in accidentally via event bubbling to the window click listener).
    if (e && e.target && inputContainer && inputContainer.contains(e.target)) {
      return;
    }

    if (isWarping) return;

    if (!window.solomonWarpActive) {
      warpOut();
    } else {
      warpIn();
    }
  };

  console.log('[Solomon Warp] System ready. Click Ars Almadel to enter invocation space.');
})();
