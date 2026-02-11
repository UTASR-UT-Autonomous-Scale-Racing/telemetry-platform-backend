import jwt from 'jsonwebtoken';
import { registerUser } from '../src/services/authService.js';
import { env } from '../src/config/env.js';

jest.mock('../src/config/postgres.js', () => ({
  query: jest.fn(async (sql: string, params: unknown[]) => {
    if (/INSERT INTO users/i.test(sql)) {
      const role = params[4] as string;
      return { rows: [{ id: 99, role }], rowCount: 1 };
    }
    if (/SELECT id, password_hash, role/i.test(sql)) {
      return { rows: [{ id: 99, password_hash: '$2a$10$fakehash', role: 'ADMIN' }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  })
}));

describe('authService registerUser role claim', () => {
  it('includes role ADMIN in JWT when provided', async () => {
    const tokens = await registerUser('A', 'B', 'a@b.c', 'StrongPass123!', 'ADMIN');
    const decoded = jwt.verify(tokens.accessToken, env.jwtSecret) as { id: number, role: string };
    expect(decoded.role).toBe('ADMIN');
    expect(decoded.id).toBe(99);
  });

  it('defaults role to VIEWER when omitted', async () => {
    const tokens = await registerUser('C', 'D', 'c@d.e', 'StrongPass123!');
    const decoded = jwt.verify(tokens.accessToken, env.jwtSecret) as { id: number, role: string };
    // The mock returns whatever was passed, for omitted role it uses VIEWER inside the service.
    expect(decoded.role).toBe('VIEWER');
  });
});
