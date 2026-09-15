#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run with sudo: sudo bash disable-ssh-password.sh" >&2
  exit 1
fi

admin_user=noxhadmin
authorized_keys="/home/${admin_user}/.ssh/authorized_keys"
config=/etc/ssh/sshd_config.d/99-noxh-security.conf

if [[ ! -s "${authorized_keys}" ]]; then
  echo "Refusing to disable passwords: ${authorized_keys} is missing or empty." >&2
  exit 1
fi

cat > "${config}" <<'EOF'
PermitRootLogin no
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
EOF

chmod 0644 "${config}"
/usr/sbin/sshd -t
systemctl reload ssh

echo "SSH password login disabled after successful configuration validation."
