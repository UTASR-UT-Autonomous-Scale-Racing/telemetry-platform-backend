import { Request, Response, NextFunction } from 'express';
import { writePoint } from '../services/influxService.js';

export async function postTelemetry(req: Request, res: Response, next: NextFunction) {
  try {
    const { deviceId, value } = req.body || {};
    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({ error: 'deviceId is required and must be a string' });
    }
    if (typeof value !== 'number') {
      return res.status(400).json({ error: 'value is required and must be a number' });
    }

    await writePoint({ deviceId, value });
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
}
