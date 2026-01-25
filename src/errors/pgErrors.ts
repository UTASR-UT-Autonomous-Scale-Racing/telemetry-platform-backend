type PgHandled = {
  handled: true;
  status: number;
  body: { error: { type: string; message: string; code?: string } };
};

type NotHandled = { handled: false };

export function handlePgError(err: any): PgHandled | NotHandled {
  if (err && typeof err === 'object' && typeof err.code === 'string' && 'routine' in err) {
    const code = err.code as string;
    switch (code) {
      case '23505':
        return { handled: true, status: 409, body: { error: { type: 'UniqueViolation', message: err.detail || 'Duplicate value', code } } };
      case '23503':
        return { handled: true, status: 409, body: { error: { type: 'ForeignKeyViolation', message: err.detail || 'Related resource constraint', code } } };
      case '23502':
        return { handled: true, status: 400, body: { error: { type: 'NotNullViolation', message: err.detail || 'Missing required field', code } } };
      case '22P02':
        return { handled: true, status: 400, body: { error: { type: 'InvalidTextRepresentation', message: err.detail || 'Invalid input', code } } };
      default:
        return { handled: true, status: 400, body: { error: { type: 'PostgresError', message: err.message || 'Database error', code } } };
    }
  }
  return { handled: false };
}
