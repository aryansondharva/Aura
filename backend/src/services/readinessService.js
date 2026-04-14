import { v4 as uuidv4 } from 'uuid';
import supabase from '../utils/supabase.js';
import llmService from './llmService.js';
import bulkPdfProcessor from './bulkPdfProcessor.js';

/**
 * Readiness Service — AI Analysis Engine
 * Analyzes question papers to extract patterns, frequency data,
 * and maps questions to syllabus topics.
 */
class ReadinessService {

  /**
   * Analyze all PDFs in a session to extract question patterns.
   * This is the main AI pipeline:
   * 1. Get all PDF texts from the session
   * 2. Extract individual questions from each paper
   * 3. Find common/repeated questions across papers
   * 4. Score importance based on frequency
   * 5. Map to syllabus topics if available
   *
   * @param {string} sessionId - Exam session UUID 
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeSession(sessionId, userId) {
    try {
      // 1. Get all PDF texts
      const { texts } = await bulkPdfProcessor.getSessionTexts(sessionId);

      if (!texts || texts.length === 0) {
        throw new Error('No processed PDFs found in this session');
      }

      // 2. Extract questions from each PDF using AI
      const allExtractedQuestions = [];

      for (const pdf of texts) {
        const questions = await this.extractQuestionsFromText(pdf.text, pdf.fileName);
        allExtractedQuestions.push({
          pdfId: pdf.pdfId,
          fileName: pdf.fileName,
          questions,
        });
      }

      // 3. Find patterns & frequency across all papers
      const patterns = await this.findQuestionPatterns(allExtractedQuestions, sessionId);

      // 4. Get syllabus topics and map questions
      const { data: syllabusTopics } = await supabase
        .from('syllabus_topics')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_selected', true);

      if (syllabusTopics && syllabusTopics.length > 0) {
        await this.mapPatternsToSyllabus(patterns, syllabusTopics, sessionId);
      }

      // 5. Store patterns in database
      await this.storePatterns(patterns, sessionId);

      // 6. Update session status
      await supabase
        .from('exam_sessions')
        .update({ status: 'ready', updated_at: new Date().toISOString() })
        .eq('session_id', sessionId);

      return {
        success: true,
        totalPdfs: texts.length,
        totalPatterns: patterns.length,
        topQuestions: patterns.slice(0, 10),
      };
    } catch (error) {
      console.error('Readiness analysis error:', error);
      throw error;
    }
  }

  /**
   * Extract individual questions from a question paper's text using AI
   * @param {string} text - Raw text from a question paper PDF
   * @param {string} fileName - Name of the source PDF
   * @returns {Promise<Array>} Array of extracted question objects
   */
  async extractQuestionsFromText(text, fileName) {
    // Truncate if too long (AI context window limit)
    const truncatedText = text.substring(0, 12000);

    const prompt = `You are an expert at analyzing university/college exam question papers.

Analyze this question paper and extract ALL individual questions from it.

For each question, determine:
1. The full question text
2. Type: "mcq", "theory", "numerical", "short_answer", or "long_answer"
3. Difficulty: "easy", "medium", or "hard"
4. Marks if mentioned (null if not)
5. Topic/subject area it belongs to

Return ONLY a valid JSON array. No other text.

Format:
[
  {
    "question": "Full question text here",
    "type": "theory",
    "difficulty": "medium",
    "marks": 5,
    "topic": "Differential Equations"
  }
]

QUESTION PAPER TEXT:
${truncatedText}`;

    try {
      const response = await llmService.generate(prompt);
      return this.parseJsonArray(response);
    } catch (error) {
      console.error(`Failed to extract questions from ${fileName}:`, error.message);
      return [];
    }
  }

  /**
   * Find question patterns and frequency across multiple papers
   * @param {Array} allPaperQuestions - Array of {pdfId, fileName, questions}
   * @param {string} sessionId
   * @returns {Array} Deduplicated patterns with frequency data
   */
  async findQuestionPatterns(allPaperQuestions, sessionId) {
    // Flatten all questions with their source
    const flatQuestions = [];
    for (const paper of allPaperQuestions) {
      for (const q of paper.questions) {
        flatQuestions.push({
          ...q,
          sourcePdf: paper.fileName,
          pdfId: paper.pdfId,
        });
      }
    }

    if (flatQuestions.length === 0) return [];

    // Use AI to group similar questions and find frequency
    const questionsJson = JSON.stringify(
      flatQuestions.map((q, i) => ({
        id: i,
        question: q.question,
        source: q.sourcePdf,
        type: q.type,
        topic: q.topic,
      }))
    );

    // If too many questions, batch them
    const truncatedJson = questionsJson.substring(0, 15000);

    const prompt = `You are an expert at analyzing university exam questions.

Here is a list of questions extracted from multiple question papers for the SAME subject.

Your task:
1. Group questions that are asking the SAME concept (even if worded differently)
2. For each unique question/concept, count how many papers it appeared in
3. Rate importance based on frequency (more frequent = more important)

Return ONLY a valid JSON array. No other text.

Format:
[
  {
    "question": "The best representative wording of this question",
    "type": "theory",
    "difficulty": "medium",
    "frequency": 5,
    "importance": 0.9,
    "sources": ["Paper1.pdf", "Paper2.pdf"],
    "topic": "Topic name",
    "marks": 5
  }
]

QUESTIONS FROM ALL PAPERS:
${truncatedJson}`;

    try {
      const response = await llmService.generate(prompt);
      const patterns = this.parseJsonArray(response);

      // Sort by frequency (most asked first)
      patterns.sort((a, b) => (b.frequency || 0) - (a.frequency || 0));

      return patterns.map((p) => ({
        question_text: p.question || '',
        question_type: p.type || 'theory',
        frequency_count: p.frequency || 1,
        importance_score: Math.min(1, Math.max(0, p.importance || 0.5)),
        source_pdfs: p.sources || [],
        year_appearances: p.sources || [],
        difficulty: p.difficulty || 'medium',
        marks: p.marks || null,
        topic: p.topic || 'General',
      }));
    } catch (error) {
      console.error('Pattern analysis failed:', error.message);
      // Fallback: treat each question as unique
      return flatQuestions.map((q) => ({
        question_text: q.question,
        question_type: q.type || 'theory',
        frequency_count: 1,
        importance_score: 0.5,
        source_pdfs: [q.sourcePdf],
        year_appearances: [q.sourcePdf],
        difficulty: q.difficulty || 'medium',
        marks: q.marks || null,
        topic: q.topic || 'General',
      }));
    }
  }

