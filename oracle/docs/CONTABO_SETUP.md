# Contabo VPS에서 Oracle 상시 운영

월 ~€5.50 Cloud VPS 4 (8GB) 기준.  
집 PC OFF · `https://oracle.vowroad.com` · 페이퍼 매매.

관련: [DOMAIN_SETUP.md](./DOMAIN_SETUP.md)

---

## 당신 할 일 (서버 메일 오기 전에도 가능)

1. [dash.cloudflare.com](https://dash.cloudflare.com) **Free** 가입 (유료 플랜 X)  
2. Alpaca **paper** API 키 준비  
3. Contabo 메일에서 **IP / 사용자 / 비밀번호** 저장  
4. (선택) [console.groq.com](https://console.groq.com) 무료 키 — Ollama 백업용

---

## 서버 준비되면 (SSH)

```bash
ssh 사용자@서버IP
```

그다음 **한 번에** (코드가 깃허브에 있을 때):

```bash
curl -fsSL https://raw.githubusercontent.com/minseongc022-create/vowpath/cursor/project-oracle-mvp-ccfb/oracle/scripts/bootstrap_contabo.sh | bash
```

또는 저장소 clone 후:

```bash
cd vowpath/oracle
bash scripts/bootstrap_contabo.sh
```

스크립트가 하는 일: 패키지 · Ollama · Oracle · systemd(`oracle`, `ollama`) · `cloudflared` 설치.

`.env`는 직접 채워야 합니다:

```bash
nano ~/vowpath/oracle/.env
sudo systemctl restart oracle
```

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
