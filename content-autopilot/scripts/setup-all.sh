#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm install
npm run setup
echo ""
echo "대시보드 실행: npm run dashboard"
