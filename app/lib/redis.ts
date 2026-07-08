import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
})

async function addRedisData(data: unknown, key: string, ttlSeconds: number = 3600): Promise<{ error: string } | null> {
  try {
    const stringifiedData = typeof data === 'string' ? data : JSON.stringify(data)
    const keyName = 'sas:' + key
    await redis.set(keyName, stringifiedData, { ex: ttlSeconds })
    console.log("Cache set for key:", keyName)
    return null
  } catch (err) {
    console.error("Redis set error:", err)
    return { error: "Failed to create session" }
  }
}

async function getRedisData(key: string): Promise<unknown> {
  try {
    const keyName = 'sas:' + key
    console.log("Cache hit attempt for:", keyName)
    return await redis.get(keyName)
  } catch (err) {
    console.error("Redis get error:", err)
    return null
  }
}

async function deleteRedisData(key: string): Promise<{ error: string } | null> {
  try {
    const keyName = 'sas:' + key
    await redis.del(keyName)
    console.log("Cache deleted for key:", keyName)
    return null
  } catch (err) {
    console.error("Redis del error:", err)
    return { error: "Failed to delete session" }
  }
}

export { addRedisData, getRedisData, deleteRedisData }