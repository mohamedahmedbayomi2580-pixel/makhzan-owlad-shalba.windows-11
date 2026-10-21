const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function dataFile() { return path.join(app.getPath('userData'), 'database.json'); }
function readStore() {
  try { return JSON.parse(fs.readFileSync(dataFile(), 'utf8')); }
  catch { return {}; }
}
function writeStore(value) {
  const file = dataFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(value), 'utf8');
  fs.renameSync(tmp, file);
}
ipcMain.on('makhzan:storage-read', (event) => { event.returnValue = readStore(); });
ipcMain.on('makhzan:storage-write', (event, value) => {
  try { writeStore(value); event.returnValue = { ok: true }; }
  catch (error) { event.returnValue = { ok: false, message: String(error.message || error) }; }
});
ipcMain.on('makhzan:backup', async () => {
  const result = await dialog.showSaveDialog({
    title: 'حفظ نسخة احتياطية', defaultPath: 'makhzan-backup.json',
    filters: [{ name: 'JSON Backup', extensions: ['json'] }]
  });
  if (!result.canceled && result.filePath) {
    try { fs.copyFileSync(dataFile(), result.filePath); }
    catch (e) { dialog.showErrorBox('فشل النسخ الاحتياطي', String(e.message || e)); }
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 850, minWidth: 900, minHeight: 650,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: false,
      nodeIntegration: false,
      sandbox: false
    }
  });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.once('ready-to-show', () => win.show());
}
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
