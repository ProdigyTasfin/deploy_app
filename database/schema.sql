-- nibash-home-services/database/schema.sql
-- FIXED VERSION - Proper Supabase Auth Integration

-- =====================================================
-- 1. EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 2. USERS TABLE - Linked with Supabase Auth
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'customer',
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  
  -- Professional specific fields (moved to professionals table)
  -- Keeping minimal fields here
  
  -- Verification and status
  is_verified BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'pending',
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  
  -- Profile
  avatar_url TEXT,
  bio TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT users_role_check CHECK (role IN ('customer', 'professional', 'admin')),
  CONSTRAINT users_status_check CHECK (status IN ('active', 'pending', 'suspended', 'inactive', 'rejected'))
);

COMMENT ON TABLE users IS 'Application users linked to Supabase Auth';
COMMENT ON COLUMN users.auth_user_id IS 'References auth.users(id) for Supabase Auth integration';

-- =====================================================
-- 3. PROFESSIONALS TABLE - Extended profile
-- =====================================================
CREATE TABLE IF NOT EXISTS professionals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Professional details
  service_type VARCHAR(100) NOT NULL,
  nid_number VARCHAR(50),
  nid_image_url TEXT,
  nid_verified BOOLEAN DEFAULT FALSE,
  experience_years INTEGER,
  hourly_rate DECIMAL(10, 2),
  portfolio_images TEXT[],
  
  -- Bank/Payment details
  bkash_number VARCHAR(20),
  nagad_number VARCHAR(20),
  rocket_number VARCHAR(20),
  bank_account_name VARCHAR(255),
  bank_account_number VARCHAR(50),
  bank_name VARCHAR(100),
  bank_branch VARCHAR(100),
  bank_routing_number VARCHAR(20),
  
  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  verification_date TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_available BOOLEAN DEFAULT TRUE,
  total_jobs_completed INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0,
  
  -- Location
  service_area TEXT[],
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT professionals_service_type_check 
    CHECK (service_type IN ('plumbing', 'electrical', 'carpentry', 'cleaning', 
                          'painting', 'ac_repair', 'appliance_repair', 'moving', 
                          'gardening', 'security', 'tutoring', 'photography', 
                          'event_planning', 'web_development', 'mobile_repair', 
                          'computer_repair', 'car_repair', 'other'))
);

-- =====================================================
-- 4. SERVICE CATEGORIES
-- =====================================================
CREATE TABLE IF NOT EXISTS service_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  image_url TEXT,
  parent_id INTEGER REFERENCES service_categories(id),
  sort_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO service_categories (name, slug, description, icon, is_featured) VALUES
  ('Plumbing', 'plumbing', 'Professional plumbing services for repairs and installation', 'fa-wrench', true),
  ('Electrical', 'electrical', 'Certified electricians for all electrical work', 'fa-bolt', true),
  ('Carpentry', 'carpentry', 'Expert carpenters for furniture and repairs', 'fa-hammer', true),
  ('Cleaning', 'cleaning', 'Professional cleaning services for home and office', 'fa-broom', true),
  ('Painting', 'painting', 'Interior and exterior painting services', 'fa-paint-brush', true),
  ('AC Repair', 'ac-repair', 'Air conditioning repair and maintenance', 'fa-snowflake', true),
  ('Appliance Repair', 'appliance-repair', 'Repair services for home appliances', 'fa-tools', true),
  ('Moving', 'moving', 'Professional moving and packing services', 'fa-truck', true),
  ('Gardening', 'gardening', 'Gardening and landscaping services', 'fa-leaf', true),
  ('Security', 'security', 'Security system installation and monitoring', 'fa-shield-alt', true)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 5. SERVICE REQUESTS
