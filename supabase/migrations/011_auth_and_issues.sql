create extension if not exists citext;

alter table public.profiles add column if not exists userid citext;
update public.profiles
set userid = 'member_' || replace(left(id::text, 8), '-', '')
where userid is null;
alter table public.profiles alter column userid set not null;
create unique index if not exists profiles_userid_unique on public.profiles(userid);

create or replace function public.protect_profile_identity()
returns trigger language plpgsql set search_path=public as $$
begin
  if auth.uid() is not null and coalesce(auth.jwt()->>'role', '') <> 'service_role' and (
    new.userid is distinct from old.userid or
    new.app_role is distinct from old.app_role or
    new.customer_id is distinct from old.customer_id or
    new.worker_id is distinct from old.worker_id
  ) then
    raise exception 'Profile identity and role are server managed';
  end if;
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_protect_identity on public.profiles;
create trigger profiles_protect_identity before update on public.profiles
for each row execute function public.protect_profile_identity();

create or replace function public.protect_job_role_fields()
returns trigger language plpgsql set search_path=public as $$
declare role_value public.app_role;
begin
  select app_role into role_value from public.profiles where id=auth.uid();
  if role_value = 'customer' and (
    new.customer_id is distinct from old.customer_id or new.worker_id is distinct from old.worker_id or
    new.service_category_id is distinct from old.service_category_id or new.task is distinct from old.task or
    new.description is distinct from old.description or new.booked_scope is distinct from old.booked_scope or
    new.approved_scope is distinct from old.approved_scope or new.locality is distinct from old.locality or
    new.service_address_label is distinct from old.service_address_label or new.service_lat is distinct from old.service_lat or
    new.service_lng is distinct from old.service_lng or new.worker_origin_lat is distinct from old.worker_origin_lat or
    new.worker_origin_lng is distinct from old.worker_origin_lng or new.scheduled_at is distinct from old.scheduled_at or
    new.emergency is distinct from old.emergency or new.customer_price is distinct from old.customer_price or
    new.worker_payout is distinct from old.worker_payout or new.welfare_amount is distinct from old.welfare_amount or
    new.cooperative_amount is distinct from old.cooperative_amount or new.estimated_net is distinct from old.estimated_net or
    new.active_policy_version_id is distinct from old.active_policy_version_id or
    new.decision_snapshot_id is distinct from old.decision_snapshot_id or
    new.route_geometry is distinct from old.route_geometry or new.route_distance_m is distinct from old.route_distance_m or
    new.route_duration_s is distinct from old.route_duration_s or new.route_provider is distinct from old.route_provider or
    new.route_is_approximate is distinct from old.route_is_approximate or new.travel_progress is distinct from old.travel_progress or
    new.accepted_at is distinct from old.accepted_at or new.travel_started_at is distinct from old.travel_started_at or
    new.arrived_at is distinct from old.arrived_at or new.work_started_at is distinct from old.work_started_at or
    new.completed_at is distinct from old.completed_at or
    new.status not in ('CUSTOMER_CANCELLED','DISPUTED')
  ) then raise exception 'Customers cannot modify dispatch, policy, price, route or worker fields';
  elsif role_value = 'worker' and (
    new.customer_id is distinct from old.customer_id or new.worker_id is distinct from old.worker_id or
    new.service_category_id is distinct from old.service_category_id or new.task is distinct from old.task or
    new.description is distinct from old.description or new.booked_scope is distinct from old.booked_scope or
    new.approved_scope is distinct from old.approved_scope or new.locality is distinct from old.locality or
    new.service_address_label is distinct from old.service_address_label or new.service_lat is distinct from old.service_lat or
    new.service_lng is distinct from old.service_lng or new.scheduled_at is distinct from old.scheduled_at or
    new.emergency is distinct from old.emergency or
    new.customer_price is distinct from old.customer_price or new.worker_payout is distinct from old.worker_payout or
    new.welfare_amount is distinct from old.welfare_amount or new.cooperative_amount is distinct from old.cooperative_amount or
    new.estimated_net is distinct from old.estimated_net or new.active_policy_version_id is distinct from old.active_policy_version_id or
    new.decision_snapshot_id is distinct from old.decision_snapshot_id
  ) then raise exception 'Workers cannot modify customer, dispatch, policy or price fields';
  end if;
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists jobs_protect_role_fields on public.jobs;
create trigger jobs_protect_role_fields before update on public.jobs
for each row execute function public.protect_job_role_fields();

create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete set null,
  raised_by_profile_id uuid not null references public.profiles(id),
  raised_by_role public.app_role not null,
  issue_type text not null,
  category text not null check(category in ('service','scope','payment','safety','policy','other')),
  description text not null check(char_length(description) between 8 and 2000),
  status text not null default 'OPEN' check(status in ('OPEN','UNDER_REVIEW','WAITING_FOR_RESPONSE','RESOLVED','CLOSED')),
  assigned_admin_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.issue_comments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  author_profile_id uuid not null references public.profiles(id),
  message text not null check(char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists jobs_customer_past_orders
on public.jobs(customer_id, status, completed_at desc);
create index if not exists issues_job_status_updated
on public.issues(job_id, status, updated_at desc);
create index if not exists issues_raised_by_updated
on public.issues(raised_by_profile_id, updated_at desc);
create index if not exists issue_comments_issue_created
on public.issue_comments(issue_id, created_at);

alter table public.issues enable row level security;
alter table public.issue_comments enable row level security;

drop policy if exists profile_locale_update on public.profiles;
create policy profile_locale_update on public.profiles for update
using(id=auth.uid()) with check(id=auth.uid());

drop policy if exists issues_participant_read on public.issues;
create policy issues_participant_read on public.issues for select using (
  public.is_admin() or raised_by_profile_id=auth.uid() or exists(
    select 1 from public.jobs j where j.id=job_id and
    (j.customer_id=public.current_customer_id() or j.worker_id=public.current_worker_id())
  )
);
drop policy if exists issues_owner_insert on public.issues;
create policy issues_owner_insert on public.issues for insert with check (
  raised_by_profile_id=auth.uid() and raised_by_role=(select app_role from public.current_profile())
);
drop policy if exists issues_admin_update on public.issues;
create policy issues_admin_update on public.issues for update
using(public.is_admin()) with check(public.is_admin());

drop policy if exists issue_comments_participant_read on public.issue_comments;
create policy issue_comments_participant_read on public.issue_comments for select using (
  exists(select 1 from public.issues i where i.id=issue_id)
);
drop policy if exists issue_comments_participant_insert on public.issue_comments;
create policy issue_comments_participant_insert on public.issue_comments for insert with check (
  author_profile_id=auth.uid() and exists(select 1 from public.issues i where i.id=issue_id)
);

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='issues') then
    alter publication supabase_realtime add table public.issues;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='issue_comments') then
    alter publication supabase_realtime add table public.issue_comments;
  end if;
end $$;