  /**
   * Map question patterns to syllabus topics using AI
   * @param {Array} patterns - Question patterns
   * @param {Array} syllabusTopics - Syllabus topics from DB
   * @param {string} sessionId
   */
  async mapPatternsToSyllabus(patterns, syllabusTopics, sessionId) {
    const topicNames = syllabusTopics.map((t) => t.topic_name);
    const topicMap = new Map(syllabusTopics.map((t) => [t.topic_name.toLowerCase(), t.syllabus_id]));

    // Batch map questions to topics
    const questionsToMap = patterns.slice(0, 50).map((p) => p.question_text);

    const prompt = `Given these syllabus topics:
${topicNames.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Map each question below to the MOST relevant syllabus topic (return the exact topic name).
If no topic matches well, return "Uncategorized".

Return ONLY a valid JSON array of objects. No other text.
Format: [{"question_index": 0, "topic": "Exact Topic Name"}, ...]

Questions:
${questionsToMap.map((q, i) => `${i}. ${q.substring(0, 200)}`).join('\n')}`;

    try {
      const response = await llmService.generate(prompt);
      const mappings = this.parseJsonArray(response);

      for (const mapping of mappings) {
        const idx = mapping.question_index;
        if (idx >= 0 && idx < patterns.length && mapping.topic) {
          const topicLower = mapping.topic.toLowerCase();
          const syllabusId = topicMap.get(topicLower);
          if (syllabusId) {
            patterns[idx].syllabus_id = syllabusId;
            patterns[idx].topic = mapping.topic;
          }
        }
      }

      // Update question counts per syllabus topic
      const topicCounts = {};
      for (const p of patterns) {
        if (p.syllabus_id) {
          topicCounts[p.syllabus_id] = (topicCounts[p.syllabus_id] || 0) + 1;
        }
      }

      for (const [syllabusId, count] of Object.entries(topicCounts)) {
        await supabase
          .from('syllabus_topics')
          .update({ question_count: count })
          .eq('syllabus_id', syllabusId);
      }
    } catch (error) {
      console.error('Syllabus mapping failed:', error.message);
    }
  }

  /**
   * Store extracted patterns in the database
   * @param {Array} patterns - Question patterns to store
   * @param {string} sessionId
   */
  async storePatterns(patterns, sessionId) {
    // Delete old patterns for this session first
    await supabase
      .from('question_patterns')
      .delete()
      .eq('session_id', sessionId);

    // Insert new patterns
    const rows = patterns.map((p) => ({
      pattern_id: uuidv4(),
      session_id: sessionId,
      syllabus_id: p.syllabus_id || null,
      question_text: p.question_text,
      question_type: p.question_type,
      frequency_count: p.frequency_count,
      importance_score: p.importance_score,
      source_pdfs: p.source_pdfs,
      year_appearances: p.year_appearances,
      difficulty: p.difficulty,
      marks: p.marks,
    }));

    // Insert in batches of 50
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const { error } = await supabase.from('question_patterns').insert(batch);
      if (error) {
        console.error('Error storing patterns batch:', error.message);
      }
    }
  }

  /**
   * Generate AI answer for a specific question pattern
   * @param {string} patternId - Pattern UUID
   * @param {string} sessionId
   * @returns {Promise<string>} AI-generated answer
   */
  async generateAnswer(patternId, sessionId) {
    const { data: pattern } = await supabase
      .from('question_patterns')
      .select('*')
      .eq('pattern_id', patternId)
      .single();

    if (!pattern) throw new Error('Question pattern not found');

    // Get relevant content from session PDFs
    const { combinedText } = await bulkPdfProcessor.getSessionTexts(sessionId);
    const relevantContent = combinedText.substring(0, 8000);

    const prompt = `You are an expert tutor. Answer this exam question thoroughly and clearly.

Question: ${pattern.question_text}
Type: ${pattern.question_type}
${pattern.marks ? `Marks: ${pattern.marks}` : ''}

Use the following study material for context:
${relevantContent}

Provide a well-structured answer that would score full marks in an exam.`;

    const answer = await llmService.generate(prompt);

    // Store the answer
    await supabase
      .from('question_patterns')
      .update({ ai_answer: answer })
      .eq('pattern_id', patternId);

    return answer;
  }

  /**
   * Parse a JSON array from AI response (handles markdown code blocks)
   * @param {string} text - Raw AI response
   * @returns {Array}
   */
  parseJsonArray(text) {
    try {
      // Remove markdown code blocks if present
      let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const startIdx = cleaned.indexOf('[');
      const endIdx = cleaned.lastIndexOf(']') + 1;

      if (startIdx === -1 || endIdx <= 0) {
        console.warn('No JSON array found in AI response');
        return [];
      }

      return JSON.parse(cleaned.substring(startIdx, endIdx));
    } catch (error) {
      console.error('JSON parse error:', error.message);
      return [];
    }
  }
}

const readinessService = new ReadinessService();
export default readinessService;
export { ReadinessService };
