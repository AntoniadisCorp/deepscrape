import { Inject, Injectable } from '@angular/core'
import { SessionStorage } from './storage.service'

type CacheEnvelope<TValue> = {
  value: TValue
  expiresAt: number
}

@Injectable({
  providedIn: 'root',
})
export class CacheService {
  private readonly storagePrefix = 'deepscrape:cache:'
  private readonly defaultTtlMs = 10 * 60 * 1000
  private readonly paginationCursorTtlMs = 5 * 60 * 1000

  constructor(@Inject(SessionStorage) private storage: Storage) {}

  set<TKey, TValue>(namespace: string, key: TKey, value: TValue, ttlMs?: number): void {
    const ttl = this.resolveTtl(namespace, ttlMs)
    const envelope: CacheEnvelope<TValue> = {
      value,
      expiresAt: Date.now() + ttl,
    }

    this.storage.setItem(this.toStorageKey(namespace, key), JSON.stringify(envelope))
  }

  get<TKey, TValue>(namespace: string, key: TKey): TValue | undefined {
    const storageKey = this.toStorageKey(namespace, key)
    const envelope = this.readEnvelope<TValue>(storageKey)
    if (!envelope) {
      return undefined
    }

    if (this.isExpired(envelope)) {
      this.storage.removeItem(storageKey)
      return undefined
    }

    return envelope.value
  }

  has<TKey>(namespace: string, key: TKey): boolean {
    return this.get(namespace, key) !== undefined
  }

  delete<TKey>(namespace: string, key: TKey): boolean {
    const storageKey = this.toStorageKey(namespace, key)
    const exists = this.storage.getItem(storageKey) !== null
    if (exists) {
      this.storage.removeItem(storageKey)
    }

    return exists
  }

  clear(namespace: string): void {
    const namespacePrefix = this.toNamespacePrefix(namespace)
    const keysToDelete: string[] = []

    for (let index = 0; index < this.storage.length; index += 1) {
      const key = this.storage.key(index)
      if (key && key.startsWith(namespacePrefix)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach((key) => this.storage.removeItem(key))
  }

  clearAll(): void {
    const keysToDelete: string[] = []

    for (let index = 0; index < this.storage.length; index += 1) {
      const key = this.storage.key(index)
      if (key && key.startsWith(this.storagePrefix)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach((key) => this.storage.removeItem(key))
  }

  getMaxNumericKey(namespace: string): number {
    let max = 0

    const namespacePrefix = this.toNamespacePrefix(namespace)
    const expiredKeys: string[] = []

    for (let index = 0; index < this.storage.length; index += 1) {
      const storageKey = this.storage.key(index)
      if (!storageKey || !storageKey.startsWith(namespacePrefix)) {
        continue
      }

      const envelope = this.readEnvelope<unknown>(storageKey)
      if (!envelope || this.isExpired(envelope)) {
        expiredKeys.push(storageKey)
        continue
      }

      const encodedKey = storageKey.slice(namespacePrefix.length)
      const parsedKey = this.parseKey(encodedKey)
      if (typeof parsedKey === 'number' && Number.isFinite(parsedKey)) {
        max = Math.max(max, parsedKey)
      }
    }

    expiredKeys.forEach((key) => this.storage.removeItem(key))

    return max
  }

  private toStorageKey(namespace: string, key: unknown): string {
    return `${this.toNamespacePrefix(namespace)}${this.serializeKey(key)}`
  }

  private toNamespacePrefix(namespace: string): string {
    return `${this.storagePrefix}${namespace}:`
  }

  private serializeKey(key: unknown): string {
    return encodeURIComponent(JSON.stringify(key))
  }

  private parseKey(encodedKey: string): unknown {
    try {
      return JSON.parse(decodeURIComponent(encodedKey))
    } catch {
      return undefined
    }
  }

  private readEnvelope<TValue>(storageKey: string): CacheEnvelope<TValue> | undefined {
    const raw = this.storage.getItem(storageKey)
    if (raw === null) {
      return undefined
    }

    try {
      const parsed = JSON.parse(raw) as CacheEnvelope<TValue>
      if (typeof parsed?.expiresAt !== 'number') {
        this.storage.removeItem(storageKey)
        return undefined
      }
      return parsed
    } catch {
      this.storage.removeItem(storageKey)
      return undefined
    }
  }

  private isExpired<TValue>(envelope: CacheEnvelope<TValue>): boolean {
    return Date.now() >= envelope.expiresAt
  }

  private resolveTtl(namespace: string, overrideTtlMs?: number): number {
    if (typeof overrideTtlMs === 'number' && Number.isFinite(overrideTtlMs) && overrideTtlMs > 0) {
      return overrideTtlMs
    }

    if (namespace.includes('lastDocByPage')) {
      return this.paginationCursorTtlMs
    }

    return this.defaultTtlMs
  }

}