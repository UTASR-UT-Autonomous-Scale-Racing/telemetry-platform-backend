import { register, login, refresh, logout, revokeAll } from '../src/controllers/authController.js';
import * as authService from '../src/services/authService.js';
import * as tokenService from '../src/services/tokenService.js';
import * as postgres from '../src/config/postgres.js';
import { Request, Response } from 'express';

function mockRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    locals: {},
  } as unknown as Response;
  return res;
}

describe('Cookie delivery for refresh tokens', () => {
  afterEach(() => jest.restoreAllMocks());

  it('register sets HttpOnly refreshToken cookie and returns accessToken only', async () => {
    const tokens = { accessToken: 'access.jwt', refreshToken: 'refresh.token.value' };
    jest.spyOn(authService, 'registerUser').mockResolvedValue(tokens);
    const req = { body: { firstName: 'A', lastName: 'B', email: 'a@b.c', password: 'StrongPass123!', role: 'ADMIN' } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    await register(req, res, next);
    expect(res.cookie).toHaveBeenCalled();
    const opts = (res.cookie as jest.Mock).mock.calls[0][2];
    expect(opts.httpOnly).toBe(true);
    expect(opts.path).toBe('/api/v1/auth/refresh');
    expect(res.json).toHaveBeenCalledWith({ accessToken: 'access.jwt' });
  });

  it('login sets cookie and returns accessToken', async () => {
    const tokens = { accessToken: 'access.jwt2', refreshToken: 'refresh.token.value2' };
    jest.spyOn(authService, 'loginUser').mockResolvedValue(tokens);
    const req = { body: { email: 'a@b.c', password: 'StrongPass123!' } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    await login(req, res, next);
    expect(res.cookie).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ accessToken: 'access.jwt2' });
  });

  it('refresh rotates cookie and returns new accessToken', async () => {
    jest.spyOn(tokenService, 'verifyAndRotateRefreshToken').mockResolvedValue({ userId: 1, newToken: 'new.refresh', newExpiresAt: new Date() });
    jest.spyOn(postgres, 'query').mockResolvedValue({ rows: [{ role: 'VIEWER' }], rowCount: 1, command: '', oid: 0, fields: [] });
    const req = { cookies: { refreshToken: 'old.refresh' }, body: {}, app: { locals: {} } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    await refresh(req, res, next);
    expect(res.cookie).toHaveBeenCalled();
    expect((res.json as jest.Mock).mock.calls[0][0].accessToken).toBeDefined();
  });

  it('logout clears cookie', async () => {
    jest.spyOn(tokenService, 'revokeRefreshToken').mockResolvedValue(undefined);
    const req = { cookies: { refreshToken: 'old.refresh' }, body: {} } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    await logout(req, res, next);
    expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', { path: '/api/v1/auth/refresh' });
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('revokeAll revokes tokens and clears cookie', async () => {
    jest.spyOn(tokenService, 'revokeAllUserTokens').mockResolvedValue(undefined);
    const req = {} as unknown as Request; // auth middleware would set res.locals.user
    const res = mockRes();
    (res.locals as { user?: { id: number; role: string } }).user = { id: 10, role: 'ADMIN' };
    const next = jest.fn();
    await revokeAll(req, res, next);
    expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', { path: '/api/v1/auth/refresh' });
    expect(res.status).toHaveBeenCalledWith(204);
  });
});