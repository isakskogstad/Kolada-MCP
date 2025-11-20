/**
 * Simple in-memory caching system for Kolada API responses
 *
 * Reduces API calls for frequently accessed data like municipalities and KPI catalogs.
 * Uses TTL (time-to-live) to ensure data freshness.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class DataCache {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number;

  constructor(defaultTTL: number = 86400000) { // 24 hours default
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get cached data if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > entry.ttl) {
      // Entry has expired
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached data with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * Get data from cache or fetch it using the provided function
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Clear a specific cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let valid = 0;

    this.cache.forEach((entry) => {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        expired++;
      } else {
        valid++;
      }
    });

    return {
      total: this.cache.size,
      valid,
      expired,
      size_bytes: this._estimateSize(),
    };
  }

  /**
   * Estimate cache size in bytes (rough approximation)
   */
  private _estimateSize(): number {
    let size = 0;
    this.cache.forEach((entry) => {
      size += JSON.stringify(entry.data).length * 2; // UTF-16 encoding
    });
    return size;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    this.cache.forEach((entry, key) => {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    });

    return removed;
  }

  /**
   * Generate cache key from endpoint and parameters
   */
  static generateKey(endpoint: string, params?: Record<string, any>): string {
    if (!params || Object.keys(params).length === 0) {
      return endpoint;
    }

    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${JSON.stringify(params[key])}`)
      .join('&');

    return `${endpoint}?${sortedParams}`;
  }
}

// Singleton cache instance
export const dataCache = new DataCache();

// Auto-cleanup every hour
setInterval(() => {
  const removed = dataCache.cleanup();
  if (removed > 0) {
    console.log(`🧹 Cache cleanup: Removed ${removed} expired entries`);
  }
}, 3600000); // 1 hour
