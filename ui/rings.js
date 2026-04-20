import { solomonState } from './state.js';

const DEG2RAD = THREE.MathUtils.degToRad;

export const rings = [];

// Ring definitions
const ringSpecs = [
    {
        id: 'almadel', name: 'Ars Almadel', domain: 'Voice and Listening',
        radius: 28, tube: 0.6, rx: 70, ry: 15, orbitNormal: 0.008, color: 0xd4845a, emissive: 0x8a3a10, peakE: 4.0, metal: 0.7, rough: 0.15, clearcoat: 1.0
    },
    {
        id: 'notoria', name: 'Ars Notoria', domain: 'Memory and Recall',
        radius: 34, tube: 0.5, rx: 65, ry: -20, orbitNormal: 0.006, color: 0xc9d4a8, emissive: 0x606b30, peakE: 5.0, metal: 0.4, rough: 0.2, trans: 0.3
    },
    {
        id: 'paulina', name: 'Ars Paulina', domain: 'Browser and Automation',
        radius: 40, tube: 0.6, rx: 75, ry: 30, orbitNormal: 0.005, orbitActive: 0.022, color: 0x5ab8d4, emissive: 0x1a5a70, peakE: 4.5, metal: 0.6, rough: 0.1, clearcoat: 0.8
    },
    {
        id: 'goetia', name: 'Ars Goetia', domain: 'Inference and Reasoning',
        radius: 46, tube: 0.7, rx: 80, ry: -10, orbitNormal: 0.007, orbitActive: 0.014, color: 0x9b7fd4, emissive: 0x4a2a8a, peakE: 5.5, metal: 0.8, rough: 0.1, clearcoat: 1.0, trans: 0.15
    },
    {
        id: 'theurgia', name: 'Ars Theurgia', domain: 'System Awareness',
        radius: 52, tube: 0.55, rx: 60, ry: 45, orbitNormal: 0.004, color: 0x5ab87a, emissive: 0x1a5a3a, peakE: 6.0, metal: 0.7, rough: 0.2, alwaysVisible: true
    },
    {
        id: 'almiras', name: 'Ars Almiras', domain: 'Biometric Gate',
        radius: 58, tube: 0.65, rx: 85, ry: -35, orbitNormal: 0.006, color: 0xd45a5a, emissive: 0x6a1a1a, idleE: 0.8, peakE: 6.0, metal: 0.9, rough: 0.1
    },
    {
        id: 'verum', name: 'Ars Verum', domain: 'File and Knowledge',
        radius: 64, tube: 0.6, rx: 70, ry: 55, orbitNormal: 0.005, orbitActive: -0.003, color: 0xc9a87a, emissive: 0x6a4a20, peakE: 3.5, metal: 0.75, rough: 0.25
    },
    {
        id: 'ephesia', name: 'Ars Ephesia', domain: 'Network and Fetch',
        radius: 70, tube: 0.55, rx: 65, ry: -50, orbitNormal: 0.009, color: 0x5a8ad4, emissive: 0x1a3a7a, peakE: 4.0, metal: 0.5, rough: 0.15, trans: 0.2
    },
    {
        id: 'fulcanelli', name: 'Ars Fulcanelli', domain: 'Task Orchestration',
        radius: 76, tube: 0.7, rx: 75, ry: 10, orbitNormal: 0.006, color: 0xd4975a, emissive: 0x7a3a05, peakE: 5.0, metal: 0.85, rough: 0.1
    },
    {
        id: 'regalis', name: 'Ars Regalis', domain: 'Master Control',
        radius: 82, tube: 1.0, rx: 60, ry: 0, orbitNormal: 0.002, color: 0xc9a84c, emissive: 0x8a6010, idleE: 2.5, peakE: 2.5, metal: 1.0, rough: 0.05, clearcoat: 1.0, alwaysVisible: true
    }
];