-- =====================================================
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_number VARCHAR(50) UNIQUE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Service details
  service_category_id INTEGER REFERENCES service_categories(id),
  service_type VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  urgency VARCHAR(50) NOT NULL DEFAULT 'medium',
  
  -- Location
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Scheduling
  preferred_date DATE,
  preferred_time_start TIME,
  preferred_time_end TIME,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Pricing
  estimated_hours DECIMAL(5, 2),
  hourly_rate DECIMAL(10, 2),
  estimated_cost DECIMAL(10, 2),
  final_cost DECIMAL(10, 2),
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  cancellation_reason TEXT,
  cancellation_by UUID REFERENCES users(id),
  
  -- Metadata
  source VARCHAR(50) DEFAULT 'web',
  tags TEXT[],
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT service_requests_urgency_check 
    CHECK (urgency IN ('low', 'medium', 'high', 'emergency')),
  CONSTRAINT service_requests_status_check 
    CHECK (status IN ('draft', 'pending', 'quoted', 'accepted', 'in_progress', 
                     'completed', 'cancelled', 'expired', 'disputed')),
  CONSTRAINT service_requests_number_unique UNIQUE (request_number)
);

-- Generate request number trigger
CREATE OR REPLACE FUNCTION generate_request_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.request_number = 'SR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(CAST(nextval('service_requests_seq'::regclass) AS TEXT), 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS service_requests_seq START 1;

CREATE TRIGGER trigger_generate_request_number
  BEFORE INSERT ON service_requests
  FOR EACH ROW
  EXECUTE FUNCTION generate_request_number();

-- =====================================================
-- 6. PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Payment details
  transaction_id VARCHAR(100) UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  fee DECIMAL(10, 2) DEFAULT 0,
  net_amount DECIMAL(10, 2) GENERATED ALWAYS AS (amount - fee) STORED,
  currency VARCHAR(10) DEFAULT 'BDT',
  payment_method VARCHAR(50) NOT NULL,
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payment_date TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  
  -- Gateway
  gateway_name VARCHAR(50),
  gateway_response JSONB,
  gateway_transaction_id VARCHAR(255),
  error_message TEXT,
  
  -- Receipt
  receipt_url TEXT,
  invoice_url TEXT,
  
  -- Metadata
  notes TEXT,
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT payments_amount_check CHECK (amount > 0),
  CONSTRAINT payments_method_check 
    CHECK (payment_method IN ('bkash', 'nagad', 'rocket', 'card', 'bank_transfer', 'cash', 'sslcommerz')),
  CONSTRAINT payments_status_check 
    CHECK (status IN ('pending', 'processing', 'submitted', 'confirmed', 'completed', 
                     'failed', 'refunded', 'cancelled', 'released')),
  CONSTRAINT payments_transaction_id_unique UNIQUE (transaction_id)
);

-- =====================================================
-- 7. REVIEWS AND RATINGS
-- =====================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Ratings
  overall_rating INTEGER NOT NULL,
  professionalism_rating INTEGER,
  quality_rating INTEGER,
  timeliness_rating INTEGER,
  communication_rating INTEGER,
  value_rating INTEGER,
  
  -- Review content
  title VARCHAR(200),
  comment TEXT,
  pros TEXT,
  cons TEXT,
  images TEXT[],
  
  -- Response from professional
  response_comment TEXT,
  responded_at TIMESTAMPTZ,
  
  -- Status
  is_verified BOOLEAN DEFAULT FALSE,
  is_anonymous BOOLEAN DEFAULT FALSE,
  is_recommended BOOLEAN DEFAULT TRUE,
  status VARCHAR(20) DEFAULT 'published',
  
  -- Helpfulness
  helpful_count INTEGER DEFAULT 0,
  report_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT reviews_rating_check CHECK (overall_rating >= 1 AND overall_rating <= 5),
  CONSTRAINT reviews_professionalism_rating_check CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
  CONSTRAINT reviews_quality_rating_check CHECK (quality_rating >= 1 AND quality_rating <= 5),
  CONSTRAINT reviews_timeliness_rating_check CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
  CONSTRAINT reviews_unique_per_request UNIQUE (service_request_id)
);

-- =====================================================
-- 8. PROFESSIONAL AVAILABILITY
-- =====================================================
CREATE TABLE IF NOT EXISTS professional_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  timezone VARCHAR(50) DEFAULT 'Asia/Dhaka',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT professional_availability_day_check CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CONSTRAINT professional_availability_time_check CHECK (start_time < end_time),
  UNIQUE(professional_id, day_of_week)
);

