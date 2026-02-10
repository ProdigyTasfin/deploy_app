-- Core auth/role/payment normalization migration
create extension if not exists "uuid-ossp";

-- 1) users table aligned with Supabase Auth (no plaintext password storage)
alter table if exists public.users
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete cascade,
  add column if not exists role text not null default 'customer' check (role in ('admin','customer','professional')),
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists status text not null default 'active' check (status in ('active','pending','suspended','inactive')),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.users
  add constraint users_email_unique unique (email);

-- optional clean-up legacy password columns
alter table if exists public.users drop column if exists password;
alter table if exists public.users drop column if exists password_hash;

-- 2) professionals table for verified professional-specific profile
create table if not exists public.professionals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  service_type text not null,
  nid_number text,
  experience_years int,
  hourly_rate numeric(10,2),
  bkash_number text,
  nagad_number text,
  bank_account_number text,
  bank_account_name text,
  bank_branch text,
  bank_routing_number text,
  is_verified boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) service requests use only customer_id + professional_id
alter table if exists public.service_requests
  add column if not exists customer_id uuid references public.users(id),
  add column if not exists professional_id uuid references public.users(id),
  add column if not exists title text,
  add column if not exists status text not null default 'pending' check (status in ('pending','accepted','in_progress','completed','cancelled')),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.service_requests drop column if exists customer_name;
alter table if exists public.service_requests drop column if exists customer_phone;
alter table if exists public.service_requests drop column if exists assigned_to;

-- 4) manual payment schema
create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  service_request_id uuid not null references public.service_requests(id) on delete cascade,
  customer_id uuid not null references public.users(id) on delete cascade,
  professional_id uuid references public.users(id) on delete set null,
  transaction_id text not null unique,
  mobile_number text not null,
  payment_type text not null check (payment_type in ('bkash','nagad','bank')),
  amount numeric(10,2) not null check (amount > 0),
  status text not null default 'submitted' check (status in ('submitted','confirmed','rejected','released')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  released_at timestamptz
);

-- 5) professional wallets
create table if not exists public.wallets (
  id uuid primary key default uuid_generate_v4(),
  professional_id uuid not null unique references public.users(id) on delete cascade,
  balance numeric(12,2) not null default 0,
  pending_balance numeric(12,2) not null default 0,
  total_earned numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_role on public.users(role);
create index if not exists idx_professionals_service_type on public.professionals(service_type);
create index if not exists idx_service_requests_customer on public.service_requests(customer_id);
create index if not exists idx_service_requests_professional on public.service_requests(professional_id);
create index if not exists idx_payments_service_request on public.payments(service_request_id);
create index if not exists idx_payments_professional on public.payments(professional_id);
