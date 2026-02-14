import { Point, WriteApi, QueryApi, FluxTableMetaData } from '@influxdata/influxdb-client';
import { getInfluxClient } from '../config/influx.js';
import { env } from '../config/env.js';
import { TelemetryPayload } from '../validators/telementryValidator.js';

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

export function writeTelemetryPayload(payload: TelemetryPayload) {
  ensureApis();
  const point = new Point('telemetry')
    .tag('vehicle_id', payload.vehicle_id)
    .timestamp(new Date(payload.timestamp * 1000));

  // Flatten pose
  if (payload.pose) {
    point.floatField('pose_x', payload.pose.x);
    point.floatField('pose_z', payload.pose.z);
  }

  // Flatten control
  if (payload.control) {
    point.floatField('steering', payload.control.steering);
    point.floatField('throttle', payload.control.throttle);
  }
  
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
  const rows: Record<string, unknown>[] = [];
  await new Promise<void>((resolve, reject) => {
    try {
      queryApi!.queryRows(flux, {
        next: (row: string[], tableMeta: FluxTableMetaData) => {
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
