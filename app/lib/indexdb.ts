const DB_NAME = 'myApp'
const DB_VERSION = 2  // Bumped for new stores

/* ─── Open DB with two stores ─── */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result
      
      // Sessions store (for session metadata)
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions')
      }
      
      // Attendees store (for attendee lists per classKey)
      if (!db.objectStoreNames.contains('attendees')) {
        db.createObjectStore('attendees')
      }
    }

    request.onsuccess = () => resolve(request.result as IDBDatabase)
    request.onerror = () => reject(request.error)
  })
}

/* ═══════════════════════════════════════════════════════════════
   SESSIONS STORE
   ═══════════════════════════════════════════════════════════════ */

async function saveSession(data: any): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('sessions', 'readwrite')
  const store = tx.objectStore('sessions')
  
  return new Promise((resolve, reject) => {
    const request = store.put(data, data.id)  // ✅ put = upsert
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function getSession(id: string): Promise<any | undefined> {
  const db = await openDB()
  const tx = db.transaction('sessions', 'readonly')
  const store = tx.objectStore('sessions')
  
  return new Promise((resolve, reject) => {
    const request = store.get(id)  // ✅ get = returns VALUE
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getAllSessions(): Promise<any[]> {
  const db = await openDB()
  const tx = db.transaction('sessions', 'readonly')
  const store = tx.objectStore('sessions')
  
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

async function removeSession(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('sessions', 'readwrite')
  const store = tx.objectStore('sessions')
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/* ═══════════════════════════════════════════════════════════════
   ATTENDEES STORE
   ═══════════════════════════════════════════════════════════════ */

async function saveAttendees(classKey: string, attendees: any[]): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('attendees', 'readwrite')
  const store = tx.objectStore('attendees')
  
  const payload = {
    id: `${classKey}:attendees`,
    classKey,
    attendees,
    updatedAt: Date.now()
  }
  
  return new Promise((resolve, reject) => {
    const request = store.put(payload, payload.id)  // ✅ put = upsert
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function getAttendees(classKey: string): Promise<any[]> {
  const db = await openDB()
  const tx = db.transaction('attendees', 'readonly')
  const store = tx.objectStore('attendees')
  
  return new Promise((resolve, reject) => {
    const request = store.get(`${classKey}:attendees`)  // ✅ get = returns VALUE
    request.onsuccess = () => {
      const result = request.result
      if (!result) return resolve([])
      if (Array.isArray(result.attendees)) return resolve(result.attendees)
      if (Array.isArray(result)) return resolve(result)
      resolve([])
    }
    request.onerror = () => reject(request.error)
  })
}

async function getAllAttendees(): Promise<any[]> {
  const db = await openDB()
  const tx = db.transaction('attendees', 'readonly')
  const store = tx.objectStore('attendees')
  
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

async function removeAttendees(classKey: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('attendees', 'readwrite')
  const store = tx.objectStore('attendees')
  
  return new Promise((resolve, reject) => {
    const request = store.delete(`${classKey}:attendees`)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/* ═══════════════════════════════════════════════════════════════
   BACKWARD COMPATIBILITY (old API)
   ═══════════════════════════════════════════════════════════════ */

async function save(data: any): Promise<void> {
  // Route to correct store based on data shape
  if ('attendees' in data && !('name' in data)) {
    return saveAttendees(data.classKey, data.attendees)
  }
  return saveSession(data)
}

async function get(id: string): Promise<any | undefined> {
  // Try attendees first, then sessions
  const attendees = await getAttendees(id.replace(':attendees', ''))
  if (attendees.length > 0) return attendees
  
  return getSession(id)
}

async function getAll(): Promise<any[]> {
  const sessions = await getAllSessions()
  return sessions
}

async function remove(id: string): Promise<void> {
  await removeSession(id)
  await removeAttendees(id)
}

export {
  // New explicit API
  saveSession,
  getSession,
  getAllSessions,
  removeSession,
  saveAttendees,
  getAttendees,
  getAllAttendees,
  removeAttendees,
  // Old API (backward compatible)
  save,
  get,
  getAll,
  remove
}