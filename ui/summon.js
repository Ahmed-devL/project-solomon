import { solomonState } from './state.js';

export function playSummonSequence(sceneGroup, rings, filamentsArray) {
    // Relying on rings from main and filaments from sigil passed in if needed
    // or just directly animating based on timing
    
    // Get objects
    const nameEl = document.getElementById('solomon-name');
    const statusEl = document.getElementById('status-line');
    const inputBar = document.getElementById('input-bar');

    // Make sure we have the sigil components
    const sigilGrp = sceneGroup.children.find(c => c.children.length > 5); // inner, outer, 6 filaments, 3 planes, light, bloom...
    if(!sigilGrp) return; // fail safe
    
    // sigilGrp.children[0] = innerCore
    // sigilGrp.children[1] = outerShell
    const innerCore = sigilGrp.children[0];
    const outerShell = sigilGrp.children[1];
    const filaments = [
        sigilGrp.children[2], sigilGrp.children[3], sigilGrp.children[4],
        sigilGrp.children[5], sigilGrp.children[6], sigilGrp.children[7]
    ];

    // t=0
    gsap.to(innerCore.scale, { x: 1, y: 1, z: 1, duration: 1.2, ease: "elastic.out(1, 0.5)" });
    gsap.to(outerShell.scale, { x: 1, y: 1, z: 1, duration: 1.2, ease: "elastic.out(1, 0.5)", delay: 0.1 });

    filaments.forEach((fil, idx) => {
        gsap.to(fil.material, { opacity: 0.35, duration: 0.8, delay: 0.2 + (idx * 0.1) });
    });

    const tl = gsap.timeline();

    function summonRing(r, delayMs) {
        tl.to(r.mesh.material, { opacity: r.spec.alwaysVisible ? 0.7 : 0.6, duration: 0.4 }, delayMs / 1000);
        tl.fromTo(r.group.scale, {x:0.3, y:0.3, z:0.3}, { x: 1, y: 1, z: 1, duration: 0.6, ease: "back.out(1.7)" }, delayMs / 1000);
        tl.to(innerCore.scale, { x: 1.08, y: 1.08, z: 1.08, duration: 0.15, yoyo: true, repeat: 1 }, delayMs / 1000);
    }

    // Rings
    // t=800ms
    const order = ['almadel', 'notoria', 'paulina', 'goetia', 'theurgia', 'almiras', 'verum', 'ephesia', 'fulcanelli', 'regalis'];
    const delays = [800, 980, 1160, 1340, 1520, 1700, 1880, 2060, 2240, 2420];

    order.forEach((id, i) => {
        const r = rings.find(x => x.id === id);
        if (r) {
            if (id === 'regalis') {
                tl.to(r.mesh.material, { opacity: 0.7, duration: 0.8 }, 2.420);
                tl.fromTo(r.group.scale, {x:0.3, y:0.3, z:0.3}, { x: 1.05, y: 1.05, z: 1.05, duration: 0.6, ease: "power2.out" }, 2.420);
                tl.to(r.group.scale, { x: 1, y: 1, z: 1, duration: 0.2 }, "+=0");
            } else {
                summonRing(r, delays[i]);
            }
        }
    });

    // Subtitles
    tl.to(nameEl, { opacity: 1, duration: 0.8 }, 2.800);
    
    // Status line changes
    setTimeout(() => {
        solomonState.setStatus("I am here.");
        gsap.to(statusEl, { opacity: 1, duration: 0.6 });
    }, 3400);

    setTimeout(() => {
        gsap.to(statusEl, { opacity: 0, duration: 0.3, onComplete: () => {
            solomonState.setStatus("Awaiting Command.");
            gsap.to(statusEl, { opacity: 1, duration: 0.3 });
        }});
        inputBar.style.pointerEvents = 'auto'; // allow input
    }, 5200);
}
