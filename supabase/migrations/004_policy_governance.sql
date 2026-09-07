create table public.policy_versions (
  id uuid primary key default gen_random_uuid(), cooperative_id uuid not null references public.cooperatives(id), version_number integer not null,
  status text not null check(status in ('DRAFT','SIMULATED','VOTING','APPROVED','ACTIVE','SUPERSEDED','EXPIRED')),
  parameters jsonb not null, created_at timestamptz not null default now(), activated_at timestamptz,
  unique(cooperative_id,version_number)
);
alter table public.jobs add constraint jobs_policy_fkey foreign key(active_policy_version_id) references public.policy_versions(id);
create table public.policy_votes (
  id uuid primary key default gen_random_uuid(), policy_version_id uuid not null references public.policy_versions(id) on delete cascade,
  worker_id uuid not null references public.workers(id), vote text not null check(vote in ('SUPPORT','OPPOSE','ABSTAIN')),
  optional_reason text, created_at timestamptz not null default now(), unique(policy_version_id,worker_id)
);
create table public.simulation_runs (
  id uuid primary key default gen_random_uuid(), policy_version_id uuid not null references public.policy_versions(id),
  seed integer not null, job_count integer not null, current_metrics jsonb not null, proposed_metrics jsonb not null,
  created_at timestamptz not null default now()
);
