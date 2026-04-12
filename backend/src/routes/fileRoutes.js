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


/**
 * GET /files - List all uploaded files for a user
 * Returns upload history so the user can see past PDFs
 */
router.get('/files', async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const { data, error } = await supabase
      .from('uploaded_files')
      .select('file_id, file_name, file_uuid, upload_type, chunk_count, file_size, uploaded_at, last_used_at')
      .eq('user_id', user_id)
      .order('last_used_at', { ascending: false });

    if (error) {
      console.error('Error fetching uploaded files:', error);
      return res.status(500).json({ error: 'Failed to fetch upload history' });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Failed to fetch upload history' });
  }
});

/**
 * DELETE /files/:fileId - Delete an uploaded file record
 * Removes the file from uploaded_files and all its document chunks
 */
router.delete('/files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { user_id } = req.body;

    if (!fileId || !user_id) {
      return res.status(400).json({ error: 'File ID and User ID are required' });
    }

    // Verify ownership
    const { data: fileRecord, error: fetchErr } = await supabase
      .from('uploaded_files')
      .select('file_uuid, user_id')
      .eq('file_id', fileId)
      .single();

    if (fetchErr || !fileRecord) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (fileRecord.user_id !== user_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete document chunks from Supabase
    await supabase.from('documents').delete().eq('file_uuid', fileRecord.file_uuid);

    // Delete conversation links
    await supabase.from('conversation_files').delete().eq('file_id', fileId);

    // Delete the file record
    const { error: deleteErr } = await supabase
      .from('uploaded_files')
      .delete()
      .eq('file_id', fileId);

    if (deleteErr) {
      return res.status(500).json({ error: 'Failed to delete file record' });
    }

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

/**
 * POST /conversations/:id/files - Link a file to a conversation
 * Call this after upload so the conversation knows which PDF it's using.
 * This enables resuming the same document context later.
 */
router.post('/conversations/:id/files', async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const { file_id } = req.body;

    if (!conversationId || !file_id) {
      return res.status(400).json({ error: 'Conversation ID and File ID are required' });
    }

    // Link the file to the conversation (ignore duplicates)
    const { error } = await supabase
      .from('conversation_files')
      .upsert({ conversation_id: conversationId, file_id }, { onConflict: 'conversation_id,file_id' });

    if (error) {
      console.error('Error linking file to conversation:', error);
      return res.status(500).json({ error: 'Failed to link file to conversation' });
    }

    // Update last_used_at on the file
    await supabase
      .from('uploaded_files')
      .update({ last_used_at: new Date().toISOString() })
      .eq('file_id', file_id);

    // Update document_count on conversation
    const { count } = await supabase
      .from('conversation_files')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    await supabase
      .from('conversations')
      .update({ document_count: count || 0 })
      .eq('conversation_id', conversationId);

    res.json({ success: true, message: 'File linked to conversation' });
  } catch (error) {
    console.error('Link file error:', error);
    res.status(500).json({ error: 'Failed to link file' });
  }
});

/**
 * GET /conversations/:id/files - Get files linked to a conversation
 * Used when resuming a chat to know which documents were in context
 */
router.get('/conversations/:id/files', async (req, res) => {
  try {
    const { id: conversationId } = req.params;

    if (!conversationId) {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }

    const { data, error } = await supabase
      .from('conversation_files')
      .select(`
        linked_at,
        uploaded_files (
          file_id, file_name, file_uuid, chunk_count, upload_type, uploaded_at
        )
      `)
      .eq('conversation_id', conversationId)
      .order('linked_at', { ascending: true });

    if (error) {
      console.error('Error fetching conversation files:', error);
      return res.status(500).json({ error: 'Failed to fetch conversation files' });
    }

    res.json(data?.map(d => d.uploaded_files) || []);
  } catch (error) {
    console.error('Get conversation files error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation files' });
  }
});

export default router;

