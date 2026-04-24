import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import javaPracticeService from '../services/javaPracticeService.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JAVA_PDF_DIR = path.resolve(__dirname, '../../../OBJECT ORIENTED PROGRAMMING');

router.get('/java-practice/resources', async (req, res) => {
  try {
    const docs = await javaPracticeService.loadDocuments();
    res.json({
      files: docs.files,
      chunk_count: docs.chunks.length,
    });
  } catch (error) {
    console.error('Java practice resources error:', error);
    res.status(500).json({ error: 'Failed to load Java practice resources' });
  }
});

router.post('/java-practice/ask', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const result = await javaPracticeService.answerQuestion(question);
    res.json(result);
  } catch (error) {
    console.error('Java practice ask error:', error);
    res.status(500).json({ error: 'Failed to answer from Java practice PDFs' });
  }
});

router.get('/java-practice/download/:fileName', async (req, res) => {
  try {
    const decodedFileName = decodeURIComponent(req.params.fileName || '');
    const safeFileName = path.basename(decodedFileName);
    const absolutePath = path.join(JAVA_PDF_DIR, safeFileName);

    if (!safeFileName.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ error: 'Only PDF files are supported' });
    }

    return res.download(absolutePath, safeFileName);
  } catch (error) {
    console.error('Java practice download error:', error);
    return res.status(404).json({ error: 'File not found' });
  }
});

export default router;
