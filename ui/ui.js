import { solomonState } from './state.js';

export function setupUI(sceneGroup, rings) {
    const debugPanel = document.getElementById('debug-panel');
    const debugRings = document.getElementById('debug-rings');
    const debugSpecials = document.getElementById('debug-specials');
    const debugReadout = document.getElementById('debug-readout');
    const inputBar = document.getElementById('input-bar');
    const cmdInput = document.getElementById('cmd-input');
    const sendBtn = document.getElementById('send-btn');
    const viewToggle = document.getElementById('view-toggle');
    const chatLog = document.getElementById('chat-log');
    const statusLine = document.getElementById('status-line');
    const solomonName = document.getElementById('solomon-name');

    // View System
    document.addEventListener('view-change', (e) => {
        const v = e.detail;
        if(v === 'dialogue') {
            gsap.to(sceneGroup.scale, { x: 0.28, y: 0.28, z: 0.28, duration: 0.8, ease: "power2.inOut" });
            gsap.to(sceneGroup.position, { y: 80, duration: 0.8, ease: "power2.inOut" });
            gsap.to([solomonName, statusLine], { opacity: 0, duration: 0.5 });
            
            chatLog.style.pointerEvents = 'auto';
            gsap.to(chatLog, { opacity: 1, duration: 0.8 });

            if (chatLog.children.length === 0) {
                appendChat('SOLOMON', 'You have called, and I have answered. The rings are bound. The seal is drawn. What would you have of me?');
            }
        } else {
            // Revert
            gsap.to(sceneGroup.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.8, ease: "power2.inOut" });
            gsap.to(sceneGroup.position, { y: 0, duration: 0.8, ease: "power2.inOut" });
            gsap.to([solomonName, statusLine], { opacity: 1, duration: 0.8 });
            
            chatLog.style.pointerEvents = 'none';
            gsap.to(chatLog, { opacity: 0, duration: 0.5 });
        }
    });

    viewToggle.addEventListener('click', () => {
        solomonState.switchView(solomonState.view === 'presence' ? 'dialogue' : 'presence');
    });

    const appendChat = (sender, text) => {
        const div = document.createElement('div');
        div.className = sender === 'YOU' ? 'msg-user' : 'msg-solomon';
        div.innerHTML = `<span class="msg-label">${sender}</span><p class="msg-text">${text}</p>`;
        chatLog.appendChild(div);
        chatLog.scrollTop = chatLog.scrollHeight;
    };

    const handleSend = () => {
        const text = cmdInput.value.trim();
        if(!text) return;
        
        if (solomonState.view === 'presence') {
            solomonState.switchView('dialogue');
        }

        appendChat('YOU', text);
        cmdInput.value = '';

        setTimeout(() => {
            appendChat('SOLOMON', `I hear your command. The intent is clear. Engaging logic gates.`);
            // Basic demo of rings activating to show interactivity
            solomonState.update({ rings: { goetia: { active: true }, ephesia: { active: true } } });
        }, 800);
    };

    sendBtn.addEventListener('click', handleSend);
    cmdInput.addEventListener('keydown', (e) => {
        if(e.key === 'Enter') handleSend();
    });

    // Debug Panel toggle via backtick
    window.addEventListener('keydown', (e) => {
        if (e.key === '\`') {
            debugPanel.style.display = debugPanel.style.display === 'block' ? 'none' : 'block';
        }
    });

    // Setup debug buttons
    const createBtn = (text, parent, onClick) => {
        const btn = document.createElement('button');
        btn.className = 'debug-btn';
        btn.innerText = text;
        btn.addEventListener('click', onClick);
        parent.appendChild(btn);
        return btn;
    };

    const ringBtns = {};
    rings.forEach(r => {
        const btnText = r.spec.name.replace('Ars ', '').toUpperCase();
        const btn = createBtn(btnText, debugRings, () => {
            const isActive = solomonState.rings[r.id].active;
            solomonState.update({ rings: { [r.id]: { active: !isActive } } });
        });
        
        const c = new THREE.Color(r.spec.color);
        btn.style.borderColor = `rgba(${c.r*255}, ${c.g*255}, ${c.b*255}, 0.5)`;
        ringBtns[r.id] = btn;
    });

    const updateBtns = () => {
        let activeCount = 0;
        rings.forEach(r => {
            if(solomonState.rings[r.id].active) {
                ringBtns[r.id].classList.add('active');
                const c = new THREE.Color(r.spec.color);
                ringBtns[r.id].style.background = `rgba(${c.r*255}, ${c.g*255}, ${c.b*255}, 0.3)`;
                activeCount++;
            } else {
                ringBtns[r.id].classList.remove('active');
                ringBtns[r.id].style.background = 'transparent';
            }
        });
        debugReadout.innerText = `Active rings: ${activeCount} / 10`;
    };

    solomonState.subscribe(updateBtns);
    updateBtns();

    createBtn('BIOMETRIC OK', debugSpecials, () => solomonState.biometricSuccess());
    createBtn('BIOMETRIC FAIL', debugSpecials, () => solomonState.biometricFail());
    createBtn('SYSTEM OVERLOAD', debugSpecials, () => solomonState.updateSystemLoad(0.96));
    createBtn('CHAOS MAX', debugSpecials, () => solomonState.updateChaos(1.0));
    createBtn('CHAOS RESET', debugSpecials, () => solomonState.updateChaos(0));
    createBtn('SUMMON ALL', debugSpecials, () => {
        const updates = {};
        rings.forEach(r => updates[r.id] = {active: true});
        solomonState.update({ rings: updates });
    });
    createBtn('DISMISS ALL', debugSpecials, () => {
        const updates = {};
        rings.forEach(r => updates[r.id] = {active: false});
        solomonState.update({ rings: updates });
    });
}
