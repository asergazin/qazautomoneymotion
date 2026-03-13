-- Run this script in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists cash_transactions (
  id uuid primary key default gen_random_uuid(),
  bitrix_item_id text unique,
  title text not null,
  operation_type text not null check (operation_type in ('income', 'expense')),
  amount numeric(14,2) not null default 0,
  payment_type text,
  article text,
  counterparty text,
  reason text,
  manager_name text,
  transaction_date timestamptz not null,
  source_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cash_transactions_date on cash_transactions (transaction_date);
create index if not exists idx_cash_transactions_operation on cash_transactions (operation_type);

create table if not exists cash_daily_inputs (
  id uuid primary key default gen_random_uuid(),
  report_date date not null unique,
  opening_balance numeric(14,2) not null default 0,
  office_cash numeric(14,2) not null default 0,
  home_cash numeric(14,2) not null default 0,
  kaspi_pay numeric(14,2) not null default 0,
  kaspi_gold numeric(14,2) not null default 0,
  cash_in_currency numeric(14,2) not null default 0,
  goods_in_transit numeric(14,2) not null default 0,
  goods_in_warehouse_cost numeric(14,2) not null default 0,
  receivables numeric(14,2) not null default 0,
  other_current_assets numeric(14,2) not null default 0,
  long_term_liabilities numeric(14,2) not null default 0,
  salary_liabilities numeric(14,2) not null default 0,
  short_term_liabilities numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  quantity numeric(14,3) not null default 0,
  unit text not null default 'pcs',
  purchase_price numeric(14,2) not null default 0,
  min_quantity numeric(14,3) not null default 0,
  manager_bitrix_user_id integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  movement_type text not null check (movement_type in ('in', 'out', 'adjustment')),
  quantity numeric(14,3) not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_movements_item on inventory_movements (inventory_item_id, created_at desc);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  level text not null check (level in ('info', 'warning', 'critical')),
  message text not null,
  metadata jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table cash_transactions enable row level security;
alter table cash_daily_inputs enable row level security;
alter table inventory_items enable row level security;
alter table inventory_movements enable row level security;
alter table notifications enable row level security;

create policy "Allow read for anon" on cash_transactions for select using (true);
create policy "Allow write for service role" on cash_transactions for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Allow read for anon" on cash_daily_inputs for select using (true);
create policy "Allow write for service role" on cash_daily_inputs for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Allow read for anon" on inventory_items for select using (true);
create policy "Allow write for service role" on inventory_items for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Allow read for anon" on inventory_movements for select using (true);
create policy "Allow write for service role" on inventory_movements for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Allow read for anon" on notifications for select using (true);
create policy "Allow write for service role" on notifications for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_cash_transactions_updated_at on cash_transactions;
create trigger trg_cash_transactions_updated_at
before update on cash_transactions
for each row execute function set_updated_at();

drop trigger if exists trg_cash_daily_inputs_updated_at on cash_daily_inputs;
create trigger trg_cash_daily_inputs_updated_at
before update on cash_daily_inputs
for each row execute function set_updated_at();

drop trigger if exists trg_inventory_items_updated_at on inventory_items;
create trigger trg_inventory_items_updated_at
before update on inventory_items
for each row execute function set_updated_at();

