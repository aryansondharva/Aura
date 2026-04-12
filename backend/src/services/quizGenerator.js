import { v4 as uuidv4 } from 'uuid';
import supabase from '../utils/supabase.js';
import llmService from './llmService.js';

/**
 * Quiz Generator Service - Generates MCQ questions from topic content
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
class QuizGenerator {
  constructor() {
    this.difficultyPrompts = {
      easy: 'Generate straightforward questions that test basic understanding and recall.',
      medium: 'Generate questions that require understanding of concepts and their applications.',
      hard: 'Generate challenging questions that require deep understanding, analysis, and application of multiple concepts.'
    };
  }

  /**
   * Build the MCQ generation prompt
   * @param {string} content - Topic content to generate questions from
   * @param {string} difficulty - Difficulty level (easy, medium, hard)
   * @param {number} numQuestions - Number of questions to generate
   * @returns {string} The prompt for the LLM
   */
  buildPrompt(content, difficulty, numQuestions) {
    const difficultyInstruction = this.difficultyPrompts[difficulty] || this.difficultyPrompts.medium;
    
    return `You are an expert quiz generator. Generate exactly ${numQuestions} multiple choice questions based on the content provided.

${difficultyInstruction}

IMPORTANT RULES:
1. Each question must have exactly 4 options.
2. Return the response ONLY as a valid JSON array.
3. Each object in the array must have these keys: "question", "options" (an array of 4 strings), "answer" (0, 1, 2, or 3 corresponding to index in options), "explanation".

CONTENT:
${content.substring(0, 4000)}

JSON FORMAT:
[
  {
    "question": "What is...?",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "answer": 0,
    "explanation": "Because..."
  }
]`;
  }


  /**
   * Parse the LLM response to extract MCQ questions
   * @param {string} text - Raw LLM response text
   * @returns {Array} Array of parsed question objects
   */
  parseResponse(text) {
    try {
      const jsonStartIndex = text.indexOf('[');
      const jsonEndIndex = text.lastIndexOf(']') + 1;
      
      if (jsonStartIndex === -1 || jsonEndIndex === 0) {
        throw new Error('No JSON array found in response');
      }

      const rawJson = text.substring(jsonStartIndex, jsonEndIndex);
      const parsed = JSON.parse(rawJson);
      
      return parsed.map(item => ({
        question_text: item.question,
        options: item.options,
        correct_answer: ['A', 'B', 'C', 'D'][item.answer],
        answer_text: item.options[item.answer] || '',
        explanation: item.explanation || ''
      }));
    } catch (error) {
      console.error('Failed to parse quiz JSON:', error.message);
      return [];
    }
  }

  /**
   * Get previous mistakes for a user on a topic
   * @param {string} userId - User ID
   * @param {string} topicId - Topic ID
   * @param {number} limit - Maximum number of mistakes to retrieve
   * @returns {Promise<Array>} Array of previously incorrect questions
   */
  async getPreviousMistakes(userId, topicId, limit = 4) {
    try {
      // Get the latest attempt for this user and topic
      const { data: attempts, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select('attempt_id')
        .eq('user_id', userId)
        .eq('topic_id', topicId)
        .order('submitted_at', { ascending: false })
        .limit(1);
      
      if (attemptError || !attempts || attempts.length === 0) {
        return [];
      }
      
      const latestAttemptId = attempts[0].attempt_id;
      
      // Get incorrect answers from the latest attempt
      const { data: incorrectAnswers, error: answersError } = await supabase
        .from('quiz_answers')
        .select('question_id')
        .eq('attempt_id', latestAttemptId)
        .eq('is_correct', false)
        .limit(limit);
      
      if (answersError || !incorrectAnswers || incorrectAnswers.length === 0) {
        return [];
      }
      
      const questionIds = incorrectAnswers.map(a => a.question_id);
      
      // Get the actual questions
      const { data: questions, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .in('question_id', questionIds);
      
      if (questionsError || !questions) {
        return [];
      }
      
      return questions.map(q => ({
        question_id: q.question_id,
        question_text: q.prompt,
        options: q.answer_option_text,
        correct_answer: q.answer,
        explanation: q.explanation,
        is_retry: true
      }));
    } catch (error) {
      console.error('Error getting previous mistakes:', error);
      return [];
    }
  }


  /**
   * Save generated questions to the database
   * @param {Array} questions - Array of question objects
   * @param {string} topicId - Topic ID
   * @returns {Promise<Array>} Array of saved questions with IDs
   */
  async saveQuestions(questions, topicId) {
    const savedQuestions = [];
    
    for (const question of questions) {
      // Skip if this is a retry question (already in DB)
      if (question.is_retry) {
        savedQuestions.push(question);
        continue;
      }
      
      const questionId = uuidv4();
      
      const { error } = await supabase
        .from('quiz_questions')
        .insert({
          question_id: questionId,
          concept_id: topicId,
          prompt: question.question_text,
          answer: question.correct_answer,
          answer_option_text: question.options,
          explanation: question.explanation,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error saving question:', error);
        continue;
      }
      
      savedQuestions.push({
        question_id: questionId,
        question_text: question.question_text,
        options: question.options,
        correct_answer: question.correct_answer,
        explanation: question.explanation
      });
    }
    
    return savedQuestions;
  }

  /**
   * Generate MCQ questions for a topic
   * @param {string} topicId - Topic ID
   * @param {string} difficulty - Difficulty level (easy, medium, hard)
   * @param {string} userId - User ID (optional, for including previous mistakes)
   * @returns {Promise<Array>} Array of generated questions
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   */
  async generateMCQs(topicId, difficulty = 'medium', userId = null) {
    // Fetch topic content
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('merged_content, title')
      .eq('topic_id', topicId)
      .single();
    
    if (topicError || !topic) {
      throw new Error('Topic not found');
    }
    
    // Get previous wrong answers if user has attempted before
    let mistakeQuestions = [];
    if (userId) {
      mistakeQuestions = await this.getPreviousMistakes(userId, topicId);
    }
    
    // Calculate how many new questions to generate (10 total, minus retries)
    const numToGenerate = Math.max(0, 10 - mistakeQuestions.length);
    
    let newQuestions = [];
    if (numToGenerate > 0) {
      // Build prompt and generate questions
      const prompt = this.buildPrompt(topic.merged_content, difficulty, numToGenerate);
      const response = await llmService.generate(prompt);
      
      // Parse the response
      newQuestions = this.parseResponse(response);
      
      // Ensure we have the right number of questions
      if (newQuestions.length < numToGenerate) {
        console.warn(`Only generated ${newQuestions.length} questions, expected ${numToGenerate}`);
      }
    }
    
    // Combine mistake questions with new questions
    const allQuestions = [...mistakeQuestions, ...newQuestions.slice(0, 10 - mistakeQuestions.length)];
    
    // Shuffle to mix retry questions with new ones
    this.shuffleArray(allQuestions);
    
    // Save new questions to database
    const savedQuestions = await this.saveQuestions(allQuestions, topicId);
    
    // Return questions without correct answers for the quiz
    return savedQuestions.map(q => ({
      question_id: q.question_id,
      question_text: q.question_text,
      options: q.options,
      is_retry: q.is_retry || false
    }));
  }

  /**
   * Shuffle array in place (Fisher-Yates algorithm)
   * @param {Array} array - Array to shuffle
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Verify answer distribution across options
   * @param {Array} questions - Array of questions
   * @returns {Object} Distribution of correct answers
   */
  getAnswerDistribution(questions) {
    const distribution = { A: 0, B: 0, C: 0, D: 0 };
    questions.forEach(q => {
      if (q.correct_answer && distribution.hasOwnProperty(q.correct_answer)) {
        distribution[q.correct_answer]++;
      }
    });
    return distribution;
  }
}

// Export singleton instance
const quizGenerator = new QuizGenerator();
export default quizGenerator;

// Also export the class for testing
export { QuizGenerator };
