import { Response } from 'express';
import { TelemetryPayload } from '../validators/telementryValidator.js';

class TelemetryStreamService {
  private clients: Response[] = [];

  constructor() {
    this.clients = [];
  }

  /**
   * Subscribe a new client to the Server-Sent Events stream.
   * @param res The Express Response object for the client.
   */
  subscribe(res: Response): void {
    // Keep connection alive
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering for Nginx/proxies
    });

    res.write('retry: 10000\n\n'); // Client retry interval

    this.clients.push(res);
    console.log(`Client connected to telemetry stream. Total clients: ${this.clients.length}`);

    // Remove client when connection closes
    res.on('close', () => {
      this.clients = this.clients.filter((client) => client !== res);
      console.log(`Client disconnected from telemetry stream. Total clients: ${this.clients.length}`);
    });
  }

  /**
   * Broadcast telemetry data to all connected clients.
   * @param data The validated telemetry payload.
   */
  broadcast(data: TelemetryPayload): void {
    if (this.clients.length === 0) return;

    // SSE format: "data: <json>\n\n"
    const message = `data: ${JSON.stringify(data)}\n\n`;

    this.clients.forEach((client) => {
      client.write(message);
    });
  }
}

export const telemetryStreamService = new TelemetryStreamService();
