create table public.service_categories (
  id uuid primary key default gen_random_uuid(), slug text unique not null,
  name_en text not null, name_hi text not null, name_mr text not null, description text not null,
  base_customer_price numeric(12,2) not null check (base_customer_price>=0),
  minimum_worker_payout numeric(12,2) not null check (minimum_worker_payout>=0),
  welfare_percentage numeric(7,4) not null check (welfare_percentage between 0 and 100),
  cooperative_percentage numeric(7,4) not null check (cooperative_percentage between 0 and 100),
  estimated_duration_minutes integer not null check (estimated_duration_minutes>0), active boolean not null default true
);
create table public.workers (
  id uuid primary key default gen_random_uuid(), cooperative_id uuid not null references public.cooperatives(id),
  display_name text not null, member_number text unique not null, verification_status text not null,
  available boolean not null default false, service_radius_km numeric(8,2) not null check (service_radius_km>=0),
  current_lat numeric(9,6), current_lng numeric(9,6), location_is_demo boolean not null default true,
  weekly_gross numeric(12,2) not null default 0, weekly_estimated_net numeric(12,2) not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.profiles add constraint profiles_worker_id_fkey foreign key (worker_id) references public.workers(id);
create table public.worker_skills (
  worker_id uuid references public.workers(id) on delete cascade,
  service_category_id uuid references public.service_categories(id) on delete cascade,
  verified boolean not null default false, skill_level text not null default 'member', created_at timestamptz not null default now(),
  primary key(worker_id,service_category_id)
);
create table public.worker_certifications (
  id uuid primary key default gen_random_uuid(), worker_id uuid not null references public.workers(id) on delete cascade,
  title text not null, issuer text not null, status text not null, valid_until date
);
create table public.workload_limits (
  worker_id uuid primary key references public.workers(id) on delete cascade,
  available_until time not null default '19:00', minimum_rest_minutes integer not null default 30 check (minimum_rest_minutes>=0),
  maximum_jobs_today integer not null default 4 check (maximum_jobs_today>=0), heavy_service_limit integer not null default 2 check (heavy_service_limit>=0),
  unavailable_periods jsonb not null default '[]', updated_at timestamptz not null default now()
);
