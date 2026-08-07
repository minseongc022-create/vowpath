#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm install
npm run setup
echo ""
echo "폰에서: npm run phone → Wi-Fi 주소로 접속 → 홈 화면에 추가"
