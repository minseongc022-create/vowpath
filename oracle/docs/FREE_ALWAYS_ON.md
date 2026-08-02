# 집 PC 없이 · 무료 · 과금/해킹 최소화 설정

> **실제 진행 중 (권장):** Contabo VPS(~월 €5.50) 경로 →  
> **[CONTABO_SETUP.md](./CONTABO_SETUP.md)**  
> 아래 Oracle Cloud Always Free는 Tokyo 품절이 잦아 백업 옵션으로만 두세요.

목표: **집 컴퓨터 OFF** 상태에서도 Oracle이 계속 돌고,  
폰/PC에서 `https://oracle.vowroad.com` 으로만 접속.

| 구성 | 역할 | 비용 |
|------|------|------|
| Oracle Cloud Always Free VM | 24시간 서버 | $0 (한도 안·PAYG 안 함) |
| Cloudflare Tunnel + Access | HTTPS + 본인만 입장 | $0 |
| Porkbun DNS (`oracle`만) | 주소 연결 | 도메인 갱신비만 (기존) |
| Alpaca **paper** | 연습 매매 | $0 |
| Ollama (VM 안) | 로컬 AI | $0 |

루트 `vowroad.com` / Effiroad / Vercel은 **건드리지 마세요.**

---

## 0. 절대 하지 말 것 (과금·사고 방지)

1. Oracle Cloud에서 **Pay As You Go / Upgrade** 누르지 않기  
2. Cloudflare에서 **유료 플랜·Workers 유료** 켜지 않기  
3. Alpaca **LIVE / 실계좌** 켜지 않기 (`ORACLE_LIVE_TRADING=0`)  
4. Porkbun에서 `@` / `www` DNS 수정하지 않기  
5. API 키·대시보드 비밀번호를 깃허브/채팅에 올리지 않기  

예산 알림: Oracle Cloud → Billing → **Budget $1** + 이메일 알림.

---

## 1. Oracle Cloud 무료 계정 + VM

