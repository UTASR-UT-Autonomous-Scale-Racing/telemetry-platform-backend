import { requireRole } from '../src/middlewares/authorize.js';

import { Request, Response } from 'express';

function mockRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    locals: {},
  } as unknown as Response;
  return res;
}

describe('authorize middleware', () => {
  it('allows when user role matches', () => {
    const mw = requireRole('ADMIN');
    const req = {} as unknown as Request;
  const res = mockRes();
  res.locals.user = { id: 1, role: 'ADMIN' };
    const next = jest.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('denies when user missing', () => {
    const mw = requireRole('ADMIN');
    const req = {} as unknown as Request;
  const res = mockRes();
    const next = jest.fn();
    mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('denies when role mismatch', () => {
    const mw = requireRole('ADMIN');
    const req = {} as unknown as Request;
  const res = mockRes();
  (res.locals as { user?: { id: number; role: string } }).user = { id: 2, role: 'VIEWER' };
    const next = jest.fn();
    mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
