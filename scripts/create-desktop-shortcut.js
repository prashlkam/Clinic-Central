#!/usr/bin/env node
// Creates a "Clinic Central" shortcut on the desktop (and in the applications menu on Linux).
// Double-clicking it starts the app straight from this folder: no terminal, no server, no internet.
//
//   npm run desktop-shortcut            create / refresh the shortcut
//   npm run desktop-shortcut -- --remove   remove it again
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const APP_NAME = 'Clinic Central';
const root = path.resolve(__dirname, '..');
const remove = process.argv.includes('--remove');

function fail(msg) {
  console.error(`\n${msg}\n`);
  process.exit(1);
}

function desktopDir() {
  if (process.platform === 'linux') {
    try {
      const dir = execFileSync('xdg-user-dir', ['DESKTOP'], { encoding: 'utf8' }).trim();
      if (dir && dir !== os.homedir() && fs.existsSync(dir)) return dir;
    } catch { /* xdg-user-dir not installed */ }
  }
  if (process.platform === 'win32') {
    try {
      const dir = execFileSync('powershell', ['-NoProfile', '-Command', "[Environment]::GetFolderPath('Desktop')"], { encoding: 'utf8' }).trim();
      if (dir && fs.existsSync(dir)) return dir;
    } catch { /* fall through */ }
  }
  return path.join(os.homedir(), 'Desktop');
}

function rm(file) {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`Removed ${file}`);
  }
}

const desktop = desktopDir();
const targets = {
  linux: [path.join(desktop, 'clinic-central.desktop'), path.join(os.homedir(), '.local', 'share', 'applications', 'clinic-central.desktop')],
  win32: [path.join(desktop, `${APP_NAME}.lnk`)],
  darwin: [path.join(desktop, `${APP_NAME}.command`)],
}[process.platform];

if (!targets) fail(`Unsupported platform: ${process.platform}`);

if (remove) {
  targets.forEach(rm);
  process.exit(0);
}

// The shortcut runs the already-built app, so make sure the build exists.
let electronPath;
try {
  electronPath = require(path.join(root, 'node_modules', 'electron'));
} catch {
  fail('Electron is not installed. Run "npm install" in the project folder first.');
}
if (typeof electronPath !== 'string' || !fs.existsSync(electronPath)) {
  fail('The Electron program was not downloaded. Run "npm install" again (its install script must be allowed to run).');
}
for (const needed of ['dist/index.html', 'electron-dist/main.js']) {
  if (!fs.existsSync(path.join(root, needed))) fail(`${needed} is missing. Run "npm run build" first (or use "npm run desktop-shortcut", which builds for you).`);
}
if (!fs.existsSync(desktop)) fs.mkdirSync(desktop, { recursive: true });

if (process.platform === 'linux') {
  const q = s => `"${s.replace(/(["\\`$])/g, '\\$1')}"`;
  const entry = [
    '[Desktop Entry]',
    'Type=Application',
    'Version=1.0',
    `Name=${APP_NAME}`,
    'Comment=Dental clinic management (runs fully on this computer)',
    `Exec=${q(electronPath)} ${q(root)}`,
    `Path=${root}`,
    `Icon=${path.join(root, 'resources', 'icon.png')}`,
    'Terminal=false',
    'Categories=Office;',
    'StartupWMClass=clinic-central',
    '',
  ].join('\n');
  for (const file of targets) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, entry, { mode: 0o755 });
    console.log(`Created ${file}`);
  }
  // GNOME/Nautilus and some other desktops only launch .desktop files marked as trusted.
  try {
    execFileSync('gio', ['set', targets[0], 'metadata::trusted', 'true'], { stdio: 'ignore' });
  } catch { /* gio not available or not needed on this desktop */ }
  console.log(`\nDone. Double-click "${APP_NAME}" on the desktop, or find it in the applications menu.`);
  console.log('If the desktop asks, choose "Allow launching" / "Trust and launch" the first time.');
} else if (process.platform === 'win32') {
  const ps = [
    "$s = (New-Object -ComObject WScript.Shell).CreateShortcut($env:CC_LNK)",
    "$s.TargetPath = $env:CC_TARGET",
    "$s.Arguments = '\"' + $env:CC_ROOT + '\"'",
    "$s.WorkingDirectory = $env:CC_ROOT",
    "$s.IconLocation = $env:CC_ICON",
    "$s.Description = 'Dental clinic management (runs fully on this computer)'",
    "$s.Save()",
  ].join('; ');
  execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], {
    stdio: 'inherit',
    env: { ...process.env, CC_LNK: targets[0], CC_TARGET: electronPath, CC_ROOT: root, CC_ICON: path.join(root, 'resources', 'icon.ico') },
  });
  console.log(`Created ${targets[0]}\n\nDone. Double-click "${APP_NAME}" on the desktop.`);
} else {
  fs.writeFileSync(targets[0], `#!/bin/sh\ncd "${root}" && exec "${electronPath}" "${root}" >/dev/null 2>&1 &\n`, { mode: 0o755 });
  console.log(`Created ${targets[0]}\n\nDone. Double-click "${APP_NAME}" on the desktop.`);
}
