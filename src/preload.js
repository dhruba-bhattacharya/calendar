const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('calendarShell', {
  setWallpaperMode: (enabled) => ipcRenderer.invoke('wallpaper-mode', enabled)
});
