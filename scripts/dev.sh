#!/usr/bin/env bash
# Orchestrate the local dev stack: Supabase + Edge Functions + Vite.
#
# Usage:
#   ./scripts/dev.sh start   # start everything in the background, log to .dev-state/
#   ./scripts/dev.sh stop    # stop Vite + functions serve; leaves Supabase running
#   ./scripts/dev.sh status  # show what's running and ports
#   ./scripts/dev.sh logs    # tail logs (Ctrl-C to stop)
#   ./scripts/dev.sh logs vite    # tail one log
#   ./scripts/dev.sh reset   # supabase stop + remove state files (full shutdown)
#
# Notes:
#   - Uses pnpm (project's packageManager).
#   - Idempotent: `start` is a no-op for Supabase if it's already up.
#   - State lives in .dev-state/ at the repo root (gitignored).
#   - Supabase data persists between `start`/`stop` runs; `reset` wipes it.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
STATE_DIR="$REPO_ROOT/.dev-state"
LOGS_DIR="$STATE_DIR/logs"
PIDS_DIR="$STATE_DIR/pids"

VITE_LOG="$LOGS_DIR/vite.log"
FUNCTIONS_LOG="$LOGS_DIR/functions.log"
SUPABASE_LOG="$LOGS_DIR/supabase.log"
VITE_PID_FILE="$PIDS_DIR/vite.pid"
FUNCTIONS_PID_FILE="$PIDS_DIR/functions.pid"

VITE_PORT=5173
SUPABASE_API_PORT=54321
SUPABASE_DB_PORT=54322

mkdir -p "$LOGS_DIR" "$PIDS_DIR"

cmd="${1:-help}"

pid_alive() {
  local pid_file="$1"
  [[ -f "$pid_file" ]] || return 1
  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

port_listening() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

log() { printf '\033[1;36m[dev]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[dev]\033[0m %s\n' "$*" >&2; }
err() { printf '\033[1;31m[dev]\033[0m %s\n' "$*" >&2; }

start() {
  cd "$REPO_ROOT"

  # 1. Supabase local stack
  if port_listening "$SUPABASE_API_PORT"; then
    log "Supabase already running on :$SUPABASE_API_PORT"
  else
    log "Starting Supabase (this can take 30-60s on first run)…"
    if ! supabase start >"$SUPABASE_LOG" 2>&1; then
      err "supabase start failed. See $SUPABASE_LOG"
      tail -30 "$SUPABASE_LOG" >&2 || true
      return 1
    fi
    log "Supabase up. API on :$SUPABASE_API_PORT, DB on :$SUPABASE_DB_PORT"
  fi

  # Seed users if none exist (idempotent — script skips existing).
  if ! curl -fsS "http://127.0.0.1:$SUPABASE_API_PORT/auth/v1/admin/users" \
       -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" \
       >/dev/null 2>&1; then
    warn "Could not query GoTrue admin (expected on a fresh stack — seeding users)"
  fi
  if ! supabase db query "SELECT count(*) FROM auth.users;" --output csv 2>/dev/null \
       | tail -n +2 | grep -qE '^[1-9]'; then
    log "No users in auth.users — running scripts/seed-users.sh"
    if ! bash "$SCRIPT_DIR/seed-users.sh" >>"$LOGS_DIR/seed.log" 2>&1; then
      warn "seed-users.sh failed. See $LOGS_DIR/seed.log"
    else
      log "Seed users created (athlete1/athlete2/admin@example.com — Password123!)"
    fi
  else
    log "Users already exist in auth.users — skipping seed"
  fi

  # 2. Edge Functions
  if pid_alive "$FUNCTIONS_PID_FILE"; then
    log "Edge Functions already running (pid $(cat "$FUNCTIONS_PID_FILE"))"
  else
    log "Starting Edge Functions (logging to $FUNCTIONS_LOG)…"
    # `supabase functions serve` reads env from supabase/functions/.env if present,
    # and gets JWT secrets from the local stack automatically.
    (cd "$REPO_ROOT" && nohup supabase functions serve --no-verify-jwt >>"$FUNCTIONS_LOG" 2>&1 &
     echo $! >"$FUNCTIONS_PID_FILE")
    log "Edge Functions pid $(cat "$FUNCTIONS_PID_FILE")"
  fi

  # 3. Vite
  if pid_alive "$VITE_PID_FILE"; then
    log "Vite already running (pid $(cat "$VITE_PID_FILE"))"
  elif port_listening "$VITE_PORT"; then
    warn "Port :$VITE_PORT is already in use by another process (not managed by this script)"
  else
    log "Starting Vite (logging to $VITE_LOG)…"
    (cd "$REPO_ROOT" && nohup pnpm run dev >>"$VITE_LOG" 2>&1 &
     echo $! >"$VITE_PID_FILE")
    log "Vite pid $(cat "$VITE_PID_FILE")"
  fi

  log "Done. Open http://localhost:$VITE_PORT — logs in $LOGS_DIR/"
}

stop() {
  cd "$REPO_ROOT"

  for label in vite functions; do
    case "$label" in
      vite) pid_file="$VITE_PID_FILE" ;;
      functions) pid_file="$FUNCTIONS_PID_FILE" ;;
    esac
    if pid_alive "$pid_file"; then
      local pid
      pid="$(cat "$pid_file")"
      log "Stopping $label (pid $pid)"
      kill "$pid" 2>/dev/null || true
      # Give it a moment, then force if still alive.
      for _ in 1 2 3 4 5; do
        kill -0 "$pid" 2>/dev/null || break
        sleep 0.5
      done
      kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
      rm -f "$pid_file"
    else
      log "$label already stopped"
      rm -f "$pid_file"
    fi
  done

  # Edge-runtime children spawned by `supabase functions serve` don't always
  # exit when the parent does. Reap any leftover deno processes bound to :54321.
  if port_listening 54321 && command -v pkill >/dev/null; then
    pkill -f "functions serve" 2>/dev/null || true
    pkill -f "deno run.*edge-runtime" 2>/dev/null || true
  fi
}

