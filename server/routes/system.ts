import { Router } from 'express';

const router = Router();

// Global API status tracking
const apiStatusTracker = {
  openai: {
    status: 'active' as 'active' | 'quota_exceeded' | 'invalid_key' | 'rate_limited',
    lastError: '',
    errorCount: 0,
    lastErrorTime: 0,
    consecutiveErrors: 0
  },
  anthropic: {
    status: 'active' as 'active' | 'quota_exceeded' | 'invalid_key' | 'rate_limited',
    lastError: '',
    errorCount: 0,
    lastErrorTime: 0,
    consecutiveErrors: 0
  }
};

// Helper function to determine status from error
function getStatusFromError(error: string): 'quota_exceeded' | 'invalid_key' | 'rate_limited' | 'active' {
  const errorLower = error.toLowerCase();
  
  if (errorLower.includes('quota') || errorLower.includes('credit') || errorLower.includes('insufficient')) {
    return 'quota_exceeded';
  }
  
  if (errorLower.includes('invalid') && errorLower.includes('key')) {
    return 'invalid_key';
  }
  
  if (errorLower.includes('rate limit') || errorLower.includes('too many requests')) {
    return 'rate_limited';
  }
  
  return 'active';
}

// Function to track API errors (called from AI services)
export function trackAPIError(provider: 'openai' | 'anthropic', error: string) {
  const tracker = apiStatusTracker[provider];
  tracker.errorCount++;
  tracker.consecutiveErrors++;
  tracker.lastError = error;
  tracker.lastErrorTime = Date.now();
  tracker.status = getStatusFromError(error);
  
  console.log(`API Status Tracker: ${provider} error - ${tracker.status} (${tracker.consecutiveErrors} consecutive)`);
}

// Function to track API success (called from AI services)
export function trackAPISuccess(provider: 'openai' | 'anthropic') {
  const tracker = apiStatusTracker[provider];
  
  // Reset consecutive errors on success
  tracker.consecutiveErrors = 0;
  
  // Reset status to active if we had consecutive successes
  if (tracker.status !== 'active') {
    tracker.status = 'active';
    console.log(`API Status Tracker: ${provider} restored to active status`);
  }
}

// API endpoint to get current status
router.get('/api-status', (req, res) => {
  // Reset status to active if errors are old (more than 5 minutes)
  const now = Date.now();
  const resetThreshold = 5 * 60 * 1000; // 5 minutes
  
  Object.keys(apiStatusTracker).forEach(provider => {
    const tracker = apiStatusTracker[provider as keyof typeof apiStatusTracker];
    if (now - tracker.lastErrorTime > resetThreshold && tracker.consecutiveErrors === 0) {
      tracker.status = 'active';
    }
  });
  
  res.json({
    openai: {
      status: apiStatusTracker.openai.status,
      lastError: apiStatusTracker.openai.lastError,
      errorCount: apiStatusTracker.openai.errorCount,
      consecutiveErrors: apiStatusTracker.openai.consecutiveErrors
    },
    anthropic: {
      status: apiStatusTracker.anthropic.status,
      lastError: apiStatusTracker.anthropic.lastError,
      errorCount: apiStatusTracker.anthropic.errorCount,
      consecutiveErrors: apiStatusTracker.anthropic.consecutiveErrors
    }
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  const openaiHealthy = apiStatusTracker.openai.status === 'active';
  const anthropicHealthy = apiStatusTracker.anthropic.status === 'active';
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      openai: openaiHealthy ? 'healthy' : 'degraded',
      anthropic: anthropicHealthy ? 'healthy' : 'degraded'
    }
  });
});

export { router as systemRouter };