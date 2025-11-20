import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from '../config/postgres.js';
import { UnauthorizedError } from "../errors/httpErrors.js";
import { env } from "../config/env.js"
import { createRefreshToken, generateAccessToken } from './tokenService.js';
export async function registerUser(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    role?: string
) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const finalRole = role ?? 'VIEWER';
    const sql = `INSERT INTO users (first_name, last_name, email, password_hash, role)
                            VALUES ($1,$2,$3,$4,$5) RETURNING id, role`;
    const result = await query(sql, [firstName, lastName, email, hashedPassword, finalRole]);
    const row = result.rows[0];
    const accessToken = generateAccessToken(row.id, row.role);
    const { refreshToken } = await createRefreshToken(row.id);
    return { accessToken, refreshToken };
}

export async function loginUser(email: string, password: string) {
    const sql = `SELECT id, password_hash, role FROM users WHERE email = $1 LIMIT 1`;
    const result = await query(sql, [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        throw new UnauthorizedError('Invalid email or password');
    }
    const accessToken = generateAccessToken(user.id, user.role);
    const { refreshToken } = await createRefreshToken(user.id);
    return { accessToken, refreshToken };
}
