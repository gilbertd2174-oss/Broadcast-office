// Broadcast Office desktop app (Electron)
const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");

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
