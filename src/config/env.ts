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
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || '7d'
};
