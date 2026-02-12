-- nibash-home-services/database/seed-data.sql
-- FIXED VERSION - Proper Supabase Auth Integration

-- =====================================================
-- 1. DISABLE TRIGGERS TEMPORARILY
-- =====================================================
ALTER TABLE users DISABLE TRIGGER ALL;
ALTER TABLE professionals DISABLE TRIGGER ALL;
ALTER TABLE service_requests DISABLE TRIGGER ALL;
ALTER TABLE payments DISABLE TRIGGER ALL;
ALTER TABLE reviews DISABLE TRIGGER ALL;
ALTER TABLE wallets DISABLE TRIGGER ALL;

-- =====================================================
-- 2. CLEAN EXISTING DATA (Optional - Comment out if not needed)
-- =====================================================
-- TRUNCATE TABLE reviews CASCADE;
-- TRUNCATE TABLE payments CASCADE;
-- TRUNCATE TABLE service_requests CASCADE;
-- TRUNCATE TABLE professionals CASCADE;
-- TRUNCATE TABLE users CASCADE;

-- =====================================================
-- 3. INSERT SERVICE CATEGORIES
-- =====================================================
INSERT INTO service_categories (name, slug, description, icon, is_featured, sort_order) VALUES
('Plumbing', 'plumbing', 'পানির লাইন, টয়লেট, বাথরুম মেরামত', 'fa-wrench', true, 1),
('Electrical', 'electrical', 'সকল ধরনের বৈদ্যুতিক মেরামত ও ইনস্টলেশন', 'fa-bolt', true, 2),
('AC Repair', 'ac-repair', 'এসি ইনস্টলেশন ও সার্ভিসিং', 'fa-snowflake', true, 3),
('Carpentry', 'carpentry', 'ফার্নিচার মেরামত ও কাস্টম কাজ', 'fa-hammer', true, 4),
('Painting', 'painting', 'বাড়ি ও অফিস রং করা', 'fa-paint-brush', true, 5),
('Cleaning', 'cleaning', 'ঘর ও অফিস পরিষ্কার', 'fa-broom', true, 6),
('Appliance Repair', 'appliance-repair', 'বিভিন্ন ধরনের সাধারণ মেরামত কাজ', 'fa-tools', true, 7),
('Pest Control', 'pest-control', 'পোকামাকড় নিধন', 'fa-bug', true, 8),
('Moving', 'moving', 'বাড়ি ও অফিস শিফটিং', 'fa-truck', false, 9),
('Gardening', 'gardening', 'বাগান পরিচর্যা', 'fa-leaf', false, 10)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  is_featured = EXCLUDED.is_featured;

-- =====================================================
-- 4. CREATE USERS WITH AUTH INTEGRATION
-- =====================================================
-- IMPORTANT: These users need to be created in Supabase Auth first!
-- Use the Supabase Auth admin API to create users with these emails and passwords.
-- After creating them in Auth, you'll get auth_user_ids which should replace the placeholders below.

