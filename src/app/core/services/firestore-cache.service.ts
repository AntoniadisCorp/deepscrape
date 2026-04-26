import { Injectable, inject } from '@angular/core'
import { getDoc } from '@angular/fire/firestore'
import type { DocumentData } from '@angular/fire/firestore'
import { CacheService } from './cache.service'
import { FirestoreService } from './firestore.service'

type FirestoreCacheType = 'userProfile' | 'userData' | 'billing' | 'apiKeys' | 'analytics' | 'organization' | 'config'

const BILLING_SUFFIX = '/billing/'
const API_KEYS_SUFFIX = '/apiKeys/'
const CACHE_NAMESPACE = 'firestore-docs'

const DEFAULT_TTLS: Record<FirestoreCacheType, number> = {
  userProfile: 10 * 60_000,
  userData: 10 * 60_000,
  billing: 5 * 60_000,
  apiKeys: 5 * 60_000,
  analytics: 30_000,
  organization: 15 * 60_000,
  config: 60 * 60_000,
}

/**
 * FirestoreCacheService — sessionStorage-backed TTL cache for one-shot Firestore getDoc reads.
 *
 * Usage:
 *   const data = await this.firestoreCacheService.cachedGet<MyType>('users/uid123')
 *   this.firestoreCacheService.invalidate('users/uid123')        // exact key
 *   this.firestoreCacheService.invalidatePrefix('users/uid123')  // all sub-paths
 */
@Injectable({ providedIn: 'root' })
export class FirestoreCacheService {
  private readonly firestoreService = inject(FirestoreService)
  private readonly cacheService = inject(CacheService)

  private resolveType(path: string): FirestoreCacheType {
    if (path.includes(BILLING_SUFFIX)) return 'billing'
    if (path.includes(API_KEYS_SUFFIX)) return 'apiKeys'
    if (path.startsWith('metrics_') || path.startsWith('metrics/')) return 'analytics'
    if (path.startsWith('organizations/')) return 'organization'
    if (path.startsWith('config/')) return 'config'
    if (path.startsWith('users/')) return 'userData'
    return 'billing'
  }

  /**
   * Returns cached Firestore document data, fetching from Firestore on a cache miss.
   * @param path  Firestore document path (e.g. users/uid123)
   * @param ttlMs Override the default TTL for this path
   */
  async cachedGet<T extends DocumentData>(path: string, ttlMs?: number): Promise<T | null> {
    const cached = this.cacheService.get<string, T>(CACHE_NAMESPACE, path)
    if (cached !== undefined) return cached

    const snap = await getDoc(this.firestoreService.doc(path))
    if (!snap.exists()) return null

    const data = snap.data() as T
    const cacheType = this.resolveType(path)
    const ttl = ttlMs ?? DEFAULT_TTLS[cacheType]
    this.cacheService.set(CACHE_NAMESPACE, path, data, ttl)
    return data
  }

  /** Remove a single cached path. */
  invalidate(path: string): void {
    this.cacheService.delete(CACHE_NAMESPACE, path)
  }

  /** Remove all cached paths that start with the given prefix. */
  invalidatePrefix(prefix: string): void {
    // CacheService stores encoded keys, so namespace clear is the safe option.
    this.cacheService.clear(CACHE_NAMESPACE)
  }

  /** Clear the entire in-memory cache (e.g. on logout). */
  clearAll(): void {
    this.cacheService.clear(CACHE_NAMESPACE)
  }
}