ringSpecs.forEach((spec, i) => {
    const group = new THREE.Group();
    group.rotation.set(spec.rx * DEG2RAD, spec.ry * DEG2RAD, 0);

    const geo = new THREE.TorusGeometry(spec.radius, spec.tube, 8, 128);
    const matArgs = {
        color: spec.color,
        emissive: spec.emissive,
        emissiveIntensity: spec.idleE !== undefined ? spec.idleE : 0.3,
        metalness: spec.metal || 0.5,
        roughness: spec.rough || 0.5,
        transparent: true,
        opacity: spec.alwaysVisible ? 0.7 : 0
    };
    if (spec.clearcoat) matArgs.clearcoat = spec.clearcoat;
    if (spec.trans) matArgs.transmission = spec.trans;

    const mat = new THREE.MeshPhysicalMaterial(matArgs);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData = { id: spec.id, spec, isRing: true };
    
    group.add(mesh);

    if (spec.id === 'regalis') {
        const innerCrownGeo = new THREE.TorusGeometry(spec.radius, 0.2, 8, 128);
        const innerCrownMat = mat.clone();
        const innerCrownMesh = new THREE.Mesh(innerCrownGeo, innerCrownMat);
        group.add(innerCrownMesh);
        mesh.userData.innerCrown = innerCrownMesh;
    }

    rings.push({ id: spec.id, group, mesh, spec, baseRX: spec.rx * DEG2RAD, baseRY: spec.ry * DEG2RAD });
});

let previousRingStates = {};
solomonState.subscribe((state) => {
    updateRegalisMasterIntensity(state);
    
    rings.forEach(r => {
        const isNowActive = state.rings[r.id].active;
        const wasActive = previousRingStates[r.id];
        
        if (isNowActive && !wasActive) {
            triggerRingActiveAnim(r);
        }
        
        previousRingStates[r.id] = isNowActive;
    });
});

function triggerRingActiveAnim(r) {
    if (r.id === 'notoria') {
        gsap.to(r.mesh.material, { emissiveIntensity: 8.0, duration: 0.1, onComplete: () => {
            gsap.to(r.mesh.material, { emissiveIntensity: 0.3, duration: 1.1 });
        }});
        
        const lineGeo = new THREE.BufferGeometry();
        const pts = [];
        for(let i=0; i<20; i++){
            const angle = Math.random() * Math.PI * 2;
            const sx = Math.cos(angle)*r.spec.radius;
            const sy = Math.sin(angle)*r.spec.radius;
            pts.push(sx, sy, 0, sx*1.5, sy*1.5, (Math.random()-0.5)*10);
        }
        lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        const lineMat = new THREE.LineBasicMaterial({ color: r.spec.color, transparent: true, opacity: 1 });
        const lines = new THREE.LineSegments(lineGeo, lineMat);
        r.group.add(lines);
        
        gsap.to(lineMat, { opacity: 0, duration: 0.3, delay: 0.05, onComplete: () => {
            lineGeo.dispose(); lineMat.dispose(); r.group.remove(lines);
        }});
    }
}

function updateRegalisMasterIntensity(state) {
    const anyActive = Object.values(state.rings).some(r => r.active && r.id !== 'regalis');
    const r = rings.find(x => x.id === 'regalis');
    if(r) {
        gsap.to(r.mesh.material, { emissiveIntensity: anyActive ? 1.8 : 2.5, duration: 0.5 });
    }
}

document.addEventListener('bio-success', () => {
    const almiras = rings.find(r => r.id === 'almiras');
    if(!almiras) return;
    
    gsap.to(almiras.mesh.material.color, { r: 0x5a/255, g: 0xdc/255, b: 0x8a/255, duration: 0.3 });
    gsap.to(almiras.mesh.material, { emissiveIntensity: 6.0, duration: 0.3, yoyo: true, repeat: 1, repeatDelay: 2.0, onComplete: () => {
        gsap.to(almiras.mesh.material.color, { r: 0xd4/255, g: 0x5a/255, b: 0x5a/255, duration: 0.5 });
    }});

    const pGeo = new THREE.SphereGeometry(0.5);
    const pMat = new THREE.MeshBasicMaterial({ color: 0x5adc8a, transparent: true, opacity: 1 });
    const pInst = new THREE.InstancedMesh(pGeo, pMat, 24);
    almiras.group.add(pInst);
    
    const dummy = new THREE.Object3D();
    const pData = [];
    for(let i=0; i<24; i++) {
        const angle = (i/24) * Math.PI * 2;
        pData.push({ angle, dist: almiras.spec.radius });
    }

    gsap.to({v: 0}, { v: 1, duration: 0.6, ease: "power2.out", onUpdate: function() {
        const prog = this.targets()[0].v;
        pData.forEach((pd, i) => {
            const d = pd.dist + (prog * 30);
            dummy.position.set(Math.cos(pd.angle)*d, Math.sin(pd.angle)*d, 0);
            dummy.updateMatrix();
            pInst.setMatrixAt(i, dummy.matrix);
        });
        pInst.instanceMatrix.needsUpdate = true;
        pInst.material.opacity = 1 - prog;
    }, onComplete: () => {
        pGeo.dispose(); pMat.dispose(); almiras.group.remove(pInst);
    }});
});

