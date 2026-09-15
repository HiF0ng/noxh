#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run with sudo: sudo bash backup-noxh.sh" >&2
  exit 1
fi

backup_root=/var/backups/noxh
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
archive="${backup_root}/noxh-vps-${timestamp}.tar.gz"

install -d -m 0700 "${backup_root}"

paths=(
  etc/nginx
  etc/letsencrypt
  etc/ssh/sshd_config
  etc/ssh/sshd_config.d
  etc/ufw
  var/www/noxh/current
)

existing_paths=()
for path in "${paths[@]}"; do
  if [[ -e "/${path}" ]]; then
    existing_paths+=("${path}")
  fi
done

if [[ ${#existing_paths[@]} -eq 0 ]]; then
  echo "No NOXH configuration or site paths were found." >&2
  exit 1
fi

tar -C / -czf "${archive}" "${existing_paths[@]}"
chmod 0600 "${archive}"
sha256sum "${archive}" > "${archive}.sha256"
chmod 0600 "${archive}.sha256"
tar -tzf "${archive}" >/dev/null

echo "Backup verified: ${archive}"
echo "Checksum: ${archive}.sha256"
