alter table public.job_events replica identity full;
alter table public.notifications replica identity full;
alter table public.change_orders replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.jobs,public.job_events,public.notifications,public.change_orders;
exception when duplicate_object then null;
end $$;
