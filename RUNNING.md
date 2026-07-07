# NigerSec — How to Run

## Prerequisites

| Tool | Min version | Check |
|------|-------------|-------|
| Docker + Docker Compose | 24+ | `docker --version` |
| Java JDK | 21+ | `java -version` |
| Node.js | 18+ | `node --version` |

---

## Mode A — Development / Demo (quickest start)

This mode seeds fake breach records and a demo institution automatically so you can explore the app without any setup.

### 1. Start infrastructure

```bash
# From the workspace root
docker compose up -d
```

Starts **PostgreSQL 16** on `localhost:5432`, **Redis 7** on `localhost:6379`, and **Kafka** on `localhost:9092`.  
Wait ~15 seconds for Kafka to be ready before continuing.

### 2. Start the backend

```bash
cd nigersec-backend/intelligence-backend

JAVA_HOME=/home/blackwrld04/.jdks/openjdk-26 \
PATH=/home/blackwrld04/.jdks/openjdk-26/bin:$PATH \
./mvnw spring-boot:run
```

Backend starts at **http://localhost:8080/api/v1**

On first boot the `DataSeeder` automatically inserts:
- Sample breach records — test with `email=test@example.com`, `phone=2348012345678`, `BVN=12345678901`, `NIN=98765432101`
- A demo institution — its UUID is printed to the startup log, use it as the Institution ID when registering on the institution portal

### 3. Start the frontend

```bash
cd nigersec-frontend
npm run dev
```

Open **http://localhost:5173**

---

## Mode B — Production (no demo data)

Use this when you want real users only and no pre-seeded fake data.

### 1. Start infrastructure

Same as above:

```bash
docker compose up -d
```

### 2. Start the backend (prod profile)

Use the provided script — it handles the JWT secret, prompts for DB credentials, and sets `SPRING_PROFILES_ACTIVE=prod` which disables `DataSeeder`:

```bash
cd nigersec-backend/intelligence-backend
bash start-prod.sh
```

The script will:
- Auto-generate a secure `JWT_SECRET` (print it — save it somewhere safe so tokens survive restarts)
- Prompt for your PostgreSQL host / database / user / password if not already in the environment
- Prompt for your frontend URL (for CORS) if deploying to a real domain
- Start the backend with reduced logging and schema validation

Or set everything via environment variables and skip the prompts entirely:

```bash
cd nigersec-backend/intelligence-backend

SPRING_PROFILES_ACTIVE=prod \
JWT_SECRET=$(openssl rand -hex 32) \
DB_HOST=localhost \
DB_NAME=nigersec \
DB_USER=nigersec \
DB_PASS=your_strong_password \
FRONTEND_URL=https://your-frontend-domain.com \
JAVA_HOME=/home/blackwrld04/.jdks/openjdk-26 \
PATH=/home/blackwrld04/.jdks/openjdk-26/bin:$PATH \
./mvnw spring-boot:run
```

> **Note:** The first boot with `SPRING_PROFILES_ACTIVE=prod` sets `ddl-auto: validate`.  
> Hibernate still **creates** the schema on the very first run because there is nothing to validate against yet — this is correct behaviour.  
> On every subsequent restart it validates the schema against the entities and refuses to start if they don't match, protecting your data.

### 3. Create your first institution (institution portal only)

With prod profile there is no demo institution. Before any institution user can register, you need to insert a real institution row.

**Step 1** — edit the values in the SQL file:

```bash
# Open the file and change name, type, contact_email, rc_number
nano nigersec-backend/intelligence-backend/seed-institution.sql
```

**Step 2** — run it against your database:

```bash
psql -h localhost -U nigersec -d nigersec \
  -f nigersec-backend/intelligence-backend/seed-institution.sql
```

The script prints the generated UUID:

```
NOTICE:  Institution ID (give this to your users): a1b2c3d4-...
```

Give that UUID to anyone who needs to register as an institution user on the portal's **Register** tab.

### 4. Start the frontend

```bash
cd nigersec-frontend

# Copy the env file and point it at your backend if not localhost
cp .env.example .env
# Edit .env if needed — VITE_API_URL defaults to /api/v1 (localhost proxy)

npm run dev          # development server
# OR
npm run build        # production build → dist/
```

---

## Quick API smoke test

```bash
# Health check
curl http://localhost:8080/api/v1/actuator/health

# Register a citizen account
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"password123","role":"CITIZEN"}'

# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"password123"}'

# Breach check (no auth needed)
curl -X POST http://localhost:8080/api/v1/citizen/breach/check \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test@example.com","dataType":"EMAIL"}'
```

---

## Running without Docker (minimal setup)

If you only have PostgreSQL available and nothing else:

- **Redis missing** — falls back to an in-memory cache automatically, no crash
- **Kafka missing** — breach/fraud events are logged as warnings, API responses still work. Set `max.block.ms=100` in `application.yaml` if you want faster timeouts
- **Kafka topics missing** — `missing-topics-fatal: false` is already configured, no crash

**Minimum requirement to run the backend: PostgreSQL only.**

---

## Environment variables

All variables have safe defaults for local development. Override them for production.

| Variable | Default | Description |
|----------|---------|-------------|
| `SPRING_PROFILES_ACTIVE` | _(none — demo mode)_ | Set to `prod` to disable demo data seeding |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `nigersec` | Database name |
| `DB_USER` | `nigersec` | DB username |
| `DB_PASS` | `nigersec` | DB password — **change in production** |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | _(empty)_ | Redis password if auth is enabled |
| `JWT_SECRET` | `nigersec-super-secret-key-...` | **Must be changed in production** — use `openssl rand -hex 32` |
| `KAFKA_SERVERS` | `localhost:9092` | Kafka bootstrap servers |
| `DARK_WEB_API_KEY` | _(empty)_ | Optional — enables real dark-web breach lookups |
| `DARK_WEB_API_URL` | `https://api.breachdirectory.org` | Dark-web API base URL |
| `FRONTEND_URL` | _(empty)_ | Extra CORS origin — set to your production frontend URL |
