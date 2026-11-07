import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Estimated cost of a booking from the space's rate and how long the driver parks
const estimatePrice = (price, priceType, minutes) => {
  const rate = parseFloat(price) || 0;
  const hours = minutes / 60;
  switch (priceType) {
    case 'Free': return 0;
    case 'Hourly': return Math.round(rate * Math.max(hours, 1) * 100) / 100;
    case 'Daily': return rate * Math.max(Math.ceil(hours / 24), 1);
    case 'Monthly': return rate * Math.max(Math.ceil(hours / (24 * 30)), 1);
    default: return rate;
  }
};

// Request to book a parking space (driver -> host)
router.post('/', [
  authenticateToken,
  body('service_id').isInt({ min: 1 }),
  body('message').optional().trim(),
  body('preferred_date').isDate().withMessage('Choose a parking date'),
  body('preferred_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Choose an arrival time'),
  // 30 minutes up to 30 days
  body('duration_minutes').optional().isInt({ min: 30, max: 43200 }),
  body('vehicle_plate').trim().notEmpty().isLength({ max: 20 }).withMessage('Enter your plate number'),
  body('vehicle_type').optional().trim().isLength({ max: 20 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg === 'Invalid value' ? 'Validation failed' : errors.array()[0].msg,
        errors: errors.array()
      });
    }

    const {
      service_id, message, preferred_date, preferred_time,
      duration_minutes, vehicle_plate, vehicle_type
    } = req.body;
    const requester_id = req.user.id;
    const minutes = parseInt(duration_minutes) || 60;

    // Find the parking space and its host
    const services = await query(
      'SELECT user_id, price, price_type, title FROM services WHERE id = ? AND status = ? AND is_available = 1',
      [service_id, 'Active']
    );

    if (services.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Parking space not found or no longer available'
      });
    }

    const service = services[0];
    const provider_id = service.user_id;

    if (requester_id === provider_id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot book your own parking space'
      });
    }

    const agreedPrice = estimatePrice(service.price, service.price_type, minutes);

    const result = await query(
      `INSERT INTO service_requests (service_id, requester_id, provider_id, message,
              vehicle_plate, vehicle_type, preferred_date, preferred_time, duration_minutes, agreed_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [service_id, requester_id, provider_id, message || null,
       vehicle_plate.toUpperCase(), vehicle_type || null, preferred_date, preferred_time,
       minutes, agreedPrice]
    );

    const request_id = result.insertId;
    const summary = message || `Booking request for ${service.title}`;

    // One conversation per pair of users: reuse it if they have talked before
    await query(
      `INSERT INTO conversations (service_request_id, participant1_id, participant2_id, last_message, last_message_at)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE service_request_id = VALUES(service_request_id),
              last_message = VALUES(last_message), last_message_at = NOW()`,
      [request_id, requester_id, provider_id, summary]
    );

    await query(
      `INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [provider_id, 'request', 'New Booking Request',
       `${req.user.first_name} wants to park at ${service.title} on ${preferred_date}`, request_id, 'service_request']
    );

    res.status(201).json({
      success: true,
      message: 'Booking request sent to the host',
      data: {
        id: request_id,
        service_id,
        provider_id,
        agreed_price: agreedPrice,
        status: 'Pending'
      }
    });

  } catch (error) {
    console.error('Create booking request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Bookings I made as a driver
router.get('/my-requests', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    let whereClause = 'WHERE sr.requester_id = ?';
    let values = [userId];

    if (status) {
      whereClause += ' AND sr.status = ?';
      values.push(status);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const requests = await query(
      `SELECT
        sr.id, sr.status, sr.message, sr.preferred_date, sr.preferred_time,
        sr.duration_minutes, sr.vehicle_plate, sr.vehicle_type,
        sr.agreed_price, sr.created_at, sr.updated_at, sr.completed_at,
        s.id as service_id, s.title as service_title, s.location as service_location,
        s.city as service_city, s.price_type,
        u.id as provider_id,
        CONCAT(u.first_name, ' ', u.last_name) as provider_name,
        u.profile_image, u.rating_avg as provider_rating, u.is_verified as provider_verified
      FROM service_requests sr
      JOIN services s ON sr.service_id = s.id
      JOIN users u ON sr.provider_id = u.id
      ${whereClause}
      ORDER BY sr.created_at DESC
      LIMIT ? OFFSET ?`,
      [...values, parseInt(limit), offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM service_requests ${whereClause}`,
      values
    );

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Booking requests received for my spaces (as host)
router.get('/received', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    let whereClause = 'WHERE sr.provider_id = ?';
    let values = [userId];

    if (status) {
      whereClause += ' AND sr.status = ?';
      values.push(status);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const requests = await query(
      `SELECT
        sr.id, sr.status, sr.message, sr.preferred_date, sr.preferred_time,
        sr.duration_minutes, sr.vehicle_plate, sr.vehicle_type,
        sr.agreed_price, sr.created_at, sr.updated_at, sr.completed_at,
        s.id as service_id, s.title as service_title, s.location as service_location,
        s.city as service_city, s.price_type,
        u.id as requester_id,
        CONCAT(u.first_name, ' ', u.last_name) as requester_name,
        u.profile_image, u.rating_avg as requester_rating, u.is_verified as requester_verified
      FROM service_requests sr
      JOIN services s ON sr.service_id = s.id
      JOIN users u ON sr.requester_id = u.id
      ${whereClause}
      ORDER BY sr.created_at DESC
      LIMIT ? OFFSET ?`,
      [...values, parseInt(limit), offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM service_requests ${whereClause}`,
      values
    );

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get received requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Accept a service request
router.put('/:id/accept', [
  authenticateToken,
  body('agreed_price').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const { id } = req.params;
    const { agreed_price } = req.body;
    const userId = req.user.id;

    // Check ownership and get request
    const requests = await query(
      'SELECT * FROM service_requests WHERE id = ? AND provider_id = ? AND status = ?',
      [id, userId, 'Pending']
    );

    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Request not found or already processed'
      });
    }

    const updateValues = agreed_price !== undefined ? [agreed_price, id] : [id];
    const priceClause = agreed_price !== undefined ? 'agreed_price = ?, ' : '';

    await query(
      `UPDATE service_requests SET ${priceClause}status = 'Accepted', updated_at = NOW() WHERE id = ?`,
      updateValues
    );

    // Create notification
    await query(
      `INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
       SELECT requester_id, 'request', 'Request Accepted',
              'Your parking booking has been approved', ?, 'service_request'
       FROM service_requests WHERE id = ?`,
      [id, id]
    );

    res.json({
      success: true,
      message: 'Request accepted successfully'
    });

  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reject a service request
router.put('/:id/reject', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check ownership
    const requests = await query(
      'SELECT * FROM service_requests WHERE id = ? AND provider_id = ? AND status = ?',
      [id, userId, 'Pending']
    );

    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Request not found or already processed'
      });
    }

    await query(
      "UPDATE service_requests SET status = 'Rejected', updated_at = NOW() WHERE id = ?",
      [id]
    );

    // Create notification
    await query(
      `INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
       SELECT requester_id, 'request', 'Request Declined',
              'Your parking booking was declined', ?, 'service_request'
       FROM service_requests WHERE id = ?`,
      [id, id]
    );

    res.json({
      success: true,
      message: 'Request rejected'
    });

  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Mark request as completed
router.put('/:id/complete', [
  authenticateToken,
  body('completion_notes').optional().trim()
], async (req, res) => {
  try {
    const { id } = req.params;
    const { completion_notes } = req.body;
    const userId = req.user.id;

    // Either requester or provider can mark as complete
    const requests = await query(
      `SELECT * FROM service_requests
       WHERE id = ? AND status = 'Accepted'
       AND (requester_id = ? OR provider_id = ?)`,
      [id, userId, userId]
    );

    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Request not found or not in accepted status'
      });
    }

    await query(
      `UPDATE service_requests
       SET status = 'Completed', completion_notes = ?, completed_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [completion_notes, id]
    );

    // Create notification for both parties
    const request = requests[0];
    const otherUserId = request.requester_id === userId ? request.provider_id : request.requester_id;

    await query(
      `INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [otherUserId, 'request', 'Parking Completed',
       'Your parking session is complete. Please leave a review.', id, 'service_request']
    );

    res.json({
      success: true,
      message: 'Booking marked as completed'
    });

  } catch (error) {
    console.error('Complete request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Cancel a request
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user is part of the request
    const requests = await query(
      `SELECT * FROM service_requests
       WHERE id = ? AND status IN ('Pending', 'Accepted')
       AND (requester_id = ? OR provider_id = ?)`,
      [id, userId, userId]
    );

    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Request not found or cannot be cancelled'
      });
    }

    await query(
      "UPDATE service_requests SET status = 'Cancelled', updated_at = NOW() WHERE id = ?",
      [id]
    );

    // Create notification
    const request = requests[0];
    const otherUserId = request.requester_id === userId ? request.provider_id : request.requester_id;

    await query(
      `INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [otherUserId, 'request', 'Request Cancelled',
       'The parking booking has been cancelled', id, 'service_request']
    );

    res.json({
      success: true,
      message: 'Request cancelled'
    });

  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get a single request by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const requests = await query(
      `SELECT
        sr.*,
        s.id as service_id, s.title as service_title, s.description as service_description,
        s.price as service_price, s.price_type,
        provider.id as provider_id,
        CONCAT(provider.first_name, ' ', provider.last_name) as provider_name,
        provider.profile_image as provider_image,
        provider.rating_avg as provider_rating,
        provider.is_verified as provider_verified,
        requester.id as requester_id,
        CONCAT(requester.first_name, ' ', requester.last_name) as requester_name,
        requester.profile_image as requester_image,
        requester.rating_avg as requester_rating,
        requester.is_verified as requester_verified
      FROM service_requests sr
      JOIN services s ON sr.service_id = s.id
      JOIN users provider ON sr.provider_id = provider.id
      JOIN users requester ON sr.requester_id = requester.id
      WHERE sr.id = ? AND (sr.requester_id = ? OR sr.provider_id = ?)`,
      [id, userId, userId]
    );

    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    res.json({
      success: true,
      data: requests[0]
    });

  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;