status() {
  echo "── Vite ──"
  if pid_alive "$VITE_PID_FILE"; then
    echo "  pid $(cat "$VITE_PID_FILE"), log $VITE_LOG"
  else
    echo "  stopped"
  fi
  port_listening "$VITE_PORT" && echo "  :$VITE_PORT LISTENING" || echo "  :$VITE_PORT not listening"

  echo "── Edge Functions ──"
  if pid_alive "$FUNCTIONS_PID_FILE"; then
    echo "  pid $(cat "$FUNCTIONS_PID_FILE"), log $FUNCTIONS_LOG"
  else
    echo "  stopped"
  fi

  echo "── Supabase ──"
  if port_listening "$SUPABASE_API_PORT"; then
    echo "  API :$SUPABASE_API_PORT LISTENING"
    echo "  DB  :$SUPABASE_DB_PORT $(port_listening "$SUPABASE_DB_PORT" && echo LISTENING || echo 'not listening')"
  else
    echo "  stopped (no listener on :$SUPABASE_API_PORT)"
  fi
}

logs() {
  local target="${1:-all}"
  case "$target" in
    all) (cd "$LOGS_DIR" && ls -1 ./*.log 2>/dev/null | xargs -I{} tail -F "./{}") ;;
    vite) tail -F "$VITE_LOG" ;;
    functions) tail -F "$FUNCTIONS_LOG" ;;
    supabase) tail -F "$SUPABASE_LOG" ;;
    seed) tail -F "$LOGS_DIR/seed.log" 2>/dev/null || echo "(no seed log)" ;;
    *) err "unknown log target: $target"; return 1 ;;
  esac
}

reset() {
  stop
  log "Stopping Supabase (this tears down Docker volumes — DATA WILL BE LOST)"
  if [[ "${CONFIRM_RESET:-}" != "yes" ]]; then
    warn "Pass CONFIRM_RESET=yes to confirm. Aborting."
    return 1
  fi
  cd "$REPO_ROOT"
  supabase stop --no-backup >>"$SUPABASE_LOG" 2>&1 || warn "supabase stop failed"
  rm -rf "$STATE_DIR"
  log "State wiped. Next ./scripts/dev.sh start will reseed."
}

case "$cmd" in
  start) start ;;
  stop) stop ;;
  status) status ;;
  logs) shift; logs "$@" ;;
  reset) reset ;;
  help|--help|-h|"")
    sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
    ;;
  *)
    err "unknown command: $cmd"
    exit 1
    ;;
esac
