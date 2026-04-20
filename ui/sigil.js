export const sigilGroup = new THREE.Group();
sigilGroup.position.set(0, 0, 0);

// Inner Core
const innerGeo = new THREE.IcosahedronGeometry(6, 1);
const innerMat = new THREE.MeshPhysicalMaterial({
    color: 0xc9a84c,
    emissive: 0x8a5a10,
    emissiveIntensity: 2.0,
    metalness: 1.0,
    roughness: 0.05,
    wireframe: true
});
export const innerCore = new THREE.Mesh(innerGeo, innerMat);
sigilGroup.add(innerCore);

// Outer Shell
const outerGeo = new THREE.IcosahedronGeometry(9, 0);
const outerMat = new THREE.MeshPhysicalMaterial({
    color: 0xc9a84c,
    emissive: 0x8a5a10,
    emissiveIntensity: 0.8,
    metalness: 1.0,
    roughness: 0.05,
    wireframe: true,
    transparent: true,
    opacity: 0.4
});
export const outerShell = new THREE.Mesh(outerGeo, outerMat);
sigilGroup.add(outerShell);

// Orbital Filaments
export const filaments = [];
const angles = [0, 30, 60, 90, 120, 150];
const filMat = new THREE.MeshBasicMaterial({ color: 0xc9a84c, transparent: true, opacity: 0 }); // starts 0 OPACITY for summon

angles.forEach((angle) => {
    const filGeo = new THREE.TorusGeometry(12, 0.08, 3, 64);
    const filMesh = new THREE.Mesh(filGeo, filMat.clone());
    filMesh.rotation.y = THREE.MathUtils.degToRad(angle);
    filMesh.userData.rotSpeed = 0.004 + Math.random() * 0.008;
    filaments.push(filMesh);
    sigilGroup.add(filMesh);
});

// Sigil Glyph Planes
function createGlyphTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    ctx.strokeStyle = 'rgba(201, 168, 76, 0.4)';
    ctx.lineWidth = 4;
    
    // Abstract geometry
    ctx.beginPath();
    for (let i=0; i<8; i++) {
        ctx.moveTo(Math.random() * 512, Math.random() * 512);
        ctx.lineTo(Math.random() * 512, Math.random() * 512);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(256, 256, 120, 0, Math.PI * 2);
    ctx.stroke();

    return new THREE.CanvasTexture(canvas);
}

export const glyphPlanes = [];
const zOffsets = [-2, 0, 2];
zOffsets.forEach(z => {
    const pGeo = new THREE.PlaneGeometry(20, 20);
    const pMat = new THREE.MeshBasicMaterial({
        map: createGlyphTexture(),
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const pMesh = new THREE.Mesh(pGeo, pMat);
    pMesh.position.z = z;
    pMesh.userData.axis = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
    glyphPlanes.push(pMesh);
    sigilGroup.add(pMesh);
});

// Core Light
export const coreLight = new THREE.PointLight(0xf0d060, 3.0, 120, 2);
sigilGroup.add(coreLight);

// Bloom Sprite
function createBloomTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(256,256,0, 256,256,256);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.2, 'rgba(240, 208, 96, 0.6)');
    grad.addColorStop(1, 'rgba(240, 208, 96, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,512,512);
    return new THREE.CanvasTexture(canvas);
}
const spriteMat = new THREE.SpriteMaterial({
    map: createBloomTexture(),
    transparent: true,
    opacity: 0.15,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});
export const bloomSprite = new THREE.Sprite(spriteMat);
bloomSprite.scale.set(35, 35, 1);
sigilGroup.add(bloomSprite);

// Initial state for summon sequence
innerCore.scale.setScalar(0);
outerShell.scale.setScalar(0);

export function updateSigil(elapsed) {
    innerCore.rotation.x += 0.003;
    innerCore.rotation.y += 0.007;
    innerCore.rotation.z += 0.002;

    outerShell.rotation.x += -0.005;
    outerShell.rotation.y += -0.003;

    filaments.forEach(f => f.rotation.z += f.userData.rotSpeed);

    glyphPlanes.forEach(p => p.rotateOnAxis(p.userData.axis, 0.001));

    coreLight.intensity = 2.5 + Math.sin(elapsed * 1.0) * 1.0;
}
