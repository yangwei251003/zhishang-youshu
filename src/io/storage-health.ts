let unavailable = false;
const listeners = new Set<() => void>();
export function markStorageUnavailable() { unavailable = true; for (const listener of listeners) listener(); }
export function isStorageUnavailable() { return unavailable; }
export function subscribeStorage(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function probePreferences() { try { const key='paperWorkshop.storage-probe'; localStorage.setItem(key,'1'); localStorage.removeItem(key); } catch { markStorageUnavailable(); } }
