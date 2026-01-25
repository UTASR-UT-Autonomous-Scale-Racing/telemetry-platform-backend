import { register, login, refresh, logout, revokeAll } from '../src/controllers/authController.js';
import * as authService from '../src/services/authService.js';
import { verifyAndRotateRefreshToken } from '../src/services/tokenService.js';

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn();
  res.clearCookie = jest.fn();
  res.locals = {};  // for auth
  return res;
}

describe('Cookie delivery for refresh tokens', () => {
  afterEach(() => jest.restoreAllMocks());

  it('register sets HttpOnly refreshToken cookie and returns accessToken only', async () => {
    const tokens = { accessToken: 'access.jwt', refreshToken: 'refresh.token.value' };
    jest.spyOn(authService, 'registerUser').mockResolvedValue(tokens as any);
    const req: any = { body: { firstName: 'A', lastName: 'B', email: 'a@b.c', password: 'StrongPass123!', role: 'ADMIN' } };
    const res = mockRes();
    const next = jest.fn();
    await register(req, res, next);
    expect(res.cookie).toHaveBeenCalled();
    const opts = res.cookie.mock.calls[0][2];
    expect(opts.httpOnly).toBe(true);
    expect(opts.path).toBe('/api/v1/auth/refresh');
    expect(res.json).toHaveBeenCalledWith({ accessToken: 'access.jwt' });
  });

  it('login sets cookie and returns accessToken', async () => {
    const tokens = { accessToken: 'access.jwt2', refreshToken: 'refresh.token.value2' };
    jest.spyOn(authService, 'loginUser').mockResolvedValue(tokens as any);
    const req: any = { body: { email: 'a@b.c', password: 'StrongPass123!' } };
    const res = mockRes();
    const next = jest.fn();
    await login(req, res, next);
    expect(res.cookie).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ accessToken: 'access.jwt2' });
  });

  it('refresh rotates cookie and returns new accessToken', async () => {
    jest.spyOn(verifyAndRotateRefreshToken as any, 'apply'); // ensure not interfering
    jest.spyOn(require('../src/services/tokenService.js'), 'verifyAndRotateRefreshToken').mockResolvedValue({ userId: 1, newToken: 'new.refresh', newExpiresAt: new Date() });
    jest.spyOn(require('../src/config/postgres.js'), 'query').mockResolvedValue({ rows: [{ role: 'VIEWER' }] });
    const req: any = { cookies: { refreshToken: 'old.refresh' }, body: {}, app: { locals: {} } };
    const res = mockRes();
    const next = jest.fn();
    await refresh(req, res, next);
    expect(res.cookie).toHaveBeenCalled();
    expect(res.json.mock.calls[0][0].accessToken).toBeDefined();
  });

  it('logout clears cookie', async () => {
    jest.spyOn(require('../src/services/tokenService.js'), 'revokeRefreshToken').mockResolvedValue(undefined);
    const req: any = { cookies: { refreshToken: 'old.refresh' }, body: {} };
    const res = mockRes();
    const next = jest.fn();
    await logout(req, res, next);
    expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', { path: '/api/v1/auth/refresh' });
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('revokeAll revokes tokens and clears cookie', async () => {
    jest.spyOn(require('../src/services/tokenService.js'), 'revokeAllUserTokens').mockResolvedValue(undefined);
    const req: any = { }; // auth middleware would set res.locals.user
    const res = mockRes();
    res.locals.user = { id: 10, role: 'ADMIN' };
    const next = jest.fn();
    await revokeAll(req, res, next);
    expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', { path: '/api/v1/auth/refresh' });
    expect(res.status).toHaveBeenCalledWith(204);
  });
});