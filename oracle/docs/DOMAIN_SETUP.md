# Oracle 개인 도메인 연결 (`oracle.vowroad.com`)

`vowroad.com` 루트는 Effiroad(Vercel) 리다이렉트용으로 이미 쓰입니다.  
Oracle(주식 AI)은 **서브도메인**을 씁니다.

권장 주소: **https://oracle.vowroad.com**

## 왜 서브도메인인가

| 호스트 | 용도 |
|--------|------|
| `vowroad.com` / `www` | Effiroad로 리다이렉트 (건드리지 않음) |
| `oracle.vowroad.com` | Project Oracle 대시보드 (개인용) |

## 준비물

1. Porkbun에서 `vowroad.com` DNS 편집 권한 (이미 있음)
2. [Cloudflare](https://dash.cloudflare.com) 무료 계정
3. Oracle이 돌아가는 서버(지금 Cursor VM 또는 본인 PC/VPS)에서 `cloudflared`

## A. Cloudflare Named Tunnel (주소 고정 · 추천)

### 1) 터널 만들기 (서버에서)

```bash
cloudflared tunnel login          # 브라우저에서 Cloudflare 로그인
cloudflared tunnel create oracle
cloudflared tunnel route dns oracle oracle.vowroad.com
```

`~/.cloudflared/<TUNNEL_ID>.json` 이 생깁니다.

### 2) 설정 파일 예 (`~/.cloudflared/config.yml`)

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /home/YOU/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: oracle.vowroad.com
    service: http://127.0.0.1:8080
  - service: http_status:404
```

### 3) 실행

```bash
# Oracle 앱
cd /path/to/oracle && PYTHONPATH=src python3 -m oracle.cli serve --host 127.0.0.1 --port 8080

# 터널 (상시)
cloudflared tunnel run oracle
```

### 4) Porkbun DNS

Cloudflare가 도메인을 네임서버로 쓰는 경우: CF에서만 CNAME이 잡히면 됩니다.

Porkbun 네임서버를 유지하는 경우:

1. Porkbun → `vowroad.com` → **DNS**
2. 레코드 추가:
   - **Type:** `CNAME`
   - **Host:** `oracle`
   - **Answer:** `<TUNNEL_ID>.cfargotunnel.com`
   - **TTL:** 600
3. 저장 후 5~30분 대기

`cloudflared tunnel route dns` 를 쓰면 Cloudflare 쪽 DNS에 자동 추가됩니다.  
도메인 네임서버가 Porkbun이면, 위 CNAME을 Porkbun에 직접 넣어야 합니다.

## B. 잠깐만 (임시 trycloudflare)

`*.trycloudflare.com` 은 재시작마다 주소가 바뀌고 자주 끊깁니다.  
도메인 고정 전에는 임시로만 쓰세요.

## 나만 쓰기 (필수)

`.env`:

```bash
ORACLE_DASHBOARD_USER=minseong
ORACLE_DASHBOARD_PASSWORD=강한비밀번호
```

브라우저에서 로그인 창이 뜨면 본인만 접속합니다.

## 확인

```bash
curl -I https://oracle.vowroad.com
# 401(로그인 필요) 또는 200 이면 연결 성공
```
