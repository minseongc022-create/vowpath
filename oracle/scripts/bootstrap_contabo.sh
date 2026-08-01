#!/usr/bin/env bash
# Contabo (Ubuntu) one-shot bootstrap for Project Oracle.
# Run as root or a sudo user: bash scripts/bootstrap_contabo.sh
set -euo pipefail

ORACLE_USER="${SUDO_USER:-${USER}}"
if [[ "${ORACLE_USER}" == "root" ]]; then
  HOME_DIR="/root"
else
  HOME_DIR="$(getent passwd "${ORACLE_USER}" | cut -d: -f6)"
fi

REPO_DIR="${HOME_DIR}/vowpath"
ORACLE_DIR="${REPO_DIR}/oracle"
REPO_URL="${ORACLE_REPO_URL:-https://github.com/minseongc022-create/vowpath.git}"
REPO_BRANCH="${ORACLE_REPO_BRANCH:-cursor/project-oracle-mvp-ccfb}"

echo "==> packages"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
  git curl ca-certificates python3 python3-pip python3-venv ufw

echo "==> firewall (SSH only inbound)"
sudo ufw allow OpenSSH || true
sudo ufw --force enable || true

echo "==> ollama"
if ! command -v ollama >/dev/null 2>&1; then
  curl -fsSL https://ollama.com/install.sh | sh
fi
sudo systemctl enable --now ollama || true
# Pull in background-friendly way; may take several minutes on first run
ollama pull qwen2.5:7b-instruct || true

echo "==> cloudflared"
ARCH="$(uname -m)"
case "${ARCH}" in
  aarch64|arm64) CF_DEB="cloudflared-linux-arm64.deb" ;;
  *) CF_DEB="cloudflared-linux-amd64.deb" ;;
esac
if ! command -v cloudflared >/dev/null 2>&1; then
  curl -fsSL -o /tmp/cloudflared.deb \
    "https://github.com/cloudflare/cloudflared/releases/latest/download/${CF_DEB}"
  sudo dpkg -i /tmp/cloudflared.deb || sudo apt-get -f install -y
fi

echo "==> repo"
if [[ ! -d "${REPO_DIR}/.git" ]]; then
  sudo -u "${ORACLE_USER}" git clone --branch "${REPO_BRANCH}" "${REPO_URL}" "${REPO_DIR}" \
    || sudo -u "${ORACLE_USER}" git clone "${REPO_URL}" "${REPO_DIR}"
fi
cd "${ORACLE_DIR}"
sudo -u "${ORACLE_USER}" python3 -m venv .venv
sudo -u "${ORACLE_USER}" "${ORACLE_DIR}/.venv/bin/pip" install -U pip
sudo -u "${ORACLE_USER}" "${ORACLE_DIR}/.venv/bin/pip" install -r requirements.txt
sudo -u "${ORACLE_USER}" "${ORACLE_DIR}/.venv/bin/pip" install -e .

if [[ ! -f "${ORACLE_DIR}/.env" ]]; then
  sudo -u "${ORACLE_USER}" cp "${ORACLE_DIR}/.env.example" "${ORACLE_DIR}/.env"
  echo "Wrote ${ORACLE_DIR}/.env — edit secrets before relying on autopilot."
fi

echo "==> systemd oracle"
sudo tee /etc/systemd/system/oracle.service >/dev/null <<EOF
[Unit]
Description=Project Oracle dashboard + autopilot
After=network-online.target ollama.service
Wants=network-online.target ollama.service

[Service]
Type=simple
User=${ORACLE_USER}
WorkingDirectory=${ORACLE_DIR}
Environment=PYTHONPATH=src
EnvironmentFile=${ORACLE_DIR}/.env
ExecStart=${ORACLE_DIR}/.venv/bin/python -m oracle.cli serve --host 127.0.0.1 --port 8080
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/cloudflared.service >/dev/null <<EOF
[Unit]
Description=Cloudflare Tunnel for Oracle
After=network-online.target oracle.service
Wants=network-online.target

[Service]
Type=simple
User=${ORACLE_USER}
ExecStart=/usr/bin/cloudflared tunnel --config ${HOME_DIR}/.cloudflared/config.yml run
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now oracle
echo
echo "Oracle service started (or restarted)."
echo "Next:"
echo "  1) nano ${ORACLE_DIR}/.env   # Alpaca + dashboard password + LIVE=0"
echo "  2) sudo systemctl restart oracle"
echo "  3) cloudflared tunnel login && cloudflared tunnel create oracle"
echo "  4) write ${HOME_DIR}/.cloudflared/config.yml then: sudo systemctl enable --now cloudflared"
echo "  5) Porkbun CNAME oracle -> <TUNNEL_ID>.cfargotunnel.com"
echo "See oracle/docs/CONTABO_SETUP.md"
