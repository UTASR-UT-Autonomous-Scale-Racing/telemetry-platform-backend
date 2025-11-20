import { requireRole } from '../src/middlewares/authorize.js';

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res;
}

describe('authorize middleware', () => {
  it('allows when user role matches', () => {
    const mw = requireRole('ADMIN');
    const req: any = {};
  const res = mockRes();
  res.locals.user = { id: 1, role: 'ADMIN' };
    const next = jest.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('denies when user missing', () => {
    const mw = requireRole('ADMIN');
    const req: any = {};
  const res = mockRes();
    const next = jest.fn();
    mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('denies when role mismatch', () => {
    const mw = requireRole('ADMIN');
    const req: any = {};
  const res = mockRes();
  res.locals.user = { id: 2, role: 'VIEWER' };
    const next = jest.fn();
    mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
