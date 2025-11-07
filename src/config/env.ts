import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 8080),
  postgresUrl: process.env.POSTGRES_URL || 'postgres://app:app@postgres:5432/app',
  influxUrl: process.env.INFLUX_URL || 'http://influxdb:8086',
  influxOrg: process.env.INFLUX_ORG || 'app-org',
  influxBucket: process.env.INFLUX_BUCKET || 'telemetry',
  influxToken: process.env.INFLUX_TOKEN || 'dev-token',
  jetsonHost: process.env.JETSON_HOST || 'host.docker.internal',
  jetsonPort: process.env.JETSON_PORT || 5001,
};
