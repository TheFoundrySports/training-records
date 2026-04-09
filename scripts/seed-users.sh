#!/usr/bin/env bash
# Creates local dev users via the Supabase Auth Admin API.
# Run once after `supabase db reset`.
#
# Usage: ./scripts/seed-users.sh
#
# Passwords: Password123!
#   athlete1@example.com (role: athlete)
#   athlete2@example.com (role: athlete)
#   admin@example.com    (role: admin)
#
# NOTE: Uses `docker exec` to reach the GoTrue container directly because
# the Kong gateway (/auth/v1/admin/*) returns 502 in Supabase CLI >= 2.x.
# See: https://github.com/supabase/cli/issues/

set -euo pipefail

AUTH_CONTAINER="supabase_auth_training-records"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

create_user() {
  local email="$1"
  local password="$2"
  local id
  id=$(docker exec "$AUTH_CONTAINER" wget -qO- \
    --post-data="{\"email\":\"$email\",\"password\":\"$password\",\"email_confirm\":true}" \
    --header='Content-Type: application/json' \
    --header="Authorization: Bearer $SERVICE_KEY" \
    "http://localhost:9999/admin/users" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id','ERROR: ' + str(d)))")
  echo "$email → $id"
  echo "$id"
}

echo "Creating seed users..."

ATHLETE1_ID=$(create_user "athlete1@example.com" "Password123!" | tail -1)
ATHLETE2_ID=$(create_user "athlete2@example.com" "Password123!" | tail -1)
ADMIN_ID=$(create_user "admin@example.com" "Password123!" | tail -1)

echo ""
echo "Setting admin role..."
supabase db query "UPDATE public.profiles SET role = 'admin' WHERE id = '$ADMIN_ID';"

echo ""
echo "Done! Users created:"
echo "  athlete1@example.com / Password123!  (athlete)"
echo "  athlete2@example.com / Password123!  (athlete)"
echo "  admin@example.com    / Password123!  (admin)"
