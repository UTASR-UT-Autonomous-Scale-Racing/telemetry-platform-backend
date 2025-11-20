// Common HTTP error classes for consistent error handling across the app

export class HttpError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, options?: { code?: string; details?: unknown }) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Bad Request', options?: { code?: string; details?: unknown }) {
    super(400, message, options);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized', options?: { code?: string; details?: unknown }) {
    super(401, message, options);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden', options?: { code?: string; details?: unknown }) {
    super(403, message, options);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not Found', options?: { code?: string; details?: unknown }) {
    super(404, message, options);
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Conflict', options?: { code?: string; details?: unknown }) {
    super(409, message, options);
  }
}

export class UnprocessableEntityError extends HttpError {
  constructor(message = 'Unprocessable Entity', options?: { code?: string; details?: unknown }) {
    super(422, message, options);
  }
}

export class TooManyRequestsError extends HttpError {
  constructor(message = 'Too Many Requests', options?: { code?: string; details?: unknown }) {
    super(429, message, options);
  }
}

export class ServiceUnavailableError extends HttpError {
  constructor(message = 'Service Unavailable', options?: { code?: string; details?: unknown }) {
    super(503, message, options);
  }
}
