import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import upload from '../middleware/upload.js';
import supabase from '../utils/supabase.js';
import bulkPdfProcessor from '../services/bulkPdfProcessor.js';
import readinessService from '../services/readinessService.js';
import readinessEngine from '../services/readinessEngine.js';

const router = express.Router();

// ── CREATE SESSION ──────────────────────────────────────────
/**
 * POST /api/readiness/create-session
 * Create a new exam readiness session
 */
router.post('/readiness/create-session', async (req, res) => {
  try {
    const { user_id, session_name, subject_name, exam_date } = req.body;

    if (!user_id || !session_name) {
      return res.status(400).json({ error: 'User ID and session name are required' });
    }

    const sessionId = uuidv4();

    const { error } = await supabase.from('exam_sessions').insert({
      session_id: sessionId,
      user_id,
      session_name,
      subject_name: subject_name || null,
      exam_date: exam_date || null,
      status: 'processing',
    });

    if (error) throw new Error(`Failed to create session: ${error.message}`);

    res.json({
      success: true,
      session_id: sessionId,
      message: 'Session created. Upload PDFs next.',
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: error.message });
  }
});


// ── UPLOAD PDFs (up to 20) ──────────────────────────────────
/**
 * POST /api/readiness/upload-pdfs
 * Upload up to 20 question paper PDFs to a session
 */
