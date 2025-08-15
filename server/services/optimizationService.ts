import { createHash } from 'crypto';

interface CacheEntry {
  hash: string;
  result: any;
  timestamp: number;
  expires: number;
}

interface ChangeDetectionEntry {
  serverId: string;
  lastProcessedHash: string;
  lastProcessedTime: number;
}

export class OptimizationService {
  private llmCache = new Map<string, CacheEntry>();
  private changeDetection = new Map<string, ChangeDetectionEntry>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MIN_PROCESSING_INTERVAL = 2 * 60 * 1000; // 2 minutes minimum between processing same data

  /**
   * Generate hash for data to detect changes
   */
  private generateDataHash(data: any): string {
    return createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 16); // Use first 16 chars for efficiency
  }

  /**
   * Check if data has changed since last processing
   */
  hasDataChanged(serverId: string, data: any): boolean {
    const hash = this.generateDataHash(data);
    const existing = this.changeDetection.get(serverId);
    
    if (!existing) {
      this.changeDetection.set(serverId, {
        serverId,
        lastProcessedHash: hash,
        lastProcessedTime: Date.now()
      });
      return true;
    }

    // Check if enough time has passed since last processing
    const timeSinceLastProcess = Date.now() - existing.lastProcessedTime;
    if (timeSinceLastProcess < this.MIN_PROCESSING_INTERVAL) {
      return false;
    }

    // Check if data actually changed
    if (existing.lastProcessedHash === hash) {
      return false;
    }

    // Update tracking
    existing.lastProcessedHash = hash;
    existing.lastProcessedTime = Date.now();
    return true;
  }

  /**
   * Get cached LLM result if available and not expired
   */
  getCachedLLMResult(operation: string, inputHash: string): any | null {
    const cacheKey = `${operation}_${inputHash}`;
    const cached = this.llmCache.get(cacheKey);
    
    if (!cached) return null;
    
    if (Date.now() > cached.expires) {
      this.llmCache.delete(cacheKey);
      return null;
    }
    
    console.log(`LLM Cache Hit: ${operation} (saved API call)`);
    return cached.result;
  }

  /**
   * Cache LLM result for future use
   */
  cacheLLMResult(operation: string, inputData: any, result: any): void {
    const inputHash = this.generateDataHash(inputData);
    const cacheKey = `${operation}_${inputHash}`;
    
    this.llmCache.set(cacheKey, {
      hash: inputHash,
      result,
      timestamp: Date.now(),
      expires: Date.now() + this.CACHE_TTL
    });
  }

  /**
   * Check if similar anomaly already exists to prevent duplicates
   */
  generateAnomalyKey(serverId: string, metricType: string, severity: string): string {
    return `${serverId}_${metricType}_${severity}`;
  }

  /**
   * Check if similar alert already exists to prevent duplicates
   */
  generateAlertKey(serverId: string, metricType: string, threshold: number): string {
    return `${serverId}_${metricType}_${threshold}`;
  }

  /**
   * Batch multiple servers' data for efficient LLM processing
   */
  shouldBatchProcess(pendingItems: any[]): boolean {
    return pendingItems.length >= 3; // Process in batches of 3+ servers
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.llmCache.entries()) {
      if (now > entry.expires) {
        this.llmCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    const activeEntries = Array.from(this.llmCache.values())
      .filter(entry => now <= entry.expires).length;
    
    return {
      totalEntries: this.llmCache.size,
      activeEntries,
      expiredEntries: this.llmCache.size - activeEntries,
      changeTrackingEntries: this.changeDetection.size
    };
  }
}

// Export singleton instance
export const optimizationService = new OptimizationService();

// Cleanup cache every 10 minutes
setInterval(() => {
  optimizationService.cleanupCache();
}, 10 * 60 * 1000);