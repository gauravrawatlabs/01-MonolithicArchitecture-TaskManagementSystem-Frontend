#!/bin/sh
# Runs at container start (nginx image entrypoint, /docker-entrypoint.d/). Writes the runtime configuration:
#   /etc/nginx/tms/config.js             → window.__APP_CONFIG__ (served at /config.js; see public/config.js)
#   /etc/nginx/tms/security-headers.conf → the Phase 16 headers, CSP connect-src = the API's origin
# Input templates live in /etc/nginx/tms-templates (read-only); output goes to /etc/nginx/tms (writable).
# Environment: API_BASE_URL (e.g. https://api.example.com), APP_NAME (optional).
set -eu

api_base_url="${API_BASE_URL:-${DEFAULT_API_BASE_URL}}"
case "$api_base_url" in
  http://*|https://*) ;;
  *) echo "tms: API_BASE_URL must start with http:// or https:// (got '$api_base_url')" >&2; exit 1 ;;
esac
# Scheme + host (+ port): what the browser compares for CORS and the CSP.
API_ORIGIN=$(printf '%s' "$api_base_url" | sed -E 's#^(https?://[^/]+).*$#\1#')
export API_ORIGIN

# JavaScript string escaping for the two values: backslash, then single quote; line breaks removed.
js() { printf '%s' "$1" | tr -d '\r\n' | sed -e 's/\\/\\\\/g' -e "s/'/\\\\'/g"; }
printf "window.__APP_CONFIG__ = { apiBaseUrl: '%s', appName: '%s' };\n" \
  "$(js "$api_base_url")" "$(js "${APP_NAME:-}")" > /etc/nginx/tms/config.js

# Only ${API_ORIGIN} is substituted (nginx's own $variables must stay untouched).
envsubst '${API_ORIGIN}' < /etc/nginx/tms-templates/security-headers.conf.template > /etc/nginx/tms/security-headers.conf

echo "tms: API at ${api_base_url} (CSP connect-src ${API_ORIGIN})"
