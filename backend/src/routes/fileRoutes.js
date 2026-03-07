import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import upload from '../middleware/upload.js';
import pdfProcessor from '../services/pdfProcessor.js';
import supabase from '../utils/supabase.js';

const router = express.Router();

/**
 * Allowed file extensions for validation
 * Requirements: 5.6
 */
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt'];

/**
 * Validate file extension
 * @param {string} filename - Original filename
 * @returns {boolean} True if valid extension
 */
export function isValidFileType(filename) {
  if (!filename) return false;
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * POST /upload - Upload PDF for chat
 * Extracts text, chunks, generates embeddings, stores in Supabase and Pinecone
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { user_id } = req.body;

    // Validate user_id
    if (!user_id) {
      // Cleanup uploaded file
      await pdfProcessor.cleanup(req.file.path);
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Validate file type (additional check beyond middleware)
    if (!isValidFileType(req.file.originalname)) {
      await pdfProcessor.cleanup(req.file.path);
      return res.status(400).json({ 
        error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}` 
      });
    }

    // Process PDF for chat
    const result = await pdfProcessor.processForChat(req.file.path, user_id);

    // Check for duplicate file
    if (result.duplicate) {
      return res.status(409).json({ message: result.message });
    }

    res.json({
      success: true,
      message: 'File uploaded and processed successfully',
      chunkCount: result.chunkCount,
      fileName: result.fileName,
      fileUuid: result.fileUuid
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Cleanup file on error if it exists
    if (req.file?.path) {
      await pdfProcessor.cleanup(req.file.path);
    }

    res.status(500).json({ error: error.message || 'Failed to process uploaded file' });
  }
});


/**
 * POST /quiz-question - Upload PDF for quiz topics
 * Extracts text, clusters content, generates topics
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
router.post('/quiz-question', upload.single('file'), async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { user_id } = req.body;

    // Validate user_id
    if (!user_id) {
      await pdfProcessor.cleanup(req.file.path);
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Validate file type
    if (!isValidFileType(req.file.originalname)) {
      await pdfProcessor.cleanup(req.file.path);
      return res.status(400).json({ 
        error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}` 
      });
    }

    // Generate document for quiz ID
    const documentForQuizId = uuidv4();

    // Check for duplicate file by hash
    const fs = await import('fs/promises');
    const crypto = await import('crypto');
    const fileBuffer = await fs.readFile(req.file.path);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Check if topics already exist for this file hash and user
    const { data: existingTopics, error: checkError } = await supabase
      .from('topics')
      .select('topic_id, title')
      .eq('hash_file', fileHash)
      .eq('user_id', user_id)
      .limit(1);

    if (checkError) {
      console.error('Error checking existing topics:', checkError);
    }

    if (existingTopics && existingTopics.length > 0) {
      await pdfProcessor.cleanup(req.file.path);
      return res.status(409).json({ 
        message: 'You have already uploaded this file earlier.',
        existingTopics: existingTopics
      });
    }

    // Process PDF for quiz topics
    const result = await pdfProcessor.processForQuiz(req.file.path, user_id, documentForQuizId);

    // Check for rate limit warning
    const response = {
      status: 'success',
      success: true,
      message: 'File processed and topics generated successfully',
      documentForQuizId,
      topicCount: result.topics.length,
      topics: result.topics.map(t => ({
        topic_id: t.topic_id,
        title: t.title,
        summary: t.topic_summary
      }))
    };

    if (result.warning) {
      response.status = 'warning';
      response.warning = result.warning;
    }

    res.json(response);
  } catch (error) {
    console.error('Quiz question upload error:', error);
    
    // Cleanup file on error if it exists
    if (req.file?.path) {
      await pdfProcessor.cleanup(req.file.path);
    }

    res.status(500).json({ status: 'error', error: error.message || 'Failed to process file for quiz topics' });
  }
});

export default router;
