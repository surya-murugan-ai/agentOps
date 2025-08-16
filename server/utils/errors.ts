/**
 * Comprehensive Error Handling System for AgentOps Platform
 * Provides structured error types, logging, and response formatting
 */

export class AgentOpsError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AgentOpsError';
    Object.setPrototypeOf(this, AgentOpsError.prototype);
  }
}

export class ValidationError extends AgentOpsError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends AgentOpsError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'DATABASE_ERROR', 500, details);
    this.name = 'DatabaseError';
  }
}

export class AuthenticationError extends AgentOpsError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AgentOpsError {
  constructor(message: string = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AgentOpsError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AgentOpsError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT', 429);
    this.name = 'RateLimitError';
  }
}

export class AIServiceError extends AgentOpsError {
  constructor(message: string, provider: string) {
    super(message, 'AI_SERVICE_ERROR', 502, { provider });
    this.name = 'AIServiceError';
  }
}

// Error logger with structured logging
export function logError(error: Error, context?: Record<string, any>) {
  const logData = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context
  };

  if (error instanceof AgentOpsError) {
    logData.code = error.code;
    logData.statusCode = error.statusCode;
    logData.details = error.details;
  }

  console.error('AgentOps Error:', JSON.stringify(logData, null, 2));
}

// Express error response formatter
export function formatErrorResponse(error: Error) {
  if (error instanceof AgentOpsError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    };
  }

  // For unknown errors, don't expose internal details
  return {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal error occurred'
    }
  };
}