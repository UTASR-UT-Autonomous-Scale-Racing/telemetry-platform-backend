import { Point, WriteApi, QueryApi } from '@influxdata/influxdb-client';
import { getInfluxClient } from '../config/influx.js';
import { env } from '../config/env.js';
import { TelemetryFrame } from '../validators/telementryValidator.js';

let writeApi: WriteApi | null = null;
let queryApi: QueryApi | null = null;

function ensureApis() {
  if (!writeApi || !queryApi) {
    const client = getInfluxClient();
    writeApi = client.getWriteApi(env.influxOrg, env.influxBucket);
    queryApi = client.getQueryApi(env.influxOrg);
  }
}

export async function writePoint({ deviceId, value }: { deviceId: string; value: number }) {
  ensureApis();
  const p = new Point('telemetry').tag('deviceId', deviceId).floatField('value', value);
  writeApi!.writePoint(p);
  await writeApi!.close();
  writeApi = null; // allow recreation on next use
}

export function writeTelemetryFrame(frame: TelemetryFrame) {
  ensureApis();
  const point = new Point('telemetry')
    .tag('sessionId', frame.sid)
    .tag('vehicleId', frame.veh || 'unknown')
    .timestamp(new Date(frame.t * 1000))

  Object.entries(frame).forEach(([key, value]) => {
    if (!['t', 'sid', 'veh'].includes(key) && typeof value === 'number') {
      point.floatField(key, value);
    }
  });
  
  writeApi!.writePoint(point);
} 

export async function closeInfluxWriter() {
  if (writeApi) {
    await writeApi.flush(true);
    await writeApi.close();
    writeApi = null;
  }
}

export async function queryRange(flux: string) {
  ensureApis();
  const rows: any[] = [];
  await new Promise<void>((resolve, reject) => {
    try {
      queryApi!.queryRows(flux, {
        next: (row: string[], tableMeta: any) => {
          const obj = tableMeta.toObject(row);
          rows.push(obj);
        },
        error: (err: Error) => {
          reject(err);
        },
        complete: () => {
          resolve();
        }
      });
    } catch (err) {
      reject(err as Error);
    }
  });
  return rows;
}
