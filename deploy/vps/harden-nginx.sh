#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run with sudo: sudo bash harden-nginx.sh" >&2
  exit 1
fi

config=/etc/nginx/sites-available/noxh.help
backup="${config}.before-security-$(date -u +%Y%m%dT%H%M%SZ)"

if [[ ! -f "${config}" ]]; then
  echo "Missing Nginx site configuration: ${config}" >&2
  exit 1
fi

cp -a "${config}" "${backup}"

sed -i 's@return 301 http://noxh.help$request_uri;@return 301 https://noxh.help$request_uri;@g' "${config}"

if ! grep -q 'Strict-Transport-Security' "${config}"; then
  sed -i '/add_header Permissions-Policy/a\    add_header Strict-Transport-Security "max-age=86400; includeSubDomains" always;' "${config}"
fi

if ! grep -q 'Content-Security-Policy-Report-Only' "${config}"; then
  sed -i "/add_header Strict-Transport-Security/a\\    add_header Content-Security-Policy-Report-Only \"default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'\" always;" "${config}"
fi

if ! nginx -t; then
  cp -a "${backup}" "${config}"
  nginx -t
  echo "Nginx validation failed; original configuration restored." >&2
  exit 1
fi

systemctl reload nginx
echo "Nginx HTTPS redirect and report-only security headers applied."
echo "Rollback copy: ${backup}"
