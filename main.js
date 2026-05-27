const { app, BrowserWindow } = require('electron');
const path = require('path');

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

app.whenReady().then(() => {
    createWindow();
});

app.on('window-all-closed', () => {
    app.quit();
});