#!/usr/bin/env bash
# Example overnight runner.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p data
export MOCK_LLM="${MOCK_LLM:-0}"
npm run nightly -- --count "${POSTS_PER_BRAND:-1}" >> data/cron.log 2>&1
