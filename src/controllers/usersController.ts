import { Request, Response, NextFunction } from 'express';
import { getUsers as fetchUsers } from '../services/userService.js';
import { query } from '../config/postgres.js';
import type { CreateUserInput } from '../schemas/userSchema.js';

export async function getUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    const users = await fetchUsers();
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    // Body has already been validated by route-level middleware.
  const { confirmPassword, role, ...rest } = req.body as CreateUserInput & { role?: string };
  const finalRole = role ?? 'VIEWER';
  const sql = `INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, first_name AS "firstName", last_name AS "lastName", email, created_at AS "createdAt", role`;
  const result = await query(sql, [rest.firstName, rest.lastName, rest.email, rest.password, finalRole]);
  res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
}
