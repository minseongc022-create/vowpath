-- Pricepulse — plan/billing. Run AFTER 001 and 002. Idempotent.
--
-- One paid tier for now ("Pro"): unlocks price history + trending and raises
-- the keyword cap. The doc's tier 2 (자동 가격조정/리프라이서) needs the
-- repricer engine itself, which doesn't exist yet — no plan gate for it here.
--
-- Payment is Toss Payments one-time checkout (reuses giu/lib/toss-payments.ts,
-- the same code path already live for Giu), sold as a 30-day pass rather than
-- true auto-recurring billing — simpler, and honest about what's actually
-- wired up. Auto-renewal via Toss's billing-key API is a later upgrade.

alter table pricepulse_sellers
  add column if not exists plan text not null default 'free',
  add column if not exists plan_expires_at timestamptz;

create table if not exists pricepulse_payments (
  id            text primary key,            -- Toss orderId
  seller_id     text not null references pricepulse_sellers (id) on delete cascade,
  amount        integer not null,
  status        text not null default 'pending',   -- pending | paid | failed
  plan          text not null default 'pro',
  payment_key   text,
  created_at    timestamptz not null default now(),
  paid_at       timestamptz
);

create index if not exists pricepulse_payments_seller_idx
  on pricepulse_payments (seller_id, created_at desc);
