-- nibash-home-services/database/seed-data.sql

-- Sample service categories
INSERT INTO service_categories (name, description, icon) VALUES
('বৈদ্যুতিক কাজ', 'সকল ধরনের বৈদ্যুতিক মেরামত ও ইনস্টলেশন', 'fa-bolt'),
('প্লাম্বিং', 'পানির লাইন, টয়লেট, বাথরুম মেরামত', 'fa-faucet'),
('এয়ারকন্ডিশনিং', 'এসি ইনস্টলেশন ও সার্ভিসিং', 'fa-temperature-low'),
('কাঠের কাজ', 'ফার্নিচার মেরামত ও কাস্টম কাজ', 'fa-hammer'),
('রং এর কাজ', 'বাড়ি ও অফিস রং করা', 'fa-paint-roller'),
('সাধারণ মেরামত', 'বিভিন্ন ধরনের সাধারণ মেরামত কাজ', 'fa-tools'),
('ক্লিনিং', 'ঘর ও অফিস পরিষ্কার', 'fa-broom'),
('পেস্ট কন্ট্রোল', 'পোকামাকড় নিধন', 'fa-bug');

-- Sample admin user (password: admin123)
INSERT INTO users (email, password, role, full_name, phone, is_verified, status) VALUES
('admin@nibash.com', '$2a$10$YourHashedPasswordHere', 'admin', 'নিবাস এডমিন', '01538106089', TRUE, 'active');

-- Sample customer (password: customer123)
INSERT INTO users (email, password, role, full_name, phone, address, is_verified) VALUES
('customer@example.com', '$2a$10$YourHashedPasswordHere', 'customer', 'রহিম মিয়া', '01712345678', 'ধানমন্ডি, ঢাকা', TRUE);

-- Sample professionals (password: pro123)
INSERT INTO users (email, password, role, full_name, phone, address, service_type, experience_years, hourly_rate, is_verified) VALUES
('electrician@example.com', '$2a$10$YourHashedPasswordHere', 'professional', 'করিম উদ্দিন', '01898765432', 'গুলশান, ঢাকা', 'বৈদ্যুতিক কাজ', 5, 500.00, TRUE),
('plumber@example.com', '$2a$10$YourHashedPasswordHere', 'professional', 'জামাল আহমেদ', '01912345678', 'মিরপুর, ঢাকা', 'প্লাম্বিং', 3, 400.00, TRUE),
('ac@example.com', '$2a$10$YourHashedPasswordHere', 'professional', 'সালাউদ্দিন', '01678901234', 'বনানী, ঢাকা', 'এয়ারকন্ডিশনিং', 7, 600.00, TRUE);

-- Sample service requests
INSERT INTO service_requests (customer_id, service_type, title, description, urgency, address, status, estimated_hours, hourly_rate, total_amount) VALUES
(
    (SELECT id FROM users WHERE email = 'customer@example.com'),
    'বৈদ্যুতিক কাজ',
    'বৈদ্যুতিক তার পরিবর্তন প্রয়োজন',
    'বৈদ্যুতিক তার পুরাতন হয়ে গেছে, নতুন তার লাগানো প্রয়োজন। লাইট এবং ফ্যানের সমস্যা হচ্ছে।',
    'medium',
    'ধানমন্ডি রোড ৭, ঢাকা',
    'completed',
    3,
    500.00,
    1500.00
);

-- Sample payment
INSERT INTO payments (service_request_id, user_id, amount, payment_method, transaction_id, status) VALUES
(
    (SELECT id FROM service_requests WHERE title = 'বৈদ্যুতিক তার পরিবর্তন প্রয়োজন'),
    (SELECT id FROM users WHERE email = 'customer@example.com'),
    1500.00,
    'bkash',
    'TRX123456789',
    'completed'
);

-- Sample review
INSERT INTO reviews (service_request_id, customer_id, professional_id, rating, comment) VALUES
(
    (SELECT id FROM service_requests WHERE title = 'বৈদ্যুতিক তার পরিবর্তন প্রয়োজন'),
    (SELECT id FROM users WHERE email = 'customer@example.com'),
    (SELECT id FROM users WHERE email = 'electrician@example.com'),
    5,
    'অসাধারণ কাজ করেছে, সময়মতো শেষ করেছে।'
);
