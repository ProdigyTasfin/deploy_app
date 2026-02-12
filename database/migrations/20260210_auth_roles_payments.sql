-- Core auth/role/payment normalization migration
-- FIXED VERSION - Proper error handling and schema validation

-- =====================================================
-- 1. EXTENSIONS
-- =====================================================
create extension if not exists "uuid-ossp";

-- =====================================================
-- 2. USERS TABLE - Aligned with Supabase Auth
-- =====================================================
alter table if exists public.users 
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete cascade,
  add column if not exists role text not null default 'customer',
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists email text,
  add column if not exists avatar_url text,
  add column if not exists last_login timestamptz,
  add column if not exists last_active timestamptz;

-- Add role check constraint separately to avoid conflicts
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'users_role_check'
  ) then
    alter table public.users 
      add constraint users_role_check 
      check (role in ('admin', 'customer', 'professional'));
  end if;
end $$;

-- Add status check constraint separately
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'users_status_check'
  ) then
    alter table public.users 
      add constraint users_status_check 
      check (status in ('active', 'pending', 'suspended', 'inactive', 'approved'));
  end if;
end $$;

-- Add unique constraint on email
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'users_email_unique'
  ) then
    alter table public.users 
      add constraint users_email_unique 
      unique (email);
  end if;
end $$;

-- Safely drop legacy password columns if they exist
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'users' and column_name = 'password'
  ) then
    alter table public.users drop column password;
  end if;
  
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'users' and column_name = 'password_hash'
  ) then
    alter table public.users drop column password_hash;
  end if;
end $$;

-- =====================================================
-- 3. PROFESSIONALS TABLE
-- =====================================================
create table if not exists public.professionals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  service_type text not null,
  nid_number text,
  nid_verified boolean default false,
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
  verification_date timestamptz,
  verified_by uuid references public.users(id),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint professionals_service_type_check 
    check (service_type in ('plumbing', 'electrical', 'carpentry', 'cleaning', 'painting', 'ac_repair', 'appliance_repair', 'other'))
);

-- =====================================================
-- 4. SERVICE REQUESTS TABLE
-- =====================================================
create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.users(id) on delete cascade,
  professional_id uuid references public.users(id) on delete set null,
  title text not null,
  description text,
  service_type text not null,
  address text not null,
  preferred_date timestamptz,
  preferred_time text,
  estimated_cost numeric(10,2),
  final_cost numeric(10,2),
  status text not null default 'pending',
  cancellation_reason text,
  completed_at timestamptz,
  customer_rating int,
  customer_review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint service_requests_status_check 
    check (status in ('pending', 'quoted', 'accepted', 'in_progress', 'completed', 'cancelled', 'expired')),
  constraint service_requests_rating_check 
    check (customer_rating >= 1 and customer_rating <= 5)
);

-- Safely drop legacy columns if they exist
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'service_requests' and column_name = 'customer_name'
  ) then
    alter table public.service_requests drop column customer_name;
  end if;
  
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'service_requests' and column_name = 'customer_phone'
  ) then
    alter table public.service_requests drop column customer_phone;
  end if;
  
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'service_requests' and column_name = 'assigned_to'
  ) then
    alter table public.service_requests drop column assigned_to;
  end if;
end $$;

-- =====================================================
-- 5. PAYMENTS TABLE
-- =====================================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(id) on delete cascade,
  customer_id uuid not null references public.users(id) on delete cascade,
  professional_id uuid references public.users(id) on delete set null,
  transaction_id text not null unique,
  mobile_number text,
  payment_type text not null,
  amount numeric(10,2) not null check (amount > 0),
  fee numeric(10,2) default 0,
  net_amount numeric(10,2),
  status text not null default 'pending',
  gateway_response jsonb,
  error_message text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  released_at timestamptz,
  
  constraint payments_payment_type_check 
    check (payment_type in ('bkash', 'nagad', 'rocket', 'bank', 'sslcommerz', 'cash')),
  constraint payments_status_check 
    check (status in ('pending', 'submitted', 'confirmed', 'rejected', 'released', 'failed', 'refunded'))
);

-- =====================================================
-- 6. PROFESSIONAL WALLETS
-- =====================================================
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null unique references public.users(id) on delete cascade,
  balance numeric(12,2) not null default 0,
  pending_balance numeric(12,2) not null default 0,
  total_earned numeric(12,2) not null default 0,
  total_withdrawn numeric(12,2) not null default 0,
  currency text not null default 'BDT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- 7. TRANSACTIONS TABLE
-- =====================================================
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid references public.wallets(id) on delete cascade,
  professional_id uuid not null references public.users(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  amount numeric(12,2) not null,
  type text not null,
  status text not null default 'pending',
  description text,
  reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint transactions_type_check 
    check (type in ('credit', 'debit', 'withdrawal', 'refund', 'fee')),
  constraint transactions_status_check 
    check (status in ('pending', 'completed', 'failed', 'cancelled'))
);

