#!/usr/bin/env bash
# Sobe um Postgres local descartável, aplica as migrations e roda os testes
# de segurança do banco (supabase/tests/rls.test.sql).
# Requer PostgreSQL 15+ instalado (pg_ctl/initdb no PATH ou em /usr/lib/postgresql/*/bin).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="$(dirname "$(command -v initdb 2>/dev/null || ls -d /usr/lib/postgresql/*/bin/initdb | tail -1)")"
DATA="$(mktemp -d)"
PORT="${TEST_DB_PORT:-54329}"
SOCK="$DATA"

cleanup() { "$PGBIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DATA"; }
trap cleanup EXIT

RUN_AS=()
if [ "$(id -u)" = "0" ]; then
  chown -R postgres "$DATA"
  RUN_AS=(runuser -u postgres --)
fi

"${RUN_AS[@]}" "$PGBIN/initdb" -D "$DATA" -U postgres --auth=trust >/dev/null
"${RUN_AS[@]}" "$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k $SOCK -c listen_addresses=''" -w start >/dev/null

PSQL=("${RUN_AS[@]}" psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)

"${PSQL[@]}" -f "$ROOT/supabase/tests/supabase-stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "Aplicando $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
"${PSQL[@]}" -f "$ROOT/supabase/tests/rls.test.sql"
