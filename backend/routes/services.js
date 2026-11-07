import express from 'express';
import { body, query as queryValidator, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// A "service" row is a parking space listing posted by a host.
const PRICE_TYPES = ['Hourly', 'Daily', 'Monthly', 'Free'];
const VEHICLE_TYPES = ['Car', 'Motorcycle', 'SUV/Van', 'Truck', 'Any'];
const TIME_PATTERN = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;

// Parking columns returned with every listing
const PARKING_COLUMNS = `
        s.vehicle_type,
        s.slot_count,
        s.is_covered,
        s.has_cctv,
        s.has_ev_charging,
        s.is_24_7,
        s.available_from,
        s.available_to`;

const toBool = (value) => value === true || value === 'true' || value === 1 || value === '1';
const toTimeOrNull = (value) => (value ? value : null);

// Get all parking spaces with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      search,
      category,
      city,
      minPrice,
      maxPrice,
      minRating,
      vehicleType,
      priceType,
      isCovered,
      hasCctv,
      hasEvCharging,
      page = 1,
      limit = 12,
      sortBy = 'created_at',
      sortOrder = ''
    } = req.query;

    let whereClause = 'WHERE s.status = ? AND s.is_available = 1';
    let values = ['Active'];

    // Search by title, description, address or city
    if (search) {
      whereClause += ' AND (s.title LIKE ? OR s.description LIKE ? OR s.location LIKE ? OR s.city LIKE ?)';
      values.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Filter by category
    if (category) {
      whereClause += ' AND s.category_id = ?';
      values.push(category);
    }

    // Filter by city or area (partial match, so "Makati" finds "Makati City")
    if (city) {
      whereClause += ' AND (s.city LIKE ? OR s.location LIKE ?)';
      values.push(`%${city}%`, `%${city}%`);
    }

    // Filter by price range
    if (minPrice) {
      whereClause += ' AND s.price >= ?';
      values.push(parseFloat(minPrice));
    }
    if (maxPrice) {
      whereClause += ' AND s.price <= ?';
      values.push(parseFloat(maxPrice));
    }

    // Filter by minimum provider rating
    if (minRating) {
      whereClause += ' AND u.rating_avg >= ?';
      values.push(parseFloat(minRating));
    }

    // Filter by vehicle size ("Any" spaces fit every vehicle)
    if (vehicleType && VEHICLE_TYPES.includes(vehicleType)) {
      whereClause += " AND (s.vehicle_type = ? OR s.vehicle_type = 'Any')";
      values.push(vehicleType);
    }

    // Filter by rate type
    if (priceType && PRICE_TYPES.includes(priceType)) {
      whereClause += ' AND s.price_type = ?';
      values.push(priceType);
    }

    // Amenity filters
    if (isCovered === 'true') whereClause += ' AND s.is_covered = 1';
    if (hasCctv === 'true') whereClause += ' AND s.has_cctv = 1';
    if (hasEvCharging === 'true') whereClause += ' AND s.has_ev_charging = 1';

    // Valid sort fields
    const validSortFields = ['created_at', 'price', 'title', 'u.rating_avg', 'rating'];
    const sortField = validSortFields.includes(sortBy)
      ? (sortBy === 'rating' ? 'u.rating_avg' : sortBy)
      : 'created_at';
    // Price and name read naturally low-to-high / A-Z unless sortOrder is given
    const defaultOrder = ['price', 'title'].includes(sortField) ? 'ASC' : 'DESC';
    const order = (sortOrder || defaultOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM services s
      JOIN users u ON s.user_id = u.id
      ${whereClause}
    `;
    const countResult = await query(countQuery, values);
    const total = countResult[0].total;

    // Get services with pagination
    const servicesQuery = `
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
        s.duration_minutes,
        s.views_count,
        s.created_at,${PARKING_COLUMNS},
        u.id as provider_id,
        CONCAT(u.first_name, ' ', u.last_name) as provider_name,
        u.profile_image,
        u.rating_avg as provider_rating,
        u.is_verified as provider_verified,
        sc.name as category_name,
        sc.icon as category_icon
      FROM services s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN service_categories sc ON s.category_id = sc.id
      ${whereClause}
      ORDER BY ${sortField} ${order}
      LIMIT ? OFFSET ?
    `;

    const services = await query(servicesQuery, [...values, parseInt(limit), offset]);

    // Get primary image for each service
    for (const service of services) {
      const images = await query(
        'SELECT image_url FROM service_images WHERE service_id = ? AND is_primary = 1 LIMIT 1',
        [service.id]
      );
      service.image = images.length > 0 ? images[0].image_url : null;
    }

    res.json({
      success: true,
      data: {
        services,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get a single service by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Increment view count
    await query('UPDATE services SET views_count = views_count + 1 WHERE id = ?', [id]);

    const services = await query(
      `SELECT
        s.id,
        s.title,
        s.description,
        s.price,
        s.price_type,
        s.location,
        s.city,
        s.is_remote,
        s.is_available,
        s.duration_minutes,
        s.views_count,
        s.created_at,${PARKING_COLUMNS},
        u.id as provider_id,
        CONCAT(u.first_name, ' ', u.last_name) as provider_name,
        u.profile_image,
        u.rating_avg as provider_rating,
        u.total_reviews as provider_total_reviews,
        u.is_verified as provider_verified,
        u.bio as provider_bio,
        sc.id as category_id,
        sc.name as category_name,
        sc.icon as category_icon
      FROM services s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN service_categories sc ON s.category_id = sc.id
      WHERE s.id = ? AND s.status = 'Active'`,
      [id]
    );

    if (services.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Parking space not found'
      });
    }

    const service = services[0];

    // Get service images
    const images = await query(
      'SELECT image_url, is_primary, display_order FROM service_images WHERE service_id = ? ORDER BY display_order',
      [id]
    );
    service.images = images;

    // Get recent reviews for provider
    const reviews = await query(
      `SELECT r.rating, r.comment, r.created_at,
              CONCAT(u.first_name, ' ', LEFT(u.last_name, 1), '.') as reviewer_name,
              r.is_anonymous
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       WHERE r.reviewed_id = ?
       ORDER BY r.created_at DESC
       LIMIT 5`,
      [service.provider_id]
    );
    service.provider_reviews = reviews;

    res.json({
      success: true,
      data: service
    });

  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create a new service (requires authentication)
router.post('/', [
  authenticateToken,
  body('title').trim().notEmpty().isLength({ min: 3, max: 255 }),
  body('description').trim().notEmpty(),
  body('category_id').optional().isInt({ min: 1 }),
  body('location').trim().notEmpty().withMessage('Address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('price').optional().isFloat({ min: 0 }),
  body('price_type').optional().isIn(PRICE_TYPES),
  body('vehicle_type').optional().isIn(VEHICLE_TYPES),
  body('slot_count').optional().isInt({ min: 1, max: 100 }),
  body('is_covered').optional().isBoolean(),
  body('has_cctv').optional().isBoolean(),
  body('has_ev_charging').optional().isBoolean(),
  body('is_24_7').optional().isBoolean(),
  body('available_from').optional({ values: 'falsy' }).matches(TIME_PATTERN),
  body('available_to').optional({ values: 'falsy' }).matches(TIME_PATTERN),
  body('duration_minutes').optional().isInt({ min: 15, max: 480 })
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

    const {
      title,
      description,
      category_id,
      price,
      price_type,
      location,
      city,
      vehicle_type,
      slot_count,
      is_covered,
      has_cctv,
      has_ev_charging,
      is_24_7
    } = req.body;

    const userId = req.user.id;
    const finalPriceType = price_type || 'Hourly';
    const finalPrice = finalPriceType === 'Free' ? 0 : (parseFloat(price) || 0);
    const allDay = is_24_7 === undefined ? true : toBool(is_24_7);
    const availableFrom = allDay ? null : toTimeOrNull(req.body.available_from);
    const availableTo = allDay ? null : toTimeOrNull(req.body.available_to);

    const result = await query(
      `INSERT INTO services (user_id, title, description, category_id, price, price_type,
              location, city, vehicle_type, slot_count, is_covered, has_cctv, has_ev_charging,
              is_24_7, available_from, available_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, title, description, category_id || null, finalPrice, finalPriceType,
       location, city, vehicle_type || 'Car', parseInt(slot_count) || 1,
       toBool(is_covered), toBool(has_cctv), toBool(has_ev_charging),
       allDay, availableFrom, availableTo]
    );

    res.status(201).json({
      success: true,
      message: 'Parking space listed successfully',
      data: {
        id: result.insertId,
        title,
        description,
        category_id,
        price: finalPrice,
        price_type: finalPriceType,
        location,
        city,
        vehicle_type: vehicle_type || 'Car',
        slot_count: parseInt(slot_count) || 1
      }
    });

  } catch (error) {
    console.error('Create parking space error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update a service (requires authentication and ownership)
router.put('/:id', [
  authenticateToken,
  body('title').optional().trim().isLength({ min: 3, max: 255 }),
  body('description').optional().trim(),
  body('category_id').optional().isInt({ min: 1 }),
  body('location').optional().trim(),
  body('city').optional().trim(),
  body('price').optional().isFloat({ min: 0 }),
  body('price_type').optional().isIn(PRICE_TYPES),
  body('vehicle_type').optional().isIn(VEHICLE_TYPES),
  body('slot_count').optional().isInt({ min: 1, max: 100 }),
  body('is_covered').optional().isBoolean(),
  body('has_cctv').optional().isBoolean(),
  body('has_ev_charging').optional().isBoolean(),
  body('is_24_7').optional().isBoolean(),
  body('available_from').optional({ values: 'falsy' }).matches(TIME_PATTERN),
  body('available_to').optional({ values: 'falsy' }).matches(TIME_PATTERN),
  body('is_available').optional().isBoolean(),
  body('duration_minutes').optional().isInt({ min: 15, max: 480 })
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

    const { id } = req.params;
    const userId = req.user.id;

    // Check ownership
    const services = await query('SELECT user_id FROM services WHERE id = ?', [id]);
    if (services.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Parking space not found'
      });
    }

    if (services[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own parking spaces'
      });
    }

    const body = req.body;
    const updateFields = [];
    const values = [];
    const set = (column, value) => { updateFields.push(`${column} = ?`); values.push(value); };

    if (body.title) set('title', body.title);
    if (body.description) set('description', body.description);
    if (body.category_id) set('category_id', body.category_id);
    // A Free rate always stores 0; otherwise `!== undefined` lets a price of 0 be saved
    if (body.price_type === 'Free') set('price', 0);
    else if (body.price !== undefined && body.price !== '') set('price', parseFloat(body.price) || 0);
    if (body.price_type) set('price_type', body.price_type);
    if (body.location) set('location', body.location);
    if (body.city) set('city', body.city);
    if (body.vehicle_type) set('vehicle_type', body.vehicle_type);
    if (body.slot_count) set('slot_count', parseInt(body.slot_count));
    ['is_covered', 'has_cctv', 'has_ev_charging', 'is_available'].forEach((flag) => {
      if (body[flag] !== undefined) set(flag, toBool(body[flag]));
    });
    if (body.is_24_7 !== undefined) {
      const allDay = toBool(body.is_24_7);
      set('is_24_7', allDay);
      set('available_from', allDay ? null : toTimeOrNull(body.available_from));
      set('available_to', allDay ? null : toTimeOrNull(body.available_to));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updateFields.push('updated_at = NOW()');
    values.push(id);

    await query(`UPDATE services SET ${updateFields.join(', ')} WHERE id = ?`, values);

    res.json({
      success: true,
      message: 'Parking space updated successfully'
    });

  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete a service (soft delete - sets status to Inactive)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check ownership
    const services = await query('SELECT user_id FROM services WHERE id = ?', [id]);
    if (services.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Parking space not found'
      });
    }

    if (services[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own parking spaces'
      });
    }

    await query("UPDATE services SET status = 'Inactive', is_available = 0, updated_at = NOW() WHERE id = ?", [id]);

    res.json({
      success: true,
      message: 'Parking space removed successfully'
    });

  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all service categories
router.get('/categories/all', async (req, res) => {
  try {
    const categories = await query(
      'SELECT id, name, description, icon FROM service_categories WHERE is_active = 1 ORDER BY name'
    );

    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get services by provider
router.get('/provider/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    const { page = 1, limit = 12, includeUnavailable } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    // The host's dashboard also lists spaces they have paused
    const availability = includeUnavailable === 'true' ? '' : ' AND s.is_available = 1';

    const services = await query(
      `SELECT
        s.id, s.title, s.description, s.price, s.price_type, s.location, s.city,
        s.is_remote, s.is_available, s.duration_minutes, s.views_count, s.created_at,
        s.status, ${PARKING_COLUMNS},
        sc.id as category_id, sc.name as category_name
      FROM services s
      LEFT JOIN service_categories sc ON s.category_id = sc.id
      WHERE s.user_id = ? AND s.status = 'Active'${availability}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?`,
      [providerId, parseInt(limit), offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM services s WHERE s.user_id = ? AND s.status = ?${availability}`,
      [providerId, 'Active']
    );

    res.json({
      success: true,
      data: {
        services,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get provider services error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;