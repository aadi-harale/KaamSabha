create type public.job_status as enum ('REQUESTED','DISPATCHING','OFFERED','ACCEPTED','TRAVELLING','ARRIVED','START_VERIFICATION','IN_PROGRESS','COMPLETION_VERIFICATION','COMPLETED','CUSTOMER_CANCELLED','WORKER_CANCELLED','DISPUTED','HUMAN_REVIEW');
create table public.jobs (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customers(id), worker_id uuid references public.workers(id),
  service_category_id uuid not null references public.service_categories(id), status public.job_status not null default 'REQUESTED',
  task text not null, description text not null, booked_scope jsonb not null default '[]', approved_scope jsonb not null default '[]',
  locality text not null, service_address_label text not null, service_lat numeric(9,6), service_lng numeric(9,6),
  worker_origin_lat numeric(9,6), worker_origin_lng numeric(9,6), scheduled_at timestamptz not null, emergency boolean not null default false,
  customer_price numeric(12,2) not null, worker_payout numeric(12,2) not null, welfare_amount numeric(12,2) not null,
  cooperative_amount numeric(12,2) not null, estimated_net numeric(12,2), active_policy_version_id uuid, decision_snapshot_id uuid,
  route_geometry jsonb, route_distance_m integer, route_duration_s integer, route_provider text, route_is_approximate boolean not null default false,
  travel_progress numeric(5,4) not null default 0 check (travel_progress between 0 and 1), created_at timestamptz not null default now(),
  accepted_at timestamptz, travel_started_at timestamptz, arrived_at timestamptz, work_started_at timestamptz,
  completed_at timestamptz, cancelled_at timestamptz, cancelled_by public.app_role, updated_at timestamptz not null default now(),
  constraint price_reconciles check (customer_price=worker_payout+welfare_amount+cooperative_amount)
);
create table public.job_events (
  id uuid primary key default gen_random_uuid(), job_id uuid not null references public.jobs(id) on delete cascade,
  event_type text not null, actor_profile_id uuid references public.profiles(id), actor_role public.app_role not null,
  payload jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.job_otps (
  id uuid primary key default gen_random_uuid(), job_id uuid not null references public.jobs(id) on delete cascade,
  otp_type text not null check (otp_type in ('START','COMPLETE')), code_hash text not null,
  issued_at timestamptz not null default now(), expires_at timestamptz not null, attempt_count integer not null default 0,
  used_at timestamptz, verified_at timestamptz, invalidated_at timestamptz
);
create table public.job_evidence (
  id uuid primary key default gen_random_uuid(), job_id uuid not null references public.jobs(id) on delete cascade,
  evidence_type text not null check (evidence_type in ('CUSTOMER_REFERENCE','BEFORE','DURING','AFTER','VARIANCE')),
  storage_path text not null, caption text not null default '', uploaded_by_profile_id uuid not null references public.profiles(id),
  uploaded_by_role public.app_role not null, created_at timestamptz not null default now()
);
create table public.change_orders (
  id uuid primary key default gen_random_uuid(), job_id uuid not null references public.jobs(id) on delete cascade,
  worker_id uuid not null references public.workers(id), reason text not null, labour_delta numeric(12,2) not null default 0,
  material_delta numeric(12,2) not null default 0, time_delta_minutes integer not null default 0,
  evidence_ids jsonb not null default '[]', status text not null check(status in ('REQUESTED','APPROVED','DECLINED')),
  created_at timestamptz not null default now(), resolved_at timestamptz
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  message_key text not null, message_params jsonb not null default '{}', notification_type text not null,
  read_at timestamptz, created_at timestamptz not null default now()
);
create table public.worker_opportunities (
  id uuid primary key default gen_random_uuid(), job_id uuid not null references public.jobs(id) on delete cascade,
  worker_id uuid not null references public.workers(id), valid_opportunity boolean not null,
  invalid_reason text, offered_at timestamptz not null default now(), accepted_at timestamptz, declined_at timestamptz
);
create table public.ratings (
  id uuid primary key default gen_random_uuid(), job_id uuid unique not null references public.jobs(id),
  customer_id uuid not null references public.customers(id), worker_id uuid not null references public.workers(id),
  stars integer not null check(stars between 1 and 5), note text not null default '', created_at timestamptz not null default now()
);
create table public.workability_signals (
  id uuid primary key default gen_random_uuid(), job_id uuid not null references public.jobs(id), worker_id uuid not null references public.workers(id),
  signal_type text not null, notes text, review_status text not null default 'RECORDED', created_at timestamptz not null default now()
);
