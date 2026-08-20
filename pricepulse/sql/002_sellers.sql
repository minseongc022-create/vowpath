-- Pricepulse — seller accounts + self-serve keyword tracking.
-- Run AFTER 001_init.sql. Idempotent.
--
-- Turns Pricepulse from a single-admin watchlist into a multi-tenant product:
-- any Toss Shopping seller can sign up and register the keywords they care
-- about. The collector's actual unit of work (pricepulse_targets) is now
-- DB-driven instead of the static config/targets.json seed list — sellers
-- add a keyword, it becomes a collection target from the next run onward.
--
-- Rank/price data itself stays UNSCOPED by seller on purpose: it's exactly
-- what anyone can already see on a public Toss Shopping search page. What's
-- private is only a seller's account and which keywords THEY chose to
-- track — that's what pricepulse_seller_targets protects.

create extension if not exists pgcrypto;

create table if not exists pricepulse_sellers (
  id            text primary key default gen_random_uuid()::text,
  email         text not null unique,
  password_hash text not null,
  display_name  text,
  created_at    timestamptz not null default now()
);

-- The actual collection unit. Two sellers tracking "무선이어폰" share one row
-- here — no point paying for the same search twice.
create table if not exists pricepulse_targets (
  id         text primary key default gen_random_uuid()::text,
  kind       text not null default 'keyword',
  query      text not null,
  created_at timestamptz not null default now(),
  constraint pricepulse_targets_kind_query_key unique (kind, query)
);

-- "Which sellers care about which target" — purely a subscription/label
-- table for the dashboard. Never joined into rank/price reads.
create table if not exists pricepulse_seller_targets (
  id         bigserial primary key,
  seller_id  text not null references pricepulse_sellers (id) on delete cascade,
  target_id  text not null references pricepulse_targets (id) on delete cascade,
  label      text,
  created_at timestamptz not null default now(),
  constraint pricepulse_seller_targets_unique unique (seller_id, target_id)
);

create index if not exists pricepulse_seller_targets_seller_idx
  on pricepulse_seller_targets (seller_id, created_at desc);

create index if not exists pricepulse_seller_targets_target_idx
  on pricepulse_seller_targets (target_id);
