export const solomonState = {
  rings: {
    almadel:    { active: false, intensity: 0 },
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
  
  listeners: [],
  
  subscribe(fn) {
    this.listeners.push(fn);
  },

  notify() {
    this.listeners.forEach(fn => fn(this));
  },

  update(payload) {
    if (payload.rings) {
      for (const key in payload.rings) {
        if (this.rings[key]) {
          Object.assign(this.rings[key], payload.rings[key]);
        }
      }
    }
    if (payload.statusText !== undefined) {
      this.setStatus(payload.statusText);
    }
    this.notify();
  },

  biometricSuccess() {
    document.dispatchEvent(new CustomEvent('bio-success'));
  },

  biometricFail() {
    document.dispatchEvent(new CustomEvent('bio-fail'));
  },

  updateSystemLoad(pct) {
    this.update({ rings: { theurgia: { load: pct } } });
  },

  updateChaos(level) {
    this.update({ rings: { fulcanelli: { chaos: level } } });
  },

  setStatus(text) {
    this.statusText = text;
    const sEl = document.getElementById('status-line');
    if (sEl) sEl.innerText = text;
  },

  switchView(v) {
    this.view = v;
    document.dispatchEvent(new CustomEvent('view-change', { detail: v }));
  }
};
