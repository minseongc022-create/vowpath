#!/usr/bin/env bash
# Contabo 첫 접속 후 한 번만 실행. 대화형으로 .env 최소값 채움.
set -euo pipefail

echo "========================================"
echo " Oracle 첫 설치 (Contabo)"
echo "========================================"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "root로 다시 실행하세요: sudo bash $0"
  exit 1
fi

BRANCH="${ORACLE_REPO_BRANCH:-cursor/project-oracle-mvp-ccfb}"
URL="https://raw.githubusercontent.com/minseongc022-create/vowpath/${BRANCH}/oracle/scripts/bootstrap_contabo.sh"

echo "==> 부트스트랩 다운로드·실행"
curl -fsSL "$URL" | bash

ORACLE_DIR="/root/vowpath/oracle"
ENV_FILE="${ORACLE_DIR}/.env"
[[ -f "$ENV_FILE" ]] || ENV_FILE="/home/*/vowpath/oracle/.env"
# resolve actual path
if [[ ! -f "${ORACLE_DIR}/.env" ]]; then
  if [[ -d /root/vowpath/oracle ]]; then
    ORACLE_DIR=/root/vowpath/oracle
  else
    ORACLE_DIR="$(find /home -maxdepth 3 -type d -path '*/vowpath/oracle' 2>/dev/null | head -1)"
  fi
fi
ENV_FILE="${ORACLE_DIR}/.env"

echo ""
echo "==> .env 최소 설정 (엔터=기본값)"
read -r -p "대시보드 아이디 [minseong]: " DUSER
DUSER="${DUSER:-minseong}"
read -r -s -p "대시보드 비밀번호 (직접 정하세요): " DPASS
echo ""
if [[ -z "${DPASS}" ]]; then
  DPASS="$(openssl rand -base64 12 | tr -d '=+/')"
  echo "비밀번호 자동생성: ${DPASS}  (메모하세요)"
fi
read -r -p "Alpaca PAPER API Key (없으면 엔터): " AKEY
read -r -p "Alpaca PAPER Secret Key (없으면 엔터): " ASECRET

# upsert helpers
_set_env() {
  local k="$1" v="$2"
  if grep -q "^${k}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${k}=.*|${k}=${v}|" "$ENV_FILE"
  else
    echo "${k}=${v}" >>"$ENV_FILE"
  fi
}

_set_env "ORACLE_DASHBOARD_USER" "$DUSER"
_set_env "ORACLE_DASHBOARD_PASSWORD" "$DPASS"
_set_env "ORACLE_AUTOPILOT" "1"
_set_env "ORACLE_LIVE_TRADING" "0"
_set_env "ORACLE_AUTOPILOT_LIVE" "0"
_set_env "ALPACA_BASE_URL" "https://paper-api.alpaca.markets"
if [[ -n "${AKEY}" ]]; then _set_env "ALPACA_API_KEY" "$AKEY"; fi
if [[ -n "${ASECRET}" ]]; then _set_env "ALPACA_API_SECRET" "$ASECRET"; fi

systemctl restart oracle || true
sleep 2
echo ""
echo "========================================"
echo " 서버 로컬 확인:"
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:8080/ || true
systemctl is-active oracle ollama || true
echo ""
echo "대시보드: 아이디=${DUSER}"
echo "다음: Cloudflare Tunnel (도메인) — 채팅에 IP 알려주면 이어서 안내"
echo "========================================"
