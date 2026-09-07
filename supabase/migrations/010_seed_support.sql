insert into public.cooperatives(id,name,city,state) values('26089000-0000-4000-8000-000000000001','KAAMSABHA Pune Member Cooperative','Pune','Maharashtra') on conflict do nothing;
insert into public.service_categories(id,slug,name_en,name_hi,name_mr,description,base_customer_price,minimum_worker_payout,welfare_percentage,cooperative_percentage,estimated_duration_minutes) values
('26089000-0000-4000-8000-000000000101','electrician','Electrician','इलेक्ट्रीशियन','इलेक्ट्रिशियन','Household electrical inspection and repair',760,650,5,9.4737,60),
('26089000-0000-4000-8000-000000000102','plumber','Plumber','प्लंबर','प्लंबर','Household plumbing inspection and repair',720,610,5,10.2778,60),
('26089000-0000-4000-8000-000000000103','cleaning','Home cleaning','घर की सफ़ाई','घर स्वच्छता','Booked household cleaning scope',820,700,5,9.6341,90),
('26089000-0000-4000-8000-000000000104','appliance-repair','Appliance repair','उपकरण मरम्मत','उपकरण दुरुस्ती','Household appliance diagnosis and repair',900,770,5,9.4444,75),
('26089000-0000-4000-8000-000000000105','caregiving','Caregiving','देखभाल','देखभाल सेवा','Scheduled household caregiving support',850,720,5,10.2941,90)
on conflict(slug) do nothing;

insert into public.workers(id,cooperative_id,display_name,member_number,verification_status,available,service_radius_km,current_lat,current_lng,location_is_demo) values
('26089000-0000-4000-8000-000000000201','26089000-0000-4000-8000-000000000001','Meena Jadhav','W01','VERIFIED',true,8,18.5515,73.947,true),
('26089000-0000-4000-8000-000000000202','26089000-0000-4000-8000-000000000001','Ravi Shinde','W02','VERIFIED',true,8,18.5679,73.9143,true),
('26089000-0000-4000-8000-000000000203','26089000-0000-4000-8000-000000000001','Salim Shaikh','W03','VERIFIED',true,8,18.5089,73.9259,true),
('26089000-0000-4000-8000-000000000204','26089000-0000-4000-8000-000000000001','Sunita Kamble','W04','VERIFIED',true,8,18.5074,73.8077,true),
('26089000-0000-4000-8000-000000000205','26089000-0000-4000-8000-000000000001','Anil Pawar','W05','VERIFIED',true,8,18.559,73.7868,true),
('26089000-0000-4000-8000-000000000206','26089000-0000-4000-8000-000000000001','Farida Khan','W06','VERIFIED',true,8,18.598,73.762,true),
('26089000-0000-4000-8000-000000000207','26089000-0000-4000-8000-000000000001','Suresh More','W07','VERIFIED',true,8,18.5308,73.8475,true),
('26089000-0000-4000-8000-000000000208','26089000-0000-4000-8000-000000000001','Priya Gaikwad','W08','VERIFIED',true,8,18.4602,73.891,true),
('26089000-0000-4000-8000-000000000209','26089000-0000-4000-8000-000000000001','Rahul Chavan','W09','VERIFIED',true,8,18.5597,73.8075,true),
('26089000-0000-4000-8000-000000000210','26089000-0000-4000-8000-000000000001','Asha Mane','W10','VERIFIED',true,8,18.552,73.889,true),
('26089000-0000-4000-8000-000000000211','26089000-0000-4000-8000-000000000001','Imran Pathan','W11','VERIFIED',true,8,18.5089,73.9259,true),
('26089000-0000-4000-8000-000000000212','26089000-0000-4000-8000-000000000001','Neha Patil','W12','VERIFIED',true,8,18.5515,73.947,true)
on conflict(member_number) do nothing;
insert into public.workload_limits(worker_id) select id from public.workers on conflict do nothing;
insert into public.worker_skills(worker_id,service_category_id,verified,skill_level)
select w.id,c.id,true,'verified member'
from public.workers w
join public.service_categories c on c.slug = case
  when w.member_number in ('W01','W02','W10') then 'electrician'
  when w.member_number in ('W03','W11') then 'plumber'
  when w.member_number in ('W04','W08') then 'cleaning'
  when w.member_number in ('W05','W09','W12') then 'appliance-repair'
  else 'caregiving' end
on conflict do nothing;
insert into public.policy_versions(id,cooperative_id,version_number,status,parameters,activated_at)
values('26089000-0000-4000-8000-000000000301','26089000-0000-4000-8000-000000000001',2,'ACTIVE','{"floor":3500,"maxDelay":8,"netPriority":true}',now())
on conflict(cooperative_id,version_number) do nothing;

insert into public.customers(id,display_name,default_locality)
values('26089000-0000-4000-8000-000000000401','Synthetic history customer','Pune') on conflict do nothing;

with numbered as (select generate_series(1,100) n), prepared as (
  select n,
    (substr(md5('kaamsabha-job-'||n),1,8)||'-'||substr(md5('kaamsabha-job-'||n),9,4)||'-4'||substr(md5('kaamsabha-job-'||n),14,3)||'-8'||substr(md5('kaamsabha-job-'||n),18,3)||'-'||substr(md5('kaamsabha-job-'||n),21,12))::uuid job_id,
    'W'||lpad((((n-1)%12)+1)::text,2,'0') member_number,
    (array['electrician','plumber','cleaning','appliance-repair','caregiving'])[((n-1)%5)+1] slug,
    (array['Kharadi','Hadapsar','Viman Nagar','Kothrud','Baner','Wakad','Shivajinagar','Kondhwa','Aundh','Yerawada'])[((n-1)%10)+1] locality
  from numbered
)
insert into public.jobs(id,customer_id,worker_id,service_category_id,status,task,description,booked_scope,approved_scope,locality,service_address_label,scheduled_at,customer_price,worker_payout,welfare_amount,cooperative_amount,estimated_net,active_policy_version_id,completed_at)
select p.job_id,'26089000-0000-4000-8000-000000000401',w.id,c.id,'COMPLETED',c.name_en||' service','Synthetic illustrative historical request',jsonb_build_array(c.name_en||' booked scope'),jsonb_build_array(c.name_en||' booked scope'),p.locality,p.locality||' illustrative service area',timestamptz '2026-08-31 09:00:00+05:30'+(p.n||' minutes')::interval,c.base_customer_price,c.minimum_worker_payout,round(c.base_customer_price*c.welfare_percentage/100,2),c.base_customer_price-c.minimum_worker_payout-round(c.base_customer_price*c.welfare_percentage/100,2),c.minimum_worker_payout-75,'26089000-0000-4000-8000-000000000301',timestamptz '2026-08-31 10:00:00+05:30'+(p.n||' minutes')::interval
from prepared p join public.workers w using(member_number) join public.service_categories c using(slug)
on conflict(id) do nothing;