router.post('/readiness/upload-pdfs', upload.array('files', 20), async (req, res) => {
  const uploadedPaths = [];
  try {
    const { session_id, user_id } = req.body;

    if (!session_id || !user_id) {
      if (req.files) {
        await bulkPdfProcessor.cleanup(req.files.map((f) => f.path));
      }
      return res.status(400).json({ error: 'Session ID and User ID are required' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    if (req.files.length > 20) {
      await bulkPdfProcessor.cleanup(req.files.map((f) => f.path));
      return res.status(400).json({ error: 'Maximum 20 PDFs allowed per session' });
    }

    // Track uploaded paths for cleanup
    const fileInfos = req.files.map((f) => {
      uploadedPaths.push(f.path);
      return { path: f.path, originalName: f.originalname };
    });

    // Process all PDFs
    const result = await bulkPdfProcessor.processBatch(fileInfos, session_id, user_id);

    // Cleanup uploaded files from disk
    await bulkPdfProcessor.cleanup(uploadedPaths);

    res.json({
      success: true,
      message: `${result.processed.length} PDFs processed successfully`,
      processed: result.processed,
      failed: result.failed,
      total_uploaded: req.files.length,
      total_processed: result.processed.length,
      total_failed: result.failed.length,
    });
  } catch (error) {
    console.error('Upload PDFs error:', error);
    await bulkPdfProcessor.cleanup(uploadedPaths);
    res.status(500).json({ error: error.message });
  }
});


// ── SET SYLLABUS ────────────────────────────────────────────
/**
 * POST /api/readiness/set-syllabus
 * Add or replace syllabus topics for a session
 * Body: { session_id, user_id, topics: [{name, unit, is_optional}], syllabus_raw }
 */
router.post('/readiness/set-syllabus', async (req, res) => {
  try {
    const { session_id, user_id, topics, syllabus_raw } = req.body;

    if (!session_id || !user_id || !topics || !Array.isArray(topics)) {
      return res.status(400).json({ error: 'Session ID, User ID, and topics array are required' });
    }

    // Delete existing syllabus for this session
    await supabase.from('syllabus_topics').delete().eq('session_id', session_id);

    // Insert new topics
    const rows = topics.map((t, idx) => ({
      syllabus_id: uuidv4(),
      session_id,
      user_id,
      topic_name: t.name || t.topic_name,
      unit_number: t.unit || t.unit_number || idx + 1,
      is_optional: t.is_optional || false,
      is_selected: t.is_selected !== undefined ? t.is_selected : true,
      weight: t.weight || 1.0,
    }));

    const { error } = await supabase.from('syllabus_topics').insert(rows);
    if (error) throw new Error(`Failed to save syllabus: ${error.message}`);

    // Save raw syllabus text on session
    if (syllabus_raw) {
      await supabase
        .from('exam_sessions')
        .update({ syllabus_raw, updated_at: new Date().toISOString() })
        .eq('session_id', session_id);
    }

    res.json({
      success: true,
      message: `${rows.length} syllabus topics saved`,
      topics: rows.map((r) => ({
        syllabus_id: r.syllabus_id,
        topic_name: r.topic_name,
        is_optional: r.is_optional,
        unit_number: r.unit_number,
      })),
    });
  } catch (error) {
    console.error('Set syllabus error:', error);
    res.status(500).json({ error: error.message });
  }
});


// ── AI-EXTRACT SYLLABUS FROM PDF TEXT ───────────────────────
/**
 * POST /api/readiness/extract-syllabus
 * AI auto-generates syllabus topics from uploaded papers
 */
router.post('/readiness/extract-syllabus', async (req, res) => {
  try {
    const { session_id, user_id } = req.body;

    if (!session_id || !user_id) {
      return res.status(400).json({ error: 'Session ID and User ID are required' });
    }

    // Get combined text from all PDFs
    const { combinedText } = await bulkPdfProcessor.getSessionTexts(session_id);

    if (!combinedText || combinedText.trim().length < 100) {
      return res.status(400).json({ error: 'Not enough content to extract syllabus' });
    }

    const { default: llmService } = await import('../services/llmService.js');

    const prompt = `Analyze these exam question papers and identify ALL major topics/units covered in the syllabus.

For each topic, determine:
1. Topic name
2. Unit number (if identifiable)
3. Whether it could be optional (true/false)

Return ONLY a valid JSON array. No other text.
Format:
[
  {"name": "Topic Name", "unit": 1, "is_optional": false},
  {"name": "Optional Topic", "unit": 5, "is_optional": true}
]

QUESTION PAPERS:
${combinedText.substring(0, 10000)}`;

    const response = await llmService.generate(prompt);

    // Parse response
    let topics = [];
    try {
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const startIdx = cleaned.indexOf('[');
      const endIdx = cleaned.lastIndexOf(']') + 1;
      if (startIdx !== -1 && endIdx > 0) {
        topics = JSON.parse(cleaned.substring(startIdx, endIdx));
      }
    } catch (parseError) {
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    res.json({
      success: true,
      topics,
      message: `AI extracted ${topics.length} syllabus topics`,
    });
  } catch (error) {
    console.error('Extract syllabus error:', error);
    res.status(500).json({ error: error.message });
  }
});


// ── ANALYZE SESSION (AI Pipeline) ───────────────────────────
/**
 * POST /api/readiness/analyze/:session_id
 * Run AI analysis on all uploaded PDFs to extract question patterns
 */
router.post('/readiness/analyze/:session_id', async (req, res) => {
  try {
    const { session_id } = req.params;
    const { user_id } = req.body;

    if (!session_id || !user_id) {
      return res.status(400).json({ error: 'Session ID and User ID are required' });
    }

    // Run analysis (this can take a while)
    const result = await readinessService.analyzeSession(session_id, user_id);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Analyze session error:', error);
    res.status(500).json({ error: error.message });
  }
});


// ── GET SESSION DETAILS ─────────────────────────────────────
/**
 * GET /api/readiness/session/:session_id
 * Get full session details including PDFs, syllabus, patterns
 */
router.get('/readiness/session/:session_id', async (req, res) => {
  try {
    const { session_id } = req.params;

    const { data: session, error } = await supabase
      .from('exam_sessions')
      .select('*')
      .eq('session_id', session_id)
      .single();

    if (error || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get PDFs
    const { data: pdfs } = await supabase
      .from('session_pdfs')
      .select('pdf_id, file_name, page_count, processed, uploaded_at')
      .eq('session_id', session_id)
      .order('uploaded_at', { ascending: true });

    // Get syllabus
    const { data: syllabus } = await supabase
      .from('syllabus_topics')
      .select('*')
      .eq('session_id', session_id)
      .order('unit_number', { ascending: true });

    // Get top patterns
    const { data: patterns } = await supabase
      .from('question_patterns')
      .select('*')
      .eq('session_id', session_id)
      .order('frequency_count', { ascending: false })
      .limit(50);

    res.json({
      session,
      pdfs: pdfs || [],
      syllabus: syllabus || [],
      patterns: patterns || [],
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: error.message });
  }
});


// ── LIST USER SESSIONS ──────────────────────────────────────
/**
 * GET /api/readiness/sessions/:user_id
 * List all exam sessions for a user
 */
router.get('/readiness/sessions/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const { data, error } = await supabase
      .from('exam_sessions')
      .select('session_id, session_name, subject_name, exam_date, total_pdfs, status, readiness_score, created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    res.json(data || []);
  } catch (error) {
    console.error('List sessions error:', error);
    res.status(500).json({ error: error.message });
  }
});


// ── GET QUESTION PATTERNS ───────────────────────────────────
/**
 * GET /api/readiness/patterns/:session_id
 * Get question patterns sorted by frequency (most asked first)
 */
router.get('/readiness/patterns/:session_id', async (req, res) => {
  try {
    const { session_id } = req.params;
    const { limit = 50 } = req.query;

    const { data, error } = await supabase
      .from('question_patterns')
      .select('*')
      .eq('session_id', session_id)
      .order('frequency_count', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw new Error(error.message);

    res.json(data || []);
  } catch (error) {
    console.error('Get patterns error:', error);
    res.status(500).json({ error: error.message });
  }
});


// ── CALCULATE READINESS SCORE ───────────────────────────────
/**
 * GET /api/readiness/score/:session_id
 * Calculate and return the predictive readiness score
 */
router.get('/readiness/score/:session_id', async (req, res) => {
  try {
    const { session_id } = req.params;
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required (query param)' });
    }

    const score = await readinessEngine.calculateReadiness(session_id, user_id);

    res.json({
      success: true,
      ...score,
    });
  } catch (error) {
    console.error('Get readiness score error:', error);
    res.status(500).json({ error: error.message });
  }
});


// ── GET AI ANSWER FOR A QUESTION ────────────────────────────
/**
 * POST /api/readiness/answer/:pattern_id
 * Generate AI answer for a specific question pattern
 */
router.post('/readiness/answer/:pattern_id', async (req, res) => {
  try {
    const { pattern_id } = req.params;
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const answer = await readinessService.generateAnswer(pattern_id, session_id);

    res.json({ success: true, answer });
  } catch (error) {
    console.error('Generate answer error:', error);
    res.status(500).json({ error: error.message });
  }
});


// ── SHARE REPORT ────────────────────────────────────────────
/**
 * POST /api/readiness/share
 * Generate a shareable link for the readiness analysis
 */
router.post('/readiness/share', async (req, res) => {
  try {
    const { session_id, user_id, shared_with_name, include_chat, include_scores, include_patterns } = req.body;

    if (!session_id || !user_id) {
      return res.status(400).json({ error: 'Session ID and User ID are required' });
    }

    // Generate unique share token
    const shareToken = crypto.randomBytes(16).toString('hex');

    // Set expiry (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error } = await supabase.from('shared_reports').insert({
      report_id: uuidv4(),
      session_id,
      user_id,
      share_token: shareToken,
      shared_with_name: shared_with_name || null,
      include_chat: include_chat !== undefined ? include_chat : true,
      include_scores: include_scores !== undefined ? include_scores : true,
      include_patterns: include_patterns !== undefined ? include_patterns : true,
      expires_at: expiresAt.toISOString(),
    });

    if (error) throw new Error(`Failed to create share link: ${error.message}`);

    res.json({
      success: true,
      share_token: shareToken,
      share_url: `/shared/${shareToken}`,
      expires_at: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Share report error:', error);
    res.status(500).json({ error: error.message });
  }
});


// ── GET SHARED REPORT (PUBLIC) ──────────────────────────────
/**
 * GET /api/readiness/shared/:token
 * Public endpoint to view a shared readiness report (no auth required)
 */
router.get('/readiness/shared/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Find the shared report
    const { data: report, error } = await supabase
      .from('shared_reports')
      .select('*')
      .eq('share_token', token)
      .single();

    if (error || !report) {
      return res.status(404).json({ error: 'Shared report not found' });
    }

    // Check expiry
    if (report.expires_at && new Date(report.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This shared link has expired' });
    }

    // Increment view count
    await supabase
      .from('shared_reports')
      .update({ views_count: (report.views_count || 0) + 1 })
      .eq('report_id', report.report_id);

    // Get session details
    const { data: session } = await supabase
      .from('exam_sessions')
      .select('session_name, subject_name, exam_date, readiness_score, total_pdfs')
      .eq('session_id', report.session_id)
      .single();

    // Build response based on permissions
    const responseData = { session };

    if (report.include_scores) {
      const { data: scores } = await supabase
        .from('readiness_scores')
        .select('*')
        .eq('session_id', report.session_id)
        .order('calculated_at', { ascending: false })
        .limit(1);

      responseData.readiness = scores?.[0] || null;
    }

    if (report.include_patterns) {
      const { data: patterns } = await supabase
        .from('question_patterns')
        .select('question_text, question_type, frequency_count, importance_score, difficulty')
        .eq('session_id', report.session_id)
        .order('frequency_count', { ascending: false })
        .limit(20);

      responseData.topQuestions = patterns || [];
    }

    // Get syllabus breakdown
    const { data: syllabus } = await supabase
      .from('syllabus_topics')
      .select('topic_name, is_optional, question_count, mastery_pct, coverage_pct')
      .eq('session_id', report.session_id);

    responseData.syllabus = syllabus || [];
    responseData.shared_by = report.shared_with_name || 'A classmate';

    res.json(responseData);
  } catch (error) {
    console.error('Get shared report error:', error);
    res.status(500).json({ error: error.message });
  }
});


// ── DELETE SESSION ──────────────────────────────────────────
/**
 * DELETE /api/readiness/session/:session_id
 * Delete an exam session and all related data (cascade)
 */
router.delete('/readiness/session/:session_id', async (req, res) => {
  try {
    const { session_id } = req.params;
    const { user_id } = req.body;

    if (!session_id || !user_id) {
      return res.status(400).json({ error: 'Session ID and User ID are required' });
    }

    // Verify ownership
    const { data: session } = await supabase
      .from('exam_sessions')
      .select('user_id')
      .eq('session_id', session_id)
      .single();

    if (!session || session.user_id !== user_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete session (cascades to all related tables)
    const { error } = await supabase
      .from('exam_sessions')
      .delete()
      .eq('session_id', session_id);

    if (error) throw new Error(error.message);

    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
