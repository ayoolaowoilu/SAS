import { Redis } from '@upstash/redis'


const REDIS_URL = process.env.NEXT_PUBLIC_REDIS_URL
const REDIS_TOKEN = process.env.NEXT_PUBLIC_REDIS_TOKEN

if (!REDIS_URL) {
  console.error('[Redis] Missing REDIS_URL environment variable')
}
if (!REDIS_TOKEN) {
  console.error('[Redis] Missing REDIS_TOKEN environment variable')
}

const redis = new Redis({
  url: REDIS_URL || '',
  token: REDIS_TOKEN || '',
})



function addRedisData(data: unknown, key: string, ttlSeconds: number = 3600): Promise<{ error: string } | null> {
  // Validate inputs
  if (!key || typeof key !== 'string') {
    return Promise.resolve({ error: "Invalid key provided" })
  }
  if (!REDIS_URL || !REDIS_TOKEN) {
    return Promise.resolve({ error: "Redis not configured. Check env vars." })
  }

  let stringifiedData: string
  try {
    stringifiedData = typeof data === 'string' ? data : JSON.stringify(data)
  } catch (err) {
    console.error("[Redis] Failed to stringify data:", err)
    return Promise.resolve({ error: "Failed to serialize session data" })
  }

  const keyName = 'sas:' + key

  return redis.set(keyName, stringifiedData, { ex: ttlSeconds })
    .then(() => {
      console.log("[Redis] Cache set for key:", keyName)
      return null
    })
    .catch((err) => {
      console.error("[Redis] Set error:", err)
      // Handle specific error types
      const errMsg = err?.message || String(err)
      if (errMsg.includes('parse') || errMsg.includes('JSON')) {
        return { error: "Failed to parse Redis response. Check your Redis URL." }
      }
      if (errMsg.includes('auth') || errMsg.includes('token') || errMsg.includes('unauthorized')) {
        return { error: "Redis authentication failed. Check your token." }
      }
      if (errMsg.includes('fetch') || errMsg.includes('network')) {
        return { error: "Network error connecting to Redis." }
      }
      return { error: "Failed to create session: " + errMsg }
    })
}

/**
 * Get data from Redis.
 * Returns the data on success, null on failure or if not found.
 * No async/await — pure promise chains.
 */
function getRedisData(key: string): Promise<unknown> {
  if (!key || typeof key !== 'string') {
    return Promise.resolve(null)
  }
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.error("[Redis] Cannot get data — Redis not configured")
    return Promise.resolve(null)
  }

  const keyName = 'sas:' + key
  console.log("[Redis] Cache hit attempt for:", keyName)

  return redis.get(keyName)
    .then((result) => {
      // result can be null (key not found), a string, or parsed JSON
      if (result === null || result === undefined) {
        console.log("[Redis] Key not found:", keyName)
        return null
      }
      console.log("[Redis] Cache hit for:", keyName)
      return result
    })
    .catch((err) => {
      console.error("[Redis] Get error:", err)
      return null
    })
}

/**
 * Delete data from Redis.
 * Returns null on success, { error: string } on failure.
 * No async/await — pure promise chains.
 */
function deleteRedisData(key: string): Promise<{ error: string } | null> {
  if (!key || typeof key !== 'string') {
    return Promise.resolve({ error: "Invalid key provided" })
  }
  if (!REDIS_URL || !REDIS_TOKEN) {
    return Promise.resolve({ error: "Redis not configured" })
  }

  const keyName = 'sas:' + key

  return redis.del(keyName)
    .then(() => {
      console.log("[Redis] Cache deleted for key:", keyName)
      return null
    })
    .catch((err) => {
      console.error("[Redis] Del error:", err)
      return { error: "Failed to delete session" }
    })
}

export { addRedisData, getRedisData, deleteRedisData }