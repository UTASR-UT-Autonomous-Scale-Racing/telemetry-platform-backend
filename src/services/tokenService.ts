import crypto from 'crypto';
import { query } from '../config/postgres.js';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../errors/httpErrors.js';

export function parseTtl(ttl: string): number {
  const match = ttl.match(/^(\d+)([smhd])$/);
  if (!match) return 900; // default 15m
  const value = Number(match[1]);
  const unit = match[2];
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return value;
  }
}

function nowPlusSeconds(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000);
}

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export async function createRefreshToken(userId: number): Promise<{ refreshToken: string; expiresAt: Date }> {
  const raw = crypto.randomBytes(48).toString('base64url');
  const tokenHash = hashToken(raw);
  const ttlSeconds = parseTtl(env.refreshTokenTtl);
  const expiresAt = nowPlusSeconds(ttlSeconds);
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)`,
    [userId, tokenHash, expiresAt]
  );
  return { refreshToken: raw, expiresAt };
}

export async function verifyAndRotateRefreshToken(raw: string): Promise<{ userId: number; newToken: string; newExpiresAt: Date }> {
  const tokenHash = hashToken(raw);
  const result = await query(`SELECT id, user_id, token_hash, expires_at, revoked FROM refresh_tokens WHERE token_hash = $1 LIMIT 1`, [tokenHash]);
  const row = result.rows[0];
  if (!row) throw new UnauthorizedError('Invalid refresh token');
  if (row.revoked) throw new UnauthorizedError('Refresh token revoked');
  if (new Date(row.expires_at) < new Date()) throw new UnauthorizedError('Refresh token expired');

  // Rotate: revoke old and create new
  await query(`UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1`, [row.id]);
  const { refreshToken: newToken, expiresAt: newExpiresAt } = await createRefreshToken(row.user_id);
  return { userId: row.user_id, newToken, newExpiresAt };
}

export async function revokeRefreshToken(raw: string): Promise<void> {
  const tokenHash = hashToken(raw);
  await query(`UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1`, [tokenHash]);
}

export async function revokeAllUserTokens(userId: number): Promise<void> {
  await query(`UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`, [userId]);
}

// Replay detection helper: check if a previously revoked token was presented again
export async function isRevokedToken(raw: string): Promise<boolean> {
  const tokenHash = hashToken(raw);
  const result = await query(`SELECT revoked FROM refresh_tokens WHERE token_hash = $1 LIMIT 1`, [tokenHash]);
  const row = result.rows[0];
  return !!row && row.revoked === true;
}

export function generateAccessToken(userId: number, role: string): string {
  const secret = env.jwtSecret;
  const ttl = env.accessTokenTtl;
  const jwt = require('jsonwebtoken');
  return jwt.sign({ id: userId, role }, secret, { expiresIn: ttl });
}
