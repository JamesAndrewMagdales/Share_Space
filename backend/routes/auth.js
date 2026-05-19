import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';

const router = express.Router();

// Admin code from environment (set in .env)
const ADMIN_CODE = process.env.ADMIN_CODE || 'ADMIN2024';

// Register a new user
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('first_name').trim().notEmpty(),
  body('last_name').trim().notEmpty(),
  body('location').optional().trim(),
  body('city').optional().trim(),
  body('phone').optional().isMobilePhone(),
  body('admin_code').optional().trim(),
  body('is_admin').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password, first_name, last_name, location, city, state = 'Philippines', phone, admin_code, is_admin } = req.body;

    // Convert undefined/empty to null for optional fields
    const locationValue = location || null;
    const cityValue = city || null;
    const stateValue = state || 'Philippines';
    const phoneValue = phone || null;

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Determine if admin - accept is_admin directly or check admin_code
    const isAdmin = is_admin === true || (admin_code && admin_code === ADMIN_CODE);

    // Insert new user
    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, location, city, state, phone, is_active, is_verified, is_admin) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?)`,
      [email, passwordHash, first_name, last_name, locationValue, cityValue, stateValue, phoneValue, isAdmin ? 1 : 0]
    );

    const userId = result.insertId;

    // Generate JWT token
    const token = jwt.sign(
      { userId: userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Update last login
    await query('UPDATE users SET last_login = NOW() WHERE id = ?', [userId]);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: userId,
          email,
          first_name,
          last_name,
          location,
          city,
          phone,
          is_admin: isAdmin
        }
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email (without is_active filter first to give specific error)
    const users = await query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Update last login
    await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          location: user.location,
          city: user.city,
          phone: user.phone,
          profile_image: user.profile_image,
          is_verified: user.is_verified,
          is_admin: user.is_admin || false,
          rating_avg: user.rating_avg,
          total_reviews: user.total_reviews
        },
        // Redirect based on role
        redirectUrl: user.is_admin ? '/admin/dashboard' : '/dashboard'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const users = await query(
      `SELECT id, email, first_name, last_name, location, city, state, country, phone, bio, 
              profile_image, is_verified, is_admin, rating_avg, total_reviews, created_at
       FROM users WHERE id = ? AND is_active = 1`,
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];

    // Get user skills
    const skills = await query(
      `SELECT s.id, s.name, s.category, us.experience_level, us.years_of_experience, us.description
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.id
       WHERE us.user_id = ?`,
      [user.id]
    );

    // Get user services
    const services = await query(
      `SELECT id, title, description, price, price_type, location, city, is_remote, 
              duration_minutes, is_available, status, views_count, created_at
       FROM services 
       WHERE user_id = ? AND status != 'Deleted'
       ORDER BY created_at DESC`,
      [user.id]
    );

    res.json({
      success: true,
      data: {
        ...user,
        skills,
        services
      }
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update user profile
router.put('/profile', [
  body('first_name').optional().trim(),
  body('last_name').optional().trim(),
  body('location').optional().trim(),
  body('city').optional().trim(),
  body('state').optional().trim(),
  body('country').optional().trim(),
  body('phone').optional().isMobilePhone(),
  body('bio').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const { first_name, last_name, location, city, state, country, phone, bio } = req.body;

    // Update user profile
    const updateFields = [];
    const values = [];

    if (first_name) { updateFields.push('first_name = ?'); values.push(first_name); }
    if (last_name) { updateFields.push('last_name = ?'); values.push(last_name); }
    if (location) { updateFields.push('location = ?'); values.push(location); }
    if (city) { updateFields.push('city = ?'); values.push(city); }
    if (state) { updateFields.push('state = ?'); values.push(state); }
    if (country) { updateFields.push('country = ?'); values.push(country); }
    if (phone) { updateFields.push('phone = ?'); values.push(phone); }
    if (bio) { updateFields.push('bio = ?'); values.push(bio); }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updateFields.push('updated_at = NOW()');
    values.push(userId);

    const result = await query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;