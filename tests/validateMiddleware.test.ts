import { z } from 'zod';
import { validateBody } from '../src/middlewares/validate.js';

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('validateBody middleware', () => {
  const schema = z.object({ name: z.string().min(2), age: z.number().int().min(1) });
  const mw = validateBody(schema);

  it('passes valid body and mutates req.body', () => {
    const req: any = { body: { name: 'John', age: 30 } };
    const res = mockRes();
    const next = jest.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ name: 'John', age: 30 });
  });

  it('passes Zod error to next for invalid body', () => {
    const req: any = { body: { name: 'J', age: 0 } }; // too short name and age < 1
    const res = mockRes();
    const next = jest.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
    const errArg = next.mock.calls[0][0];
    expect(errArg).toBeInstanceOf(Error);
  });
});
