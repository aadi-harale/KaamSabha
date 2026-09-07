create or replace function public.current_profile() returns public.profiles language sql stable security definer set search_path=public as $$
  select * from public.profiles where id=auth.uid()
$$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and app_role='admin')
$$;
create or replace function public.current_customer_id() returns uuid language sql stable security definer set search_path=public as $$
  select customer_id from public.profiles where id=auth.uid() and app_role='customer'
$$;
create or replace function public.current_worker_id() returns uuid language sql stable security definer set search_path=public as $$
  select worker_id from public.profiles where id=auth.uid() and app_role='worker'
$$;

do $$ declare t text; begin
  foreach t in array array['cooperatives','profiles','customers','workers','service_categories','worker_skills','worker_certifications','workload_limits','jobs','job_events','job_otps','job_evidence','change_orders','notifications','worker_opportunities','ratings','workability_signals','policy_versions','policy_votes','simulation_runs','decision_snapshots','challenges','replay_results','settlements','settlement_lines','demand_forecasts'] loop
    execute format('alter table public.%I enable row level security',t);
  end loop;
end $$;

create policy jobs_read on public.jobs for select using (public.is_admin() or customer_id=public.current_customer_id() or worker_id=public.current_worker_id());
create policy jobs_customer_insert on public.jobs for insert with check (customer_id=public.current_customer_id());
create policy jobs_role_update on public.jobs for update using (public.is_admin() or customer_id=public.current_customer_id() or worker_id=public.current_worker_id());
create policy events_read on public.job_events for select using (public.is_admin() or exists(select 1 from public.jobs j where j.id=job_id and (j.customer_id=public.current_customer_id() or j.worker_id=public.current_worker_id())));
create policy evidence_read on public.job_evidence for select using (public.is_admin() or exists(select 1 from public.jobs j where j.id=job_id and (j.customer_id=public.current_customer_id() or j.worker_id=public.current_worker_id())));
create policy evidence_insert on public.job_evidence for insert with check (uploaded_by_profile_id=auth.uid() and exists(select 1 from public.jobs j where j.id=job_id and (j.customer_id=public.current_customer_id() or j.worker_id=public.current_worker_id())));
create policy otp_admin_only on public.job_otps for all using (public.is_admin()) with check(public.is_admin());
create policy notification_owner on public.notifications for select using(recipient_profile_id=auth.uid() or public.is_admin());
create policy worker_private_self on public.worker_opportunities for select using(worker_id=public.current_worker_id() or public.is_admin());
create policy challenge_self on public.challenges for select using(worker_id=public.current_worker_id() or public.is_admin());
create policy worker_self on public.workers for select using(id=public.current_worker_id() or public.is_admin());
create policy customer_self on public.customers for select using(id=public.current_customer_id() or public.is_admin());
create policy profile_self on public.profiles for select using(id=auth.uid() or public.is_admin());
create policy member_policy_read on public.policy_versions for select using(auth.uid() is not null);
create policy member_vote_read on public.policy_votes for select using(worker_id=public.current_worker_id() or public.is_admin());
create policy member_vote_insert on public.policy_votes for insert with check(worker_id=public.current_worker_id());
create policy admin_all_workers on public.workers for all using(public.is_admin()) with check(public.is_admin());

create policy evidence_objects_read on storage.objects for select using (
  bucket_id='job-evidence' and exists(
    select 1 from public.job_evidence e join public.jobs j on j.id=e.job_id
    where e.storage_path=name and (public.is_admin() or j.customer_id=public.current_customer_id() or j.worker_id=public.current_worker_id())
  )
);
create policy evidence_objects_insert on storage.objects for insert with check(bucket_id='job-evidence' and auth.uid() is not null);
