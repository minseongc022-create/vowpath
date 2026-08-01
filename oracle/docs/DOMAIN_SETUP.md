# Oracle ↔ Porkbun (`oracle.vowroad.com`)

DNS는 **Porkbun**에 둡니다. 루트 `vowroad.com`은 Effiroad용으로 그대로 두고,  
Oracle만 서브도메인으로 붙입니다.

최종 주소: **https://oracle.vowroad.com**

## Porkbun에서 할 일 (휴대폰 기준)

1. [porkbun.com](https://porkbun.com) 로그인 → **Domain Management**
2. **vowroad.com** 줄에서 **DNS** 버튼
3. **Add Record** (또는 레코드 추가)
4. 아래처럼 입력:

| 항목 | 값 |
|------|-----|
| Type | `CNAME` |
| Host | `oracle` |
| Answer / Content | `<TUNNEL_ID>.cfargotunnel.com` |
| TTL | `600` (또는 Auto) |

저장하면 주소는 `oracle.vowroad.com` 이 됩니다.  
(`www` / `@` 는 건드리지 마세요 — Effiroad 리다이렉트용)

> `TUNNEL_ID` 는 Cloudflare Named Tunnel을 만들면 나오는 UUID입니다.  
> 예: `a1b2c3d4-....cfargotunnel.com`

## 서버 쪽 (Cloudflare Named Tunnel)

Porkbun은 DNS만 담당합니다. HTTPS 연결은 Cloudflare 터널이 합니다.  
(네임서버를 Cloudflare로 옮길 필요 없음)

### 1회 설정

```bash
cloudflared tunnel login                 # Cloudflare 무료 계정으로 로그인
cloudflared tunnel create oracle
# 출력된 TUNNEL_ID 를 Porkbun CNAME Answer 에 넣기:
#   Host=oracle  Answer=<TUNNEL_ID>.cfargotunnel.com

cat > ~/.cloudflared/config.yml <<EOF
tunnel: <TUNNEL_ID>
credentials-file: $HOME/.cloudflared/<TUNNEL_ID>.json
ingress:
  - hostname: oracle.vowroad.com
    service: http://127.0.0.1:8080
  - service: http_status:404
EOF
```

### 상시 실행

```bash
# 앱
cd oracle && PYTHONPATH=src python3 -m oracle.cli serve --host 127.0.0.1 --port 8080

# 터널
cloudflared tunnel run oracle
```

## 임시 (터널 UUID 아직 없을 때)

Porkbun URL Forward로 잠깐 연결 가능:

1. vowroad.com → **DNS** (또는 URL Forwarding)
2. Host `oracle` → Forward to  
   `https://extended-meanwhile-undertake-bedroom.trycloudflare.com`
3. 단점: trycloudflare 주소가 바뀌면 Forward도 다시 고쳐야 함

고정이 필요하면 Named Tunnel + CNAME이 정답입니다.

## 로그인 (나만 쓰기)

```bash
ORACLE_DASHBOARD_USER=minseong
ORACLE_DASHBOARD_PASSWORD=...
```

## 확인

```bash
curl -I https://oracle.vowroad.com
# 401 또는 200 → OK
```
