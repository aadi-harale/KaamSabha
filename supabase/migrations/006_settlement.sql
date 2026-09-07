create table public.settlements (
  id uuid primary key default gen_random_uuid(), job_id uuid unique not null references public.jobs(id),
  customer_total numeric(12,2) not null, worker_amount numeric(12,2) not null, welfare_amount numeric(12,2) not null,
  cooperative_amount numeric(12,2) not null, disputed_amount numeric(12,2) not null default 0,
  undisputed_amount numeric(12,2) not null, status text not null, created_at timestamptz not null default now(),
  constraint settlement_reconciles check(customer_total=worker_amount+welfare_amount+cooperative_amount)
);
create table public.settlement_lines (
  id uuid primary key default gen_random_uuid(), settlement_id uuid not null references public.settlements(id) on delete cascade,
  line_type text not null, label text not null, amount numeric(12,2) not null
);
create table public.demand_forecasts (
  id uuid primary key default gen_random_uuid(), service_category_id uuid not null references public.service_categories(id), locality text not null,
  window_start timestamptz not null, window_end timestamptz not null, demand_level text not null,
  expected_jobs numeric(10,2) not null, model_version text not null, is_demo boolean not null default true,
  created_at timestamptz not null default now()
);
