import { register, login } from '../src/controllers/authController.js';
import * as authService from '../src/services/authService.js';
import { UnauthorizedError } from '../src/errors/httpErrors.js';

// Minimal mock helpers for Express req/res/next
function createMockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  return res as any;
}

describe('authController', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('register: returns 201 and access token, sets cookie', async () => {
    const tokens = { accessToken: 'fake.jwt.token', refreshToken: 'fake.refresh.token' };
    const spy = jest.spyOn(authService, 'registerUser').mockResolvedValue(tokens as any);

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
  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.json).toHaveBeenCalledWith({ accessToken: 'fake.jwt.token' });
  expect(res.cookie).toHaveBeenCalled();
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

  it('login: returns 200 and access token, sets cookie', async () => {
    const tokens = { accessToken: 'fake.jwt.token', refreshToken: 'fake.refresh.token' };
    const spy = jest.spyOn(authService, 'loginUser').mockResolvedValue(tokens as any);

    const req: any = { body: { email: 'ada@example.com', password: 'SecurePass123!' } };
    const res = createMockRes();
    const next = jest.fn();

    await login(req, res, next);

    expect(spy).toHaveBeenCalledWith('ada@example.com', 'SecurePass123!');
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ accessToken: 'fake.jwt.token' });
  expect(res.cookie).toHaveBeenCalled();
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
