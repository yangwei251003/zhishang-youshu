import type { ProjectDocument } from '../types';
import { parseProject } from './files';
import { markStorageUnavailable } from './storage-health';

const DATABASE = 'zhishang-youshu';
const STORE = 'projects';
const CURRENT_PROJECT = 'current';
const LATEST_PROJECT = 'latest';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('此浏览器无法使用本地存储。请导出项目文件保留设计。')); return; }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onerror = () => reject(new Error('无法打开本地存储。请检查浏览器的存储权限。'));
    request.onblocked = () => reject(new Error('本地存储正在被其他窗口使用，请关闭旧版页面后重试。'));
    request.onsuccess = () => resolve(request.result);
  });
}

async function persistProject(project: ProjectDocument): Promise<void> {
  const snapshot = parseProject(JSON.stringify(project));
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(new Error('保存未完成，设计仍保留在当前页面。请导出项目文件备份。'));
      tx.onerror = () => reject(new Error('本地保存失败，可能已超出存储空间。请导出项目文件备份。'));
      const store = tx.objectStore(STORE);
      store.put(snapshot, snapshot.id);
      store.put(snapshot.id, LATEST_PROJECT);
    });
  } finally { db.close(); }
}

async function readProject(id?: string): Promise<ProjectDocument | null> {
  const db = await openDatabase();
  try {
    const record = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      tx.onabort = () => reject(new Error('读取本地设计失败，请重试或导入备份文件。'));
      const read = (key: string) => {
        const request = store.get(key);
        request.onerror = () => reject(new Error('读取本地设计失败，请重试或导入备份文件。'));
        request.onsuccess = () => resolve(request.result);
      };
      if (id) read(id);
      else {
        const latest = store.get(LATEST_PROJECT);
        latest.onerror = () => reject(new Error('读取最近设计失败。'));
        latest.onsuccess = () => read(typeof latest.result === 'string' ? latest.result : CURRENT_PROJECT);
      }
    });
    return record === undefined ? null : parseProject(JSON.stringify(record));
  } finally { db.close(); }
}

async function readProjects(): Promise<ProjectDocument[]> {
  const db = await openDatabase();
  try {
    const records = await new Promise<unknown[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).getAll();
      request.onerror = () => reject(new Error('读取作品列表失败，请重试。'));
      tx.onabort = () => reject(new Error('读取作品列表失败，请重试。'));
      request.onsuccess = () => resolve(request.result);
    });
    const projects = records.filter((record) => record && typeof record === 'object').map((record) => parseProject(JSON.stringify(record)));
    const byId = new Map<string, ProjectDocument>();
    for (const project of projects) {
      const previous = byId.get(project.id);
      if (!previous || previous.updatedAt < project.updatedAt) byId.set(project.id, project);
    }
    return [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } finally { db.close(); }
}

// Keep recoverable session snapshots when a private window denies persistent storage.
const sessionProjects = new Map<string, ProjectDocument>();
let sessionLatest: string | undefined;
export async function saveProject(project: ProjectDocument): Promise<void> {
  const snapshot = parseProject(JSON.stringify(project));
  sessionProjects.set(snapshot.id, snapshot); sessionLatest = snapshot.id;
  try { await persistProject(snapshot); } catch (error) { markStorageUnavailable(); throw error; }
}
export async function saveForTransition(project: ProjectDocument): Promise<void> {
  try { await saveProject(project); } catch { /* Already retained in session; visible health warning requests backup. */ }
}
export async function loadProject(id?: string): Promise<ProjectDocument | null> {
  try { return await readProject(id); } catch (error) { markStorageUnavailable(); throw error; }
}
export async function loadForSession(id?: string): Promise<ProjectDocument | null> {
  try { return await loadProject(id); } catch { return sessionProjects.get(id ?? sessionLatest ?? '') ?? null; }
}
export async function listProjects(): Promise<ProjectDocument[]> {
  try { return await readProjects(); } catch (error) { markStorageUnavailable(); throw error; }
}
export async function listForSession(): Promise<ProjectDocument[]> {
  let persisted: ProjectDocument[] = [];
  try { persisted = await listProjects(); } catch { /* warning is already visible */ }
  const merged = new Map(persisted.map(p => [p.id, p]));
  for (const item of sessionProjects.values()) { const old = merged.get(item.id); if (!old || old.updatedAt <= item.updatedAt) merged.set(item.id, item); }
  return [...merged.values()].sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
}
