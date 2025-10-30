import { Request, Response, NextFunction } from 'express';
import { getUsers as fetchUsers } from '../services/userService.js';

export async function getUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    const users = await fetchUsers();
    res.json({ users });
  } catch (err) {
    next(err);
  }
}
