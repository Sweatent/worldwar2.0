import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis
  private subscriber: Redis

  async onModuleInit() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
    })

    this.subscriber = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
    })

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err)
    })

    this.subscriber.on('error', (err) => {
      console.error('Redis Subscriber Error:', err)
    })
  }

  async onModuleDestroy() {
    await this.client.quit()
    await this.subscriber.quit()
  }

  // String operations
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const stringValue = JSON.stringify(value)
    if (ttl) {
      await this.client.setex(key, ttl, stringValue)
    } else {
      await this.client.set(key, stringValue)
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key)
    return value ? JSON.parse(value) : null
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key)
    return result === 1
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds)
  }

  // Hash operations
  async hset(key: string, field: string, value: any): Promise<void> {
    await this.client.hset(key, field, JSON.stringify(value))
  }

  async hget<T>(key: string, field: string): Promise<T | null> {
    const value = await this.client.hget(key, field)
    return value ? JSON.parse(value) : null
  }

  async hgetall<T extends Record<string, any>>(key: string): Promise<T | null> {
    const value = await this.client.hgetall(key)
    if (!value || Object.keys(value).length === 0) {
      return null
    }
    const result: any = {}
    for (const [field, val] of Object.entries(value)) {
      result[field] = JSON.parse(val)
    }
    return result as T
  }

  async hdel(key: string, field: string): Promise<void> {
    await this.client.hdel(key, field)
  }

  async hkeys(key: string): Promise<string[]> {
    return this.client.hkeys(key)
  }

  // Set operations
  async sadd(key: string, ...members: string[]): Promise<void> {
    await this.client.sadd(key, ...members)
  }

  async srem(key: string, ...members: string[]): Promise<void> {
    await this.client.srem(key, ...members)
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key)
  }

  async sismember(key: string, member: string): Promise<boolean> {
    const result = await this.client.sismember(key, member)
    return result === 1
  }

  async scard(key: string): Promise<number> {
    return this.client.scard(key)
  }

  // Sorted set operations
  async zadd(key: string, score: number, member: string): Promise<void> {
    await this.client.zadd(key, score, member)
  }

  async zrem(key: string, member: string): Promise<void> {
    await this.client.zrem(key, member)
  }

  async zrange(key: string, start: number, stop: number, withScores = false): Promise<string[]> {
    if (withScores) {
      return this.client.zrange(key, start, stop, 'WITHSCORES')
    }
    return this.client.zrange(key, start, stop)
  }

  async zrevrange(key: string, start: number, stop: number, withScores = false): Promise<string[]> {
    if (withScores) {
      return this.client.zrevrange(key, start, stop, 'WITHSCORES')
    }
    return this.client.zrevrange(key, start, stop)
  }

  async zscore(key: string, member: string): Promise<number | null> {
    const score = await this.client.zscore(key, member)
    return score !== null ? parseFloat(score) : null
  }

  async zincrby(key: string, increment: number, member: string): Promise<number> {
    const result = await this.client.zincrby(key, increment, member)
    return parseFloat(result)
  }

  // List operations
  async lpush(key: string, ...values: any[]): Promise<void> {
    const stringValues = values.map(v => JSON.stringify(v))
    await this.client.lpush(key, ...stringValues)
  }

  async rpush(key: string, ...values: any[]): Promise<void> {
    const stringValues = values.map(v => JSON.stringify(v))
    await this.client.rpush(key, ...stringValues)
  }

  async lpop<T>(key: string): Promise<T | null> {
    const value = await this.client.lpop(key)
    return value ? JSON.parse(value) : null
  }

  async rpop<T>(key: string): Promise<T | null> {
    const value = await this.client.rpop(key)
    return value ? JSON.parse(value) : null
  }

  async lrange<T>(key: string, start: number, stop: number): Promise<T[]> {
    const values = await this.client.lrange(key, start, stop)
    return values.map(v => JSON.parse(v))
  }

  async llen(key: string): Promise<number> {
    return this.client.llen(key)
  }

  async ltrim(key: string, start: number, stop: number): Promise<void> {
    await this.client.ltrim(key, start, stop)
  }

  // Pub/Sub operations
  async publish(channel: string, message: any): Promise<number> {
    return this.client.publish(channel, JSON.stringify(message))
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    await this.subscriber.subscribe(channel)
    this.subscriber.on('message', (ch, msg) => {
      if (ch === channel) {
        try {
          callback(JSON.parse(msg))
        } catch (error) {
          console.error('Error parsing message:', error)
        }
      }
    })
  }

  async unsubscribe(channel: string): Promise<void> {
    await this.subscriber.unsubscribe(channel)
  }

  // Transaction support
  multi() {
    return this.client.multi()
  }

  // Get raw client for advanced operations
  getClient(): Redis {
    return this.client
  }

  getSubscriber(): Redis {
    return this.subscriber
  }
}
