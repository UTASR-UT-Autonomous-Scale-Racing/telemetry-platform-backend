import { Request, Response, NextFunction } from 'express';
import { getUsers as fetchUsers } from '../services/userService.js';
import prisma from '../services/prismaClient.js';
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
    const { confirmPassword, ...data } = req.body as CreateUserInput;
    const user = await prisma.user.create({ data });
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}
