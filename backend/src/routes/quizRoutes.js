import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../utils/supabase.js';
import quizGenerator from '../services/quizGenerator.js';
import mlModelService from '../services/mlModelService.js';
import emailService from '../services/emailService.js';
import llmService from '../services/llmService.js';

const router = express.Router();
const COMPLETED_SCORE_THRESHOLD = 7;
const ASCII_CODE_A = 65;

/**
 * Calculate quiz score
 * @param {number} correctCount - Number of correct answers
 * @param {number} totalQuestions - Total number of questions
 * @returns {number} Score (0-10)
 * Requirements: 8.1, 8.2
 */
export function calculateScore(correctCount, totalQuestions) {
  if (totalQuestions === 0) return 0;
  return (correctCount / totalQuestions) * 10;
}

/**
 * Determine topic status based on score
 * @param {number} score - Quiz score (0-10)
 * @returns {string} Topic status ('Completed' or 'Weak')
 * Requirements: 8.5
 */
export function determineTopicStatus(score) {
  return score > COMPLETED_SCORE_THRESHOLD ? 'Completed' : 'Weak';
}

/**
 * POST /generate-questions - Generate MCQ questions
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
router.post('/generate-questions', async (req, res) => {
  try {
    const {
      user_id,
      topic_id,
      difficulty_mode = 'medium',
      exam_mode = 'quick-practice',
      branch = '',
      semester = '',
      subject_code = '',
      unit = ''
    } = req.body;

    // Validate required fields
    if (!topic_id) {
      return res.status(400).json({ error: 'Topic ID is required' });
    }

    // Validate difficulty mode
    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(difficulty_mode)) {
      return res.status(400).json({ 
        error: `Invalid difficulty mode. Must be one of: ${validDifficulties.join(', ')}` 
      });
    }

    // Generate MCQ questions
    const questions = await quizGenerator.generateMCQs(topic_id, difficulty_mode, user_id, {
      exam_mode,
      branch,
      semester,
      subject_code,
      unit
    });

    res.json({
      success: true,
      questions,
      count: questions.length,
      exam_mode
    });
  } catch (error) {
    console.error('Generate questions error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate questions' });
  }
});


/**
 * POST /submit-answers - Submit and evaluate quiz
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */
router.post('/submit-answers', async (req, res) => {
  try {
    const { user_id, topic_id, email, submitted_answers } = req.body;

    // Validate required fields
    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    if (!topic_id) {
      return res.status(400).json({ error: 'Topic ID is required' });
    }
    if (!submitted_answers || !Array.isArray(submitted_answers)) {
      return res.status(400).json({ error: 'Submitted answers are required' });
    }

    // Get question IDs from submitted answers
    const questionIds = submitted_answers.map(a => a.question_id);

    // Fetch correct answers from database
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('question_id, answer, answer_option_text, prompt')
      .in('question_id', questionIds);

    if (questionsError) {
      throw new Error('Failed to fetch questions');
    }

    const { data: attemptData } = await supabase
      .from('quiz_attempts')
      .select('attempt_id, submitted_at, score')
      .eq('attempt_id', resolvedAttemptId)
      .single();

    // Create a map of question_id to correct answer
    const correctAnswersMap = new Map(
      questions.map(q => [q.question_id, { answer: q.answer, options: q.answer_option_text, prompt: q.prompt }])
    );

    // Evaluate answers
    let correctCount = 0;
    const evaluatedAnswers = submitted_answers.map(submission => {
      if (!submission || !submission.question_id) {
        return {
          question_id: null,
          selected_answer: '',
          selected_answer_text: '',
          is_correct: false
        };
      }
      const questionData = correctAnswersMap.get(submission.question_id);
      const selectedAnswer = submission?.selected_answer ? String(submission.selected_answer).toUpperCase() : '';
      const isCorrect = questionData &&
        selectedAnswer === String(questionData.answer || '').toUpperCase();
      
      if (isCorrect) correctCount++;

      return {
        question_id: submission.question_id,
        selected_answer: selectedAnswer,
        selected_answer_text: submission.selected_answer_text || '',
        is_correct: isCorrect
      };
    }).filter(a => a.question_id);

    // Calculate score (Requirements: 8.1, 8.2)
    const totalQuestions = submitted_answers.length;
    const score = calculateScore(correctCount, totalQuestions);

    // Create quiz attempt record (Requirement: 8.3)
    const attemptId = uuidv4();
    const { error: attemptError } = await supabase
      .from('quiz_attempts')
      .insert({
        attempt_id: attemptId,
        user_id,
        topic_id,
        score,
        submitted_at: new Date().toISOString()
      });

    if (attemptError) {
      console.error('Error creating attempt:', attemptError);
      throw new Error('Failed to create quiz attempt');
    }

    // Store individual answers (Requirement: 8.3)
    const answerRecords = evaluatedAnswers.map(answer => ({
      answer_id: uuidv4(),
      attempt_id: attemptId,
      question_id: answer.question_id,
      selected_answer: answer.selected_answer,
      selected_answer_text: answer.selected_answer_text,
      is_correct: answer.is_correct
    }));

    const { error: answersError } = await supabase
      .from('quiz_answers')
      .insert(answerRecords);

    if (answersError) {
      console.error('Error storing answers:', answersError);
    }

    // Update user_topic_progress (Requirement: 8.4)
    await updateUserTopicProgress(user_id, topic_id, score);

    // Determine topic status (Requirement: 8.5)
    const topicStatus = determineTopicStatus(score);

    // Update topic status
    await supabase
      .from('topics')
      .update({ topic_status: topicStatus })
      .eq('topic_id', topic_id);

    // Use ML model to predict next review date (Requirement: 8.6)
    const nextReviewDate = await updateReviewFeatures(user_id, topic_id, score);

    // Get topic title for email
    const { data: topicData } = await supabase
      .from('topics')
      .select('title')
      .eq('topic_id', topic_id)
      .single();

    // Send email if provided (Requirement: 8.7)
    if (email) {
      emailService.sendQuizResultsEmailAsync(email, {
        topicTitle: topicData?.title || 'Quiz',
        score,
        totalQuestions,
        correctAnswers: correctCount,
        topicStatus,
        nextReviewDate: nextReviewDate ? new Date(nextReviewDate).toLocaleDateString() : null
      });
    }

    res.json({
      success: true,
      attempt_id: attemptId,
      score,
      total_questions: totalQuestions,
      correct_answers: correctCount,
      topic_status: topicStatus,
      next_review_date: nextReviewDate,
      answers: evaluatedAnswers
    });
  } catch (error) {
    console.error('Submit answers error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit answers' });
  }
});


