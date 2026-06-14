const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

let mainWindow;
let wallpaperMode = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 980,
    minHeight: 680,
    title: 'Calendar',
    backgroundColor: '#070912',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

function setWallpaperMode(enabled) {
  if (!mainWindow) return false;
  wallpaperMode = Boolean(enabled);
  if (wallpaperMode) {
    const display = screen.getPrimaryDisplay();
    mainWindow.setBounds(display.workArea);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setSkipTaskbar(true);
    mainWindow.setResizable(false);
    mainWindow.setMovable(false);
    mainWindow.setMenuBarVisibility(false);
  } else {
    mainWindow.setSkipTaskbar(false);
    mainWindow.setResizable(true);
    mainWindow.setMovable(true);
    mainWindow.setBounds({ width: 1400, height: 900, x: 80, y: 60 });
  }
  return wallpaperMode;
}

app.whenReady().then(() => {
  ipcMain.handle('wallpaper-mode', (_event, enabled) => setWallpaperMode(enabled));
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
