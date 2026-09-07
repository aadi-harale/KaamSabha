-- KAAMSABHA Federation Mesh: cooperative-level capacity exchange.
create table if not exists public.federations (
  id uuid primary key default gen_random_uuid(), name text not null, region text not null,
  active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.cooperative_federation_memberships (
  id uuid primary key default gen_random_uuid(), federation_id uuid not null references public.federations(id),
  cooperative_id uuid not null references public.cooperatives(id), status text not null check(status in ('active','paused','left')),
  joined_at timestamptz not null default now(), unique(federation_id, cooperative_id)
);
create table if not exists public.federation_capacity_snapshots (
  id uuid primary key default gen_random_uuid(), cooperative_id uuid not null references public.cooperatives(id),
  service_category_id uuid not null references public.service_categories(id), available_worker_count int not null check(available_worker_count>=0),
  earliest_eta_minutes int not null check(earliest_eta_minutes>=0), active_jobs int not null default 0,
  workload_capacity int not null default 0, captured_at timestamptz not null default now()
);
create table if not exists public.federation_opportunity_requests (
  id uuid primary key default gen_random_uuid(), job_id uuid not null references public.jobs(id),
  home_cooperative_id uuid not null references public.cooperatives(id), federation_id uuid not null references public.federations(id),
  service_category_id uuid not null references public.service_categories(id), customer_sla_minutes int not null,
  reason_for_overflow text not null, status text not null check(status in ('OPEN','OFFERED','ACCEPTED','DECLINED','EXPIRED','FULFILLED')),
  selected_cooperative_id uuid references public.cooperatives(id), created_at timestamptz not null default now(), resolved_at timestamptz
);
create table if not exists public.federation_opportunity_candidates (
  id uuid primary key default gen_random_uuid(), opportunity_request_id uuid not null references public.federation_opportunity_requests(id),
  cooperative_id uuid not null references public.cooperatives(id), qualified_capacity int not null,
  estimated_eta int not null, protection_compatible boolean not null, sla_compatible boolean not null,
  eligible boolean not null, exclusion_reason text, created_at timestamptz not null default now(),
  unique(opportunity_request_id, cooperative_id)
);
create table if not exists public.federation_agreements (
  id uuid primary key default gen_random_uuid(), federation_id uuid not null references public.federations(id),
  from_cooperative_id uuid not null references public.cooperatives(id), to_cooperative_id uuid not null references public.cooperatives(id),
  worker_payout_floor_rule jsonb not null, welfare_rule jsonb not null, cancellation_rule jsonb not null,
  scope_rule jsonb not null, rating_rule jsonb not null, workload_rule jsonb not null,
  active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.federation_decision_snapshots (
  id uuid primary key default gen_random_uuid(), opportunity_request_id uuid not null references public.federation_opportunity_requests(id),
  snapshot jsonb not null, checksum text not null, created_at timestamptz not null default now()
);
create table if not exists public.federation_settlements (
  id uuid primary key default gen_random_uuid(), job_id uuid not null references public.jobs(id),
  home_cooperative_id uuid not null references public.cooperatives(id), fulfilling_cooperative_id uuid not null references public.cooperatives(id),
  customer_total numeric(12,2) not null, worker_amount numeric(12,2) not null,
  worker_welfare_amount numeric(12,2) not null, fulfilling_cooperative_amount numeric(12,2) not null,
  status text not null, created_at timestamptz not null default now(),
  check(customer_total=worker_amount+worker_welfare_amount+fulfilling_cooperative_amount)
);

do $$ declare t text; begin
  foreach t in array array['federations','cooperative_federation_memberships','federation_capacity_snapshots','federation_opportunity_requests','federation_opportunity_candidates','federation_agreements','federation_decision_snapshots','federation_settlements'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create policy federation_members_read on public.federations for select using(auth.uid() is not null);
create policy federation_memberships_read on public.cooperative_federation_memberships for select using(auth.uid() is not null);
create policy federation_capacity_admin_read on public.federation_capacity_snapshots for select using(public.is_admin());
create policy federation_request_participant_read on public.federation_opportunity_requests for select using(
  public.is_admin() or exists(select 1 from public.jobs j where j.id=job_id and (j.customer_id=public.current_customer_id() or j.worker_id=public.current_worker_id()))
);
create policy federation_candidate_admin_read on public.federation_opportunity_candidates for select using(public.is_admin());
create policy federation_agreement_admin_read on public.federation_agreements for select using(public.is_admin());
create policy federation_snapshot_participant_read on public.federation_decision_snapshots for select using(
  public.is_admin() or exists(select 1 from public.federation_opportunity_requests r join public.jobs j on j.id=r.job_id where r.id=opportunity_request_id and (j.customer_id=public.current_customer_id() or j.worker_id=public.current_worker_id()))
);
create policy federation_settlement_admin_read on public.federation_settlements for select using(public.is_admin());
create policy federation_admin_write_requests on public.federation_opportunity_requests for all using(public.is_admin()) with check(public.is_admin());
create policy federation_admin_write_candidates on public.federation_opportunity_candidates for all using(public.is_admin()) with check(public.is_admin());

alter table public.federation_opportunity_requests replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.federation_opportunity_requests;
exception when duplicate_object then null;
end $$;
