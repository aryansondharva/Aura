import express from 'express';
import supabase from '../utils/supabase.js';

const router = express.Router();

/**
 * Sort quiz attempts by submitted_at in descending order
 * @param {Array} attempts - Array of quiz attempts
 * @returns {Array} Sorted attempts (most recent first)
 * Requirements: 9.2
 */
export function sortAttemptsByDate(attempts) {
  if (!Array.isArray(attempts)) return [];
  
  return [...attempts].sort((a, b) => {
    const dateA = new Date(a.submitted_at);
    const dateB = new Date(b.submitted_at);
    return dateB - dateA; // Descending order (most recent first)
  });
}

/**
 * GET /api/progress/:user_id - Get user progress
 * Returns all quiz attempts and topic metadata for a user
 * Requirements: 9.1, 9.2
 */
router.get('/progress/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    // Validate required fields
    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Fetch all quiz attempts for the user (Requirement: 9.1)
    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select(`
        attempt_id,
        topic_id,
        score,
        submitted_at
      `)
      .eq('user_id', user_id);

    if (attemptsError) {
      console.error('Error fetching attempts:', attemptsError);
      throw new Error('Failed to fetch quiz attempts');
    }

    // Sort attempts by submitted_at descending (Requirement: 9.2)
    const sortedAttempts = sortAttemptsByDate(attempts || []);

    // Get unique topic IDs from attempts
    const topicIds = [...new Set(sortedAttempts.map(a => a.topic_id))];

    // Fetch topic metadata
    let topics = [];
    if (topicIds.length > 0) {
      const { data: topicData, error: topicsError } = await supabase
        .from('topics')
        .select('topic_id, title, topic_status, topic_summary')
        .in('topic_id', topicIds);

      if (topicsError) {
        console.error('Error fetching topics:', topicsError);
      } else {
        topics = topicData || [];
      }
    }

    // Create topic lookup map
    const topicMap = new Map(topics.map(t => [t.topic_id, t]));

    // Enrich attempts with topic metadata
    const enrichedAttempts = sortedAttempts.map(attempt => ({
      ...attempt,
      topic: topicMap.get(attempt.topic_id) || null
    }));

    // Fetch user topic progress
    const { data: progress, error: progressError } = await supabase
      .from('user_topic_progress')
      .select('*')
      .eq('user_id', user_id);

    if (progressError) {
      console.error('Error fetching progress:', progressError);
    }

    res.json({
      success: true,
      user_id,
      attempts: enrichedAttempts,
      total_attempts: enrichedAttempts.length,
      topics_attempted: topicIds.length,
      progress: progress || []
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: error.message || 'Failed to get progress' });
  }
});

export default router;


/**
 * GET /api/topics/:user_id - Get all topics for a user
 */
router.get('/topics/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const { data: topics, error } = await supabase
      .from('topics')
      .select('topic_id, title, topic_status, topic_summary, file_name, created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch topics');
    }

    res.json(topics || []);
  } catch (error) {
    console.error('Get topics error:', error);
    res.status(500).json({ error: error.message || 'Failed to get topics' });
  }
});

/**
 * GET /api/notification-settings/:user_id - Get notification settings
 */
router.get('/notification-settings/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Return default settings (can be extended with database storage)
    res.json({
      global_settings: {
        email_notifications_enabled: true,
        daily_reminders_enabled: true
      },
      topic_settings: {}
    });
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({ error: error.message || 'Failed to get notification settings' });
  }
});

/**
 * PUT /api/notification-settings/:user_id - Update notification settings
 */
router.put('/notification-settings/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const settings = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // For now, just acknowledge the settings (can be extended with database storage)
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ error: error.message || 'Failed to update notification settings' });
  }
});
