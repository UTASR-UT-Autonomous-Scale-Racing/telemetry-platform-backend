import { z } from 'zod';
import { validateBody } from '../src/middlewares/validate.js';

import { Request, Response } from 'express';

function mockRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('validateBody middleware', () => {
  const schema = z.object({ name: z.string().min(2), age: z.number().int().min(1) });
  const mw = validateBody(schema);

  it('passes valid body and mutates req.body', () => {
    const req = { body: { name: 'John', age: 30 } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ name: 'John', age: 30 });
  });

  it('passes Zod error to next for invalid body', () => {
    const req = { body: { name: 'J', age: 0 } } as unknown as Request; // too short name and age < 1
    const res = mockRes();
    const next = jest.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
    const errArg = next.mock.calls[0][0];
    expect(errArg).toBeInstanceOf(Error);
  });
});