document.addEventListener('bio-fail', () => {
    const almiras = rings.find(r => r.id === 'almiras');
    if(!almiras) return;

    gsap.to(almiras.mesh.material.color, { r: 1.0, g: 0.125, b: 0.125, duration: 0.2 });
    gsap.to(almiras.mesh.material, { emissiveIntensity: 8.0, duration: 0.2, yoyo: true, repeat: 1, repeatDelay: 2.0, onComplete: () => {
        gsap.to(almiras.mesh.material.color, { r: 0xd4/255, g: 0x5a/255, b: 0x5a/255, duration: 0.5 });
    }});

    const tl = gsap.timeline();
    const bx = almiras.group.position.x;
    tl.to(almiras.group.position, {x: bx - 8, duration: 0.05})
      .to(almiras.group.position, {x: bx + 8, duration: 0.05})
      .to(almiras.group.position, {x: bx - 6, duration: 0.05})
      .to(almiras.group.position, {x: bx + 6, duration: 0.05})
      .to(almiras.group.position, {x: bx - 3, duration: 0.05})
      .to(almiras.group.position, {x: bx + 3, duration: 0.05})
      .to(almiras.group.position, {x: bx, duration: 0.05});
});

let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let hoveredRing = null;

export function setupRaycaster(camera, sceneGroup, renderer) {
    const tooltip = document.getElementById('ring-tooltip');
    if(!tooltip) return;
    const ttTitle = tooltip.querySelector('.title');
    const ttSub = tooltip.querySelector('.subtitle');

    window.addEventListener('mousemove', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        
        let interactables = rings.map(r => r.mesh);
        let intersects = raycaster.intersectObjects(interactables);

        if (intersects.length > 0) {
            let hit = intersects[0].object;
            if (hoveredRing !== hit) {
                if (hoveredRing) leaveRing(hoveredRing);
                hoveredRing = hit;
                enterRing(hoveredRing);
            }
            tooltip.style.left = (event.clientX + 12) + 'px';
            tooltip.style.top = (event.clientY - 30) + 'px';
            tooltip.style.opacity = '1';
            ttTitle.innerText = hoveredRing.userData.spec.name;
            ttSub.innerText = hoveredRing.userData.spec.domain;
            document.body.style.cursor = 'crosshair';
        } else {
            if (hoveredRing) {
                leaveRing(hoveredRing);
                hoveredRing = null;
            }
            tooltip.style.opacity = '0';
            document.body.style.cursor = 'default';
        }
    });

    function enterRing(mesh) {
        if(!mesh.userData.isRing) return;
        
        gsap.to(mesh.scale, { x: 1.4, y: 1.4, z: 1.4, duration: 0.3 });
        if(mesh.material.emissiveIntensity !== undefined) {
             gsap.to(mesh.material, { emissiveIntensity: mesh.userData.spec.peakE * 1.3, duration: 0.3 });
        }
        
        let cloneGeo = new THREE.TorusGeometry(mesh.userData.spec.radius, mesh.userData.spec.tube, 8, 128);
        let cloneMat = new THREE.MeshBasicMaterial({ color: mesh.userData.spec.color, transparent: true, opacity: 0.6 });
        let clone = new THREE.Mesh(cloneGeo, cloneMat);
        mesh.parent.add(clone);
        
        gsap.to(clone.scale, { x: 2.2, y: 2.2, z: 2.2, duration: 0.8, ease: "power2.out" });
        gsap.to(clone.material, { opacity: 0, duration: 0.8, ease: "power2.out", onComplete: () => {
            cloneGeo.dispose(); cloneMat.dispose(); if(clone.parent) clone.parent.remove(clone);
        }});
    }

    function leaveRing(mesh) {
        if(!mesh.userData.isRing) return;
        gsap.to(mesh.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.3 });
        
        let targetIntensity = solomonState.rings[mesh.userData.id].active ? mesh.userData.spec.peakE : (mesh.userData.spec.idleE || 0.3);
        if(mesh.userData.id !== 'regalis' && mesh.userData.id !== 'almiras' && mesh.userData.id !== 'theurgia') {
            gsap.to(mesh.material, { emissiveIntensity: targetIntensity, duration: 0.3 });
        }
    }
}

