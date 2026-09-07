create table public.decision_snapshots (
  id uuid primary key default gen_random_uuid(), job_id uuid references public.jobs(id), decision_type text not null,
  snapshot jsonb not null, checksum text not null, policy_version_id uuid not null references public.policy_versions(id),
  created_at timestamptz not null default now()
);
alter table public.jobs add constraint jobs_snapshot_fkey foreign key(decision_snapshot_id) references public.decision_snapshots(id);
create table public.challenges (
  id uuid primary key default gen_random_uuid(), decision_snapshot_id uuid not null references public.decision_snapshots(id),
  worker_id uuid not null references public.workers(id), reason text not null,
  status text not null check(status in ('OPEN','REPLAYED','CONFIRMED','VIOLATION','HUMAN_REVIEW','REMEDIED','RESOLVED','CLOSED')),
  created_at timestamptz not null default now(), resolved_at timestamptz
);
create table public.replay_results (
  id uuid primary key default gen_random_uuid(), challenge_id uuid not null references public.challenges(id) on delete cascade,
  verdict text not null check(verdict in ('CONFIRMED','POLICY_VIOLATION','HUMAN_REVIEW_REQUIRED')),
  expected_result jsonb not null, historical_result jsonb not null, explanation text not null,
  created_at timestamptz not null default now()
);
