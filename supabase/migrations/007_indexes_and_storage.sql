create index jobs_customer_created_idx on public.jobs(customer_id,created_at desc);
create index jobs_worker_status_idx on public.jobs(worker_id,status);
create index jobs_status_schedule_idx on public.jobs(status,scheduled_at);
create index job_events_job_created_idx on public.job_events(job_id,created_at);
create index notifications_recipient_read_idx on public.notifications(recipient_profile_id,read_at);
create index opportunities_worker_offered_idx on public.worker_opportunities(worker_id,offered_at);
create index policies_coop_status_idx on public.policy_versions(cooperative_id,status);
create index votes_policy_idx on public.policy_votes(policy_version_id);
create index challenges_worker_status_idx on public.challenges(worker_id,status);
create index evidence_job_idx on public.job_evidence(job_id);
create index change_orders_job_status_idx on public.change_orders(job_id,status);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('job-evidence','job-evidence',false,6291456,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