/**
 * Update user topic progress
 * @param {string} userId - User ID
 * @param {string} topicId - Topic ID
 * @param {number} score - Quiz score
 * Requirements: 8.4
 */
async function updateUserTopicProgress(userId, topicId, score) {
  // Check if progress record exists
  const { data: existing } = await supabase
    .from('user_topic_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('topic_id', topicId)
    .single();

  const mastered = score > COMPLETED_SCORE_THRESHOLD;
  const now = new Date().toISOString();

  if (existing) {
    // Update existing record
    await supabase
      .from('user_topic_progress')
      .update({
        last_score: score,
        attempts_count: existing.attempts_count + 1,
        mastered,
        last_attempt: now
      })
      .eq('user_id', userId)
      .eq('topic_id', topicId);
  } else {
    // Create new record
    await supabase
      .from('user_topic_progress')
      .insert({
        user_id: userId,
        topic_id: topicId,
        last_score: score,
        attempts_count: 1,
        mastered,
        last_attempt: now
      });
  }
}

/**
 * Update review features and predict next review date
 * @param {string} userId - User ID
 * @param {string} topicId - Topic ID
 * @param {number} latestScore - Latest quiz score
 * @returns {Promise<string|null>} Next review date
 * Requirements: 8.6, 14.2, 14.3
 */
async function updateReviewFeatures(userId, topicId, latestScore) {
  try {
    // Get existing review features
    const { data: existing } = await supabase
      .from('user_topic_review_features')
      .select('*')
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .single();

    const now = new Date();
    let avgScore, attemptsCount, daysSinceLastAttempt;
    let recentTrend = 0;
    let repeatedWrongCount = 0;

    if (existing) {
      // Calculate new average score
      attemptsCount = existing.attempts_count + 1;
      avgScore = ((existing.avg_score * existing.attempts_count) + latestScore) / attemptsCount;
      
      // Calculate days since last attempt
      const lastAttemptDate = new Date(existing.last_attempt_date);
      daysSinceLastAttempt = Math.floor((now - lastAttemptDate) / (1000 * 60 * 60 * 24));
    } else {
      avgScore = latestScore;
      attemptsCount = 1;
      daysSinceLastAttempt = 0;
    }

    // Build lightweight trend and repeated mistakes features
    const { data: recentAttempts } = await supabase
      .from('quiz_attempts')
      .select('attempt_id, score, submitted_at')
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .order('submitted_at', { ascending: false })
      .limit(4);

    if (recentAttempts && recentAttempts.length >= 2) {
      const latest = Number(recentAttempts[0]?.score || 0);
      const previous = Number(recentAttempts[1]?.score || 0);
      recentTrend = latest - previous;
    }

    const attemptIds = (recentAttempts || []).map(a => a.attempt_id).filter(Boolean);
    if (attemptIds.length > 0) {
      const { data: recentWrongAnswers } = await supabase
        .from('quiz_answers')
        .select('question_id')
        .in('attempt_id', attemptIds)
        .eq('is_correct', false);

      if (recentWrongAnswers && recentWrongAnswers.length > 0) {
        const counts = {};
        for (const row of recentWrongAnswers) {
          counts[row.question_id] = (counts[row.question_id] || 0) + 1;
        }
        repeatedWrongCount = Object.values(counts).filter(c => c >= 2).length;
      }
    }

    // Predict next review days using ML model
    const schedulePrediction = mlModelService.predictReviewSchedule(
      latestScore,
      avgScore,
      attemptsCount,
      daysSinceLastAttempt,
      recentTrend,
      repeatedWrongCount
    );
    const predictedDays = schedulePrediction.days;

    // Calculate next review date
    const nextReviewDate = new Date(now);
    nextReviewDate.setDate(nextReviewDate.getDate() + predictedDays);
    const nextReviewDateStr = nextReviewDate.toISOString().split('T')[0];

    const mastered = latestScore > COMPLETED_SCORE_THRESHOLD;

    if (existing) {
      // Update existing record
      await supabase
        .from('user_topic_review_features')
        .update({
          latest_score: latestScore,
          avg_score: avgScore,
          attempts_count: attemptsCount,
          last_attempt_date: now.toISOString().split('T')[0],
          next_review_date: nextReviewDateStr,
          mastered
        })
        .eq('user_id', userId)
        .eq('topic_id', topicId);
    } else {
      // Create new record
      await supabase
        .from('user_topic_review_features')
        .insert({
          user_id: userId,
          topic_id: topicId,
          latest_score: latestScore,
          avg_score: avgScore,
          attempts_count: attemptsCount,
          last_attempt_date: now.toISOString().split('T')[0],
          next_review_date: nextReviewDateStr,
          mastered
        });
    }

    // Log model inference for retraining/drift (best-effort)
    await supabase
      .from('ml_prediction_logs')
      .insert({
        user_id: userId,
        topic_id: topicId,
        model_version: schedulePrediction.modelVersion || 'fallback-v1',
        prediction_source: schedulePrediction.source || 'fallback',
        confidence: schedulePrediction.confidence ?? null,
        latest_score: latestScore,
        avg_score: avgScore,
        attempts_count: attemptsCount,
        days_since_last_attempt: daysSinceLastAttempt,
        recent_trend: recentTrend,
        repeated_wrong_count: repeatedWrongCount,
        predicted_days: predictedDays,
        predicted_next_review_date: nextReviewDateStr,
        created_at: now.toISOString()
      })
      .then(() => null)
      .catch((err) => {
        console.warn('Failed to insert ml_prediction_logs record:', err?.message || err);
        return null;
      });

    return nextReviewDateStr;
  } catch (error) {
    console.error('Error updating review features:', error);
    return null;
  }
}


/**
 * GET /api/answer-analysis - Get detailed answer analysis
 * Requirements: 9.3
 */
router.get('/answer-analysis', async (req, res) => {
  try {
    const { attempt_id, user_id, topic_id, attempt_number } = req.query;
    let resolvedAttemptId = attempt_id;

    // Validate required fields
    if (!resolvedAttemptId && (!topic_id || !attempt_number || !user_id)) {
      return res.status(400).json({
        error: 'Attempt ID is required (or provide topic_id + attempt_number + user_id)'
      });
    }

    // Legacy contract support: resolve attempt from topic_id + attempt_number
    if (!resolvedAttemptId && topic_id && attempt_number && user_id) {
      const rawAttemptNumber = Number(attempt_number);
      if (!Number.isFinite(rawAttemptNumber)) {
        return res.status(400).json({ error: 'attempt_number must be numeric' });
      }
      const parsedAttemptNumber = Math.max(1, rawAttemptNumber);
      const { data: attemptsForTopic, error: attemptsError } = await supabase
        .from('quiz_attempts')
        .select('attempt_id, submitted_at, score')
        .eq('topic_id', topic_id)
        .eq('user_id', user_id)
        .order('submitted_at', { ascending: true });

      if (attemptsError || !attemptsForTopic || attemptsForTopic.length < parsedAttemptNumber) {
        return res.status(404).json({ error: 'Attempt not found for topic/attempt_number' });
      }
      resolvedAttemptId = attemptsForTopic[parsedAttemptNumber - 1].attempt_id;
      // attempt_number is 1-based in legacy frontend; array index is 0-based
    }

    // Verify the attempt belongs to the user if user_id provided
    if (user_id) {
      const { data: attempt, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('attempt_id', resolvedAttemptId)
        .eq('user_id', user_id)
        .single();

      if (attemptError || !attempt) {
        return res.status(404).json({ error: 'Attempt not found' });
      }
    }

    // Get all answers for this attempt
    const { data: answers, error: answersError } = await supabase
      .from('quiz_answers')
      .select('*')
      .eq('attempt_id', resolvedAttemptId);

    if (answersError) {
      throw new Error('Failed to fetch answers');
    }

    // Get question details for each answer
    const questionIds = answers.map(a => a.question_id);
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('question_id, prompt, answer, answer_option_text, explanation')
      .in('question_id', questionIds);

    if (questionsError) {
      throw new Error('Failed to fetch questions');
    }

    // Create question map
    const questionMap = new Map(questions.map(q => [q.question_id, q]));

    // Build detailed analysis
    const analysis = answers.map(answer => {
      const question = questionMap.get(answer.question_id);
      return {
        question_id: answer.question_id,
        question_text: question?.prompt || '',
        options: question?.answer_option_text || [],
        correct_answer: question?.answer || '',
        selected_answer: answer.selected_answer,
        selected_option: answer.selected_answer,
        selected_answer_text: answer.selected_answer_text,
        is_correct: answer.is_correct,
        explanation: question?.explanation || '',
        correct_option: question?.answer || '',
        correct_option_text: (() => {
          if (!Array.isArray(question?.answer_option_text) || !question?.answer) return '';
          const answerStr = String(question.answer).toUpperCase();
          if (!/^[A-D]$/.test(answerStr)) return '';
          const idx = answerStr.charCodeAt(0) - ASCII_CODE_A;
          if (idx < 0 || idx >= question.answer_option_text.length) return '';
          return question.answer_option_text[idx] || '';
        })()
      };
    });

    // Calculate summary stats
    const correctCount = analysis.filter(a => a.is_correct).length;
    const totalQuestions = analysis.length;

    res.json({
      attempt_id: resolvedAttemptId,
      total_questions: totalQuestions,
      correct_answers: correctCount,
      score: calculateScore(correctCount, totalQuestions),
      analysis,
      // Legacy frontend compatibility keys
      questions: analysis,
      attempt_data: attemptData || null
    });
  } catch (error) {
    console.error('Answer analysis error:', error);
    res.status(500).json({ error: error.message || 'Failed to get answer analysis' });
  }
});

/**
 * POST /api/update-weak-topics - Update overdue topics
 * Requirements: 12.1, 12.2, 12.3
 */
router.post('/update-weak-topics', async (req, res) => {
  try {
    const { user_id } = req.body;

    // Validate required fields
    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const today = new Date().toISOString().split('T')[0];
    const { data: overdueTopics, error: fetchError } = await supabase
      .from('user_topic_review_features')
      .select('topic_id')
      .eq('user_id', user_id)
      .lt('next_review_date', today);

    if (fetchError) throw new Error('Failed to fetch overdue topics');
    const topicIds = (overdueTopics || []).map(t => t.topic_id);
    if (topicIds.length === 0) {
      return res.json({ success: true, message: 'No overdue topics found', updated_count: 0 });
    }

    await supabase.from('topics').update({ topic_status: 'Weak' }).in('topic_id', topicIds);
    for (const topicId of topicIds) {
      const { data: latestAttempt } = await supabase
        .from('quiz_attempts')
        .select('attempt_id')
        .eq('user_id', user_id)
        .eq('topic_id', topicId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single();
      if (latestAttempt) {
        await supabase.from('quiz_attempts').update({ score: 0 }).eq('attempt_id', latestAttempt.attempt_id);
      }
    }

    res.json({
      success: true,
      message: `Updated ${topicIds.length} overdue topics to Weak status`,
      updated_count: topicIds.length,
      topic_ids: topicIds
    });
  } catch (error) {
    console.error('Update weak topics error:', error);
    res.status(500).json({ error: error.message || 'Failed to update weak topics' });
  }
});


/**
 * POST /api/generate_flashcards - Generate flashcards
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */
router.post('/generate_flashcards', async (req, res) => {
  try {
    const { user_id, attempt_id, topic_id } = req.body;

    // Validate required fields
    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    if (!attempt_id) {
      return res.status(400).json({ error: 'Attempt ID is required' });
    }
    if (!topic_id) {
      return res.status(400).json({ error: 'Topic ID is required' });
    }

    // Check if flashcards already exist for this attempt (Requirement: 11.5)
    const { data: existingFlashcards, error: existingError } = await supabase
      .from('flashcards')
      .select('*')
      .eq('attempt_id', attempt_id);

    if (!existingError && existingFlashcards && existingFlashcards.length > 0) {
      return res.json({
        success: true,
        message: 'Flashcards already exist for this attempt',
        flashcards: existingFlashcards,
        count: existingFlashcards.length,
        existing: true
      });
    }

    // Get answers for this attempt
    const { data: answers, error: answersError } = await supabase
      .from('quiz_answers')
      .select('question_id, is_correct')
      .eq('attempt_id', attempt_id);

    if (answersError) {
      throw new Error('Failed to fetch answers');
    }

    // Prioritize incorrect answers (up to 8) (Requirement: 11.2)
    const incorrectAnswers = answers.filter(a => !a.is_correct);
    const correctAnswers = answers.filter(a => a.is_correct);

    // Select questions for flashcards: up to 8 incorrect + remaining from correct to make 10
    const selectedQuestionIds = [
      ...incorrectAnswers.slice(0, 8).map(a => a.question_id),
      ...correctAnswers.slice(0, 10 - Math.min(incorrectAnswers.length, 8)).map(a => a.question_id)
    ].slice(0, 10);

    // Get question details
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('question_id, prompt, answer, answer_option_text, explanation')
      .in('question_id', selectedQuestionIds);

    if (questionsError) {
      throw new Error('Failed to fetch questions');
    }

    // Generate flashcards using LLM (Requirements: 11.1, 11.3)
    const flashcards = await generateFlashcardsFromQuestions(questions, user_id, attempt_id, topic_id);

    res.json({
      success: true,
      message: 'Flashcards generated successfully',
      flashcards,
      count: flashcards.length,
      existing: false
    });
  } catch (error) {
    console.error('Generate flashcards error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate flashcards' });
  }
});

/**
 * Generate flashcards from quiz questions
 * @param {Array} questions - Quiz questions
 * @param {string} userId - User ID
 * @param {string} attemptId - Attempt ID
 * @param {string} topicId - Topic ID
 * @returns {Promise<Array>} Generated flashcards
 * Requirements: 11.1, 11.3, 11.4
 */
async function generateFlashcardsFromQuestions(questions, userId, attemptId, topicId) {
  const flashcards = [];

  for (const question of questions) {
    try {
      // Build prompt for flashcard generation
      const prompt = `Based on this quiz question, generate a flashcard with the following fields:
      
Question: ${question.prompt}
Correct Answer: ${question.answer_option_text?.['ABCD'.indexOf(question.answer)] || question.answer}
Explanation: ${question.explanation || 'N/A'}

Generate a flashcard in this exact JSON format:
{
  "core_concept": "The main concept being tested (1-2 sentences)",
  "key_theory": "The key theory or principle to remember (2-3 sentences)",
  "common_mistake": "A common mistake students make with this concept (1-2 sentences)"
}

Return ONLY the JSON object, no other text.`;

      const response = await llmService.generate(prompt);
      
      // Parse the response
      let flashcardData;
      try {
        // Try to extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          flashcardData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        // Fallback to basic flashcard
        flashcardData = {
          core_concept: question.prompt,
          key_theory: question.explanation || 'Review this concept',
          common_mistake: 'Pay attention to the details in this question'
        };
      }

      // Store flashcard in database (Requirement: 11.4)
      const { data: savedFlashcard, error: saveError } = await supabase
        .from('flashcards')
        .insert({
          user_id: userId,
          attempt_id: attemptId,
          topic_id: topicId,
          core_concept: flashcardData.core_concept,
          key_theory: flashcardData.key_theory,
          common_mistake: flashcardData.common_mistake,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving flashcard:', saveError);
        continue;
      }

      flashcards.push(savedFlashcard);
    } catch (error) {
      console.error('Error generating flashcard:', error);
      continue;
    }
  }

  return flashcards;
}

export default router;
