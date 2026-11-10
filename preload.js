// Gives the page two safe abilities: copy a photo to the Windows clipboard,
// and save a photo to the Downloads folder.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("boDesktop", {
  copyImage: (pngBytes) => ipcRenderer.invoke("bo:copy-image", pngBytes),
  savePhoto: (filename, bytes) => ipcRenderer.invoke("bo:save-photo", filename, bytes),
});