-- =====================================================
-- 8. INDEXES FOR PERFORMANCE
-- =====================================================
create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_role on public.users(role);
create index if not exists idx_users_status on public.users(status);
create index if not exists idx_users_auth_id on public.users(auth_user_id);

create index if not exists idx_professionals_user_id on public.professionals(user_id);
create index if not exists idx_professionals_service_type on public.professionals(service_type);
create index if not exists idx_professionals_is_verified on public.professionals(is_verified);

create index if not exists idx_service_requests_customer on public.service_requests(customer_id);
create index if not exists idx_service_requests_professional on public.service_requests(professional_id);
create index if not exists idx_service_requests_status on public.service_requests(status);
create index if not exists idx_service_requests_created on public.service_requests(created_at);

create index if not exists idx_payments_transaction_id on public.payments(transaction_id);
create index if not exists idx_payments_service_request on public.payments(service_request_id);
create index if not exists idx_payments_customer on public.payments(customer_id);
create index if not exists idx_payments_professional on public.payments(professional_id);
create index if not exists idx_payments_status on public.payments(status);

create index if not exists idx_wallets_professional on public.wallets(professional_id);

-- =====================================================
-- 9. FUNCTIONS & TRIGGERS
-- =====================================================

-- Update timestamp trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create triggers for each table
do $$
begin
  -- Users trigger
  if not exists (
    select 1 from pg_trigger where tgname = 'update_users_updated_at'
  ) then
    create trigger update_users_updated_at
      before update on public.users
      for each row
      execute function update_updated_at_column();
  end if;
  
  -- Professionals trigger
  if not exists (
    select 1 from pg_trigger where tgname = 'update_professionals_updated_at'
  ) then
    create trigger update_professionals_updated_at
      before update on public.professionals
      for each row
      execute function update_updated_at_column();
  end if;
  
  -- Service requests trigger
  if not exists (
    select 1 from pg_trigger where tgname = 'update_service_requests_updated_at'
  ) then
    create trigger update_service_requests_updated_at
      before update on public.service_requests
      for each row
      execute function update_updated_at_column();
  end if;
  
  -- Payments trigger
  if not exists (
    select 1 from pg_trigger where tgname = 'update_payments_updated_at'
  ) then
    create trigger update_payments_updated_at
      before update on public.payments
      for each row
      execute function update_updated_at_column();
  end if;
  
  -- Wallets trigger
  if not exists (
    select 1 from pg_trigger where tgname = 'update_wallets_updated_at'
  ) then
    create trigger update_wallets_updated_at
      before update on public.wallets
      for each row
      execute function update_updated_at_column();
  end if;
  
  -- Transactions trigger
  if not exists (
    select 1 from pg_trigger where tgname = 'update_transactions_updated_at'
  ) then
    create trigger update_transactions_updated_at
      before update on public.transactions
      for each row
      execute function update_updated_at_column();
  end if;
end $$;

-- =====================================================
-- 10. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.professionals enable row level security;
alter table public.service_requests enable row level security;
alter table public.payments enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;

-- Users policies
drop policy if exists "Users can view their own profile" on public.users;
create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = auth_user_id);

drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = auth_user_id);

drop policy if exists "Admins can view all users" on public.users;
create policy "Admins can view all users"
  on public.users for select
  using (auth.role() = 'authenticated' and exists (
    select 1 from public.users where auth_user_id = auth.uid() and role = 'admin'
  ));

-- Professionals policies
drop policy if exists "Anyone can view verified professionals" on public.professionals;
create policy "Anyone can view verified professionals"
  on public.professionals for select
  using (is_verified = true or auth.uid() = (
    select auth_user_id from public.users where id = user_id
  ));

-- Service requests policies
drop policy if exists "Users can view their own service requests" on public.service_requests;
create policy "Users can view their own service requests"
  on public.service_requests for select
  using (auth.uid() = (
    select auth_user_id from public.users where id = customer_id
  ) or auth.uid() = (
    select auth_user_id from public.users where id = professional_id
  ));

-- =====================================================
-- 11. INITIAL DATA
-- =====================================================

-- Insert default admin user (you'll need to create this in Supabase Auth first)
-- This is just a placeholder - actual user should be created via Supabase Auth
insert into public.users (id, email, full_name, role, status, created_at, updated_at)
values (
  '00000000-0000-0000-0000-000000000000',
  'admin@nibash.com',
  'System Administrator',
  'admin',
  'active',
  now(),
  now()
) on conflict (email) do nothing;

-- =====================================================
-- 12. VERIFICATION QUERIES
-- =====================================================

-- Run this to verify migration success
select '✅ Migration completed successfully' as status;
select count(*) as users_count from public.users;
select count(*) as professionals_count from public.professionals;
select count(*) as service_requests_count from public.service_requests;
select count(*) as payments_count from public.payments;
select count(*) as wallets_count from public.wallets;
