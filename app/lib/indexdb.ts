/* ──────────────────────────── IndexedDB Library ──────────────────────────── */
/* Primary storage for ALL session data. No Redis looping. Redis is only used 
   for cross-device sync (fire-and-forget). All reads come from IndexedDB. */

const DB_NAME = "AttendanceDB";
const DB_VERSION = 1;
const SESSION_STORE = "sessions";
const ATTENDEES_STORE = "attendees";

interface DBSession {
  classKey: string;
  data: string; // JSON stringified Session
  updatedAt: number;
}

interface DBAttendees {
  classKey: string;
  data: string; // JSON stringified Attendee[]
  updatedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Sessions store
      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        const sessionStore = db.createObjectStore(SESSION_STORE, { keyPath: "classKey" });
        sessionStore.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      // Attendees store
      if (!db.objectStoreNames.contains(ATTENDEES_STORE)) {
        const attendeeStore = db.createObjectStore(ATTENDEES_STORE, { keyPath: "classKey" });
        attendeeStore.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
  });
}

/* ─── Session Operations ─── */

export async function saveSession(session:any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSION_STORE, "readwrite");
    const store = tx.objectStore(SESSION_STORE);

    const record: DBSession = {
      classKey: session.classKey,
      data: JSON.stringify(session),
      updatedAt: Date.now(),
    };

    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function getSession(classKey: string): Promise<Record<string, unknown> | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSION_STORE, "readonly");
    const store = tx.objectStore(SESSION_STORE);
    const request = store.get(classKey);

    request.onsuccess = () => {
      const result = request.result as DBSession | undefined;
      if (!result) {
        resolve(null);
        return;
      }
      try {
        const parsed = JSON.parse(result.data);
        resolve(parsed);
      } catch {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function getAllSessions(): Promise<Array<Record<string, unknown> & { classKey: string; attended: number }>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSION_STORE, "readonly");
    const store = tx.objectStore(SESSION_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = request.result as DBSession[];
      const sessions = results
        .map((r) => {
          try {
            return JSON.parse(r.data);
          } catch {
            return null;
          }
        })
        .filter((s): s is Record<string, unknown> & { classKey: string; attended: number } => s !== null);
      resolve(sessions);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function deleteSession(classKey: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSION_STORE, "readwrite");
    const store = tx.objectStore(SESSION_STORE);
    const request = store.delete(classKey);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

/* ─── Attendees Operations ─── */

export async function saveAttendees(classKey: string, attendees: Array<Record<string, unknown>>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ATTENDEES_STORE, "readwrite");
    const store = tx.objectStore(ATTENDEES_STORE);

    const record: DBAttendees = {
      classKey,
      data: JSON.stringify(attendees),
      updatedAt: Date.now(),
    };

    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}



export async function deleteAttendees(classKey: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ATTENDEES_STORE, "readwrite");
    const store = tx.objectStore(ATTENDEES_STORE);
    const request = store.delete(classKey);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}