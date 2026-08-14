#!/usr/bin/env bash
# Generate SSH key for GitHub Actions → Contabo deploy.
# 1) Run locally: bash oracle/scripts/setup_github_deploy_key.sh
# 2) Add PRIVATE key to GitHub → Settings → Secrets → ORACLE_DEPLOY_SSH_PRIVATE_KEY
# 3) Add PUBLIC key to Contabo: ssh root@169.58.109.86
#      mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys
#      (paste public key, Ctrl-D)
set -euo pipefail

KEY="${HOME}/.ssh/oracle_contabo_deploy"
if [[ ! -f "${KEY}" ]]; then
  ssh-keygen -t ed25519 -f "${KEY}" -N "" -C "oracle-github-deploy"
fi

echo "=== Public key (paste into Contabo root ~/.ssh/authorized_keys) ==="
cat "${KEY}.pub"
echo
echo "=== Private key (GitHub secret ORACLE_DEPLOY_SSH_PRIVATE_KEY) ==="
cat "${KEY}"
echo
echo "Optional secrets: ORACLE_DEPLOY_SSH_HOST=169.58.109.86  ORACLE_DEPLOY_SSH_USER=root"
