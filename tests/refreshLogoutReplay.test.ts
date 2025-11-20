import { registerUser } from '../src/services/authService.js';
import { verifyAndRotateRefreshToken, revokeRefreshToken, isRevokedToken } from '../src/services/tokenService.js';
import { refresh, logout } from '../src/controllers/authController.js';
import { UnauthorizedError } from '../src/errors/httpErrors.js';

// In-memory fakes for Postgres
const users: any[] = [];
const refreshTokens: any[] = [];

jest.mock('../src/config/postgres.js', () => ({
  query: jest.fn(async (sql: string, params: any[]) => {
    // Users
    if (/INSERT INTO users/i.test(sql)) {
      const id = users.length + 1;
      const [firstName, lastName, email, passwordHash, role] = params;
      const user = { id, first_name: firstName, last_name: lastName, email, password_hash: passwordHash, role };
      users.push(user);
      return { rows: [{ id, role }], rowCount: 1 } as any;
    }
    if (/SELECT id, password_hash, role FROM users WHERE email = \$1/i.test(sql)) {
      const email = params[0];
      const user = users.find(u => u.email === email);
      if (!user) return { rows: [], rowCount: 0 } as any;
      return { rows: [{ id: user.id, password_hash: user.password_hash, role: user.role }], rowCount: 1 } as any;
    }
    if (/SELECT role FROM users WHERE id = \$1/i.test(sql)) {
      const id = params[0];
      const user = users.find(u => u.id === id);
      return { rows: user ? [{ role: user.role }] : [], rowCount: user ? 1 : 0 } as any;
    }

    // Refresh tokens
    if (/INSERT INTO refresh_tokens/i.test(sql)) {
      const [user_id, token_hash, expires_at] = params;
      const row = { id: refreshTokens.length + 1, user_id, token_hash, expires_at, revoked: false };
      refreshTokens.push(row);
      return { rows: [], rowCount: 1 } as any;
    }
    if (/SELECT id, user_id, token_hash, expires_at, revoked FROM refresh_tokens WHERE token_hash = \$1 LIMIT 1/i.test(sql)) {
      const token_hash = params[0];
      const row = refreshTokens.find(r => r.token_hash === token_hash);
      return { rows: row ? [row] : [], rowCount: row ? 1 : 0 } as any;
    }
    if (/SELECT revoked FROM refresh_tokens WHERE token_hash = \$1 LIMIT 1/i.test(sql)) {
      const token_hash = params[0];
      const row = refreshTokens.find(r => r.token_hash === token_hash);
      return { rows: row ? [{ revoked: row.revoked }] : [], rowCount: row ? 1 : 0 } as any;
    }
    if (/UPDATE refresh_tokens SET revoked = TRUE WHERE id = \$1/i.test(sql)) {
      const id = params[0];
      const row = refreshTokens.find(r => r.id === id);
      if (row) row.revoked = true;
      return { rows: [], rowCount: row ? 1 : 0 } as any;
    }
    if (/UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = \$1/i.test(sql)) {
      const token_hash = params[0];
      const row = refreshTokens.find(r => r.token_hash === token_hash);
      if (row) row.revoked = true;
      return { rows: [], rowCount: row ? 1 : 0 } as any;
    }
    if (/UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = \$1/i.test(sql)) {
      const user_id = params[0];
      refreshTokens.forEach(r => { if (r.user_id === user_id) r.revoked = true; });
      return { rows: [], rowCount: 0 } as any;
    }

    throw new Error('Unexpected SQL in mock: ' + sql);
  })
}));

// Minimal Express response mock
function createRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
}

describe('Refresh / Logout / Replay flow', () => {
  beforeEach(() => {
    users.length = 0;
    refreshTokens.length = 0;
    jest.clearAllMocks();
  });

  it('rotates refresh token and invalidates the old one', async () => {
    const { refreshToken: initialRefresh } = await registerUser('A', 'B', 'a@b.c', 'StrongPass123!', 'ADMIN');
    // First rotation
    const { newToken } = await verifyAndRotateRefreshToken(initialRefresh);
    expect(newToken).toBeDefined();
    // Old token should now be revoked
    await expect(verifyAndRotateRefreshToken(initialRefresh)).rejects.toThrow('Refresh token revoked');
    // isRevokedToken helper reports true
    const revoked = await isRevokedToken(initialRefresh);
    expect(revoked).toBe(true);
  });

  it('logout revokes refresh token so it cannot be reused', async () => {
    const { refreshToken } = await registerUser('C', 'D', 'c@d.e', 'StrongPass123!', 'VIEWER');
    // Call logout controller
    const req: any = { body: { refreshToken } };
    const res = createRes();
    const next = jest.fn();
    await logout(req, res, next);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.clearCookie).toHaveBeenCalled();
    // Attempt rotation should fail
    await expect(verifyAndRotateRefreshToken(refreshToken)).rejects.toThrow('Refresh token revoked');
  });

  it('refresh controller issues new access token and rejects replay of old token', async () => {
    const { refreshToken } = await registerUser('E', 'F', 'e@f.g', 'StrongPass123!', 'TEAM');
    const req: any = { body: { refreshToken }, cookies: {}, app: { locals: {} } };
    const res = createRes();
    const next = jest.fn();
    await refresh(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.accessToken).toBeDefined();
    expect(res.cookie).toHaveBeenCalled();
    // Old token should now be revoked
    await expect(verifyAndRotateRefreshToken(refreshToken)).rejects.toThrow('Refresh token revoked');
  });
});