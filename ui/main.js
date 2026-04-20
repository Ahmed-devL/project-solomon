import { setupSceneEnvironment, updateEnvironment } from './particles.js';
import { sigilGroup, updateSigil } from './sigil.js';
import { rings, updateRings, setupRaycaster } from './rings.js';
import { solomonState } from './state.js';
import { setupUI } from './ui.js';
import { playSummonSequence } from './summon.js';

// Three.js setup
const canvasContainer = document.getElementById('canvas-container');
export const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020103, 0.0018);

export const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
export const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
canvasContainer.appendChild(renderer.domElement);

export const sceneGroup = new THREE.Group();
scene.add(sceneGroup);

// Add primary objects to sceneGroup
sceneGroup.add(sigilGroup);
rings.forEach(r => sceneGroup.add(r.group));

// Add environment
setupSceneEnvironment(sceneGroup);

// Lighting
const ambientLight = new THREE.AmbientLight(0x0a0812, 0.4);
scene.add(ambientLight);

const pointLightLeft = new THREE.PointLight(0x2a1a5a, 1.5);
pointLightLeft.position.set(-150, 50, -80);
scene.add(pointLightLeft);

const pointLightRight = new THREE.PointLight(0x1a3a5a, 1.5);
pointLightRight.position.set(150, 50, -80);
scene.add(pointLightRight);

const pointLightTop = new THREE.PointLight(0xc9a84c, 0.8);
pointLightTop.position.set(0, 200, 0);
scene.add(pointLightTop);

const spotLight = new THREE.SpotLight(0xffffff, 0.5);
spotLight.position.set(0, 300, 0);
spotLight.target.position.set(0,0,0);
spotLight.penumbra = 0.8;
spotLight.angle = 0.3;
scene.add(spotLight);
scene.add(spotLight.target);

// Camera and interaction
camera.position.set(0, 40, 180);
camera.lookAt(0, 0, 0);

let targetCameraX = 0;
let targetCameraY = 40;

window.addEventListener('mousemove', (e) => {
    if (solomonState.view === 'presence') {
        let rawX = e.clientX - window.innerWidth / 2;
        let rawY = e.clientY - window.innerHeight / 2;
        targetCameraX = rawX * 0.015;
        targetCameraY = -rawY * 0.010 + 40;
    } else {
        targetCameraX = 0;
        targetCameraY = 40;
    }
});

setupRaycaster(camera, sceneGroup, renderer);

const clock = new THREE.Clock();
let frameCount = 0;

function animate() {
    requestAnimationFrame(animate);
    frameCount++;
    
    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    if(solomonState.view === 'presence') {
        camera.position.x += (targetCameraX - camera.position.x) * 0.03;
        camera.position.y += (targetCameraY - camera.position.y) * 0.03;
    }
    camera.lookAt(0, sceneGroup.position.y, 0);

    updateEnvironment(elapsed, rings);
    updateSigil(elapsed);
    updateRings(elapsed, delta, frameCount);
    
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Init
setupUI(sceneGroup, rings);
playSummonSequence(sceneGroup, rings);

animate();
