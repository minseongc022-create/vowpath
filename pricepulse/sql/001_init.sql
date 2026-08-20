-- Pricepulse — Toss Shopping price & rank history.
-- Run in the Supabase SQL editor (project: pricepulse). Idempotent.
--
-- Design notes:
--  * One observation per (target, product, KST day). Re-runs upsert, so a retry
--    after a partial failure repairs the day instead of duplicating it.
--  * Prices are integer KRW. Never float — repricer arithmetic must be exact.
--  * No RLS-exposed tables: everything is written by the service role and read
--    by server code only.

create table if not exists pricepulse_runs (
  id            text primary key,
  source        text        not null,
  started_at    timestamptz not null,
  finished_at   timestamptz,
  ok            boolean     not null default false,
  dry_run       boolean     not null default false,
  target_count  integer     not null default 0,
  failed_count  integer     not null default 0,
  item_count    integer     not null default 0,
  stored_count  integer     not null default 0,
  alerts        jsonb       not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists pricepulse_runs_started_idx on pricepulse_runs (started_at desc);

create table if not exists pricepulse_products (
  id             bigserial primary key,
  source         text not null default 'toss-shopping',
  external_id    text not null,
  name           text not null,
  seller_name    text,
  category_name  text,
  product_url    text,
  image_url      text,
  first_seen_at  timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  constraint pricepulse_products_source_external_key unique (source, external_id)
);

create index if not exists pricepulse_products_seller_idx on pricepulse_products (seller_name);

create table if not exists pricepulse_observations (
  id            bigserial primary key,
  run_id        text not null references pricepulse_runs (id) on delete cascade,
  target_id     text not null,
  source        text not null default 'toss-shopping',
  external_id   text not null,
  observed_on   date not null,
  observed_at   timestamptz not null default now(),
  rank          integer not null,
  page          integer not null default 1,
  price         integer,
  list_price    integer,
  delivery_fee  integer,
  review_count  integer,
  rating        numeric(3, 2),
  sold_out      boolean,
  seller_name   text,
  name          text,
  constraint pricepulse_observations_daily_key unique (target_id, external_id, observed_on)
);

-- Price history for one product (dashboard chart, repricer input).
create index if not exists pricepulse_obs_product_day_idx
  on pricepulse_observations (source, external_id, observed_on desc);

-- Rank board for one keyword on one day.
create index if not exists pricepulse_obs_target_day_rank_idx
  on pricepulse_observations (target_id, observed_on desc, rank);

-- "What did this seller do yesterday?"
create index if not exists pricepulse_obs_seller_day_idx
  on pricepulse_observations (seller_name, observed_on desc);

create table if not exists pricepulse_health (
  id                bigserial primary key,
  run_id            text,
  target_id         text not null,
  fingerprint       text,
  items_path        text,
  raw_item_count    integer,
  parsed_item_count integer,
  coverage          jsonb,
  matched_paths     jsonb,
  warnings          jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists pricepulse_health_target_idx
  on pricepulse_health (target_id, created_at desc);

-- ─── Read helpers the dashboard will use ────────────────────────────────────

-- Yesterday → today rank movement per target.
create or replace view pricepulse_rank_moves as
with latest as (
  select target_id, max(observed_on) as day from pricepulse_observations group by target_id
)
select
  today.target_id,
  today.external_id,
  today.name,
  today.seller_name,
  today.observed_on,
  today.rank            as rank_today,
  prev.rank             as rank_prev,
  prev.rank - today.rank as rank_delta,
  today.price           as price_today,
  prev.price            as price_prev,
  today.price - prev.price as price_delta
from pricepulse_observations today
join latest on latest.target_id = today.target_id and latest.day = today.observed_on
left join pricepulse_observations prev
  on prev.target_id = today.target_id
 and prev.external_id = today.external_id
 and prev.observed_on = today.observed_on - 1;

-- Daily low price per keyword — the repricer's "competitor floor".
create or replace view pricepulse_target_daily_low as
select
  target_id,
  observed_on,
  min(price) filter (where price is not null and coalesce(sold_out, false) = false) as low_price,
  count(*) as item_count
from pricepulse_observations
group by target_id, observed_on;