export function updateRings(elapsed, delta, frameCount) {
    rings.forEach(r => {
        let st = solomonState.rings[r.id];
        let spec = r.spec;
        
        let speed = spec.orbitNormal;
        
        if (st.active && spec.orbitActive !== undefined) speed = spec.orbitActive;
        if (r.id === 'fulcanelli') speed = 0.006 + (solomonState.rings.fulcanelli.chaos * 0.025);

        r.mesh.rotation.z += speed;
        if (r.mesh.userData.innerCrown) {
            r.mesh.userData.innerCrown.rotation.z -= 0.001; 
        }

        if (r.id === 'theurgia') {
            const load = st.load || 0;
            const c1 = new THREE.Color(0x5ab87a);
            const c2 = new THREE.Color(0xa8c94c);
            const c3 = new THREE.Color(0xd4975a);
            const c4 = new THREE.Color(0xd45a5a);
            
            let color = new THREE.Color();
            if (load <= 0.4) color.lerpColors(c1, c2, load/0.4);
            else if (load <= 0.7) color.lerpColors(c2, c3, (load-0.4)/0.3);
            else color.lerpColors(c3, c4, (load-0.7)/0.3);

            r.mesh.material.color.copy(color);
            r.mesh.material.emissive.copy(color).multiplyScalar(0.5);
            r.mesh.material.emissiveIntensity = 1 + (load * 5.0);
        }

        if (r.id === 'fulcanelli') {
            const chaos = st.chaos || 0;
            if (chaos > 0) {
                const wobbleX = Math.sin(elapsed / 1.5 * Math.PI*2) * (chaos * 25) * DEG2RAD;
                const wobbleY = Math.cos(elapsed / 1.5 * Math.PI*2) * (chaos * 25) * DEG2RAD;
                r.group.rotation.x = r.baseRX + wobbleX;
                r.group.rotation.y = r.baseRY + wobbleY;
            } else {
                r.group.rotation.x = r.baseRX;
                r.group.rotation.y = r.baseRY;
            }
        }
        
        if (st.active) {
            if (r.id === 'almadel') {
                 r.mesh.material.opacity = 0.5 + Math.sin(elapsed * Math.PI*2 / 0.15) * 0.5;
            }
            if (r.id === 'goetia') {
                 r.mesh.scale.setScalar(0.88 + Math.sin(elapsed * Math.PI) * 0.12);
            }
            if (r.id === 'ephesia' && frameCount % 48 === 0) {
                let p = new THREE.Mesh(new THREE.TorusGeometry(r.spec.radius, r.spec.tube, 8, 64), new THREE.MeshBasicMaterial({color: r.spec.color, transparent:true, opacity:0.6}));
                r.group.add(p);
                gsap.to(p.scale, { x: 1.8, y: 1.8, z: 1.8, duration: 0.8});
                gsap.to(p.material, { opacity: 0, duration: 0.8, onComplete: () => { p.geometry.dispose(); p.material.dispose(); r.group.remove(p); } });
            }
        } else {
            if (r.id === 'almadel' && solomonState.view === 'presence' && r.mesh.material.opacity > 0 && r.mesh.material.opacity < 0.6) {
                r.mesh.material.opacity = 0.6;
            }
        }
    });
}
