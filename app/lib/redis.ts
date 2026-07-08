import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
})

function addRedisData(data: unknown, key: string, ttlSeconds: number = 3600): void {
  const stringifiedData = typeof data === 'string' ? data : JSON.stringify(data)
  const keyName = 'sas:' + key
  redis.set(keyName, stringifiedData, { ex: ttlSeconds })
    .catch(err =>{
         console.log("Redis set error:", err)
        return {error:"Failed to create session"}} )
  console.log("Cache set for key:", keyName)
}

function getRedisData(key: string): Promise<unknown> {
  const keyName = 'sas:' + key
  console.log("Cache hit attempt for:", keyName)
  return redis.get(keyName)
}

function deleteRedisData(key: string): void {
  const keyName = 'sas:' + key
  redis.del(keyName)
    .catch(err => console.error("Redis del error:", err))
}

export { addRedisData, getRedisData, deleteRedisData }