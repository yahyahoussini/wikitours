#!/usr/bin/env bash
# wikitours.ma VPS bootstrap — Ubuntu 24.04, run as root. Safe to re-run.
# Installs Node 22 LTS, Caddy, the `wikitours` app user, firewall, fail2ban, automatic
# security updates, and this folder's systemd units and scripts. It does NOT deploy the
# app, does NOT enable the cron timers and does NOT touch DNS (see README.md for the order).
# Usage: bash bootstrap.sh            (from inside deploy/vps on the server)
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
APP_USER=wikitours
APP_DIR=/srv/wikitours
NODE_MAJOR=22
# GitHub's published SSH host key fingerprint (docs.github.com, "GitHub's SSH key fingerprints").
GITHUB_ED25519_FP='SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU'

[ "$(id -u)" = 0 ] || { echo "run as root" >&2; exit 1; }
. /etc/os-release
[ "$ID" = ubuntu ] || { echo "expects Ubuntu, found $ID" >&2; exit 1; }

timedatectl set-timezone UTC
export DEBIAN_FRONTEND=noninteractive
# A fresh VPS often has cloud-init / apt-daily holding the dpkg lock for minutes: wait, don't fail.
APT=(apt-get -y -o DPkg::Lock::Timeout=600)
"${APT[@]}" update
"${APT[@]}" -o Dpkg::Options::=--force-confold upgrade
"${APT[@]}" install curl git ufw fail2ban unattended-upgrades ca-certificates gnupg \
  debian-keyring debian-archive-keyring apt-transport-https jq

# Node.js 22 LTS (NodeSource)
if ! node -v 2>/dev/null | grep -q "^v${NODE_MAJOR}\."; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" -o /tmp/nodesource_setup.sh
  bash /tmp/nodesource_setup.sh
  "${APT[@]}" install nodejs
fi

# Caddy (official apt repository): HTTPS certificates and the reverse proxy
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' -o /etc/apt/sources.list.d/caddy-stable.list
  chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
  "${APT[@]}" update
  "${APT[@]}" install caddy
fi

# App user and directories
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --home-dir "/home/$APP_USER" --shell /bin/bash "$APP_USER"
install -d -o "$APP_USER" -g "$APP_USER" "$APP_DIR" "$APP_DIR/releases" /var/log/wikitours
install -d -m 750 -o root -g "$APP_USER" /etc/wikitours

# Read-only GitHub deploy key for the app user; its public half goes to the repo's Deploy keys.
install -d -m 700 -o "$APP_USER" -g "$APP_USER" "/home/$APP_USER/.ssh"
[ -f "/home/$APP_USER/.ssh/id_ed25519" ] || runuser -u "$APP_USER" -- ssh-keygen -q -t ed25519 -N '' -C 'wikitours-vps-deploy (read-only)' -f "/home/$APP_USER/.ssh/id_ed25519"
ssh-keyscan -t ed25519 github.com 2>/dev/null > /tmp/github_known_hosts || true
[ -s /tmp/github_known_hosts ] || { echo "cannot reach github.com:22 to read its host key" >&2; exit 1; }
fp="$(ssh-keygen -lf /tmp/github_known_hosts | awk '{print $2}')"
[ "$fp" = "$GITHUB_ED25519_FP" ] || { echo "github.com host key fingerprint mismatch: $fp" >&2; exit 1; }
install -m 644 -o "$APP_USER" -g "$APP_USER" /tmp/github_known_hosts "/home/$APP_USER/.ssh/known_hosts"

# Scripts, units, the narrow sudo rule (restart the app service only)
install -m 755 "$SRC/bin/wikitours-deploy" /usr/local/bin/wikitours-deploy
install -m 755 "$SRC/bin/wikitours-cron" /usr/local/bin/wikitours-cron
install -m 644 "$SRC"/systemd/*.service "$SRC"/systemd/*.timer /etc/systemd/system/
# Validate BEFORE installing: a broken file in /etc/sudoers.d breaks sudo for the whole system.
visudo -cf "$SRC/sudoers-wikitours" >/dev/null
install -m 440 "$SRC/sudoers-wikitours" /etc/sudoers.d/wikitours
systemctl daemon-reload

# Caddy starts in PREVIEW mode: internal certificates for the real hostnames (they still point
# at Vercel) and a real certificate for the server's own Hostinger name. The switch to the
# production Caddyfile happens at the DNS cut-over (README.md).
[ -f /etc/caddy/.wikitours-production ] || install -m 644 "$SRC/Caddyfile.preview" /etc/caddy/Caddyfile
install -d -o caddy -g caddy /var/log/caddy
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
systemctl enable caddy >/dev/null
systemctl reload-or-restart caddy

# Firewall: SSH, HTTP, HTTPS (TCP, and UDP for Caddy's HTTP/3) only
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw allow 443/udp >/dev/null
ufw --force enable >/dev/null
systemctl enable --now fail2ban >/dev/null

# Automatic security updates
printf 'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";\n' > /etc/apt/apt.conf.d/20auto-upgrades

# SSH: keys only — but only once root has a key, so this can never lock the owner out.
# (Hostinger's browser terminal in hPanel is a console login and keeps working.)
# sshd keeps the FIRST value it reads for each keyword, and the image's 50-cloud-init.conf sets
# PasswordAuthentication yes, so this drop-in must sort before it (01-…). Verified with sshd -T.
if [ -s /root/.ssh/authorized_keys ]; then
  rm -f /etc/ssh/sshd_config.d/99-wikitours.conf
  printf 'PasswordAuthentication no\nKbdInteractiveAuthentication no\nPermitRootLogin prohibit-password\n' > /etc/ssh/sshd_config.d/01-wikitours.conf
  install -d -m 755 /run/sshd   # sshd -t needs it; Ubuntu 24.04 creates it only when ssh.service runs
  sshd -t && systemctl restart ssh
  sshd -T | grep -qx 'passwordauthentication no' || { echo "sshd still allows passwords" >&2; exit 1; }
fi

echo "bootstrap: OK (node $(node -v), $(caddy version | cut -d' ' -f1))"
echo "next: /etc/wikitours/env, the GitHub deploy key below, then: systemctl start wikitours-deploy"
cat "/home/$APP_USER/.ssh/id_ed25519.pub"
