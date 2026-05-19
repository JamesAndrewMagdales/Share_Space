import express from 'express';
import { pool } from '../config/database.js';
import bcrypt from 'bcryptjs';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Create new user (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      email, password, first_name, last_name,
      location, city, state, country, phone, bio,
      is_active, is_admin
    } = req.body;

    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, first name, and last name are required'
      });
    }

    // Check if user already exists
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const locationValue = location || null;
    const cityValue = city || null;
    const stateValue = state || 'Philippines';
    const phoneValue = phone || null;
    const countryValue = country || 'Philippines';
    const bioValue = bio || null;
    const isActiveValue = is_active !== undefined ? (is_active ? 1 : 0) : 1;
    const isAdminValue = is_admin ? 1 : 0;

    const [result] = await pool.execute(
      `INSERT INTO users (email, password_hash, first_name, last_name, location, city, state, country, phone, bio, is_active, is_admin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [email, passwordHash, first_name, last_name, locationValue, cityValue, stateValue, countryValue, phoneValue, bioValue, isActiveValue, isAdminValue]
    );

    const [newUser] = await pool.execute(
      `SELECT id, email, first_name, last_name, location, city, state, country, phone, bio,
              is_verified, is_admin, rating_avg, total_reviews, created_at, is_active
       FROM users WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json({ success: true, data: newUser[0] });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all users (authenticated users)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, city, is_verified } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ` AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (city) {
      whereClause += ' AND city = ?';
      params.push(city);
    }

    if (is_verified !== undefined) {
      whereClause += ' AND is_verified = ?';
      params.push(is_verified === 'true');
    }

    const [users] = await pool.execute(`
      SELECT 
        id,
        email,
        first_name,
        last_name,
        location,
        city,
        state,
        country,
        phone,
        bio,
        profile_image,
        is_verified,
        is_admin,
        rating_avg,
        total_reviews,
        created_at,
        is_active
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const [countResult] = await pool.execute(`SELECT COUNT(*) as total FROM users ${whereClause}`, params);
    const total = countResult[0].total;

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;
    const isAdminUser = req.user.is_admin;

    const [users] = await pool.execute(`
      SELECT 
        id,
        email,
        first_name,
        last_name,
        location,
        city,
        state,
        country,
        phone,
        bio,
        profile_image,
        is_verified,
        verification_document,
        rating_avg,
        total_reviews,
        created_at,
        last_login,
        is_active
      FROM users WHERE id = ?
    `, [id]);

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = users[0];

    // Non-admins can only view their own profile or public info of others
    if (!isAdminUser && currentUserId !== parseInt(id)) {
      // Return limited public info
      const { email, verification_document, last_login, is_active, ...publicUser } = user;
      return res.json({ success: true, data: publicUser });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update user profile
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdminUser = req.user.is_admin;

    // Users can update their own profile, admins can update any
    if (!isAdminUser && userId !== parseInt(id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const {
      first_name,
      last_name,
      location,
      city,
      state,
      country,
      phone,
      bio,
      profile_image,
      is_active,
      is_admin
    } = req.body;

    // Build update query - only include fields that are provided
    const updates = [];
    const params = [];

    if (first_name !== undefined) { updates.push('first_name = ?'); params.push(first_name); }
    if (last_name !== undefined) { updates.push('last_name = ?'); params.push(last_name); }
    if (location !== undefined) { updates.push('location = ?'); params.push(location); }
    if (city !== undefined) { updates.push('city = ?'); params.push(city); }
    if (state !== undefined) { updates.push('state = ?'); params.push(state); }
    if (country !== undefined) { updates.push('country = ?'); params.push(country); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
    if (bio !== undefined) { updates.push('bio = ?'); params.push(bio); }
    if (profile_image !== undefined) { updates.push('profile_image = ?'); params.push(profile_image); }
    
    // Only admins can update is_active and is_admin
    if (isAdminUser && is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }
    if (isAdminUser && is_admin !== undefined) { updates.push('is_admin = ?'); params.push(is_admin); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    params.push(id);

    const [result] = await pool.execute(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const [updatedUser] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    res.json({ success: true, data: updatedUser[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete user (admin can delete any, users can delete own)
// Hard delete - permanently removes the user from the database
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdminUser = req.user.is_admin;

    // Users can only delete their own account, admins can delete any
    if (!isAdminUser && parseInt(id) !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Check if user exists first
    const [users] = await pool.execute('SELECT id FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Hard delete - permanently remove the user (CASCADE will handle related records)
    await pool.execute('DELETE FROM users WHERE id = ?', [id]);

    res.json({ success: true, message: 'User permanently deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user's services
router.get('/:id/services', async (req, res) => {
  try {
    const { id } = req.params;
    const { status = 'Active' } = req.query;

    const [services] = await pool.execute(`
      SELECT 
        s.*,
        sc.name as category_name,
        sc.icon as category_icon
      FROM services s
      LEFT JOIN service_categories sc ON s.category_id = sc.id
      WHERE s.user_id = ? AND s.status = ?
      ORDER BY s.created_at DESC
    `, [id, status]);

    res.json({ success: true, data: services });
  } catch (error) {
    console.error('Get user services error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user's reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [reviews] = await pool.execute(`
      SELECT 
        r.*,
        reviewer.first_name as reviewer_first_name,
        reviewer.last_name as reviewer_last_name,
        reviewer.profile_image as reviewer_image,
        sr.service_id,
        s.title as service_title
      FROM reviews r
      JOIN users reviewer ON r.reviewer_id = reviewer.id
      LEFT JOIN service_requests sr ON r.service_request_id = sr.id
      LEFT JOIN services s ON sr.service_id = s.id
      WHERE r.reviewed_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [id, limit, offset]);

    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM reviews WHERE reviewed_id = ?',
      [id]
    );

    res.json({
      success: true,
      data: reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Verify user (self only)
router.patch('/:id/verify', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { is_verified, verification_document } = req.body;

    // Users can only verify their own account
    if (parseInt(id) !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [result] = await pool.execute(
      'UPDATE users SET is_verified = ?, verification_document = COALESCE(?, verification_document), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [is_verified, verification_document, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const [user] = await pool.execute('SELECT id, email, first_name, last_name, is_verified FROM users WHERE id = ?', [id]);
    res.json({ success: true, data: user[0] });
  } catch (error) {
    console.error('Verify user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
