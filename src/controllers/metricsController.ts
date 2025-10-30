import { Request, Response } from 'express';

export function metricsHandler(_req: Request, res: Response) {
  res
    .type('text/plain')
    .send('# HELP telemetry_requests_total Total telemetry requests\ntelemetry_requests_total 0\n');
}
