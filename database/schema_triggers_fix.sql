-- Fixed triggers and stored procedures for ShareServe
-- Run this after schema.sql

-- Drop existing if any
DROP TRIGGER IF EXISTS after_review_insert;
DROP TRIGGER IF EXISTS after_review_update;
DROP TRIGGER IF EXISTS after_review_delete;
DROP PROCEDURE IF EXISTS update_user_rating;

-- Procedure to update user rating after a new review
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
END;

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

-- Trigger to update rating after deleting a review
CREATE TRIGGER after_review_delete
AFTER DELETE ON reviews
FOR EACH ROW
BEGIN
    CALL update_user_rating(OLD.reviewed_id);
END;
