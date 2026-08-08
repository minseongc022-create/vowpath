# Contabo VPS에서 Oracle 상시 운영

월 ~€5.50 Cloud VPS 4 (8GB) 기준.  
집 PC OFF · `https://oracle.vowroad.com` · 페이퍼 매매.

**초간단 체크리스트:** [YOU_DO_THIS_NOW.md](./YOU_DO_THIS_NOW.md)

관련: [DOMAIN_SETUP.md](./DOMAIN_SETUP.md)

---

## 당신 할 일 (최소)

1. Contabo 메일에서 **서버 IP만** 복사 → 채팅에 붙이기 (**비밀번호는 채팅에 금지**)  
2. 제가 주는 `ssh` 한 줄 실행 → 비밀번호는 터미널에만 입력  
3. 서버 안에서 아래 **한 줄** 실행:

```bash
curl -fsSL https://raw.githubusercontent.com/minseongc022-create/vowpath/cursor/project-oracle-mvp-ccfb/oracle/scripts/first_boot_oracle.sh | bash
```

(대시보드 비번·Alpaca 키는 질문이 나오면 짧게 입력)

미리 준비하면 좋은 것: Cloudflare Free, Alpaca paper 키.

---

## 서버 준비되면 (SSH) — 수동

```bash
ssh root@서버IP
```

부트스트랩만:

```bash
curl -fsSL https://raw.githubusercontent.com/minseongc022-create/vowpath/cursor/project-oracle-mvp-ccfb/oracle/scripts/bootstrap_contabo.sh | bash
```

스크립트가 하는 일: 패키지 · Ollama · Oracle · systemd(`oracle`, `ollama`) · `cloudflared` 설치.

---

## Cloudflare Tunnel + Porkbun

```bash
cloudflared tunnel login
cloudflared tunnel create oracle
cloudflared tunnel list   # TUNNEL_ID 확인
```

`~/.cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json
ingress:
  - hostname: oracle.vowroad.com
    service: http://127.0.0.1:8080
  - service: http_status:404
```

(사용자가 `ubuntu`면 경로를 `/home/ubuntu/.cloudflared/...` 로)

```bash
sudo systemctl enable --now cloudflared   # 스크립트가 유닛을 만들었으면
# 또는:
cloudflared tunnel run oracle
```

Porkbun DNS:

| Type | Host | Answer |
|------|------|--------|
| CNAME | `oracle` | `<TUNNEL_ID>.cfargotunnel.com` |

Zero Trust → Access → `oracle.vowroad.com` → 본인 이메일만 Allow.

---

## 과금·보안 체크

- Contabo에서 추가 VPS/백업/오브젝트 스토리지 막 추가 금지  
- `ORACLE_LIVE_TRADING=0`  
- 방화벽: SSH + (선택) 없으면 됨. 80/443 직접 열 필요 없음  
- `.env` 깃허브 금지  

---

## 확인

```bash
sudo systemctl status oracle ollama --no-pager
curl -I http://127.0.0.1:8080
```

브라우저: `https://oracle.vowroad.com`
