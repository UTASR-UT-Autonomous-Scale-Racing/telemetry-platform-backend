import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

export const jetsonAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== env.jetsonApiSecret) {
    return res.status(401).json({ message: 'Unauthorized: Invalid or missing API Key' });
  }

  next();
};
