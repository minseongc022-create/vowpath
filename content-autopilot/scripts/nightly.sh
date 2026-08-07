#!/usr/bin/env bash
# Overnight: 3 platform posts + notification
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p data
export MOCK_LLM="${MOCK_LLM:-0}"
npm run generate-all >> data/cron.log 2>&1
