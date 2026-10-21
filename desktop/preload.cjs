const { ipcRenderer } = require('electron');

// File-backed localStorage-compatible adapter: avoids the small browser localStorage quota.
let values = ipcRenderer.sendSync('makhzan:storage-read') || {};
function persist() {
  const result = ipcRenderer.sendSync('makhzan:storage-write', values);
  if (!result || !result.ok) throw new Error((result && result.message) || 'تعذر حفظ البيانات على القرص');
}
const storage = new Proxy({}, {
  get(_target, prop) {
    if (prop === 'getItem') return (key) => Object.prototype.hasOwnProperty.call(values, String(key)) ? String(values[String(key)]) : null;
    if (prop === 'setItem') return (key, value) => { values[String(key)] = String(value); persist(); };
    if (prop === 'removeItem') return (key) => { delete values[String(key)]; persist(); };
    if (prop === 'clear') return () => { values = {}; persist(); };
    if (prop === 'key') return (index) => Object.keys(values)[index] ?? null;
    if (prop === 'length') return Object.keys(values).length;
    if (prop === Symbol.toStringTag) return 'Storage';
    if (typeof prop === 'string' && Object.prototype.hasOwnProperty.call(values, prop)) return String(values[prop]);
    return undefined;
  },
  set(_target, prop, value) { values[String(prop)] = String(value); persist(); return true; },
  deleteProperty(_target, prop) { delete values[String(prop)]; persist(); return true; },
  ownKeys() { return Object.keys(values); },
  getOwnPropertyDescriptor(_target, prop) {
    if (Object.prototype.hasOwnProperty.call(values, prop)) return { enumerable: true, configurable: true, value: String(values[prop]), writable: true };
    return undefined;
  }
});
try {
  Object.defineProperty(window, 'localStorage', { configurable: true, enumerable: true, value: storage });
} catch (e) {
  console.error('Could not install file-backed storage adapter:', e);
}
window.makhzanDesktop = { isDesktop: true, backup: () => ipcRenderer.send('makhzan:backup') };
