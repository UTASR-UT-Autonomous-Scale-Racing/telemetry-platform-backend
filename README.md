# Telemetry Platform Backend

Backend service for a real-time telemetry platform, handling data ingestion, processing, and live streaming for autonomous vehicle telemetry.

TypeScript (Node 20, ESM) Express API with PostgreSQL and InfluxDB via Docker Compose.

## Prerequisites

- Docker Desktop (for Windows/macOS) or Docker Engine (Linux)
- Node.js 20.x and npm (for local development)

## Quick start (Docker)

Bring up the full stack (API + PostgreSQL + InfluxDB):

```powershell
# from the repository root
cp .env.example .env
docker compose up --build -d

# check containers
docker compose ps
docker compose logs api --tail 100

# verify health
curl http://localhost:8080/healthz
```

The API listens on http://localhost:8080.

## Local development (without Docker for the API)

If you prefer to run the API locally (and run DBs however you like):

```powershell
# install deps
npm install

# set up env
cp .env.example .env

# (optional) if your DBs are local, update .env hostnames to localhost
# POSTGRES_URL=postgres://app:app@localhost:5432/app
# INFLUX_URL=http://localhost:8086

# run dev server (tsx)
npm run dev
```

## Project structure

```
src/
	config/        # env + db clients
	controllers/   # route handlers
	middlewares/   # error handler, request logging
	routes/        # express router
	services/      # postgres/influx helpers
	server.ts      # express app bootstrap
tests/           # jest tests
```

## Environment variables

Copy `.env.example` to `.env` and adjust as needed (use placeholders here; see `.env.example` for dev defaults):

```
NODE_ENV=development
PORT=8080
POSTGRES_URL=postgres://app:app@postgres:5432/app
INFLUX_URL=http://influxdb:8086
INFLUX_ORG=app-org
INFLUX_BUCKET=telemetry
INFLUX_TOKEN=dev-token

```

Notes:
- Inside Docker Compose, the hostnames `postgres` and `influxdb` resolve to their containers.
- If you run the API directly on your host, change those hostnames to `localhost` for locally running DBs.
- `.env` is gitignored and must never be committed. `.env.example` contains dev-friendly defaults that match `docker-compose.yml` (e.g., Postgres `app/app` and Influx token `dev-token`) for local development only — replace with strong values in any non-dev environment.

## NPM scripts

```json
{
  "dev": "tsx watch src/server.ts",
  "build": "tsc -p tsconfig.json",
  "start": "node dist/server.js",
  "lint": "eslint . --ext .ts",
  "test": "jest"
}
```

## API endpoints

- GET `/healthz` → `{ status: "ok", uptime, version }`
- GET `/metrics` → plain text placeholder
- GET `/users` → returns rows from Postgres `users` table
- POST `/telemetry` → validates JSON body and writes a point to InfluxDB

Examples (PowerShell):

```powershell
# Health
curl http://localhost:8080/healthz

# Metrics (text/plain)
curl http://localhost:8080/metrics

# Users
curl http://localhost:8080/users

# Telemetry (PowerShell escaping)
curl -Method POST http://localhost:8080/telemetry -ContentType "application/json" -Body '{"deviceId":"dev-1","value":42}'
```

Examples (bash):

```bash
curl http://localhost:8080/healthz
curl http://localhost:8080/metrics
curl http://localhost:8080/users
curl -X POST http://localhost:8080/telemetry -H "Content-Type: application/json" -d '{"deviceId":"dev-1","value":42}'
```

## Docker services

- api: Node 20, builds the TypeScript app and listens on 8080
- postgres: Postgres 15 with database `app` and user `app`/`app`
- influxdb: InfluxDB 2.7 with org `app-org`, bucket `telemetry`, token `dev-token`

Persistent volumes:

```
pgdata:      # Postgres data
influxdata:  # InfluxDB 2 data
```

## Development tasks

```powershell
# Type check + build
npm run build

# Lint
npm run lint

# Tests
npm test
```

## Troubleshooting

- Docker not running: If `docker compose up` fails with an engine error, open Docker Desktop and wait until it says "Running".
- Port conflicts: If 8080/5432/8086 are in use, edit `docker-compose.yml` port mappings.
- Module not found (in editor): Run `npm install` once locally to get types; the container handles its own deps during `docker compose up`.

## License

See [LICENSE](./LICENSE).
