import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../errors/httpErrors.js';
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
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

  // Postgres (pg) errors via helper
  {
    const handled = handlePgError(err);
    if (handled.handled) return send(res, handled.status, handled.body);
  }

  // Body parser / JSON parse errors
  if (err && typeof err === 'object' && (err as { type?: string }).type === 'entity.parse.failed') {
    return send(res, 400, { error: { type: 'InvalidJson', message: 'Malformed JSON body' } });
  }

  // Fallback to provided status/message if present
  if (err && typeof err === 'object') {
    const e = err as { status?: number; message?: string; name?: string };
    if (typeof e.status === 'number') status = e.status;
    if (typeof e.message === 'string') message = e.message;
    if (typeof e.name === 'string') type = e.name;
  }

  return send(res, status, { error: { type, message } });
}
