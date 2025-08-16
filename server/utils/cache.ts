/**
 * In-Memory Caching System
 * Optimizes database queries and API responses
 */

interface CacheItem<T> {
  data: T;
  expiry: number;
}

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expiry });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  stats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const cache = new MemoryCache();

// Cache cleanup every 5 minutes
setInterval(() => {
  cache.cleanup();
}, 5 * 60 * 1000);

// Cache key generators
export const cacheKeys = {
  servers: () => 'servers:all',
  serverById: (id: string) => `server:${id}`,
  serverByHostname: (hostname: string) => `server:hostname:${hostname}`,
  metrics: (serverId: string, limit?: number) => `metrics:${serverId}:${limit || 'all'}`,
  metricsRange: (startTime: string, endTime: string) => `metrics:range:${startTime}:${endTime}`,
  alerts: (limit?: number) => `alerts:${limit || 'all'}`,
  activeAlerts: () => 'alerts:active',
  agents: () => 'agents:all',
  agentById: (id: string) => `agent:${id}`,
  dashboardMetrics: () => 'dashboard:metrics',
  auditLogs: (limit?: number) => `audit:${limit || 'all'}`
};

// Cache helper functions
export async function getCached<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Try to get from cache first
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetchFn();
  
  // Cache the result
  cache.set(key, data, ttl);
  
  return data;
}

export function invalidateCache(pattern: string): void {
  const keys = Array.from(cache['cache'].keys());
  const regex = new RegExp(pattern);
  
  keys.forEach(key => {
    if (regex.test(key)) {
      cache.delete(key);
    }
  });
}

// Cache TTL configurations (in milliseconds)
export const cacheTTL = {
  servers: 5 * 60 * 1000,      // 5 minutes
  metrics: 2 * 60 * 1000,      // 2 minutes  
  alerts: 1 * 60 * 1000,       // 1 minute
  agents: 5 * 60 * 1000,       // 5 minutes
  dashboard: 1 * 60 * 1000,    // 1 minute
  auditLogs: 10 * 60 * 1000    // 10 minutes
};