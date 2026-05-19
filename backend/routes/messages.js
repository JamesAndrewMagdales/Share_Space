import express from 'express';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get user's conversations
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [conversations] = await pool.execute(`
      SELECT 
        c.id,
        c.service_request_id,
        c.participant1_id,
        c.participant2_id,
        c.last_message,
        c.last_message_at,
        c.created_at,
        c.updated_at,
        u1.first_name as participant1_name,
        u1.profile_image as participant1_image,
        u2.first_name as participant2_name,
        u2.profile_image as participant2_image
      FROM conversations c
      JOIN users u1 ON c.participant1_id = u1.id
      JOIN users u2 ON c.participant2_id = u2.id
      WHERE c.participant1_id = ? OR c.participant2_id = ?
      ORDER BY c.last_message_at DESC NULLS LAST, c.updated_at DESC
    `, [userId, userId]);

    res.json({ success: true, data: conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get messages for a conversation
router.get('/conversation/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Verify user is participant
    const [conversation] = await pool.execute(
      'SELECT * FROM conversations WHERE id = ? AND (participant1_id = ? OR participant2_id = ?)',
      [conversationId, userId, userId]
    );

    if (conversation.length === 0) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [messages] = await pool.execute(`
      SELECT 
        m.id,
        m.conversation_id,
        m.sender_id,
        m.message,
        m.is_read,
        m.created_at,
        u.first_name,
        u.last_name,
        u.profile_image
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC
    `, [conversationId]);

    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Send a message
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { conversationId, message } = req.body;
    const senderId = req.user.id;

    if (!conversationId || !message) {
      return res.status(400).json({ success: false, message: 'Conversation ID and message required' });
    }

    // Verify user is participant
    const [conversation] = await pool.execute(
      'SELECT * FROM conversations WHERE id = ? AND (participant1_id = ? OR participant2_id = ?)',
      [conversationId, senderId, senderId]
    );

    if (conversation.length === 0) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Insert message
    const [result] = await pool.execute(
      'INSERT INTO messages (conversation_id, sender_id, message) VALUES (?, ?, ?)',
      [conversationId, senderId, message]
    );

    // Update conversation last message
    await pool.execute(
      'UPDATE conversations SET last_message = ?, last_message_at = NOW() WHERE id = ?',
      [message, conversationId]
    );

    // Fetch the inserted message with sender info
    const [messages] = await pool.execute(`
      SELECT 
        m.id,
        m.conversation_id,
        m.sender_id,
        m.message,
        m.is_read,
        m.created_at,
        u.first_name,
        u.last_name,
        u.profile_image
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `, [result.insertId]);

    res.status(201).json({ success: true, data: messages[0] });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create or get conversation
router.post('/conversation', authenticateToken, async (req, res) => {
  try {
    const { serviceRequestId, otherUserId } = req.body;
    const userId = req.user.id;

    let conversationId;

    // If serviceRequestId provided, get the other participant
    if (serviceRequestId) {
      const [request] = await pool.execute(
        'SELECT requester_id, provider_id FROM service_requests WHERE id = ?',
        [serviceRequestId]
      );

      if (request.length === 0) {
        return res.status(404).json({ success: false, message: 'Service request not found' });
      }

      const otherId = request[0].requester_id === userId ? request[0].provider_id : request[0].requester_id;
      conversationId = await getOrCreateConversation(userId, otherId, serviceRequestId);
    } else if (otherUserId) {
      conversationId = await getOrCreateConversation(userId, otherUserId, null);
    } else {
      return res.status(400).json({ success: false, message: 'serviceRequestId or otherUserId required' });
    }

    res.json({ success: true, data: { conversation_id: conversationId } });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Helper function to get or create conversation
const getOrCreateConversation = async (userId1, userId2, serviceRequestId) => {
  // Check existing
  const [existing] = await pool.execute(`
    SELECT id FROM conversations 
    WHERE ((participant1_id = ? AND participant2_id = ?) OR (participant1_id = ? AND participant2_id = ?))
    ${serviceRequestId ? 'AND service_request_id = ?' : ''}
  `, serviceRequestId ? [userId1, userId2, userId2, userId1, serviceRequestId] : [userId1, userId2, userId2, userId1]);

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Create new
  const [result] = await pool.execute(
    'INSERT INTO conversations (participant1_id, participant2_id, service_request_id) VALUES (?, ?, ?)',
    [userId1, userId2, serviceRequestId || null]
  );

  return result.insertId;
};

// Mark messages as read
router.patch('/read/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    await pool.execute(
      'UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND sender_id != ?',
      [conversationId, userId]
    );

    res.json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get unread count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [conversations] = await pool.execute(`
      SELECT COUNT(DISTINCT c.id) as unread_conversations
      FROM conversations c
      JOIN messages m ON c.id = m.conversation_id
      WHERE (c.participant1_id = ? OR c.participant2_id = ?)
        AND m.sender_id != ?
        AND m.is_read = FALSE
    `, [userId, userId, userId]);

    res.json({ success: true, data: { unread_count: conversations[0].unread_conversations } });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
