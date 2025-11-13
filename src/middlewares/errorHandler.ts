import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError, NotBeforeError } from 'jsonwebtoken';
import {
  HttpError,
  UnauthorizedError,
} from '../errors/httpErrors.js';
import { handlePrismaError } from '../errors/prismaErrors.js';
import { handlePgError } from '../errors/pgErrors.js';

type ErrorBody = {
  error: {
    type: string;
    message: string;
    code?: string;
    details?: unknown;
  };
};

function send(res: Response, status: number, body: ErrorBody) {
  res.status(status).json(body);
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  // Default fallback
  let status = 500;
  let type = 'InternalServerError';
  let message = 'Internal Server Error';
  let code: string | undefined;
  let details: unknown;

  // Already a structured HttpError
  if (err instanceof HttpError) {
    status = err.status;
    type = err.name;
    message = err.message;
    code = err.code;
    details = err.details;
    return send(res, status, { error: { type, message, code, details } });
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    status = 400;
    type = 'ValidationError';
    message = 'Validation failed';
    details = err.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
      code: i.code,
    }));
    return send(res, status, { error: { type, message, details } });
  }

  // JWT errors
  if (err instanceof TokenExpiredError) {
    return send(res, 401, { error: { type: 'TokenExpiredError', message: err.message } });
  }
  if (err instanceof NotBeforeError) {
    return send(res, 401, { error: { type: 'TokenNotActiveError', message: err.message } });
  }
  if (err instanceof JsonWebTokenError) {
    return send(res, 401, { error: { type: 'JsonWebTokenError', message: err.message } });
  }

  // Prisma errors via helper
  {
    const handled = handlePrismaError(err);
    if (handled.handled) return send(res, handled.status, handled.body);
  }

  // Postgres (pg) errors via helper
  {
    const handled = handlePgError(err);
    if (handled.handled) return send(res, handled.status, handled.body);
  }

  // Body parser / JSON parse errors
  if (err && err.type === 'entity.parse.failed') {
    return send(res, 400, { error: { type: 'InvalidJson', message: 'Malformed JSON body' } });
  }

  // Fallback to provided status/message if present
  if (err && typeof err.status === 'number') status = err.status;
  if (err && typeof err.message === 'string') message = err.message;
  if (err && typeof err.name === 'string') type = err.name;

  return send(res, status, { error: { type, message } });
}
