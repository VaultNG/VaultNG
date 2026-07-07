#!/usr/bin/env bash
# =============================================================================
#  NigerSec — Production start script
#  Usage:  bash start-prod.sh
#
#  What it does:
#    1. Checks that required tools are present (java, mvnw)
#    2. Generates a secure JWT_SECRET if one is not already set
#    3. Reads DB credentials from environment variables (with prompts if missing)
#    4. Starts the backend with SPRING_PROFILES_ACTIVE=prod
#       → DataSeeder does NOT run (no fake demo data)
#       → DDL set to "validate" (schema must already exist)
#       → Logging reduced to WARN level
#
#  All variables can be pre-set in the environment before running this script,
#  in which case the prompts are skipped.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ---------------------------------------------------------------------------
# 1. Locate Java
# ---------------------------------------------------------------------------
if [[ -z "${JAVA_HOME:-}" ]]; then
  # Try the JDK installed by IntelliJ / IDE plugin (common on dev machines)
  CANDIDATE="/home/blackwrld04/.jdks/openjdk-26"
  if [[ -d "$CANDIDATE" ]]; then
    export JAVA_HOME="$CANDIDATE"
  fi
fi

if [[ -z "${JAVA_HOME:-}" ]]; then
  echo "ERROR: JAVA_HOME is not set and could not be auto-detected."
  echo "       Set JAVA_HOME to a JDK 21+ directory before running this script."
  exit 1
fi

export PATH="${JAVA_HOME}/bin:${PATH}"

JAVA_VERSION=$("${JAVA_HOME}/bin/java" -version 2>&1 | head -1)
echo "✔  Java: ${JAVA_VERSION}"

# ---------------------------------------------------------------------------
# 2. Generate JWT_SECRET if not provided
# ---------------------------------------------------------------------------
if [[ -z "${JWT_SECRET:-}" ]]; then
  if command -v openssl &>/dev/null; then
    JWT_SECRET="$(openssl rand -hex 32)"
    echo "✔  JWT_SECRET auto-generated (64 hex chars). Store this for token continuity across restarts:"
    echo "   JWT_SECRET=${JWT_SECRET}"
  else
    echo "WARNING: openssl not found — using a default secret. Set JWT_SECRET manually before going live."
    JWT_SECRET="nigersec-change-me-in-production-$(date +%s)"
  fi
  export JWT_SECRET
fi

# ---------------------------------------------------------------------------
# 3. Database credentials — read from env or prompt
# ---------------------------------------------------------------------------
if [[ -z "${DB_HOST:-}" ]]; then
  read -rp "PostgreSQL host [localhost]: " DB_HOST
  DB_HOST="${DB_HOST:-localhost}"
fi
export DB_HOST

if [[ -z "${DB_PORT:-}" ]]; then
  DB_PORT="5432"
fi
export DB_PORT

if [[ -z "${DB_NAME:-}" ]]; then
  read -rp "PostgreSQL database name [nigersec]: " DB_NAME
  DB_NAME="${DB_NAME:-nigersec}"
fi
export DB_NAME

if [[ -z "${DB_USER:-}" ]]; then
  read -rp "PostgreSQL username [nigersec]: " DB_USER
  DB_USER="${DB_USER:-nigersec}"
fi
export DB_USER

if [[ -z "${DB_PASS:-}" ]]; then
  read -rsp "PostgreSQL password: " DB_PASS
  echo
fi
export DB_PASS

# ---------------------------------------------------------------------------
# 4. Optional: Frontend URL for CORS
# ---------------------------------------------------------------------------
if [[ -z "${FRONTEND_URL:-}" ]]; then
  read -rp "Frontend URL for CORS (leave blank to allow only localhost): " FRONTEND_URL
fi
export FRONTEND_URL

# ---------------------------------------------------------------------------
# 5. Start
# ---------------------------------------------------------------------------
echo ""
echo "Starting NigerSec backend (prod profile — no demo data)..."
echo "  DB:       postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo "  CORS:     http://localhost:5173, http://localhost:3000${FRONTEND_URL:+, $FRONTEND_URL}"
echo ""

SPRING_PROFILES_ACTIVE=prod \
  exec ./mvnw spring-boot:run \
    -Dspring-boot.run.jvmArguments="-Xms256m -Xmx512m"