1. [cloud.oracle.com](https://cloud.oracle.com) 가입 (Always Free)  
2. 카드 요구해도 **유료 업그레이드는 하지 말 것**  
3. **Compute → Instances → Create instance**  
4. 권장:
   - Image: **Ubuntu 22.04**
   - Shape: **VM.Standard.A1.Flex** (Ampere)  
     - OCPU **2** / Memory **12 GB** (Always Free 한도 안)  
     - 한도 부족하면 AMD Always Free (1/8·1GB 등)는 Ollama에 너무 작음 → A1 12GB 우선  
5. SSH 키 등록 후 생성  
6. **VCN 보안 규칙**: 인바운드는 **SSH(22)만** (80/443 열 필요 없음 — 터널 사용)  
7. 공인 IP 확인 후 접속:

```bash
ssh ubuntu@<VM공인IP>
```

---

## 2. VM에 Oracle + Ollama 설치

```bash
sudo apt update && sudo apt install -y git python3-pip python3-venv curl

# Ollama
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen2.5:7b-instruct

# 코드 (본인 저장소 URL로)
git clone https://github.com/minseongc022-create/vowpath.git
cd vowpath/oracle
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -e .

cp .env.example .env
nano .env   # 아래 값 채우기
```

`.env` 최소값:

```bash
ALPACA_API_KEY=...
ALPACA_SECRET_KEY=...
ALPACA_BASE_URL=https://paper-api.alpaca.markets
ORACLE_BROKER=auto
ORACLE_LIVE_TRADING=0
ORACLE_AUTOPILOT=1
ORACLE_DASHBOARD_USER=minseong
ORACLE_DASHBOARD_PASSWORD=여기긴암호
ORACLE_OLLAMA_HOST=http://127.0.0.1:11434
```

수동 확인:

```bash
source .venv/bin/activate
PYTHONPATH=src python3 -m oracle.cli serve --host 127.0.0.1 --port 8080
# 다른 터미널: curl -I http://127.0.0.1:8080
```

---

## 3. 재부팅해도 자동 시작 (systemd)

```bash
sudo tee /etc/systemd/system/ollama-ready.service >/dev/null <<'EOF'
[Unit]
Description=Ensure Ollama model warm (optional)
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/bin/ollama list
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF
```

Ollama는 설치 스크립트가 보통 `ollama` 서비스를 등록합니다. 확인:

```bash
sudo systemctl enable --now ollama
```

Oracle 대시보드:

```bash
sudo tee /etc/systemd/system/oracle.service >/dev/null <<'EOF'
[Unit]
Description=Project Oracle dashboard + autopilot
After=network-online.target ollama.service
Wants=ollama.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/vowpath/oracle
Environment=PYTHONPATH=src
EnvironmentFile=/home/ubuntu/vowpath/oracle/.env
ExecStart=/home/ubuntu/vowpath/oracle/.venv/bin/python -m oracle.cli serve --host 127.0.0.1 --port 8080
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now oracle
sudo systemctl status oracle --no-pager
```

경로가 다르면 `WorkingDirectory` / `EnvironmentFile` / `ExecStart` 만 맞추세요.

---

## 4. Cloudflare 계정 + Named Tunnel

1. [dash.cloudflare.com](https://dash.cloudflare.com) **Free** 가입  
2. **유료 플랜으로 올리지 말 것**  
3. VM에서:

```bash
# cloudflared 설치 (linux)
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
# AMD면: cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

cloudflared tunnel login
# 브라우저에서 로그인. vowroad.com 네임서버를 Cloudflare로 옮길 필요 없음.
# 로그인만 하면 됨.

cloudflared tunnel create oracle
cloudflared tunnel list
# TUNNEL_ID 메모
```

설정 파일:

```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

내용 (ID·경로는 본인 값으로):

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /home/ubuntu/.cloudflared/<TUNNEL_ID>.json
ingress:
  - hostname: oracle.vowroad.com
    service: http://127.0.0.1:8080
  - service: http_status:404
```

터널 상시 실행:

```bash
sudo tee /etc/systemd/system/cloudflared.service >/dev/null <<EOF
[Unit]
Description=Cloudflare Tunnel
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
ExecStart=/usr/bin/cloudflared tunnel --config /home/ubuntu/.cloudflared/config.yml run oracle
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared --no-pager
```

---

## 5. Porkbun DNS (휴대폰 OK)

1. [porkbun.com](https://porkbun.com) → Domain Management → **vowroad.com** → **DNS**  
2. **Add Record**

| Type | Host | Answer | TTL |
|------|------|--------|-----|
| `CNAME` | `oracle` | `<TUNNEL_ID>.cfargotunnel.com` | 600 |

3. `@` / `www` 는 **수정·삭제 금지** (Effiroad)

수 분~1시간 후: `https://oracle.vowroad.com`

Zero Trust 대시보드에서 Public Hostname을 추가했다면, 안내에 나온 CNAME과 동일하게 맞추면 됩니다.

---

## 6. Cloudflare Access (해킹 면적 줄이기 · 무료)

1. Cloudflare → **Zero Trust** (개인용 Free, 팀 유료 업그레이드 하지 말 것)  
2. **Access → Applications → Add an application → Self-hosted**  
3. Application domain: `oracle.vowroad.com`  
4. Policy: **Allow** → Include → **Emails** → 본인 이메일만  
5. 저장  

이후 접속 흐름:

1. 브라우저가 Cloudflare 이메일 로그인 요청  
2. 통과 후 Oracle Basic Auth (`.env` 비번)  

둘 다 켜 두는 걸 권장합니다.

---

## 7. 사용 확인

```bash
# VM에서
sudo systemctl is-active ollama oracle cloudflared
curl -I http://127.0.0.1:8080
```

폰/PC:

1. `https://oracle.vowroad.com`  
2. Cloudflare Access 이메일 인증  
3. Oracle 로그인  
4. **설정**에서 LIVE 꺼짐 확인  
5. 미션 넣고 AI 자동 시작 → 창 닫아도 VM에서 계속 동작

---

## 8. 문제 생기면

| 증상 | 볼 곳 |
|------|--------|
| 502 / 안 열림 | `sudo systemctl status oracle cloudflared` |
| AI 느림/실패 | `ollama list` / 메모리 12GB인지 |
| 청구 메일 | Oracle에서 PAYG·추가 리소스 만들었는지 즉시 확인·삭제 |
| Effiroad 죽음 | Porkbun `@`/`www` 를 건드렸는지 → 원래 Vercel 값 복구 |

---

## 한 줄 요약

**Always Free VM에 Oracle+Ollama를 systemd로 상시 실행 → Cloudflare Tunnel로만 공개 → Access로 본인만 → Porkbun에 `oracle` CNAME만 → 페이퍼만.**
