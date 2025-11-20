import { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser } from '../services/authService.js';
import { verifyAndRotateRefreshToken, revokeRefreshToken, generateAccessToken, parseTtl, revokeAllUserTokens } from '../services/tokenService.js';
import { query } from '../config/postgres.js';

// Register a new user and issue initial access + refresh tokens
export async function register(req: Request, res: Response, next: NextFunction) {
    const { firstName, lastName, email, password, role } = req.body;
    try {
                const { accessToken, refreshToken } = role
                    ? await registerUser(firstName, lastName, email, password, role)
                    : await registerUser(firstName, lastName, email, password);
                const ttlSeconds = parseTtl(process.env.REFRESH_TOKEN_TTL || '7d');
                res.cookie('refreshToken', refreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    path: '/api/v1/auth/refresh',
                    maxAge: ttlSeconds * 1000,
                });
                res.status(201).json({ accessToken });
    } catch (err) {
        next(err);
    }
}

// Login existing user and issue new pair of tokens
export async function login(req: Request, res: Response, next: NextFunction) {
    const { email, password } = req.body;
    try {
                const { accessToken, refreshToken } = await loginUser(email, password);
                const ttlSeconds = parseTtl(process.env.REFRESH_TOKEN_TTL || '7d');
                res.cookie('refreshToken', refreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    path: '/api/v1/auth/refresh',
                    maxAge: ttlSeconds * 1000,
                });
                res.status(200).json({ accessToken });
    } catch (err) {
        next(err);
    }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
    try {
        const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
        if (!refreshToken) return res.status(400).json({ message: 'Missing refreshToken' });

        const { userId, newToken } = await verifyAndRotateRefreshToken(refreshToken);
        // Retrieve role for access token claims
        const roleResult = await query('SELECT role FROM users WHERE id = $1', [userId]);
        const role = roleResult.rows[0]?.role || 'VIEWER';
                const accessToken = generateAccessToken(userId, role);
                const ttlSeconds = parseTtl(process.env.REFRESH_TOKEN_TTL || '7d');
                res.cookie('refreshToken', newToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    path: '/api/v1/auth/refresh',
                    maxAge: ttlSeconds * 1000,
                });
                return res.status(200).json({ accessToken });
    } catch (err) {
        next(err);
    }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
    try {
                const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
                if (!refreshToken) return res.status(400).json({ message: 'Missing refreshToken' });
                await revokeRefreshToken(refreshToken);
                res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
                return res.status(204).send();
    } catch (err) {
        next(err);
    }
}

export async function revokeAll(req: Request, res: Response, next: NextFunction) {
    try {
        const user = (res.locals as any).user;
        if (!user?.id) return res.status(401).json({ message: 'Unauthorized' });
        await revokeAllUserTokens(user.id);
        res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
        return res.status(204).send();
    } catch (err) {
        next(err);
    }
}