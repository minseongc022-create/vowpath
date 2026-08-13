# HanPro — TOPIK học tiếng Hàn cho người Việt

**Hoàn toàn tách biệt** khỏi Effiroad (điều phối kỹ thuật viên) và Lane Learn.

## Truy cập

```bash
npm run dev
# http://localhost:3000/topik
```

## Tách biệt 100%

| | Effiroad | HanPro (`/topik`) |
|---|---|---|
| Middleware | Auth JWT, redirect dashboard | `x-app-shell: topik` — bỏ qua hoàn toàn |
| HTML shell | PlatformShell + assistant | TopikPlatformShell riêng |
| Font | Inter + Pretendard | Be Vietnam Pro |
| Ngôn ngữ | en/es/ko | vi |
| Lưu trữ | Vercel KV / Prisma | localStorage (tức thì) |
| OpenAI | lib/openai | topik/lib/openai |

## Tính năng

- **Chấm bài viết AI** — TOPIK 51–54, giải thích tiếng Việt
- **Video bài học** — YouTube + từ vựng + ngữ pháp
- **Luyện đề** — TOPIK 1–6
- **SRS ôn tập** — SM-2, lưu local instant
- **Sổ sai sót** — tự động thêm vào SRS

## Subdomain (tương lai)

`topik.effiroad.com`, `hanpro.vn` → map vào `/topik/*` qua `topik/lib/topik-host.ts`
