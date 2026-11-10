# Broadcast Office for Windows

A desktop version of Broadcast Office. It installs like a normal program, with a Start menu entry, a desktop shortcut and its own window.

- **Post:** write once, then copy and open each social site, Buffer or Meta Business Suite.
- **Contacts:** add or import contacts, then email or text everyone you select. Contacts are saved on this computer.

Links to Gmail, Outlook, WhatsApp and the social sites open in your normal web browser.

## Get the installer with GitHub (free)

1. On github.com, click **+ → New repository**, name it `broadcast-office-app`, and click **Create repository**.
2. Click **uploading an existing file** and drag in: `index.html`, `main.js`, `package.json`, `README.md`, and the `build` folder (with `icon.png` and `icon.ico`). Click **Commit changes**.
3. Add the build instructions by hand, because the hidden `.github` folder doesn't upload by dragging:
   - Click **Add file → Create new file**.
   - In the name box type exactly `.github/workflows/build.yml` (note the **s** in workflows).
   - Open `build.yml` from this ZIP in Notepad, copy everything, paste it in, and click **Commit changes**.
4. Open the **Actions** tab. A run called **Build Windows app** starts. It takes about 5 minutes.
5. When it has a green check, click it, scroll to **Artifacts** at the bottom of the Summary page, and download **Broadcast-Office-Windows**.

## Install it

1. Unzip the download and double-click **Broadcast-Office-Setup-1.0.0.exe**.
2. Windows may show **"Windows protected your PC"** because the app isn't signed with a paid certificate. Click **More info → Run anyway**.
3. Follow the installer. Broadcast Office appears in the Start menu and on your desktop.

To remove it later: **Settings → Apps → Installed apps → Broadcast Office → Uninstall**.

## Test it without installing (optional)

With Node.js installed: run `npm install` then `npm start` in this folder.