-- Admin user
INSERT INTO users (
  id, 
  email, 
  full_name, 
  phone, 
  role, 
  status, 
  is_verified, 
  email_verified,
  created_at, 
  updated_at
) VALUES (
  gen_random_uuid(),
  'admin@nibash.com',
  'নিবাস এডমিন',
  '01538106089',
  'admin',
  'active',
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  is_verified = EXCLUDED.is_verified,
  updated_at = NOW();

-- Customer user
INSERT INTO users (
  id,
  email,
  full_name,
  phone,
  address,
  role,
  status,
  is_verified,
  email_verified,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'customer@example.com',
  'রহিম মিয়া',
  '01712345678',
  'ধানমন্ডি, ঢাকা - 1209',
  'customer',
  'active',
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Professional - Electrician
INSERT INTO users (
  id,
  email,
  full_name,
  phone,
  address,
  role,
  status,
  is_verified,
  email_verified,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'electrician@example.com',
  'করিম উদ্দিন',
  '01898765432',
  'গুলশান ১, ঢাকা - 1212',
  'professional',
  'active',
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Professional - Plumber
INSERT INTO users (
  id,
  email,
  full_name,
  phone,
  address,
  role,
  status,
  is_verified,
  email_verified,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'plumber@example.com',
  'জামাল আহমেদ',
  '01912345678',
  'মিরপুর ১০, ঢাকা - 1216',
  'professional',
  'active',
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Professional - AC Technician
INSERT INTO users (
  id,
  email,
  full_name,
  phone,
  address,
  role,
  status,
  is_verified,
  email_verified,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'ac@example.com',
  'সালাউদ্দিন',
  '01678901234',
  'বনানী, ঢাকা - 1213',
  'professional',
  'active',
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  status = EXCLUDED.status,
  updated_at = NOW();

-- =====================================================
-- 5. INSERT PROFESSIONALS DETAILS
-- =====================================================
INSERT INTO professionals (
  user_id,
  service_type,
  nid_number,
  experience_years,
  hourly_rate,
  is_verified,
  is_active,
  bkash_number,
  nagad_number,
  bank_account_name,
  bank_account_number,
  bank_name,
  created_at,
  updated_at
) VALUES
(
  (SELECT id FROM users WHERE email = 'electrician@example.com'),
  'electrical',
  '1234567890123',
  5,
  500.00,
  true,
  true,
  '01898765432',
  '01898765433',
  'করিম উদ্দিন',
  '123456789012',
  'সোনালী ব্যাংক',
  NOW(),
  NOW()
),
(
  (SELECT id FROM users WHERE email = 'plumber@example.com'),
  'plumbing',
  '2345678901234',
  3,
  400.00,
  true,
  true,
  '01912345678',
  '01912345679',
  'জামাল আহমেদ',
  '234567890123',
  'জনতা ব্যাংক',
  NOW(),
  NOW()
),
(
  (SELECT id FROM users WHERE email = 'ac@example.com'),
  'ac_repair',
  '3456789012345',
  7,
  600.00,
  true,
  true,
  '01678901234',
  '01678901235',
  'সালাউদ্দিন',
  '345678901234',
  'অগ্রণী ব্যাংক',
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  service_type = EXCLUDED.service_type,
  experience_years = EXCLUDED.experience_years,
  hourly_rate = EXCLUDED.hourly_rate,
  is_verified = EXCLUDED.is_verified,
  bkash_number = EXCLUDED.bkash_number,
  updated_at = NOW();

-- =====================================================
-- 6. INSERT SERVICE REQUESTS
-- =====================================================
INSERT INTO service_requests (
  customer_id,
  professional_id,
  service_category_id,
  service_type,
  title,
  description,
  urgency,
  address,
  latitude,
  longitude,
  status,
  estimated_hours,
  hourly_rate,
  estimated_cost,
  final_cost,
  scheduled_at,
  completed_at,
  created_at,
  updated_at
) VALUES
(
  (SELECT id FROM users WHERE email = 'customer@example.com'),
  (SELECT id FROM users WHERE email = 'electrician@example.com'),
  (SELECT id FROM service_categories WHERE slug = 'electrical'),
  'electrical',
  'বৈদ্যুতিক তার পরিবর্তন প্রয়োজন',
  'বৈদ্যুতিক তার পুরাতন হয়ে গেছে, নতুন তার লাগানো প্রয়োজন। লাইট এবং ফ্যানের সমস্যা হচ্ছে। ঘরের ৩ টি ফ্যান এবং ৫ টি লাইট ঠিকমত কাজ করছে না।',
  'medium',
  'ধানমন্ডি ২৭, বাসা #৩, ঢাকা - ১২০৯',
  23.7465,
  90.3742,
  'completed',
  3,
  500.00,
  1500.00,
  1500.00,
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '6 days',
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '6 days'
),
(
  (SELECT id FROM users WHERE email = 'customer@example.com'),
  (SELECT id FROM users WHERE email = 'plumber@example.com'),
  (SELECT id FROM service_categories WHERE slug = 'plumbing'),
  'plumbing',
  'বাথরুমের পানির লাইন লিকেজ',
  'বাথরুমের পানির লাইন থেকে পানি লিক করছে। সিলিং এবং দেয়াল ভিজে যাচ্ছে। জরুরি ভিত্তিতে মেরামত প্রয়োজন।',
  'high',
  'ধানমন্ডি ২৭, বাসা #৩, ঢাকা - ১২০৯',
  23.7465,
  90.3742,
  'in_progress',
  2,
  400.00,
  800.00,
  NULL,
  NOW() - INTERVAL '2 days',
  NULL,
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '2 days'
),
(
  (SELECT id FROM users WHERE email = 'customer@example.com'),
  NULL,
  (SELECT id FROM service_categories WHERE slug = 'ac-repair'),
  'ac_repair',
  'এসি কুলিং করছে না',
  '৩ টন এলজি এসি, ২ বছর পুরাতন। হঠাৎ করে কুলিং বন্ধ হয়ে গেছে। গ্যাস রিফিল প্রয়োজন হতে পারে।',
  'medium',
  'ধানমন্ডি ২৭, বাসা #৩, ঢাকা - ১২০৯',
  23.7465,
  90.3742,
  'pending',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
);

-- =====================================================
-- 7. INSERT PAYMENTS
-- =====================================================
INSERT INTO payments (
  service_request_id,
  customer_id,
  professional_id,
  transaction_id,
  amount,
  fee,
  net_amount,
  currency,
  payment_method,
  status,
  gateway_name,
  gateway_transaction_id,
  payment_date,
  confirmed_at,
  created_at,
  updated_at
) VALUES
(
  (SELECT id FROM service_requests WHERE title LIKE '%বৈদ্যুতিক তার পরিবর্তন%' LIMIT 1),
  (SELECT id FROM users WHERE email = 'customer@example.com'),
  (SELECT id FROM users WHERE email = 'electrician@example.com'),
  'TRX-BKASH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'),
  1500.00,
  30.00,
  1470.00,
  'BDT',
  'bkash',
  'completed',
  'bkash',
  'BKASH' || LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 10, '0'),
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '6 days',
  NOW() - INTERVAL '5 days'
);

-- =====================================================
-- 8. INSERT REVIEWS
-- =====================================================
INSERT INTO reviews (
  service_request_id,
  customer_id,
  professional_id,
  overall_rating,
  professionalism_rating,
  quality_rating,
  timeliness_rating,
  communication_rating,
  value_rating,
  comment,
  pros,
  cons,
  is_verified,
  is_recommended,
  status,
  created_at,
  updated_at
) VALUES
(
  (SELECT id FROM service_requests WHERE title LIKE '%বৈদ্যুতিক তার পরিবর্তন%' LIMIT 1),
  (SELECT id FROM users WHERE email = 'customer@example.com'),
  (SELECT id FROM users WHERE email = 'electrician@example.com'),
  5,
  5,
  5,
  5,
  5,
  5,
  'অসাধারণ কাজ করেছে, সময়মতো শেষ করেছে। খুবই পেশাদার এবং দক্ষ। তার পরিবর্তন করে দেখে দিয়েছে যে সব ঠিক আছে। পরিষ্কার পরিচ্ছন্নভাবে কাজ করেছে।',
  'সময়মতো আসা, গুণগত মান, সাশ্রয়ী মূল্য, পরিষ্কার পরিচ্ছন্ন কাজ',
  'কোনো সমস্যা নেই',
  true,
  true,
  'published',
  NOW() - INTERVAL '4 days',
  NOW() - INTERVAL '4 days'
);

-- =====================================================
-- 9. UPDATE PROFESSIONAL RATINGS
-- =====================================================
UPDATE professionals
SET 
  total_jobs_completed = (
    SELECT COUNT(*) 
    FROM service_requests 
    WHERE professional_id = professionals.user_id 
    AND status = 'completed'
  ),
  average_rating = (
    SELECT COALESCE(AVG(overall_rating), 0)::DECIMAL(3,2)
    FROM reviews 
    WHERE professional_id = professionals.user_id 
    AND status = 'published'
  )
WHERE user_id IN (
  SELECT id FROM users WHERE role = 'professional'
);

-- =====================================================
-- 10. CREATE WALLETS FOR PROFESSIONALS
-- =====================================================
INSERT INTO wallets (
  professional_id,
  balance,
  pending_balance,
  total_earned,
  total_withdrawn,
  currency,
  created_at,
  updated_at
)
SELECT 
  p.user_id,
  COALESCE(SUM(pm.net_amount), 0) FILTER (WHERE pm.status = 'completed'),
  COALESCE(SUM(pm.net_amount), 0) FILTER (WHERE pm.status IN ('pending', 'processing', 'submitted', 'confirmed')),
  COALESCE(SUM(pm.net_amount), 0) FILTER (WHERE pm.status = 'completed'),
  0,
  'BDT',
  NOW(),
  NOW()
FROM professionals p
LEFT JOIN service_requests sr ON sr.professional_id = p.user_id AND sr.status = 'completed'
LEFT JOIN payments pm ON pm.service_request_id = sr.id AND pm.status = 'completed'
WHERE p.user_id IN (
  SELECT id FROM users WHERE role = 'professional'
)
GROUP BY p.user_id
ON CONFLICT (professional_id) DO UPDATE SET
  balance = EXCLUDED.balance,
  pending_balance = EXCLUDED.pending_balance,
  total_earned = EXCLUDED.total_earned,
  updated_at = NOW();

-- =====================================================
-- 11. INSERT WALLET TRANSACTIONS
-- =====================================================
INSERT INTO wallet_transactions (
  wallet_id,
  professional_id,
  payment_id,
  transaction_type,
  amount,
  balance_before,
  balance_after,
  status,
  description,
  reference,
  created_at,
  updated_at
)
SELECT 
  w.id,
  w.professional_id,
  p.id,
  'credit',
  p.net_amount,
  COALESCE((
    SELECT SUM(p2.net_amount) 
    FROM payments p2 
    JOIN service_requests sr2 ON sr2.id = p2.service_request_id
    WHERE sr2.professional_id = w.professional_id 
    AND p2.status = 'completed'
    AND p2.created_at < p.created_at
  ), 0),
  COALESCE((
    SELECT SUM(p2.net_amount) 
    FROM payments p2 
    JOIN service_requests sr2 ON sr2.id = p2.service_request_id
    WHERE sr2.professional_id = w.professional_id 
    AND p2.status = 'completed'
    AND p2.created_at <= p.created_at
  ), 0),
  'completed',
  'Payment for service request #' || sr.request_number,
  p.transaction_id,
  p.created_at,
  p.created_at
FROM wallets w
JOIN service_requests sr ON sr.professional_id = w.professional_id
JOIN payments p ON p.service_request_id = sr.id
WHERE p.status = 'completed'
AND NOT EXISTS (
  SELECT 1 FROM wallet_transactions wt 
  WHERE wt.payment_id = p.id
);

-- =====================================================
-- 12. INSERT NOTIFICATIONS
-- =====================================================
INSERT INTO notifications (
  user_id,
  type,
  title,
  message,
  data,
  is_read,
  created_at
) VALUES
(
  (SELECT id FROM users WHERE email = 'customer@example.com'),
  'service_request',
  'সার্ভিস রিকোয়েস্ট সম্পন্ন হয়েছে',
  'আপনার বৈদ্যুতিক তার পরিবর্তনের কাজ সম্পন্ন হয়েছে। অনুগ্রহ করে রিভিউ দিন।',
  jsonb_build_object(
    'service_request_id', (SELECT id FROM service_requests WHERE title LIKE '%বৈদ্যুতিক তার পরিবর্তন%' LIMIT 1),
    'professional_name', 'করিম উদ্দিন',
    'amount', 1500
  ),
  false,
  NOW() - INTERVAL '5 days'
),
(
  (SELECT id FROM users WHERE email = 'electrician@example.com'),
  'payment',
  'পেমেন্ট রিলিজ হয়েছে',
  'আপনার ১,৫০০ টাকা পেমেন্ট রিলিজ হয়েছে এবং ওয়ালেটে যোগ হয়েছে।',
  jsonb_build_object(
    'amount', 1500,
    'transaction_id', (SELECT transaction_id FROM payments LIMIT 1)
  ),
  false,
  NOW() - INTERVAL '5 days'
),
(
  (SELECT id FROM users WHERE email = 'customer@example.com'),
  'review',
  'রিভিউর জন্য ধন্যবাদ',
  'আপনার রিভিউ সফলভাবে পোস্ট হয়েছে।',
  jsonb_build_object(
    'rating', 5,
    'professional_name', 'করিম উদ্দিন'
  ),
  true,
  NOW() - INTERVAL '4 days'
);

-- =====================================================
-- 13. VERIFICATION QUERIES
-- =====================================================
SELECT '✅ Nibash Home Services Seed Data Migration Completed Successfully' as status;
SELECT COUNT(*) as users_count FROM users;
SELECT COUNT(*) as professionals_count FROM professionals;
SELECT COUNT(*) as service_requests_count FROM service_requests;
SELECT COUNT(*) as payments_count FROM payments;
SELECT COUNT(*) as reviews_count FROM reviews;
SELECT COUNT(*) as wallets_count FROM wallets;

-- =====================================================
-- 14. RE-ENABLE TRIGGERS
-- =====================================================
ALTER TABLE users ENABLE TRIGGER ALL;
ALTER TABLE professionals ENABLE TRIGGER ALL;
ALTER TABLE service_requests ENABLE TRIGGER ALL;
ALTER TABLE payments ENABLE TRIGGER ALL;
ALTER TABLE reviews ENABLE TRIGGER ALL;
ALTER TABLE wallets ENABLE TRIGGER ALL;

-- =====================================================
-- 15. DISPLAY SAMPLE DATA
-- =====================================================
SELECT 
  '📊 Database Seed Summary' as title;
  
SELECT 
  role,
  COUNT(*) as count
FROM users 
GROUP BY role 
ORDER BY role;

SELECT 
  p.service_type,
  COUNT(*) as professionals_count,
  AVG(p.hourly_rate)::DECIMAL(10,2) as avg_rate,
  AVG(p.average_rating)::DECIMAL(3,2) as avg_rating
FROM professionals p
GROUP BY p.service_type
ORDER BY p.service_type;

SELECT 
  status,
  COUNT(*) as count,
  SUM(final_cost)::DECIMAL(10,2) as total_revenue
FROM service_requests
GROUP BY status
ORDER BY status;
