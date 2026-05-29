(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 1 — DEPENDENCY GUARD
  // ═══════════════════════════════════════════════════════════════════

  if (
    !window.solomonRings ||
    !window.solomonSigilGroup ||
    !window.solomonComposer
  ) {
    console.error(
      '[Solomon Boot] Required globals missing. ' +
      'Ensure phase1.js, phase2.js, phase3.js all loaded before boot.js.'
    );
    throw new Error('[Solomon Boot] Aborting.');
  }
  console.log('[Solomon Boot] Globals confirmed. Starting sequence.');

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 2 — TIMING CONSTANTS
  // ═══════════════════════════════════════════════════════════════════

  const T_VOID_END        = 800;    // ms — space breathes alone before anything
  const T_TRAVEL_DURATION = 1.4;    // seconds — GSAP travel time per ring
  const T_STAGGER_MS      = 80;     // ms between each ring launch

  // Last ring starts traveling at: T_VOID_END + 9 * T_STAGGER_MS = 1520ms
  // Last ring arrives at: 1520 + T_TRAVEL_DURATION * 1000 = 2920ms
  // Ignition fires 400ms after last ring arrives:
  const T_IGNITION = T_VOID_END + (9 * T_STAGGER_MS) +
                     (T_TRAVEL_DURATION * 1000) + 400;
  // T_IGNITION = 3320ms

  // Bloom attack duration (violent, fast):
  const T_BLOOM_ATTACK    = 0.08;   // seconds — GSAP
  // Bloom decay back to normal:
  const T_BLOOM_DECAY     = 0.9;    // seconds — GSAP
  // Sigil scale snap duration:
  const T_SIGIL_SCALE     = 0.8;    // seconds — GSAP

  // Breath period starts when sigil ignites, lasts 800ms:
  const T_BREATH_START    = T_IGNITION + 800;  // 4120ms

  // Stone pulse: 10 rings * 60ms apart, starts at T_BREATH_START
  // Handoff fires after stone pulse completes + small buffer:
  const T_HANDOFF         = T_BREATH_START + (9 * 60) + 400;
  // T_HANDOFF ≈ 5060ms

  // Normal bloom strength (restore to this after spike):
  const BLOOM_NORMAL      = 1.4;
  // Spike bloom strength:
  const BLOOM_SPIKE       = 4.5;
  // Convergence sphere radius (rings launch from this distance):
  const SPHERE_RADIUS     = 2000;

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 3 — REFERENCE ACQUISITION
  // ═══════════════════════════════════════════════════════════════════

  const rings      = window.solomonRings;
  const sigilGroup = window.solomonSigilGroup;
  const composer   = window.solomonComposer;

  // Get bloom pass by index — Phase 2 adds RenderPass first,
  // UnrealBloomPass second. Index 1 is always UnrealBloomPass.
  const bloomPass = composer.passes[1];

  if (!bloomPass) {
    console.error('[Solomon Boot] Could not find bloom pass at composer.passes[1].');
    throw new Error('[Solomon Boot] Bloom pass missing.');
  }

  // Set boot flag — phase3Update reads this for nothing currently,
  // but expose it for any future code that needs to check boot state
  window.solomonBootComplete = false;

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 4 — INITIAL STATE SETUP
  // ═══════════════════════════════════════════════════════════════════

  // Run synchronously at load time, before any setTimeout.
  // This ensures the state is set before the first frame renders.

  // ── SIGIL ──────────────────────────────────────────────────────────
  // Hide sigil completely. Phase 2 is still animating its internals
  // (gyro rings spinning etc.) but nothing renders since visible=false.
  sigilGroup.visible = false;

  // Set bloom to 0 — sigil is hidden but bloom could still affect
  // other bright objects. Start at 0 for clean Act 1.
  bloomPass.strength = 0;

  // ── RINGS ───────────────────────────────────────────────────────────
  rings.forEach(r => {

    // 1. Lock ring from phase3Update
    //    With isTraveling = true, phase3Update will only apply
    //    r.spinDeltaZ * 2.0 rotation (z-spin) and return.
    //    It will NOT touch position, NOT touch emissiveIntensity.
    //    GSAP has full control of position and rotation.x/y.
    r.isTraveling = true;

    // 2. Set all material emissive to 0
    //    Rings will glow into existence during convergence.
    //    userData.baseEmissiveIntensity is already set by phase3's
    //    makeRingMaterial() — use it as the restoration target.
    //    Just set current intensity to 0 for now.
    r.allStdMats.forEach(mat => {
      mat.emissiveIntensity = 0;
    });

    // 3. Place ring at random position on sphere surface
    //    Use spherical coordinates for even distribution.
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    r.group.position.set(
      SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta),
      SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta),
      SPHERE_RADIUS * Math.cos(phi)
    );

    // 4. Set wild initial rotation
    //    Rings will feel like they're tumbling through space
    //    before finding their orbit.
    r.group.rotation.set(
      Math.random() * Math.PI * 4,
      Math.random() * Math.PI * 4,
      Math.random() * Math.PI * 4
    );

    // 5. Hide ring particle cloud
    //    CRITICAL: particles are a separate THREE.Points object
    //    added directly to scene — NOT a child of r.group.
    //    Must be hidden explicitly here or they render at homePos
    //    while the ring is at radius 2000.
    //    updateRingParticles() will keep updating their positions
    //    to follow r.group.position each frame, but since
    //    visible=false nothing renders. They'll be ready at the
    //    correct position when we show them on ring arrival.
    if (r.particleSystem && r.particleSystem.points) {
      r.particleSystem.points.visible = false;
    }
  });

  console.log('[Solomon Boot] Initial state set. Act 1 — The Void begins.');

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 5 — ACT 2: RING CONVERGENCE
  // ═══════════════════════════════════════════════════════════════════

  // Starts at T_VOID_END (800ms).
  // All 10 rings launch simultaneously (with per-ring stagger)
  // from their random sphere positions toward their homePos.

  setTimeout(() => {
    console.log('[Solomon Boot] Act 2 — Convergence begins.');

    rings.forEach((r, i) => {

      // GSAP delay for stagger — each ring launches 80ms after previous
      const staggerDelay = i * (T_STAGGER_MS / 1000);  // convert to seconds

      // ── Position tween ──────────────────────────────────────────
      // power3.out: fast initial velocity, decelerates sharply at
      // destination. Feels gravitational — pulled in by the sigil.
      gsap.to(r.group.position, {
        x: r.spec.homePos.x,
        y: r.spec.homePos.y,
        z: r.spec.homePos.z,
        duration: T_TRAVEL_DURATION,
        delay:    staggerDelay,
        ease:     'power3.out',
        // No onComplete here — see emissive tween onComplete below
      });

      // ── Rotation tween ──────────────────────────────────────────
      // Tween toward the ring's initRot (its natural idle orientation).
      // This settles the wild tumbling as the ring arrives.
      // Note: phase3Update is also adding spinDeltaZ * 2.0 to rotation.z
      // each frame. This is intentional — z keeps spinning even as
      // x and y settle. Do NOT tween rotation.z here.
      gsap.to(r.group.rotation, {
        x: r.spec.initRot.x,
        y: r.spec.initRot.y,
        duration: T_TRAVEL_DURATION,
        delay:    staggerDelay,
        ease:     'power2.out',
      });

      // ── Emissive ramp ───────────────────────────────────────────
      // Rings glow into existence in the final portion of travel.
      // Start emissive ramp 40% into the journey, complete at arrival.
      // Each material gets tweened to its own base intensity.
      r.allStdMats.forEach(mat => {
        const targetIntensity = mat.userData.baseEmissiveIntensity || 0.8;
        gsap.to(mat, {
          emissiveIntensity: targetIntensity,
          duration: T_TRAVEL_DURATION * 0.65,
          delay:    staggerDelay + (T_TRAVEL_DURATION * 0.35),
          ease:     'power2.out',
        });
      });

      // ── Show particles on ring arrival ──────────────────────────
      // gsap.delayedCall fires after the ring fully arrives.
      // updateRingParticles() has been tracking r.group.position
      // every frame during travel, so particles are already at the
      // correct position when made visible. No snap.
      gsap.delayedCall(staggerDelay + T_TRAVEL_DURATION, () => {
        if (r.particleSystem && r.particleSystem.points) {
          r.particleSystem.points.visible = true;
        }
      });

    });

  }, T_VOID_END);

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 6 — ACT 3: SIGIL IGNITION
  // ═══════════════════════════════════════════════════════════════════

  // Fires at T_IGNITION (3320ms).
  // The sigil punches into existence with a bloom spike.

  setTimeout(() => {
    console.log('[Solomon Boot] Act 3 — Ignition.');

    // ── Make sigil visible ──────────────────────────────────────────
    sigilGroup.visible = true;

    // ── Start at tiny scale ─────────────────────────────────────────
    // Set scale before any tween so the first rendered frame is small.
    sigilGroup.scale.set(0.1, 0.1, 0.1);

    // ── Bloom spike ─────────────────────────────────────────────────
    // Attack: brutal and fast (80ms). Like a star igniting.
    // Decay: slow and satisfying (900ms). Power falls away.
    // GSAP tweens bloomPass.strength directly — valid because
    // bloomPass.strength is a plain numeric property.
    gsap.to(bloomPass, {
      strength: BLOOM_SPIKE,
      duration: T_BLOOM_ATTACK,
      ease:     'none',
      onComplete: () => {
        gsap.to(bloomPass, {
          strength: BLOOM_NORMAL,
          duration: T_BLOOM_DECAY,
          ease:     'power2.out',
        });
      }
    });

    // ── Scale snap ──────────────────────────────────────────────────
    // elastic.out: snaps to full size with a single overshoot.
    // Feels like something under pressure being suddenly released.
    // The elastic overshoot momentarily scales past 1.0 then settles.
    gsap.to(sigilGroup.scale, {
      x: 1.0, y: 1.0, z: 1.0,
      duration: T_SIGIL_SCALE,
      ease:     'elastic.out(1, 0.5)',
    });

  }, T_IGNITION);

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 7 — ACT 4: STONE PULSE AND HANDOFF
  // ═══════════════════════════════════════════════════════════════════

  // Fires at T_BREATH_START (4120ms).
  // A single soft pulse travels clockwise around the ring formation —
  // one ring at a time, 60ms apart.
  // Then at T_HANDOFF (5060ms), control returns to phase3Update.

  setTimeout(() => {
    console.log('[Solomon Boot] Act 4 — Breath and stone pulse.');

    rings.forEach((r, i) => {

      // Find the stone material specifically.
      // The stone mesh is named 'stone' in the ring group.
      // Traverse to find it reliably.
      let stoneMat = null;
      r.group.traverse(child => {
        if (child.isMesh && child.name === 'stone' && child.material) {
          stoneMat = child.material;
        }
      });

      if (!stoneMat) return;  // stone not found — skip silently

      // Stagger: 60ms between each ring
      const pulseDelay = i * 0.06;  // seconds for GSAP

      gsap.delayedCall(pulseDelay, () => {
        // Current emissive intensity (what GSAP left it at after convergence)
        const currentIntensity = stoneMat.emissiveIntensity;
        const peakIntensity    = currentIntensity * 2.5;

        // Quick rise then slower decay — a single heartbeat
        gsap.to(stoneMat, {
          emissiveIntensity: peakIntensity,
          duration: 0.15,
          ease:     'power2.out',
          onComplete: () => {
            gsap.to(stoneMat, {
              emissiveIntensity: currentIntensity,
              duration: 0.45,
              ease:     'power2.in',
            });
          }
        });
      });

    });

  }, T_BREATH_START);

  // ── HANDOFF ─────────────────────────────────────────────────────────
  // Fires at T_HANDOFF. Releases all rings to phase3Update.
  // From this point: phase3Update owns position, rotation, emissive.
  // Boot.js has no further presence — no listeners, no loops, nothing.

  setTimeout(() => {

    rings.forEach(r => {
      // Release ring from boot control.
      // phase3Update will immediately begin applying radial spin deltas
      // and drift sine waves from the ring's current position.
      // Since rings are already at homePos (GSAP put them there),
      // the drift oscillation begins correctly with no position snap.
      r.isTraveling = false;
    });

    window.solomonBootComplete = true;
    console.log('[Solomon Boot] Sequence complete. Handing off to idle state.');

    // boot.js is now inert. No cleanup needed.
    // The IIFE scope closes. All local variables are garbage collected.

  }, T_HANDOFF);

})();
