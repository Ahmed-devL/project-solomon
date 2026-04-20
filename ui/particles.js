export let starGeo, stars, nebulaGrp, dustMesh, groundGlow;
const dustParticles = [];
const dustCount = 3000;
const dummy2 = new THREE.Object3D();

export function setupSceneEnvironment(sceneGroup) {
    // 1. Star field
    starGeo = new THREE.BufferGeometry();
    const starCount = 8000;
    const pos = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
        const r = 400 + Math.random() * 200;
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(Math.random() * 2 - 1);

        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);

        sizes[i] = 0.3 + Math.random() * 1.5;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starMat = new THREE.PointsMaterial({
        color: 0xcccccc,
        size: 1.0,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.8
    });

    stars = new THREE.Points(starGeo, starMat);
    sceneGroup.add(stars);

    // 2. Nebula Clouds
    nebulaGrp = new THREE.Group();
    const pGeo = new THREE.PlaneGeometry(300, 300);

    function createNebulaTex() {
        const c = document.createElement('canvas');
        c.width = 512; c.height = 512;
        const ctx = c.getContext('2d');
        const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
        grad.addColorStop(0, 'rgba(26, 10, 46, 1)');
        grad.addColorStop(1, 'rgba(26, 10, 46, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);
        return new THREE.CanvasTexture(c);
    }
    const nebTex = createNebulaTex();

    for (let i = 0; i < 4; i++) {
        const pMat = new THREE.MeshBasicMaterial({
            map: nebTex,
            transparent: true,
            opacity: 0.06 + Math.random() * 0.06,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        const p = new THREE.Mesh(pGeo, pMat);
        p.position.set((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 100, -100 - Math.random() * 200);
        p.userData = {
            baseX: p.position.x, baseY: p.position.y,
            rx: Math.random() * 2, ry: Math.random() * 2, speed: 0.1 + Math.random() * 0.2
        };
        nebulaGrp.add(p);
    }
    sceneGroup.add(nebulaGrp);

    // 3. Geometric Dust
    const dustGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const dustMat = new THREE.MeshBasicMaterial({ color: 0x998877, transparent: true, opacity: 0.4 });
    dustMesh = new THREE.InstancedMesh(dustGeometry, dustMat, dustCount);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < dustCount; i++) {
        const r = Math.random() * 200;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        dummy.position.set(x, y, z);
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        dummy.updateMatrix();
        dustMesh.setMatrixAt(i, dummy.matrix);

        dustParticles.push({
            position: new THREE.Vector3(x, y, z),
            velocity: new THREE.Vector3((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05)
        });
    }
    sceneGroup.add(dustMesh);

    // 4. Concentric Ground Glow
    const glowGeo = new THREE.TorusGeometry(80, 0.5, 2, 64);
    glowGeo.rotateX(Math.PI / 2);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xc9a84c, transparent: true, opacity: 0.08 });
    groundGlow = new THREE.Mesh(glowGeo, glowMat);
    groundGlow.position.y = -120;
    sceneGroup.add(groundGlow);
}

export function updateEnvironment(elapsed, rings) {
    if (stars) {
        stars.rotation.y += 0.00008;
        stars.rotation.x += 0.00003;
    }

    if (nebulaGrp) {
        nebulaGrp.children.forEach(n => {
            n.position.x = n.userData.baseX + Math.sin(elapsed * n.userData.speed) * 30;
            n.position.y = n.userData.baseY + Math.cos(elapsed * n.userData.speed) * 20;
        });
    }

    if (dustMesh) {
        for (let i = 0; i < dustCount; i++) {
            let p = dustParticles[i];

            let attracted = false;
            if (rings) {
                for (const r of rings) {
                    if (r.mesh.material.emissiveIntensity > (r.spec.idleE || 0.3) + 1.0) {
                        const dist = p.position.distanceTo(r.group.position);
                        if (dist < r.spec.radius + 40 && dist > r.spec.radius - 20) {
                            const dir = new THREE.Vector3().subVectors(r.group.position, p.position).normalize();
                            p.velocity.add(dir.multiplyScalar(0.005));
                            attracted = true;
                        }
                    }
                }
            }

            p.position.add(p.velocity);

            if (attracted) {
                p.velocity.multiplyScalar(0.95);
            } else {
                p.velocity.lerp(new THREE.Vector3((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05), 0.01);
            }

            if (p.position.length() > 250) {
                p.position.setScalar(0);
                p.position.x = (Math.random() - 0.5) * 100;
            }

            dummy2.position.copy(p.position);
            dummy2.updateMatrix();
            dustMesh.setMatrixAt(i, dummy2.matrix);
        }
        dustMesh.instanceMatrix.needsUpdate = true;
    }

    if (groundGlow) {
        groundGlow.material.opacity = 0.05 + Math.sin(elapsed) * 0.07;
    }
}
