import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataCache } from '../../src/utils/cache';

describe('DataCache', () => {
  let cache: DataCache;

  beforeEach(() => {
    cache = new DataCache(1000); // 1 second TTL for testing
  });

  describe('get and set', () => {
    it('should store and retrieve data', () => {
      const testData = { value: 'test' };
      cache.set('key1', testData);

      const result = cache.get('key1');
      expect(result).toEqual(testData);
    });

    it('should return null for non-existent keys', () => {
      const result = cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should expire data after TTL', async () => {
      cache.set('key1', 'value', 100); // 100ms TTL

      expect(cache.get('key1')).toBe('value');

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(cache.get('key1')).toBeNull();
    });
  });

  describe('getOrFetch', () => {
    it('should fetch data if not cached', async () => {
      const fetcher = vi.fn().mockResolvedValue('fetched-data');

      const result = await cache.getOrFetch('key1', fetcher);

      expect(result).toBe('fetched-data');
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('should return cached data without calling fetcher', async () => {
      const fetcher = vi.fn().mockResolvedValue('fetched-data');

      cache.set('key1', 'cached-data');
      const result = await cache.getOrFetch('key1', fetcher);

      expect(result).toBe('cached-data');
      expect(fetcher).not.toHaveBeenCalled();
    });
  });

  describe('delete and clear', () => {
    it('should delete specific entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const deleted = cache.delete('key1');

      expect(deleted).toBe(true);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.getStats();

      expect(stats.total).toBe(2);
      expect(stats.valid).toBe(2);
      expect(stats.expired).toBe(0);
      expect(stats.size_bytes).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      cache.set('key1', 'value1', 100);
      cache.set('key2', 'value2', 10000);

      await new Promise(resolve => setTimeout(resolve, 150));

      const removed = cache.cleanup();

      expect(removed).toBe(1);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
    });
  });

  describe('generateKey', () => {
    it('should generate key from endpoint', () => {
      const key = DataCache.generateKey('/kpi');
      expect(key).toBe('/kpi');
    });

    it('should generate key with parameters', () => {
      const key = DataCache.generateKey('/kpi', { title: 'test', limit: 10 });
      expect(key).toContain('/kpi?');
      expect(key).toContain('limit=10');
      expect(key).toContain('title="test"');
    });

    it('should generate consistent keys regardless of parameter order', () => {
      const key1 = DataCache.generateKey('/kpi', { a: 1, b: 2 });
      const key2 = DataCache.generateKey('/kpi', { b: 2, a: 1 });
      expect(key1).toBe(key2);
    });
  });
});
