-- ShareServe Database Schema
-- SQLite Database Design for Community Skill-Sharing Platform

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    country VARCHAR(50) DEFAULT 'Philippines',
    phone VARCHAR(20),
    bio TEXT,
    profile_image VARCHAR(500),
    is_verified BOOLEAN DEFAULT 0,
    verification_document VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT 1,
    rating_avg DECIMAL(2,1) DEFAULT 0.00,
    total_reviews INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_location ON users(city, state);
CREATE INDEX IF NOT EXISTS idx_verified ON users(is_verified);

-- ============================================
-- SKILLS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_name ON skills(name);

-- ============================================
-- USER SKILLS (Many-to-Many Relationship)
-- ============================================
CREATE TABLE IF NOT EXISTS user_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INT NOT NULL,
    skill_id INT NOT NULL,
    experience_level TEXT DEFAULT 'Intermediate',
    years_of_experience INT DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    UNIQUE(user_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_user ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_skill ON user_skills(skill_id);

-- ============================================
-- SERVICE CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS service_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_category_name ON service_categories(name);

-- Insert default categories
INSERT INTO service_categories (name, description, icon) VALUES
('Home & Garden', 'Home improvement, gardening, repairs', 'Home'),
('Tech & IT', 'Computer help, software, web development', 'Laptop'),
('Teaching & Tutoring', 'Academic help, language lessons, music', 'Book'),
('Health & Wellness', 'Fitness, massage, nutrition advice', 'Heart'),
('Beauty & Personal Care', 'Hair, makeup, skincare services', 'Sparkles'),
('Automotive', 'Car repair, maintenance, detailing', 'Car'),
('Events & Photography', 'Event planning, photography services', 'Camera'),
('Writing & Translation', 'Content writing, translation services', 'Pen'),
('Art & Craft', 'Custom artwork, crafts, DIY projects', 'Palette'),
('Business & Legal', 'Consulting, accounting, legal advice', 'Briefcase'),
('Moving & Delivery', 'Moving help, delivery services', 'Truck'),
('Cleaning & Laundry', 'House cleaning, laundry services', 'SprayCan');

-- ============================================
-- SERVICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category_id INT,
    price DECIMAL(10,2) DEFAULT 0.00,
    price_type TEXT DEFAULT 'Fixed',
    location VARCHAR(255),
    city VARCHAR(100),
    is_remote BOOLEAN DEFAULT 0,
    duration_minutes INT DEFAULT 60,
    is_available BOOLEAN DEFAULT 1,
    status TEXT DEFAULT 'Active',
    views_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_service_user ON services(user_id);
CREATE INDEX IF NOT EXISTS idx_service_category ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_service_city ON services(city);
CREATE INDEX IF NOT EXISTS idx_service_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_service_available ON services(is_available);
-- SQLite doesn't support FULLTEXT indexes in the same way;
-- Use FTS5 virtual table if full-text search is needed

-- ============================================
-- SERVICE IMAGES
-- ============================================
CREATE TABLE IF NOT EXISTS service_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    is_primary BOOLEAN DEFAULT 0,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_image_service ON service_images(service_id);

-- ============================================
-- SERVICE REQUESTS
-- ============================================
CREATE TABLE IF NOT EXISTS service_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INT NOT NULL,
    requester_id INT NOT NULL,
    provider_id INT NOT NULL,
    message TEXT,
    preferred_date DATE,
    preferred_time TIME,
    duration_minutes INT DEFAULT 60,
    status TEXT DEFAULT 'Pending',
    agreed_price DECIMAL(10,2),
    completion_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_request_service ON service_requests(service_id);
CREATE INDEX IF NOT EXISTS idx_request_requester ON service_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_request_provider ON service_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_request_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_request_date ON service_requests(preferred_date);

-- ============================================
-- REVIEWS AND RATINGS
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_request_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    reviewed_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_anonymous BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(service_request_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_review_reviewed ON reviews(reviewed_id);
CREATE INDEX IF NOT EXISTS idx_review_rating ON reviews(rating);

-- ============================================
-- CONVERSATIONS AND MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_request_id INT,
    participant1_id INT NOT NULL,
    participant2_id INT NOT NULL,
    last_message TEXT,
    last_message_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE SET NULL,
    FOREIGN KEY (participant1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (participant2_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(participant1_id, participant2_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_p1 ON conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversation_p2 ON conversations(participant2_id);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_message_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_message_created ON messages(created_at);

-- ============================================
-- USER AVAILABILITY
-- ============================================
CREATE TABLE IF NOT EXISTS user_availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INT NOT NULL,
    day_of_week INT,
    start_time TIME,
    end_time TIME,
    specific_date DATE,
    is_available BOOLEAN DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_availability_user ON user_availability(user_id);
CREATE INDEX IF NOT EXISTS idx_availability_date ON user_availability(specific_date);
CREATE INDEX IF NOT EXISTS idx_availability_day ON user_availability(day_of_week);

-- ============================================
-- REPORTS
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id INT NOT NULL,
    reported_user_id INT,
    reported_service_id INT,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Pending',
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_report_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_report_reporter ON reports(reporter_id);

-- ============================================
-- FAVORITES / SAVED SERVICES
-- ============================================
CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INT NOT NULL,
    service_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    UNIQUE(user_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_service ON favorites(service_id);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INT NOT NULL,
    type TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    related_id INT,
    related_type VARCHAR(50),
    is_read BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notification_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notification_created ON notifications(created_at);

-- ============================================
-- AI RECOMMENDATIONS LOG (for analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS recommendation_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INT NOT NULL,
    service_id INT NOT NULL,
    recommendation_type TEXT NOT NULL,
    was_clicked BOOLEAN DEFAULT 0,
    was_booked BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recommendation_user ON recommendation_log(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_type ON recommendation_log(recommendation_type);

-- ============================================
-- VERIFICATION DOCUMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS verification_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INT NOT NULL,
    document_type TEXT NOT NULL,
    document_url VARCHAR(500) NOT NULL,
    status TEXT DEFAULT 'Pending',
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_verification_user ON verification_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_status ON verification_documents(status);

-- ============================================
-- SAMPLE DATA FOR TESTING
-- ============================================

-- Insert sample skills
INSERT INTO skills (name, category, description) VALUES
('Web Development', 'Tech & IT', 'Building websites and web applications'),
('Graphic Design', 'Art & Craft', 'Creating visual content and designs'),
('Python Programming', 'Tech & IT', 'Python development and scripting'),
('English Tutoring', 'Teaching & Tutoring', 'English language lessons'),
('House Cleaning', 'Cleaning & Laundry', 'Professional home cleaning'),
('Car Detailing', 'Automotive', 'Complete car cleaning and polishing'),
('Photography', 'Events & Photography', 'Professional photo services'),
('Guitar Lessons', 'Teaching & Tutoring', 'Learn to play guitar'),
('Content Writing', 'Writing & Translation', 'Blog posts, articles, copywriting'),
('Yoga Instruction', 'Health & Wellness', 'Yoga classes and meditation');

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View: Service details with provider info
CREATE VIEW IF NOT EXISTS service_details AS
SELECT
    s.id,
    s.title,
    s.description,
    s.price,
    s.price_type,
    s.location,
    s.city,
    s.is_remote,
    s.is_available,
    s.status,
    s.views_count,
    s.created_at,
    u.id as provider_id,
    u.first_name || ' ' || u.last_name as provider_name,
    u.profile_image,
    u.rating_avg as provider_rating,
    u.is_verified as provider_verified,
    sc.name as category_name,
    sc.icon as category_icon
FROM services s
JOIN users u ON s.user_id = u.id
LEFT JOIN service_categories sc ON s.category_id = sc.id;

-- View: User profile with stats
CREATE VIEW IF NOT EXISTS user_profile_stats AS
SELECT
    u.id,
    u.first_name || ' ' || u.last_name as full_name,
    u.email,
    u.location,
    u.city,
    u.bio,
    u.profile_image,
    u.is_verified,
    u.rating_avg,
    u.total_reviews,
    u.created_at,
    COUNT(DISTINCT s.id) as total_services,
    COUNT(DISTINCT CASE WHEN s.status = 'Active' THEN s.id END) as active_services,
    COUNT(DISTINCT us.skill_id) as total_skills
FROM users u
LEFT JOIN services s ON u.id = s.user_id
LEFT JOIN user_skills us ON u.id = us.user_id
WHERE u.is_active = 1
GROUP BY u.id;
