'use strict';

/**
 * Structured application error with HTTP status code and serialization support.
 * Throw with a known `type` string (e.g. 'NOT_FOUND_ERROR') to get a
 * pre-configured status code and message, or pass custom values directly.
 */
class CalmError extends Error {
  error = true;
  responseTimestamp = new Date();

  /**
   * Calm Error
   * @param {('NOT_FOUND_ERROR'|'PERMISSION_DENIED_ERROR'|'UNAUTHORIZED_ERROR'|'CONFLICT_ERROR'|'BAD_REQUEST'|'VALIDATION_ERROR'|'RATE_LIMIT_ERROR'|'SERVICE_UNAVAILABLE_ERROR') | null} type
   * @param {string | null} [message]
   * @param {number | null} [statusCode]
   * @param {Object | null} [errors]
   */
  constructor(type = null, message = null, statusCode = null, errors = null) {
    super();
    this.name = type || 'CUSTOM_ERROR';

    switch (type) {
      case 'NOT_FOUND_ERROR':
        this.message = message || 'Resource not found';
        this.statusCode = statusCode || 404;
        break;
      case 'PERMISSION_DENIED_ERROR':
        this.message = message || "You don't have permission to access this resource";
        this.statusCode = statusCode || 403;
        break;
      case 'UNAUTHORIZED_ERROR':
        this.message = message || 'You are not authorized to access this resource';
        this.statusCode = statusCode || 401;
        break;
      case 'CONFLICT_ERROR':
        this.message = message || 'Resource already exists';
        this.statusCode = statusCode || 409;
        break;
      case 'BAD_REQUEST':
        this.message = message || 'Bad request';
        this.statusCode = statusCode || 400;
        break;
      case 'VALIDATION_ERROR':
        this.message = message || 'Validation failed';
        this.statusCode = statusCode || 422;
        if (errors) {
          this.errors = errors;
        }
        break;
      case 'RATE_LIMIT_ERROR':
        this.message = message || 'Too many requests';
        this.statusCode = statusCode || 429;
        break;
      case 'SERVICE_UNAVAILABLE_ERROR':
        this.message = message || 'Service unavailable';
        this.statusCode = statusCode || 503;
        break;
      default:
        this.message = message || 'Internal server error';
        this.statusCode = statusCode || 500;
    }
  }

  toJSON() {
    const obj = {
      error: this.error,
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      responseTimestamp: this.responseTimestamp
    };
    if (this.errors) {
      obj.errors = this.errors;
    }
    return obj;
  }
}

module.exports = { CalmError };
