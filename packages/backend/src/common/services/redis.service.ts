type ExpiringValue<T> = {
  value: T
  expiresAt: number | null
}

export class RedisService {
  private kvStore = new Map<string, ExpiringValue<any>>()
  private hashStore = new Map<string, Map<string, any>>()
  private setStore = new Map<string, Set<any>>()
  private listStore = new Map<string, any[]>()

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null
    this.kvStore.set(key, { value, expiresAt })
  }

  async get<T = any>(key: string): Promise<T | null> {
    const record = this.kvStore.get(key)
    if (!record) return null
    if (record.expiresAt && record.expiresAt < Date.now()) {
      this.kvStore.delete(key)
      return null
    }
    return record.value as T
  }

  async hset(key: string, field: string, value: any): Promise<void> {
    if (!this.hashStore.has(key)) {
      this.hashStore.set(key, new Map())
    }
    this.hashStore.get(key)!.set(field, value)
  }

  async hget<T = any>(key: string, field: string): Promise<T | null> {
    const hash = this.hashStore.get(key)
    if (!hash) return null
    return (hash.get(field) ?? null) as T
  }

  async sadd(key: string, value: any): Promise<void> {
    if (!this.setStore.has(key)) {
      this.setStore.set(key, new Set())
    }
    this.setStore.get(key)!.add(value)
  }

  async smembers<T = any>(key: string): Promise<T[]> {
    return Array.from(this.setStore.get(key) ?? new Set()) as T[]
  }

  async lpush(key: string, value: any): Promise<void> {
    const list = this.listStore.get(key) ?? []
    list.unshift(value)
    this.listStore.set(key, list)
  }

  async rpush(key: string, value: any): Promise<void> {
    const list = this.listStore.get(key) ?? []
    list.push(value)
    this.listStore.set(key, list)
  }

  async lrange<T = any>(key: string, start: number, stop: number): Promise<T[]> {
    const list = this.listStore.get(key) ?? []
    const normalizedStop = stop === -1 ? list.length : stop + 1
    return list.slice(start, normalizedStop) as T[]
  }

  async del(key: string): Promise<void> {
    this.kvStore.delete(key)
    this.hashStore.delete(key)
    this.setStore.delete(key)
    this.listStore.delete(key)
  }

  async flushAll(): Promise<void> {
    this.kvStore.clear()
    this.hashStore.clear()
    this.setStore.clear()
    this.listStore.clear()
  }
}
