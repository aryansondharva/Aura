import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../utils/supabase.js';
import { syncUserFromAuth } from '../utils/userSync.js';

const router = express.Router();

/**
 * Validate conversation data for creation
 * @param {Object} data - Conversation data
 * @returns {{ valid: boolean, error?: string }} Validation result
 */
export function validateConversationCreate(data) {
  if (!data) {
    return { valid: false, error: 'Data is required' };
  }
  if (!data.user_id) {
    return { valid: false, error: 'User ID is required' };
  }
  return { valid: true };
}

/**
 * Validate conversation data for update
 * @param {Object} data - Update data
 * @returns {{ valid: boolean, error?: string }} Validation result
 */
export function validateConversationUpdate(data) {
  if (!data) {
    return { valid: false, error: 'Data is required' };
  }
  if (!data.title || !data.title.trim()) {
    return { valid: false, error: 'Title is required' };
  }
  return { valid: true };
}

/**
 * Create a conversation object with generated fields
 * @param {string} userId - User ID
 * @param {string} [title] - Optional title
 * @returns {Object} Conversation object ready for insertion
 */
export function createConversationObject(userId, title = 'New Conversation') {
  const conversationId = uuidv4();
  const now = new Date().toISOString();
  
  return {
    conversation_id: conversationId,
    user_id: userId,
    title: title,
    created_at: now,
    updated_at: now
  };
}

/**
 * Create an update object for conversation title change
 * @param {string} title - New title
 * @returns {Object} Update object
 */
export function createConversationUpdateObject(title) {
  return {
    title: title.trim(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Verify CRUD consistency: after create, conversation should be retrievable
 * @param {Object} created - Created conversation
 * @param {Object} retrieved - Retrieved conversation
 * @returns {boolean} True if consistent
 */
export function verifyCrudCreateConsistency(created, retrieved) {
  if (!created || !retrieved) return false;
  return (
    created.conversation_id === retrieved.conversation_id &&
    created.user_id === retrieved.user_id &&
    created.title === retrieved.title
  );
}

/**
 * Verify CRUD consistency: after update, title should be changed
 * @param {Object} original - Original conversation
 * @param {Object} updated - Updated conversation
 * @param {string} newTitle - Expected new title
 * @returns {boolean} True if consistent
 */
export function verifyCrudUpdateConsistency(original, updated, newTitle) {
  if (!original || !updated) return false;
  return (
    original.conversation_id === updated.conversation_id &&
    updated.title === newTitle.trim() &&
    new Date(updated.updated_at) >= new Date(original.updated_at)
  );
}

/**
 * Verify CRUD consistency: after delete, conversation should not exist
 * @param {Object|null} conversation - Retrieved conversation (should be null)
 * @param {Array} chatLogs - Retrieved chat logs (should be empty)
 * @returns {boolean} True if consistent (both are empty/null)
 */
export function verifyCrudDeleteConsistency(conversation, chatLogs) {
  return conversation === null && (!chatLogs || chatLogs.length === 0);
}

/**
 * GET /api/conversations - List user conversations
 * Returns all conversations for a user
 * Requirements: 10.1
 */
router.get('/conversations', async (req, res) => {
  try {
    const { user_id } = req.query;

    // Validate required fields
    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Fetch all conversations for the user
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('conversation_id, user_id, title, created_at, updated_at')
      .eq('user_id', user_id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      throw new Error('Failed to fetch conversations');
    }

    // Return array directly (frontend expects array, not object)
    res.json(conversations || []);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: error.message || 'Failed to get conversations' });
  }
});

/**
 * POST /api/conversations - Create conversation
 * Creates a new conversation for a user
 * Requirements: 10.2
 */
router.post('/conversations', async (req, res) => {
  try {
    const { user_id, title } = req.body;

    // Validate required fields
    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Ensure user exists in database
    await syncUserFromAuth(user_id);

    const conversationId = uuidv4();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        conversation_id: conversationId,
        user_id: user_id,
        title: title || 'New Conversation',
        created_at: now,
        updated_at: now
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      throw new Error('Failed to create conversation');
    }

    // Return conversation object directly (frontend expects { conversation_id, ... })
    res.status(201).json(data);
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: error.message || 'Failed to create conversation' });
  }
});


/**
 * PUT /api/conversations/:id - Rename conversation
 * Updates the title of a conversation
 * Requirements: 10.3
 */
router.put('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    // Validate required fields
    if (!id) {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Check if conversation exists
    const { data: existing, error: fetchError } = await supabase
      .from('conversations')
      .select('conversation_id')
      .eq('conversation_id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Update the conversation title
    const { data, error } = await supabase
      .from('conversations')
      .update({
        title: title.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('conversation_id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating conversation:', error);
      throw new Error('Failed to update conversation');
    }

    res.json({
      success: true,
      conversation: data
    });
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({ error: error.message || 'Failed to update conversation' });
  }
});

/**
 * DELETE /api/conversations/:id - Delete conversation
 * Deletes a conversation and all associated chat logs
 * Requirements: 10.4
 */
router.delete('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate required fields
    if (!id) {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }

    // Check if conversation exists
    const { data: existing, error: fetchError } = await supabase
      .from('conversations')
      .select('conversation_id')
      .eq('conversation_id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Delete associated chat logs first
    const { error: logsError } = await supabase
      .from('chat_logs')
      .delete()
      .eq('conversation_id', id);

    if (logsError) {
      console.error('Error deleting chat logs:', logsError);
      // Continue with conversation deletion even if logs deletion fails
    }

    // Delete the conversation
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('conversation_id', id);

    if (error) {
      console.error('Error deleting conversation:', error);
      throw new Error('Failed to delete conversation');
    }

    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete conversation' });
  }
});

/**
 * GET /api/conversations/:id/logs - Get chat logs
 * Returns all chat messages for a conversation
 * Requirements: 10.5
 */
router.get('/conversations/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate required fields
    if (!id) {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }

    // Check if conversation exists
    const { data: existing, error: fetchError } = await supabase
      .from('conversations')
      .select('conversation_id, title')
      .eq('conversation_id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Fetch all chat logs for the conversation
    const { data: logs, error } = await supabase
      .from('chat_logs')
      .select('id, user_id, conversation_id, user_message, response_message, created_at, message_id')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching chat logs:', error);
      throw new Error('Failed to fetch chat logs');
    }

    // Return logs array directly (frontend expects array)
    res.json(logs || []);
  } catch (error) {
    console.error('Get chat logs error:', error);
    res.status(500).json({ error: error.message || 'Failed to get chat logs' });
  }
});

export default router;
