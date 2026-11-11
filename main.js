// Broadcast Office desktop app (Electron)
const { app, BrowserWindow, shell, Menu, ipcMain, clipboard, nativeImage, safeStorage } = require("electron");
const path = require("path");
const fs = require("fs");

// ---------- Upload-Post direct posting ----------
// The API key is kept here in the main process, encrypted with Windows' own
// protection (safeStorage), and is only ever sent to api.upload-post.com.
const UP_API = "https://api.upload-post.com/api";
const UP_PLATFORMS = new Set(["x", "facebook", "instagram", "threads", "linkedin", "tiktok", "bluesky", "youtube"]);
const cfgFile = () => path.join(app.getPath("userData"), "upload-post.json");

function readCfg() {
  try {
    const raw = JSON.parse(fs.readFileSync(cfgFile(), "utf8"));
    let apiKey = "";
    if (raw.enc && safeStorage.isEncryptionAvailable()) apiKey = safeStorage.decryptString(Buffer.from(raw.enc, "base64"));
    else if (raw.plain) apiKey = raw.plain;
    return { apiKey, user: raw.user || "", facebookPageId: raw.facebookPageId || "" };
  } catch (e) {
    return { apiKey: "", user: "", facebookPageId: "" };
  }
}

function writeCfg(c) {
  const out = { user: c.user || "", facebookPageId: c.facebookPageId || "" };
  if (c.apiKey) {
    if (safeStorage.isEncryptionAvailable()) out.enc = safeStorage.encryptString(c.apiKey).toString("base64");
    else out.plain = c.apiKey;
  }
  fs.writeFileSync(cfgFile(), JSON.stringify(out));
}

async function upFetch(url, opts = {}) {
  const c = readCfg();
  if (!c.apiKey) return { ok: false, status: 401, body: { success: false, message: "Add your Upload-Post API key first." } };
  const res = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: "Apikey " + c.apiKey } });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch (e) { body = { message: text.slice(0, 300) }; }
  return { ok: res.ok, status: res.status, body };
}

ipcMain.handle("up:get-config", () => {
  const c = readCfg();
  return { hasKey: !!c.apiKey, user: c.user, facebookPageId: c.facebookPageId };
});

ipcMain.handle("up:save-config", (_e, c) => {
  const cur = readCfg();
  writeCfg({
    apiKey: String((c && c.apiKey) || "").trim() || cur.apiKey,
    user: String((c && c.user) || "").trim().slice(0, 100),
    facebookPageId: String((c && c.facebookPageId) || "").replace(/[^\d]/g, ""),
  });
  return true;
});

ipcMain.handle("up:clear-config", () => {
  try { fs.unlinkSync(cfgFile()); } catch (e) {}
  return true;
});

ipcMain.handle("up:publish", async (_e, req) => {
  const c = readCfg();
  if (!c.user) return { ok: false, status: 400, body: { success: false, message: "Add your Upload-Post profile name first." } };
  const kind = req && req.kind === "video" ? "video" : "photo";
  const platforms = (req.platforms || []).filter((p) => UP_PLATFORMS.has(p) && !(kind === "photo" && p === "youtube"));
  if (!platforms.length) return { ok: false, status: 400, body: { success: false, message: "Pick at least one site." } };

  const fd = new FormData();
  fd.append("user", c.user);
  platforms.forEach((p) => fd.append("platform[]", p));
  for (const [k, v] of Object.entries(req.fields || {})) {
    if (/^[a-z_]{1,40}$/.test(k) && v != null && v !== "") fd.append(k, String(v));
  }
  if (c.facebookPageId && platforms.includes("facebook")) fd.append("facebook_page_id", c.facebookPageId);
  const field = kind === "video" ? "video" : "photos[]";
  for (const f of (req.files || []).slice(0, kind === "video" ? 1 : 20)) {
    fd.append(field, new Blob([Buffer.from(f.bytes)], { type: f.type || "application/octet-stream" }), path.basename(String(f.name || "file")));
  }
  const headers = req.requestId ? { "Idempotency-Key": String(req.requestId) } : {};
  try {
    return await upFetch(`${UP_API}/${kind === "video" ? "upload" : "upload_photos"}`, { method: "POST", body: fd, headers });
  } catch (e) {
    return { ok: false, status: 0, body: { success: false, message: "Couldn't reach Upload-Post. Check your internet connection." } };
  }
});

ipcMain.handle("up:status", async (_e, q) => {
  const qs = q && q.jobId ? "job_id=" + encodeURIComponent(q.jobId) : "request_id=" + encodeURIComponent((q && q.requestId) || "");
  try {
    return await upFetch(`${UP_API}/uploadposts/status?${qs}`, { method: "GET" });
  } catch (e) {
    return { ok: false, status: 0, body: { message: "Couldn't reach Upload-Post." } };
  }
});

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
  if (!/\.(jpe?g|png|gif|webp|mp4|mov|webm)$/i.test(safe)) throw new Error("Only photos and videos can be saved.");
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
