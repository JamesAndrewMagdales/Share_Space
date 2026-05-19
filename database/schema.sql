-- ShareServe Database Schema
-- MySQL Database Design for Community Skill-Sharing Platform

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
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
    is_verified BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    verification_document VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    rating_avg DECIMAL(2,1) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    INDEX idx_email (email),
    INDEX idx_location (city, state),
    INDEX idx_verified (is_verified),
    INDEX idx_is_admin (is_admin)
);

-- ============================================
-- SKILLS TABLE
-- ============================================
CREATE TABLE skills (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_name (name)
);

-- ============================================
-- USER SKILLS (Many-to-Many Relationship)
-- ============================================
CREATE TABLE user_skills (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    skill_id INT NOT NULL,
    experience_level ENUM('Beginner', 'Intermediate', 'Advanced', 'Expert') DEFAULT 'Intermediate',
    years_of_experience INT DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_skill (user_id, skill_id),
    INDEX idx_user (user_id),
    INDEX idx_skill (skill_id)
);

-- ============================================
-- SERVICE CATEGORIES
-- ============================================
CREATE TABLE service_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name)
);

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
CREATE TABLE services (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category_id INT,
    price DECIMAL(10,2) DEFAULT 0.00,
    price_type ENUM('Fixed', 'Hourly', 'Negotiable', 'Free') DEFAULT 'Fixed',
    location VARCHAR(255),
    city VARCHAR(100),
    is_remote BOOLEAN DEFAULT FALSE,
    duration_minutes INT DEFAULT 60,
    is_available BOOLEAN DEFAULT TRUE,
    status ENUM('Active', 'Inactive', 'Completed', 'Cancelled') DEFAULT 'Active',
    views_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_category (category_id),
    INDEX idx_city (city),
    INDEX idx_status (status),
    INDEX idx_available (is_available),
    FULLTEXT idx_search (title, description)
);

-- ============================================
-- SERVICE IMAGES
-- ============================================
CREATE TABLE service_images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    service_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    INDEX idx_service (service_id)
);

-- ============================================
-- SERVICE REQUESTS
-- ============================================
CREATE TABLE service_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    service_id INT NOT NULL,
    requester_id INT NOT NULL,
    provider_id INT NOT NULL,
    message TEXT,
    preferred_date DATE,
    preferred_time TIME,
    duration_minutes INT DEFAULT 60,
    status ENUM('Pending', 'Accepted', 'Rejected', 'Completed', 'Cancelled') DEFAULT 'Pending',
    agreed_price DECIMAL(10,2),
    completion_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_service (service_id),
    INDEX idx_requester (requester_id),
    INDEX idx_provider (provider_id),
    INDEX idx_status (status),
    INDEX idx_date (preferred_date)
);

-- ============================================
-- REVIEWS AND RATINGS
-- ============================================
CREATE TABLE reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    service_request_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    reviewed_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_review (service_request_id, reviewer_id),
    INDEX idx_reviewed (reviewed_id),
    INDEX idx_rating (rating)
);

-- ============================================
-- MESSAGES
-- ============================================
CREATE TABLE conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    service_request_id INT,
    participant1_id INT NOT NULL,
    participant2_id INT NOT NULL,
    last_message TEXT,
    last_message_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE SET NULL,
    FOREIGN KEY (participant1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (participant2_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_participants (participant1_id, participant2_id),
    INDEX idx_participant1 (participant1_id),
    INDEX idx_participant2 (participant2_id)
);

CREATE TABLE messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_conversation (conversation_id),
    INDEX idx_sender (sender_id),
    INDEX idx_created (created_at)
);

-- ============================================
-- AVAILABILITY CALENDAR
-- ============================================
CREATE TABLE user_availability (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    day_of_week INT, -- 0=Sunday, 1=Monday, etc. NULL for specific dates
    start_time TIME,
    end_time TIME,
    specific_date DATE, -- For specific date availability
    is_available BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_date (specific_date),
    INDEX idx_day (day_of_week)
);

-- ============================================
-- REPORTS
-- ============================================
CREATE TABLE reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    reporter_id INT NOT NULL,
    reported_user_id INT,
    reported_service_id INT,
    reason ENUM('Spam', 'Inappropriate', 'Fraud', 'Harassment', 'Other') NOT NULL,
    description TEXT,
    status ENUM('Pending', 'Under Review', 'Resolved', 'Dismissed') DEFAULT 'Pending',
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_service_id) REFERENCES services(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_reporter (reporter_id)
);

-- ============================================
-- FAVORITES / SAVED SERVICES
-- ============================================
CREATE TABLE favorites (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    service_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    UNIQUE KEY unique_favorite (user_id, service_id),
    INDEX idx_user (user_id),
    INDEX idx_service (service_id)
);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    type ENUM('request', 'message', 'review', 'system', 'reminder') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    related_id INT, -- Can be service_request_id, message_id, etc.
    related_type VARCHAR(50), -- 'service_request', 'message', etc.
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_read (is_read),
    INDEX idx_created (created_at)
);

-- ============================================
-- AI RECOMMENDATIONS LOG (for analytics)
-- ============================================
CREATE TABLE recommendation_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    service_id INT NOT NULL,
    recommendation_type ENUM('similar', 'nearby', 'based_on_skills', 'trending') NOT NULL,
    was_clicked BOOLEAN DEFAULT FALSE,
    was_booked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_type (recommendation_type)
);

-- ============================================
-- VERIFICATION DOCUMENTS
-- ============================================
CREATE TABLE verification_documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    document_type ENUM('ID', 'Certificate', 'License', 'Other') NOT NULL,
    document_url VARCHAR(500) NOT NULL,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_status (status)
);

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
CREATE VIEW service_details AS
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
    CONCAT(u.first_name, ' ', u.last_name) as provider_name,
    u.profile_image,
    u.rating_avg as provider_rating,
    u.is_verified as provider_verified,
    sc.name as category_name,
    sc.icon as category_icon
FROM services s
JOIN users u ON s.user_id = u.id
LEFT JOIN service_categories sc ON s.category_id = sc.id;

-- View: User profile with stats
CREATE VIEW user_profile_stats AS
SELECT 
    u.id,
    CONCAT(u.first_name, ' ', u.last_name) as full_name,
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
WHERE u.is_active = TRUE
GROUP BY u.id;

-- ============================================
-- STORED PROCEDURES
-- ============================================

-- Procedure to update user rating after a new review
DELIMITER //
CREATE PROCEDURE update_user_rating(IN p_user_id INT)
BEGIN
    UPDATE users u
    SET 
        u.rating_avg = (
            SELECT COALESCE(AVG(r.rating), 0)
            FROM reviews r
            WHERE r.reviewed_id = p_user_id
        ),
        u.total_reviews = (
            SELECT COUNT(*)
            FROM reviews r
            WHERE r.reviewed_id = p_user_id
        )
    WHERE u.id = p_user_id;
END //
DELIMITER ;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to update rating after inserting a review
CREATE TRIGGER after_review_insert
AFTER INSERT ON reviews
FOR EACH ROW
BEGIN
    CALL update_user_rating(NEW.reviewed_id);
END;

-- Trigger to update rating after updating a review
CREATE TRIGGER after_review_update
AFTER UPDATE ON reviews
FOR EACH ROW
BEGIN
    CALL update_user_rating(NEW.reviewed_id);
END;

-- Trigger to delete review
CREATE TRIGGER after_review_delete
AFTER DELETE ON reviews
FOR EACH ROW
BEGIN
    CALL update_user_rating(OLD.reviewed_id);
END;