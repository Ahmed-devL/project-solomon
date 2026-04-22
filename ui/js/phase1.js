/* ═══════════════════════════════════════════════════════════════
   SOLOMON — Phase 1: Animated Space Background
   No sigil, no rings, no interaction beyond cursor disruption.
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── RENDERER / CAMERA / SCENE ───────────────────────────────
  const canvas = document.getElementById('solomon-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x02010a, 1);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000);
  camera.position.set(0, 0, 500);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();

  window.solomonRenderer = renderer;
  window.solomonCamera   = camera;
  window.solomonScene    = scene;

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Resize nebula plane
    var camDist = 900; // camera z=500, plane z=-400
    var h = 2 * Math.tan(THREE.MathUtils.degToRad(30)) * camDist;
    var w = h * camera.aspect;
    bgPlane.geometry.dispose();
    bgPlane.geometry = new THREE.PlaneGeometry(w * 1.1, h * 1.1);
  });

  // ─── MOUSE TRACKING ─────────────────────────────────────────
  var mouseWorld = new THREE.Vector3(99999, 99999, 0);
  window.addEventListener('mousemove', function (e) {
    var ndcX = (e.clientX / window.innerWidth) * 2 - 1;
    var ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
    var vec = new THREE.Vector3(ndcX, ndcY, 0.5);
    vec.unproject(camera);
    var dir = vec.sub(camera.position).normalize();
    var dist = -camera.position.z / dir.z;
    mouseWorld.copy(camera.position).addScaledVector(dir, dist);
  });

  // ═══════════════════════════════════════════════════════════════
  // LAYER 1 — DEEP NEBULAE (full-screen GLSL shader quad)
  // ═══════════════════════════════════════════════════════════════
  var camDist = 900; // distance from camera (z=500) to plane (z=-400)
  var planeH = 2 * Math.tan(THREE.MathUtils.degToRad(30)) * camDist;
  var planeW = planeH * camera.aspect;

  var nebulaVert = [
    'varying vec2 vUv;',
    'void main(){',
    '  vUv = uv;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);',
    '}'
  ].join('\n');

  var nebulaFrag = [
    'uniform float uTime;',
    'varying vec2 vUv;',
    '',
    'void main(){',
    '  vec3 base = vec3(0.008, 0.004, 0.039);',
    '  vec3 acc = vec3(0.0);',
    '',
    '  // Cloud centers',
    '  vec2 c[7]; c[0]=vec2(0.12,0.20); c[1]=vec2(0.85,0.75); c[2]=vec2(0.70,0.10);',
    '  c[3]=vec2(0.18,0.82); c[4]=vec2(0.55,0.50); c[5]=vec2(0.38,0.28); c[6]=vec2(0.78,0.42);',
    '',
    '  // Radii',
    '  float r[7]; r[0]=0.38; r[1]=0.30; r[2]=0.26; r[3]=0.28; r[4]=0.18; r[5]=0.20; r[6]=0.16;',
    '',
    '  // Colors',
    '  vec3 col[7];',
    '  col[0]=vec3(0.22,0.04,0.48); col[1]=vec3(0.00,0.18,0.50); col[2]=vec3(0.50,0.08,0.18);',
    '  col[3]=vec3(0.00,0.30,0.28); col[4]=vec3(0.40,0.18,0.04); col[5]=vec3(0.26,0.04,0.48);',
    '  col[6]=vec3(0.04,0.26,0.42);',
    '',
    '  // Opacities',
    '  float op[7]; op[0]=0.17; op[1]=0.14; op[2]=0.13; op[3]=0.12; op[4]=0.09; op[5]=0.11; op[6]=0.08;',
    '',
    '  // Pulse speeds & phase offsets',
    '  float ps[7]; ps[0]=0.08; ps[1]=0.06; ps[2]=0.09; ps[3]=0.07; ps[4]=0.10; ps[5]=0.065; ps[6]=0.085;',
    '  float po[7]; po[0]=0.0; po[1]=1.2; po[2]=2.4; po[3]=0.7; po[4]=3.1; po[5]=1.8; po[6]=4.5;',
    '',
    '  for(int i=0;i<7;i++){',
    '    float d = length(vUv - c[i]);',
    '    float f = 1.0 - smoothstep(0.0, r[i], d);',
    '    f = pow(f, 2.2);',
    '    float pulse = 0.85 + 0.15 * sin(uTime * ps[i] + po[i]);',
    '    acc += col[i] * op[i] * f * pulse;',
    '  }',
    '',
    '  gl_FragColor = vec4(base + acc, 1.0);',
    '}'
  ].join('\n');

  var nebulaMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0.0 } },
    vertexShader: nebulaVert,
    fragmentShader: nebulaFrag,
    depthWrite: false
  });

  var bgPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(planeW * 1.1, planeH * 1.1),
    nebulaMaterial
  );
  bgPlane.position.z = -400;
  scene.add(bgPlane);

  // ═══════════════════════════════════════════════════════════════
  // LAYER 2 — STAR FIELD (500 twinkling points)
  // ═══════════════════════════════════════════════════════════════
  var STAR_COUNT = 500;
  var starPositions = new Float32Array(STAR_COUNT * 3);
  var starColors    = new Float32Array(STAR_COUNT * 3);
  var starBaseR     = new Float32Array(STAR_COUNT);
  var starBaseG     = new Float32Array(STAR_COUNT);
  var starBaseB     = new Float32Array(STAR_COUNT);
  var starSizes     = new Float32Array(STAR_COUNT);
  var starPhase     = new Float32Array(STAR_COUNT);
  var starSpeed     = new Float32Array(STAR_COUNT);
  var starAmp       = new Float32Array(STAR_COUNT);

  var palette = [
    [1.0, 1.0, 1.0],       // white 40%
    [1.0, 0.91, 0.75],     // warm white 20%
    [0.78, 0.85, 1.0],     // pale blue 20%
    [1.0, 0.82, 0.82],     // faint red 10%
    [0.94, 0.91, 0.69]     // pale gold 10%
  ];

  function pickStarColor() {
    var r = Math.random();
    if (r < 0.4) return palette[0];
    if (r < 0.6) return palette[1];
    if (r < 0.8) return palette[2];
    if (r < 0.9) return palette[3];
    return palette[4];
  }

  for (var i = 0; i < STAR_COUNT; i++) {
    starPositions[i * 3]     = (Math.random() - 0.5) * 1800;
    starPositions[i * 3 + 1] = (Math.random() - 0.5) * 1000;
    starPositions[i * 3 + 2] = -200 - Math.random() * 180;

    var c = pickStarColor();
    starBaseR[i] = c[0]; starBaseG[i] = c[1]; starBaseB[i] = c[2];
    starColors[i * 3] = c[0]; starColors[i * 3 + 1] = c[1]; starColors[i * 3 + 2] = c[2];

    starSizes[i] = 0.5 + Math.random() * 2.3;
    starPhase[i] = Math.random() * Math.PI * 2;
    starSpeed[i] = 0.003 + Math.random() * 0.015;
    starAmp[i]   = 0.3 + Math.random() * 0.4;
  }

  var starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute('color',    new THREE.BufferAttribute(starColors, 3));

  var starMat = new THREE.PointsMaterial({
    vertexColors: true, size: 2.0, sizeAttenuation: true,
    transparent: true, opacity: 1.0, depthWrite: false
  });
  var starField = new THREE.Points(starGeo, starMat);
  scene.add(starField);

  function updateStars() {
    for (var i = 0; i < STAR_COUNT; i++) {
      starPhase[i] += starSpeed[i];
      var a = (1 - starAmp[i]) + starAmp[i] * (0.5 + 0.5 * Math.sin(starPhase[i]));
      starColors[i * 3]     = starBaseR[i] * a;
      starColors[i * 3 + 1] = starBaseG[i] * a;
      starColors[i * 3 + 2] = starBaseB[i] * a;
    }
    starGeo.attributes.color.needsUpdate = true;
  }

  // ═══════════════════════════════════════════════════════════════
  // LAYER 3 — DRIFTING SPACE PARTICLES
  // ═══════════════════════════════════════════════════════════════
  var BX = 900, BY = 500;

  // ── Shared particle color picker (gold / white / purple) ─────
  function particleColor(opacity) {
    var r = Math.random();
    var rgb;
    if (r < 0.4)      rgb = [201/255, 147/255, 58/255];   // gold
    else if (r < 0.7) rgb = [1.0, 1.0, 1.0];               // white
    else               rgb = [120/255, 80/255, 200/255];    // purple
    return [rgb[0] * opacity, rgb[1] * opacity, rgb[2] * opacity];
  }

  // ─── TYPE A: DUST MOTES (50 particles) ──────────────────────
  var DUST_N = 50;
  var dustPos = new Float32Array(DUST_N * 3);
  var dustCol = new Float32Array(DUST_N * 3);
  var dustData = [];

  for (var i = 0; i < DUST_N; i++) {
    var x = (Math.random() - 0.5) * BX * 2;
    var y = (Math.random() - 0.5) * BY * 2;
    var z = -50 + Math.random() * 100;
    dustPos[i*3] = x; dustPos[i*3+1] = y; dustPos[i*3+2] = z;

    var op = 0.12 + Math.random() * 0.23;
    var col = particleColor(op);
    dustCol[i*3] = col[0]; dustCol[i*3+1] = col[1]; dustCol[i*3+2] = col[2];

    var bvx = (Math.random() * 0.08 + 0.04) * (Math.random() < 0.5 ? 1 : -1);
    var bvy = (Math.random() * 0.06 + 0.02) * (Math.random() < 0.5 ? 1 : -1);
    dustData.push({
      vx: bvx, vy: bvy, baseVx: bvx, baseVy: bvy,
      sinOff: Math.random() * Math.PI * 2,
      sinFreq: 0.005 + Math.random() * 0.01
    });
  }

  var dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute('color',    new THREE.BufferAttribute(dustCol, 3));
  var dustMat = new THREE.PointsMaterial({
    vertexColors: true, size: 1.2, sizeAttenuation: true,
    transparent: true, opacity: 1.0, depthWrite: false
  });
  scene.add(new THREE.Points(dustGeo, dustMat));

  // ─── TYPE B: HOLLOW CIRCLES (40 particles) ──────────────────
  // Build 32x32 hollow-circle texture
  var hcCanvas = document.createElement('canvas');
  hcCanvas.width = 32; hcCanvas.height = 32;
  var hcCtx = hcCanvas.getContext('2d');
  hcCtx.clearRect(0, 0, 32, 32);
  hcCtx.strokeStyle = 'white';
  hcCtx.lineWidth = 2;
  hcCtx.beginPath();
  hcCtx.arc(16, 16, 10, 0, Math.PI * 2);
  hcCtx.stroke();
  var hollowCircleTexture = new THREE.CanvasTexture(hcCanvas);

  var SHARD_N = 40;
  var shardPos  = new Float32Array(SHARD_N * 3);
  var shardCols = new Float32Array(SHARD_N * 3);
  var shardData = [];

  for (var i = 0; i < SHARD_N; i++) {
    var x = (Math.random()-0.5)*BX*2, y = (Math.random()-0.5)*BY*2, z = -50+Math.random()*100;
    shardPos[i*3] = x; shardPos[i*3+1] = y; shardPos[i*3+2] = z;

    var bvx = (Math.random()*0.08+0.04)*(Math.random()<0.5?1:-1);
    var bvy = (Math.random()*0.06+0.02)*(Math.random()<0.5?1:-1);
    shardData.push({
      vx:bvx, vy:bvy, baseVx:bvx, baseVy:bvy,
      sinOff: Math.random()*Math.PI*2, sinFreq: 0.005+Math.random()*0.01
    });

    var op = 0.18 + Math.random() * 0.27;
    var col = particleColor(op);
    shardCols[i*3] = col[0]; shardCols[i*3+1] = col[1]; shardCols[i*3+2] = col[2];
  }

  var shardGeo = new THREE.BufferGeometry();
  shardGeo.setAttribute('position', new THREE.BufferAttribute(shardPos, 3));
  shardGeo.setAttribute('color',    new THREE.BufferAttribute(shardCols, 3));
  var shardMat = new THREE.PointsMaterial({
    map: hollowCircleTexture, vertexColors: true, size: 8, sizeAttenuation: true,
    transparent: true, alphaTest: 0.01, depthWrite: false
  });
  scene.add(new THREE.Points(shardGeo, shardMat));

  // ─── TYPE C: MICRO-CRYSTALS (30 sparkle points) ─────────────
  var CRYSTAL_N = 30;

  // Build 16x16 crystal texture
  var cCanvas = document.createElement('canvas');
  cCanvas.width = 16; cCanvas.height = 16;
  var cx = cCanvas.getContext('2d');
  cx.clearRect(0,0,16,16);
  cx.strokeStyle = 'white'; cx.lineWidth = 1;
  cx.globalAlpha = 0.9;
  // Cardinal lines
  cx.beginPath(); cx.moveTo(8,1); cx.lineTo(8,15); cx.stroke();
  cx.beginPath(); cx.moveTo(1,8); cx.lineTo(15,8); cx.stroke();
  // Diagonal lines (shorter)
  cx.globalAlpha = 0.5;
  cx.beginPath(); cx.moveTo(4,4);  cx.lineTo(12,12); cx.stroke();
  cx.beginPath(); cx.moveTo(12,4); cx.lineTo(4,12);  cx.stroke();

  var crystalTex = new THREE.CanvasTexture(cCanvas);

  var crystalPos = new Float32Array(CRYSTAL_N * 3);
  var crystalCol = new Float32Array(CRYSTAL_N * 3);
  var crystalData = [];

  for (var i = 0; i < CRYSTAL_N; i++) {
    var x = (Math.random()-0.5)*BX*2, y = (Math.random()-0.5)*BY*2, z = -50+Math.random()*100;
    crystalPos[i*3]=x; crystalPos[i*3+1]=y; crystalPos[i*3+2]=z;

    var op = 0.25+Math.random()*0.3;
    var col = particleColor(op);
    crystalCol[i*3]=col[0]; crystalCol[i*3+1]=col[1]; crystalCol[i*3+2]=col[2];

    var bvx = (Math.random()*0.08+0.04)*(Math.random()<0.5?1:-1);
    var bvy = (Math.random()*0.06+0.02)*(Math.random()<0.5?1:-1);
    crystalData.push({
      vx:bvx, vy:bvy, baseVx:bvx, baseVy:bvy,
      sinOff: Math.random()*Math.PI*2, sinFreq: 0.005+Math.random()*0.01
    });
  }

  var crystalGeo = new THREE.BufferGeometry();
  crystalGeo.setAttribute('position', new THREE.BufferAttribute(crystalPos, 3));
  crystalGeo.setAttribute('color',    new THREE.BufferAttribute(crystalCol, 3));
  var crystalMat = new THREE.PointsMaterial({
    map: crystalTex, vertexColors: true, size: 6, sizeAttenuation: true,
    transparent: true, alphaTest: 0.01, depthWrite: false
  });
  scene.add(new THREE.Points(crystalGeo, crystalMat));

  // ═══════════════════════════════════════════════════════════════
  // PARTICLE UPDATE (cursor disruption + movement + wrapping)
  // ═══════════════════════════════════════════════════════════════
  var p1Time = 0;

  function cursorPush(px, py, d) {
    var dx = px - mouseWorld.x, dy = py - mouseWorld.y;
    var dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < 120 && dist > 0.01) {
      var str = (1 - dist/120) * 1.8;
      d.vx += (dx/dist) * str * 0.4;
      d.vy += (dy/dist) * str * 0.4;
      d.vx = Math.max(-1.5, Math.min(1.5, d.vx));
      d.vy = Math.max(-1.5, Math.min(1.5, d.vy));
    }
    d.vx += (d.baseVx - d.vx) * 0.04;
    d.vy += (d.baseVy - d.vy) * 0.04;
  }

  function wrap(arr, idx) {
    if (arr[idx]   >  BX) arr[idx]   = -BX;
    if (arr[idx]   < -BX) arr[idx]   =  BX;
    if (arr[idx+1] >  BY) arr[idx+1] = -BY;
    if (arr[idx+1] < -BY) arr[idx+1] =  BY;
  }

  function updateParticles() {
    var i, d;

    // Type A — Dust
    for (i = 0; i < DUST_N; i++) {
      d = dustData[i];
      cursorPush(dustPos[i*3], dustPos[i*3+1], d);
      dustPos[i*3]   += d.vx;
      dustPos[i*3+1] += d.vy + Math.sin(p1Time * d.sinFreq + d.sinOff) * 0.03;
      wrap(dustPos, i*3);
    }
    dustGeo.attributes.position.needsUpdate = true;

    // Type B — Hollow circles
    for (i = 0; i < SHARD_N; i++) {
      d = shardData[i];
      cursorPush(shardPos[i*3], shardPos[i*3+1], d);
      shardPos[i*3]   += d.vx;
      shardPos[i*3+1] += d.vy + Math.sin(p1Time * d.sinFreq + d.sinOff) * 0.03;
      wrap(shardPos, i*3);
    }
    shardGeo.attributes.position.needsUpdate = true;

    // Type C — Crystals
    for (i = 0; i < CRYSTAL_N; i++) {
      d = crystalData[i];
      cursorPush(crystalPos[i*3], crystalPos[i*3+1], d);
      crystalPos[i*3]   += d.vx;
      crystalPos[i*3+1] += d.vy + Math.sin(p1Time * d.sinFreq + d.sinOff) * 0.03;
      wrap(crystalPos, i*3);
    }
    crystalGeo.attributes.position.needsUpdate = true;
  }

  // ═══════════════════════════════════════════════════════════════
  // ANIMATION LOOP (cancelable by Phase 2)
  // ═══════════════════════════════════════════════════════════════
  var rafId = null;

  function phase1Loop() {
    rafId = requestAnimationFrame(phase1Loop);
    p1Time += 0.01;
    nebulaMaterial.uniforms.uTime.value = p1Time;
    updateStars();
    updateParticles();
    renderer.render(scene, camera);
  }

  phase1Loop();

  // Expose for Phase 2 to cancel + reference
  window.solomonPhase1RAFId = function () { return rafId; };
  window.solomonCancelPhase1 = function () { cancelAnimationFrame(rafId); };
  window.solomonP1Time = function () { return p1Time; };
  window.solomonNebulaMaterial = nebulaMaterial;

})();
