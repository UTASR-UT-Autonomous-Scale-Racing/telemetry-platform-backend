import jwt from 'jsonwebtoken';
import { auth } from '../src/middlewares/auth.js';
import { env } from '../src/config/env.js';

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res;
}

describe('auth middleware', () => {
  it('sets res.locals.user for valid Bearer token', () => {
    const token = jwt.sign({ id: 42, role: 'ADMIN' }, env.jwtSecret, { expiresIn: '1h' });
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();
    auth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.locals.user).toEqual({ id: 42, role: 'ADMIN' });
  });

  it('returns 401 when token missing', () => {
    const req: any = { headers: {} };
    const res = mockRes();
    const next = jest.fn();
    auth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 on invalid token', () => {
    const req: any = { headers: { authorization: 'Bearer invalid.token.here' } };
    const res = mockRes();
    const next = jest.fn();
    auth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
