# Giu × Lemon Squeezy — setup checklist

Online payments for **giucuu.com** without a Vietnamese PG merchant account. Korean individual / sole prop OK (MoR).

## Before store approval (do now)

### 1. Lemon Squeezy dashboard

- [ ] Store created (URL: `giu.lemonsqueezy.com` — no dots)
- [ ] Store description + link to **https://www.giucuu.com**
- [ ] **Products → New** → **One-time**
  - Name: `Giu Food Rescue Box`
  - Description: `Discounted surplus food box pickup on giucuu.com (Ho Chi Minh City).`
  - Price: e.g. `$0.99` (overridden per order via API)
- [ ] Copy **Variant ID** → save for Vercel

### 2. API keys (test mode works before approval)

- [ ] Settings → **API** → Create key → `LEMON_SQUEEZY_API_KEY`
- [ ] Settings → **Stores** → Store ID → `LEMON_SQUEEZY_STORE_ID`

### 3. Webhook (test + live)

Settings → **Webhooks → Add webhook**

| Field | Value |
|-------|--------|
| URL | `https://www.giucuu.com/api/giu/payments/lemon-squeezy/webhook` |
| Events | **`order_created`** |
| Secret | → `GIU_LEMON_SQUEEZY_WEBHOOK_SECRET` |

### 4. Vercel Production env

```bash
LEMON_SQUEEZY_API_KEY=...
LEMON_SQUEEZY_STORE_ID=...
LEMON_SQUEEZY_VARIANT_ID_GIU=...
GIU_LEMON_SQUEEZY_WEBHOOK_SECRET=...
GIU_PAYMENT_DEMO=0
# optional:
GIU_VND_PER_USD=25000
GIU_PAYMENT_PROVIDER=lemon_squeezy
```

Redeploy after saving.

### 5. Verify checkout mode

```bash
curl -s https://www.giucuu.com/api/giu/payments/config
```

Expect: `"backend":"lemon_squeezy"` (not `"demo"`).

### 6. Test flow (test mode)

1. Log in as customer on giucuu.com
2. Open a box → **카드 · PayPal로 결제**
3. Lemon Squeezy checkout opens (not instant demo code)
4. Complete test payment
5. Redirect to pickup page with code

---

## After store approval

- [ ] Switch API key to **live** (if separate)
- [ ] One real small test charge, then refund in LS dashboard
- [ ] Confirm payout bank (국민은행 SWIFT `CZNBKRSE`) in LS settings

---

## Payout bank (Korea)

| Field | Value |
|-------|--------|
| Bank | KB Kookmin Bank |
| SWIFT | `CZNBKRSE` |
| Domestic bank code | `004` |

---

## Cron (unpaid reservation expiry)

cron-job.org — every **60 seconds**:

```
GET https://www.giucuu.com/api/cron/giu-reservation-expiry
Authorization: Bearer <CRON_SECRET>
```

---

## Notes

- Checkout charged in **USD** (VND display on site; converted via `GIU_VND_PER_USD`).
- **MoMo / VietQR** not supported — use VNPay + Vietnamese partner if needed later.
- Effiroad can share `LEMON_SQUEEZY_API_KEY` + `STORE_ID`; use a **separate Giu variant** + **separate webhook URL**.
