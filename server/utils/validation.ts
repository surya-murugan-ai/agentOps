/**
 * Comprehensive Input Validation System
 * Provides security-focused validation for all user inputs
 */

import { z } from 'zod';
import { ValidationError } from './errors';

// Base validation schemas
export const commonSchemas = {
  id: z.string().uuid('Invalid ID format'),
  hostname: z.string()
    .min(1, 'Hostname required')
    .max(255, 'Hostname too long')
    .regex(/^[a-zA-Z0-9.-]+$/, 'Invalid hostname format'),
  ipAddress: z.string()
    .regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, 'Invalid IP address'),
  email: z.string().email('Invalid email format').optional(),
  severity: z.enum(['info', 'warning', 'critical']),
  status: z.enum(['active', 'acknowledged', 'resolved']),
  environment: z.enum(['development', 'staging', 'production']),
  limit: z.number().min(1).max(1000).optional(),
  offset: z.number().min(0).optional()
};

// Upload data validation
export const uploadSchemas = {
  servers: z.object({
    hostname: commonSchemas.hostname,
    ipAddress: commonSchemas.ipAddress,
    environment: commonSchemas.environment,
    location: z.string().min(1).max(255),
    status: z.enum(['healthy', 'warning', 'critical', 'offline']).optional(),
    tags: z.record(z.any()).optional()
  }),

  metrics: z.object({
    serverId: z.string().min(1, 'Server ID required'),
    serverid: z.string().min(1, 'Server ID required').optional(),
    server_id: z.string().min(1, 'Server ID required').optional(),
    hostname: commonSchemas.hostname.optional(),
    cpuUsage: z.number().min(0).max(100),
    cpu_usage: z.number().min(0).max(100).optional(),
    memoryUsage: z.number().min(0).max(100),
    memory_usage: z.number().min(0).max(100).optional(),
    diskUsage: z.number().min(0).max(100),
    disk_usage: z.number().min(0).max(100).optional(),
    networkLatency: z.number().min(0).optional(),
    network_latency: z.number().min(0).optional(),
    networkThroughput: z.number().min(0).optional(),
    memoryTotal: z.number().min(1).optional(),
    diskTotal: z.number().min(1).optional(),
    processCount: z.number().min(0).optional(),
    process_count: z.number().min(0).optional()
  }),

  alerts: z.object({
    hostname: commonSchemas.hostname,
    title: z.string().min(1).max(255),
    description: z.string().min(1).max(1000),
    severity: commonSchemas.severity,
    metricType: z.string().min(1).max(100),
    metricValue: z.number(),
    threshold: z.number().optional(),
    serverId: z.string().optional(),
    ServerID: z.string().optional(),
    server_id: z.string().optional()
  })
};

// API endpoint validation schemas
export const apiSchemas = {
  smartUpload: z.object({
    data: z.array(z.record(z.any())).min(1, 'Data array cannot be empty').max(10000, 'Too many records')
  }),

  createServer: z.object({
    hostname: commonSchemas.hostname,
    ipAddress: commonSchemas.ipAddress,
    environment: commonSchemas.environment,
    location: z.string().min(1).max(255),
    status: z.enum(['healthy', 'warning', 'critical', 'offline']).optional(),
    tags: z.record(z.any()).optional()
  }),

  updateServer: z.object({
    hostname: commonSchemas.hostname.optional(),
    ipAddress: commonSchemas.ipAddress.optional(),
    environment: commonSchemas.environment.optional(),
    location: z.string().min(1).max(255).optional(),
    status: z.enum(['healthy', 'warning', 'critical', 'offline']).optional(),
    tags: z.record(z.any()).optional()
  }),

  createAlert: z.object({
    hostname: commonSchemas.hostname,
    title: z.string().min(1).max(255),
    description: z.string().min(1).max(1000),
    severity: commonSchemas.severity,
    metricType: z.string().min(1).max(100),
    metricValue: z.number(),
    threshold: z.number().optional(),
    serverId: z.string().optional()
  }),

  metricsRange: z.object({
    startTime: z.string().datetime('Invalid start time format'),
    endTime: z.string().datetime('Invalid end time format'),
    serverId: z.string().optional()
  })
};

// SQL injection prevention
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Remove potential SQL injection patterns
  return input
    .replace(/['"\\;]/g, '') // Remove quotes and semicolons
    .replace(/(--)|(\/\*)|(\*\/)/g, '') // Remove SQL comments
    .replace(/\b(union|select|insert|delete|update|drop|create|alter|exec|execute)\b/gi, '') // Remove SQL keywords
    .trim()
    .slice(0, 1000); // Limit length
}

// XSS prevention for HTML content
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
    .slice(0, 10000); // Limit length
}

// Validate file uploads
export function validateFileUpload(file: any): void {
  if (!file) {
    throw new ValidationError('No file provided');
  }

  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv',
    'application/json'
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new ValidationError('Invalid file type. Only Excel (.xlsx, .xls), CSV, and JSON files are allowed');
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new ValidationError('File too large. Maximum size is 10MB');
  }
}

// Rate limiting configuration
export const rateLimits = {
  upload: { windowMs: 15 * 60 * 1000, max: 10 }, // 10 uploads per 15 minutes
  api: { windowMs: 60 * 1000, max: 100 }, // 100 API calls per minute
  auth: { windowMs: 15 * 60 * 1000, max: 5 } // 5 auth attempts per 15 minutes
};

// Validate and sanitize input data
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw new ValidationError('Input validation failed', { details });
    }
    throw error;
  }
}