-- =====================================================
-- 9. PROFESSIONAL WALLETS
-- =====================================================
CREATE TABLE IF NOT EXISTS wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  pending_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_earned DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_withdrawn DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'BDT',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 10. WALLET TRANSACTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  
  transaction_type VARCHAR(50) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  balance_before DECIMAL(12, 2) NOT NULL,
  balance_after DECIMAL(12, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  
  description TEXT,
  reference VARCHAR(255),
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT wallet_transactions_type_check 
    CHECK (transaction_type IN ('credit', 'debit', 'withdrawal', 'refund', 'fee', 'adjustment')),
  CONSTRAINT wallet_transactions_status_check 
    CHECK (status IN ('pending', 'completed', 'failed', 'cancelled'))
);

-- =====================================================
-- 11. NOTIFICATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT notifications_type_check 
    CHECK (type IN ('service_request', 'payment', 'review', 'verification', 'system', 'promotion'))
);

-- =====================================================
-- 12. INDEXES
-- =====================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Professionals indexes
CREATE INDEX IF NOT EXISTS idx_professionals_user_id ON professionals(user_id);
CREATE INDEX IF NOT EXISTS idx_professionals_service_type ON professionals(service_type);
CREATE INDEX IF NOT EXISTS idx_professionals_is_verified ON professionals(is_verified);
CREATE INDEX IF NOT EXISTS idx_professionals_rating ON professionals(average_rating);

-- Service requests indexes
CREATE INDEX IF NOT EXISTS idx_service_requests_customer ON service_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_professional ON service_requests(professional_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_urgency ON service_requests(urgency);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_service_requests_number ON service_requests(request_number);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_service_request ON payments(service_request_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_professional ON payments(professional_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_professional ON reviews(professional_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(overall_rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);

-- Wallet indexes
CREATE INDEX IF NOT EXISTS idx_wallets_professional ON wallets(professional_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_professional ON wallet_transactions(professional_id);

-- Availability indexes
CREATE INDEX IF NOT EXISTS idx_availability_professional ON professional_availability(professional_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- =====================================================
-- 13. TRIGGERS AND FUNCTIONS
-- =====================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for each table
DO $$
DECLARE
  tables TEXT[] := ARRAY['users', 'professionals', 'service_categories', 'service_requests', 
                         'payments', 'reviews', 'professional_availability', 'wallets', 
                         'wallet_transactions'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_' || t || '_updated_at'
    ) THEN
      EXECUTE format('
        CREATE TRIGGER trigger_update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
      ', t, t);
    END IF;
  END LOOP;
END $$;

-- Function to update professional average rating
CREATE OR REPLACE FUNCTION update_professional_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE professionals
  SET average_rating = (
    SELECT AVG(overall_rating)::DECIMAL(3,2)
    FROM reviews
    WHERE professional_id = NEW.professional_id
    AND status = 'published'
  )
  WHERE user_id = NEW.professional_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_professional_rating
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_professional_rating();

-- Function to create wallet for new professional
CREATE OR REPLACE FUNCTION create_professional_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (professional_id)
  VALUES (NEW.user_id)
  ON CONFLICT (professional_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_professional_wallet
  AFTER INSERT ON professionals
  FOR EACH ROW
  EXECUTE FUNCTION create_professional_wallet();

-- =====================================================
-- 14. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = auth_user_id OR role = 'admin');

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Admins can view all users"
  ON users FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'admin'
  ));

-- Professionals policies
CREATE POLICY "Anyone can view verified professionals"
  ON professionals FOR SELECT
  USING (is_verified = true OR EXISTS (
    SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND (id = professionals.user_id OR role = 'admin')
  ));

-- Service requests policies
CREATE POLICY "Users can view own service requests"
  ON service_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = auth.uid() 
    AND (id = service_requests.customer_id OR id = service_requests.professional_id OR role = 'admin')
  ));

-- =====================================================
-- 15. VERIFICATION
-- =====================================================

-- Run this to verify migration
SELECT '✅ Nibash Home Services Schema Migration Completed Successfully' as status;
SELECT COUNT(*) as users_count FROM users;
SELECT COUNT(*) as professionals_count FROM professionals;
SELECT COUNT(*) as service_categories_count FROM service_categories;
SELECT COUNT(*) as service_requests_count FROM service_requests;
