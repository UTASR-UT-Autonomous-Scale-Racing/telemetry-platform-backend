import { InfluxDB } from '@influxdata/influxdb-client';
import { env } from './env.js';

let client: InfluxDB | null = null;

export async function initInflux() {
  client = new InfluxDB({ url: env.influxUrl, token: env.influxToken });
}

export function getInfluxClient() {
  if (!client) throw new Error('Influx client not initialized');
  return client;
}
