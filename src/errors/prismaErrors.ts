import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
  PrismaClientUnknownRequestError,
  PrismaClientInitializationError,
  PrismaClientRustPanicError,
} from '@prisma/client/runtime/library';

type PrismaHandled = {
  handled: true;
  status: number;
  body: { error: { type: string; message: string; code?: string } };
};

type NotHandled = { handled: false };

export function handlePrismaError(err: unknown): PrismaHandled | NotHandled {
  if (err instanceof PrismaClientKnownRequestError) {
    let status = 400;
    let type = 'PrismaKnownRequestError';
    let message = err.message;
    const code = err.code;
    switch (err.code) {
      case 'P2002':
        status = 409;
        type = 'UniqueConstraintViolation';
        message = 'Resource conflict (unique constraint)';
        break;
      case 'P2025':
        status = 404;
        type = 'RecordNotFound';
        message = 'Requested resource was not found';
        break;
      case 'P2003':
        status = 409;
        type = 'ForeignKeyViolation';
        message = 'Related resource constraint violation';
        break;
      case 'P2000':
        status = 400;
        type = 'ValueTooLong';
        message = 'Provided value is too long';
        break;
      default:
        // use defaults
        break;
    }
    return { handled: true, status, body: { error: { type, message, code } } };
  }
  if (err instanceof PrismaClientValidationError) {
    return { handled: true, status: 400, body: { error: { type: 'PrismaValidationError', message: err.message } } };
  }
  if (err instanceof PrismaClientUnknownRequestError) {
    return { handled: true, status: 500, body: { error: { type: 'PrismaUnknownRequestError', message: err.message } } };
  }
  if (err instanceof PrismaClientInitializationError) {
    return { handled: true, status: 503, body: { error: { type: 'PrismaInitializationError', message: err.message } } };
  }
  if (err instanceof PrismaClientRustPanicError) {
    return { handled: true, status: 500, body: { error: { type: 'PrismaRustPanic', message: err.message } } };
  }
  return { handled: false };
}
