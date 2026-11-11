// Safe bridge between the page and the Windows app.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("boDesktop", {
  // Photos: Windows clipboard and Downloads folder
  copyImage: (pngBytes) => ipcRenderer.invoke("bo:copy-image", pngBytes),
  savePhoto: (filename, bytes) => ipcRenderer.invoke("bo:save-photo", filename, bytes),

  // Upload-Post direct posting. The API key stays in the app's main process.
  upGetConfig: () => ipcRenderer.invoke("up:get-config"),
  upSaveConfig: (cfg) => ipcRenderer.invoke("up:save-config", cfg),
  upClearConfig: () => ipcRenderer.invoke("up:clear-config"),
  upPublish: (req) => ipcRenderer.invoke("up:publish", req),
  upStatus: (q) => ipcRenderer.invoke("up:status", q),
});
