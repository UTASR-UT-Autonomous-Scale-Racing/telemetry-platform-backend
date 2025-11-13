import { register, login } from '../src/controllers/authController.js';
import * as authService from '../src/services/authService.js';
import { UnauthorizedError } from '../src/errors/httpErrors.js';

// Minimal mock helpers for Express req/res/next
function createMockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res as any;
}

describe('authController', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('register: returns 200 and token on success', async () => {
  const token = 'fake.jwt.token';
  const spy = jest.spyOn(authService, 'registerUser').mockResolvedValue(token as any);

    const req: any = {
      body: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
      },
    };
    const res = createMockRes();
    const next = jest.fn();

    await register(req, res, next);

    expect(spy).toHaveBeenCalledWith('Ada', 'Lovelace', 'ada@example.com', 'SecurePass123!');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ token });
    expect(next).not.toHaveBeenCalled();
  });

  it('register: forwards errors to next(err)', async () => {
    const err = new Error('DB down');
    jest.spyOn(authService, 'registerUser').mockRejectedValue(err);

    const req: any = { body: { firstName: 'X', lastName: 'Y', email: 'x@y.com', password: 'p', confirmPassword: 'p' } };
    const res = createMockRes();
    const next = jest.fn();

    await register(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('login: returns 200 and token on success', async () => {
  const token = 'fake.jwt.token';
  const spy = jest.spyOn(authService, 'loginUser').mockResolvedValue(token as any);

    const req: any = { body: { email: 'ada@example.com', password: 'SecurePass123!' } };
    const res = createMockRes();
    const next = jest.fn();

    await login(req, res, next);

    expect(spy).toHaveBeenCalledWith('ada@example.com', 'SecurePass123!');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ token });
    expect(next).not.toHaveBeenCalled();
  });

  it('login: unauthorized bubbles to error handler', async () => {
    const err = new UnauthorizedError('Invalid email or password');
    jest.spyOn(authService, 'loginUser').mockRejectedValue(err);

    const req: any = { body: { email: 'ada@example.com', password: 'wrong' } };
    const res = createMockRes();
    const next = jest.fn();

    await login(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });
});
