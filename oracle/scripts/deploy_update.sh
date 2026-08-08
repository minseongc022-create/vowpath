#!/usr/bin/env bash
# Oracle 서버에서 한 줄로 최신 코드 + 블로그 메뉴 반영
# curl -fsSL https://raw.githubusercontent.com/minseongc022-create/vowpath/cursor/content-autopilot-engine-42ff/oracle/scripts/deploy_update.sh | bash
set -euo pipefail

BRANCH="${ORACLE_REPO_BRANCH:-cursor/content-autopilot-engine-42ff}"
REPO_URL="${ORACLE_REPO_URL:-https://github.com/minseongc022-create/vowpath.git}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "root 또는 sudo 로 실행하세요"
  exit 1
fi

ORACLE_DIR=""
for d in /root/vowpath /home/ubuntu/vowpath /opt/vowpath; do
  if [[ -d "$d/oracle" ]]; then ORACLE_DIR="$d"; break; fi
done

if [[ -z "$ORACLE_DIR" ]]; then
  echo "==> vowpath 없음 → clone"
  ORACLE_DIR=/root/vowpath
  git clone --depth 1 -b "$BRANCH" "$REPO_URL" "$ORACLE_DIR"
else
  echo "==> 업데이트: $ORACLE_DIR ($BRANCH)"
  cd "$ORACLE_DIR"
  git fetch origin "$BRANCH" --depth 1
  git checkout -f "$BRANCH" 2>/dev/null || git checkout -B "$BRANCH" "origin/$BRANCH"
  git reset --hard "origin/$BRANCH"
fi

cd "$ORACLE_DIR/oracle"
if [[ -d .venv ]]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
  pip install -q -r requirements.txt || true
  pip install -q -e . || true
fi

systemctl restart oracle 2>/dev/null || systemctl restart oracle-dashboard 2>/dev/null || true
sleep 2
echo "==> /blog 확인"
code=$(curl -s -o /dev/null -w "%{http_code}" -u "${ORACLE_DASHBOARD_USER:-}:x" http://127.0.0.1:8080/blog || echo 000)
# 401 means route exists (auth required); 404 means missing
code2=$(curl -s -o /tmp/oracle_blog_check.json -w "%{http_code}" http://127.0.0.1:8080/blog || true)
echo "HTTP $code2"
head -c 120 /tmp/oracle_blog_check.json 2>/dev/null; echo
if grep -q 'Not Found' /tmp/oracle_blog_check.json 2>/dev/null && [[ "$code2" == "404" ]]; then
  echo "FAIL: /blog still 404 — check service logs: journalctl -u oracle -n 50"
  exit 1
fi
echo "OK: deploy done → https://oracle.vowroad.com/blog"
