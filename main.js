// Broadcast Office desktop app (Electron)
const { app, BrowserWindow, shell, Menu, ipcMain, clipboard, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");

// Copy a photo (PNG bytes from the page) to the Windows clipboard.
ipcMain.handle("bo:copy-image", (_event, pngBytes) => {
  const img = nativeImage.createFromBuffer(Buffer.from(pngBytes));
  if (img.isEmpty()) throw new Error("That photo couldn't be read.");
  clipboard.writeImage(img);
  return true;
});

// Save a photo into Downloads without overwriting an existing file, then show it.
ipcMain.handle("bo:save-photo", (_event, filename, bytes) => {
  const safe = path.basename(String(filename || "photo.jpg")).replace(/[<>:"/\\|?*\x00-\x1f]/g, "_") || "photo.jpg";
  if (!/\.(jpe?g|png|gif|webp)$/i.test(safe)) throw new Error("Only photos can be saved.");
  const dir = app.getPath("downloads");
  const ext = path.extname(safe), base = path.basename(safe, ext);
  let target = path.join(dir, safe), n = 1;
  while (fs.existsSync(target)) target = path.join(dir, `${base} (${n++})${ext}`);
  fs.writeFileSync(target, Buffer.from(bytes));
  shell.showItemInFolder(target);
  return target;
});

// Links to websites, Gmail, Outlook, WhatsApp and so on open in the
// person's normal web browser instead of inside the app window.
function openOutside(url) {
  if (/^(https?|mailto|sms|tel):/i.test(url)) shell.openExternal(url);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1180,
    height: 860,
    minWidth: 420,
    minHeight: 500,
    title: "Broadcast Office",
    icon: path.join(__dirname, "build", "icon.png"),
    backgroundColor: "#F3F5F9",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    openOutside(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file:")) {
      event.preventDefault();
      openOutside(url);
    }
  });

  win.loadFile(path.join(__dirname, "index.html"));
}

// Only one copy of the app at a time; opening it again focuses the window.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
