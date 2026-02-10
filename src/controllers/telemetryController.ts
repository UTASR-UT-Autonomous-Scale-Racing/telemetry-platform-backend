import { Request, Response } from 'express';
import { validateHttpTelemetry } from '../validators/telementryValidator.js';
import { writeTelemetryPayload } from '../services/influxService.js';
import { telemetryStreamService } from '../services/telemetryStreamService.js';

export const postTelemetry = async (req: Request, res: Response) => {
  const result = validateHttpTelemetry(req.body);

  if (!result.valid) {
    console.error('Invalid telemetry:', result.error);
    return res.status(400).json({ message: result.error });
  }

  // Write to InfluxDB (fire and forget / async)
  if (result.payload) {
    // Add server receive time
    result.payload.serverReceiveTime = Date.now() / 1000;

    try {
      writeTelemetryPayload(result.payload);
      
      // Broadcast to connected clients
      telemetryStreamService.broadcast(result.payload);
      
      res.status(200).json({ message: 'Telemetry received' });
    } catch (err) {
      console.error('Error processing telemetry:', err);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
};

export const getTelemetryStream = (req: Request, res: Response) => {
  telemetryStreamService.subscribe(res);
  // Connection is kept alive by the service
};
