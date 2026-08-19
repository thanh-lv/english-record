/**
 * @file serviceHandler.ts
 * @description
 * Unified service error handling utility that standardizes try-catch blocks,
 * normalizes Supabase / PostgREST / network error payloads into typed ServiceErrors,
 * and automatically logs failures to loggerService for remote error monitoring.
 *
 * @module services/serviceHandler
 */

import { loggerService } from './loggerService';

export class ServiceError extends Error {
  public code?: string;
  public details?: string;
  public originalError?: any;

  constructor(message: string, options?: { code?: string; details?: string; originalError?: any }) {
    super(message);
    this.name = 'ServiceError';
    this.code = options?.code;
    this.details = options?.details;
    this.originalError = options?.originalError;
  }
}

/**
 * Standardized wrapper for service async operations that:
 * 1. Safely executes the operation in a unified try-catch boundary.
 * 2. Normalizes raw Supabase / PostgREST / network error objects into typed `ServiceError` instances.
 * 3. Automatically logs errors to `loggerService.error()` for client diagnostics.
 * 4. Re-throws a structured `ServiceError` with user-friendly messages.
 *
 * @param moduleName - Name of the service module (e.g. 'topicService')
 * @param operationName - Name of the method being executed (e.g. 'fetchAllTopics')
 * @param fn - Async callback to execute
 * @param fallbackErrorMessage - Default error message if the error has no message
 */
export async function withServiceHandling<T>(
  moduleName: string,
  operationName: string,
  fn: () => Promise<T>,
  fallbackErrorMessage = 'Đã có lỗi xảy ra trong quá trình xử lý.'
): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    // If already normalized, log and rethrow
    if (err instanceof ServiceError) {
      loggerService.error(moduleName, `[${operationName}] ${err.message}`, err);
      throw err;
    }

    const message =
      typeof err === 'string'
        ? err
        : err?.message || err?.error_description || fallbackErrorMessage;
    const code = err?.code || err?.status;
    const details = err?.details || err?.hint;

    const serviceError = new ServiceError(message, {
      code: code ? String(code) : undefined,
      details,
      originalError: err,
    });

    loggerService.error(moduleName, `[${operationName}] ${message}`, serviceError);
    throw serviceError;
  }
}
