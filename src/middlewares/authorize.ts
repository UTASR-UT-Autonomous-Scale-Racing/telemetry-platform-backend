import { Request, Response, NextFunction } from 'express';

export type AppRole = 'ADMIN' | 'TEAM' | 'VIEWER';

export function requireRole(...allowed: AppRole[]) {
  return function (req: Request, res: Response, next: NextFunction) {
    const user = res.locals.user as { id?: number; role?: AppRole } | undefined;
    if (!user || !user.role) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (!allowed.includes(user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    return next();
  };
}
