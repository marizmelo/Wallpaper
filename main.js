const { app, BrowserWindow, ipcMain, session, screen } = require('electron');
const path = require('path');

let windows = [];
let readyCount = 0;
let totalWindows = 0;

function createWindow() {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media' || permission === 'geolocation') {
      callback(true);
    } else {
      callback(false);
    }
  });

  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  const hasMultipleDisplays = displays.length > 1;

  // Primary first
  const sorted = [...displays].sort((a, b) => {
    if (a.id === primaryDisplay.id) return -1;
    if (b.id === primaryDisplay.id) return 1;
    return 0;
  });

  sorted.forEach((display) => {
    const { x, y, width, height } = display.bounds;
    const isPrimary = display.id === primaryDisplay.id;

    if (!isPrimary && !hasMultipleDisplays) return;

    totalWindows++;
    const mode = isPrimary ? 'earth' : 'saturn';

    const win = new BrowserWindow({
      x: x + 50,
      y: y + 50,
      width: width - 100,
      height: height - 100,
      frame: false,
      backgroundColor: '#000000',
      skipTaskbar: true,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false
      }
    });

    win.loadFile('index.html', { hash: mode });

    win.webContents.on('did-finish-load', () => {
      win.setBounds({ x, y, width, height });
      win.setFullScreen(true);
      win.show();
      win.webContents.insertCSS('* { cursor: none !important; }');
    });

    win.on('closed', () => {
      windows = windows.filter(w => w !== win);
    });

    windows.push(win);
  });
}

// Windows signal when planet is loaded and ready to fade in
ipcMain.on('window-ready', () => {
  readyCount++;
  if (readyCount >= totalWindows) {
    // Tell all windows to fade in planets together
    windows.forEach(w => {
      if (!w.isDestroyed()) {
        w.webContents.send('all-ready');
      }
    });
  }
});

// Forward head tracking data from primary to all other windows
ipcMain.on('head-data', (event, data) => {
  windows.forEach(w => {
    if (!w.isDestroyed() && w.webContents !== event.sender) {
      w.webContents.send('head-data', data);
    }
  });
});

ipcMain.on('quit', () => {
  windows.forEach(w => { if (!w.isDestroyed()) w.close(); });
  app.quit();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});
