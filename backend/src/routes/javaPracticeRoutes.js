import express from 'express';
import javaPracticeService from '../services/javaPracticeService.js';

const router = express.Router();

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

export default router;
