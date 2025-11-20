# Telemetry Platform Backend

TypeScript (Node 20, ESM) Express API with PostgreSQL and InfluxDB. The API is protected with JWT-based authentication, role-based authorization (ADMIN, TEAM, VIEWER), short-lived access tokens, and HttpOnly cookie-based refresh tokens with rotation and revocation.

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
curl http://localhost:8080/api/v1/healthz
```

The API listens on http://localhost:8080 (routes are mounted at `/api/v1`).

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

# seed database (creates refresh_tokens table, and an admin user if missing)
npm run seed

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

See `.env.example` for dev defaults. Important variables:

```
NODE_ENV=development
PORT=8080
POSTGRES_URL=postgres://app:app@postgres:5432/app
INFLUX_URL=http://influxdb:8086
INFLUX_ORG=app-org
INFLUX_BUCKET=telemetry
INFLUX_TOKEN=dev-token
CORS_ORIGIN=http://localhost:8081
JWT_SECRET=<long-random-secret>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
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
	"test": "jest",
	"seed": "tsx scripts/seed.ts"
}
```

## Authentication

- Access token: short-lived JWT returned in JSON on register/login/refresh.
- Refresh token: long-lived, stored as an HttpOnly cookie (not readable by JavaScript), rotated on each refresh.
	- Cookie attributes: `httpOnly`, `secure` in production, `sameSite='strict'`, `path='/api/v1/auth/refresh'`.

Roles:
- ADMIN: full access
- TEAM: elevated non-admin actions
- VIEWER: default read-only

### Endpoints (all under `/api/v1`)

- POST `/register` → Issue access token and set refresh cookie
- POST `/login` → Issue access token and set refresh cookie
- POST `/auth/refresh` → Rotate refresh cookie and return new access token
- POST `/auth/logout` → Revoke the presented refresh token and clear cookie
- POST `/auth/revoke-all` → Revoke all refresh tokens for the authenticated user and clear cookie

Request validation uses Zod (see `src/schemas/authSchemas.ts`).

### Protected application routes

- GET `/metrics` → requires auth
- POST `/telemetry` → requires auth (and can be further role-gated)
- GET `/users` → requires auth
- POST `/users` → requires auth

Mount path reminder: these are available at `/api/v1/...`.

- GET `/healthz` → `{ status: "ok", uptime, version }`
- GET `/metrics` → plain text placeholder
- GET `/users` → returns rows from Postgres `users` table
- POST `/telemetry` → validates JSON body and writes a point to InfluxDB

### Examples (PowerShell)

```powershell
# Health
curl http://localhost:8080/api/v1/healthz

# Register (returns accessToken, sets cookie)
curl -Method POST http://localhost:8080/api/v1/register -ContentType "application/json" -Body '{"firstName":"Ada","lastName":"Lovelace","email":"ada@example.com","password":"SecurePass123!","confirmPassword":"SecurePass123!","role":"VIEWER"}'

# Login (returns accessToken, sets cookie)
curl -Method POST http://localhost:8080/api/v1/login -ContentType "application/json" -Body '{"email":"ada@example.com","password":"SecurePass123!"}'

# Use access token for protected route
$token = "<paste access token>"
curl -H @{"Authorization"="Bearer $token"} http://localhost:8080/api/v1/users

# Refresh (cookie sent automatically by the client if preserved by your tool)
curl -Method POST http://localhost:8080/api/v1/auth/refresh
```

### Examples (bash)

```bash
curl http://localhost:8080/api/v1/healthz
curl -X POST http://localhost:8080/api/v1/register -H "Content-Type: application/json" -d '{"firstName":"Ada","lastName":"Lovelace","email":"ada@example.com","password":"SecurePass123!","confirmPassword":"SecurePass123!","role":"VIEWER"}'
curl -X POST http://localhost:8080/api/v1/login -H "Content-Type: application/json" -d '{"email":"ada@example.com","password":"SecurePass123!"}'
ACCESS_TOKEN="<paste>"
curl -H "Authorization: Bearer $ACCESS_TOKEN" http://localhost:8080/api/v1/users
curl -X POST http://localhost:8080/api/v1/auth/refresh -c cookies.txt -b cookies.txt
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

# Seed (creates refresh_tokens and an admin user if missing)
npm run seed
```

## Troubleshooting

- Docker not running: If `docker compose up` fails with an engine error, open Docker Desktop and wait until it says "Running".
- Port conflicts: If 8080/5432/8086 are in use, edit `docker-compose.yml` port mappings.
- Module not found (in editor): Run `npm install` locally to get types; the container handles its own deps during `docker compose up`.
- Refresh token cookie not set: ensure you are using HTTP(S) correctly; in production, `secure` cookies require HTTPS.
- 401 Unauthorized on protected routes: verify the `Authorization: Bearer <accessToken>` header and that the token hasn’t expired.
- 403 Forbidden: your role may not allow the action; check route-level role enforcement.

## License

See [LICENSE](./LICENSE).
