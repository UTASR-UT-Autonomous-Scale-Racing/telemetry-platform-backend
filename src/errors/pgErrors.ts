type PgHandled = {
  handled: true;
  status: number;
  body: { error: { type: string; message: string; code?: string } };
};

type NotHandled = { handled: false };

export function handlePgError(err: unknown): PgHandled | NotHandled {
  if (err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string' && 'routine' in err) {
    const error = err as { code: string; detail?: string };
    const code = error.code;
    switch (code) {
      case '23505':
        return { handled: true, status: 409, body: { error: { type: 'UniqueViolation', message: error.detail || 'Duplicate value', code } } };
      case '23503':
        return { handled: true, status: 409, body: { error: { type: 'ForeignKeyViolation', message: error.detail || 'Related resource constraint', code } } };
      case '23502':
        return { handled: true, status: 400, body: { error: { type: 'NotNullViolation', message: error.detail || 'Missing required field', code } } };
      case '22P02':
        return { handled: true, status: 400, body: { error: { type: 'InvalidTextRepresentation', message: error.detail || 'Invalid input', code } } };
      default:
        return { handled: true, status: 400, body: { error: { type: 'PostgresError', message: (err as { message?: string }).message || 'Database error', code } } };
    }
  }
  return { handled: false };
}
