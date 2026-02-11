import jwt from 'jsonwebtoken';
import { auth } from '../src/middlewares/auth.js';
import { env } from '../src/config/env.js';

import { Request, Response } from 'express';

function mockRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    locals: {},
  } as unknown as Response;
  return res;
}

describe('auth middleware', () => {
  it('sets res.locals.user for valid Bearer token', () => {
    const token = jwt.sign({ id: 42, role: 'ADMIN' }, env.jwtSecret, { expiresIn: '1h' });
    const req = { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    auth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.locals.user).toEqual({ id: 42, role: 'ADMIN' });
  });

  it('returns 401 when token missing', () => {
    const req = { headers: {} } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    auth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 on invalid token', () => {
    const req = { headers: { authorization: 'Bearer invalid.token.here' } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    auth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
