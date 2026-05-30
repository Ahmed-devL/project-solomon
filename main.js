const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// ── Brain process (WSL Python) ────────────────────────────────────────────────
// brain.py runs inside WSL where Python3 and Ollama both live.
// The Windows path D:\solomon-windows maps to /mnt/d/solomon-windows in WSL.
let brainProcess = null;

function startBrain() {
    const wslScriptPath = '/mnt/d/solomon-windows/brain.py';

    brainProcess = spawn('wsl', ['/mnt/d/solomon-windows/venv/bin/python', wslScriptPath], {
        // Detach stdio from the Electron terminal window — pipe it so we can log it
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Forward brain.py stdout to Electron's console (visible in DevTools)
    brainProcess.stdout.on('data', (data) => {
        process.stdout.write(`[brain] ${data}`);
    });

    // Forward brain.py stderr separately so errors are easy to spot
    brainProcess.stderr.on('data', (data) => {
        process.stderr.write(`[brain:err] ${data}`);
    });

    brainProcess.on('exit', (code, signal) => {
        if (code !== null) {
            console.log(`[brain] Process exited with code ${code}`);
        } else if (signal !== null) {
            console.log(`[brain] Process killed by signal ${signal}`);
        }
        brainProcess = null;
    });

    brainProcess.on('error', (err) => {
        console.error(`[brain] Failed to start WSL process: ${err.message}`);
        console.error('[brain] Make sure WSL is installed and brain.py dependencies are installed inside WSL.');
    });

    console.log('[brain] Spawned brain.py via WSL.');
}

function stopBrain() {
    if (brainProcess) {
        console.log('[brain] Shutting down brain process...');
        brainProcess.kill();
        brainProcess = null;
    }
}


// ── Electron window ───────────────────────────────────────────────────────────

function createWindow() {
    const win = new BrowserWindow({
        width: 1440,
        height: 900,
        frame: false,
        backgroundColor: '#02010a',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        }
    });

    win.loadFile(path.join(__dirname, 'ui', 'index.html'));
}


// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
    startBrain();    // Start Python backend first
    setTimeout(createWindow, 1500);  // Give brain.py time to bind ws port
});

app.on('window-all-closed', () => {
    stopBrain();     // Kill brain.py before quitting
    app.quit();
});

// Safety net: also kill brain if Electron is force-quit
process.on('exit', stopBrain);
process.on('SIGTERM', () => { stopBrain(); process.exit(0); });