#!/usr/bin/env bash
# Local convenience: run post-market report
set -euo pipefail
cd "$(dirname "$0")/.."
export PYTHONPATH="${PYTHONPATH:-}:$(pwd)/src"
oracle report --session post_market
