create extension if not exists pgcrypto;
create type public.app_role as enum ('customer','worker','admin');
create type public.app_locale as enum ('en','hi','mr');

create table public.cooperatives (
  id uuid primary key default gen_random_uuid(), name text not null, city text not null,
  state text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.customers (
  id uuid primary key default gen_random_uuid(), display_name text not null, phone text, email text,
  default_locality text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  app_role public.app_role not null, customer_id uuid references public.customers(id), worker_id uuid,
  locale public.app_locale not null default 'en', is_demo boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint profile_entity check (
    (app_role='customer' and customer_id is not null and worker_id is null) or
    (app_role='worker' and worker_id is not null and customer_id is null) or
    (app_role='admin' and customer_id is null and worker_id is null)
  )
);
