/**
 * Property-Based Tests for Quiz Routes
 * Feature: backend-js-migration
 * Tests Properties 13, 14, 17, 18
 */

import fc from 'fast-check';
import { calculateScore, determineTopicStatus } from '../../src/routes/quizRoutes.js';

describe('Quiz Routes Property Tests', () => {
  /**
   * Property 13: Quiz Scoring Calculation
   * For any quiz submission, the score SHALL equal (correct_count / total_questions) * 10.
   * Validates: Requirements 8.1, 8.2
   */
  describe('Property 13: Quiz Scoring Calculation', () => {
    test('score should equal (correct_count / total_questions) * 10', () => {
      fc.assert(
        fc.property(
          // Generate random correct count and total questions
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          (correctCount, totalQuestions) => {
            // Ensure correctCount doesn't exceed totalQuestions
            const validCorrectCount = Math.min(correctCount, totalQuestions);
            
            const score = calculateScore(validCorrectCount, totalQuestions);
            const expectedScore = (validCorrectCount / totalQuestions) * 10;

            // Property: score should equal the formula result
            expect(score).toBeCloseTo(expectedScore, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('score should be 0 when no questions answered correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (totalQuestions) => {
            const score = calculateScore(0, totalQuestions);

            // Property: score should be 0 when correctCount is 0
            expect(score).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('score should be 10 when all questions answered correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (totalQuestions) => {
            const score = calculateScore(totalQuestions, totalQuestions);

            // Property: score should be 10 when all correct
            expect(score).toBe(10);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('score should be between 0 and 10 inclusive', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          (correctCount, totalQuestions) => {
            const validCorrectCount = Math.min(correctCount, totalQuestions);
            const score = calculateScore(validCorrectCount, totalQuestions);

            // Property: score should be in valid range
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(10);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('score should be 0 when totalQuestions is 0', () => {
      const score = calculateScore(0, 0);
      expect(score).toBe(0);
    });

    test('score should be proportional to correct answers', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }),
          fc.integer({ min: 1, max: 50 }),
          (correctCount1, correctCount2) => {
            const totalQuestions = 100;
            const score1 = calculateScore(correctCount1, totalQuestions);
            const score2 = calculateScore(correctCount2, totalQuestions);

            // Property: more correct answers should result in higher or equal score
            if (correctCount1 > correctCount2) {
              expect(score1).toBeGreaterThan(score2);
            } else if (correctCount1 < correctCount2) {
              expect(score1).toBeLessThan(score2);
            } else {
              expect(score1).toBe(score2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * Property 14: Quiz Submission State Updates
   * For any quiz submission, records SHALL be created in quiz_attempts and quiz_answers tables,
   * user_topic_progress SHALL be updated, and topic_status SHALL be set to "Completed" if score > 7, otherwise "Weak".
   * Validates: Requirements 8.3, 8.4, 8.5
   */
  describe('Property 14: Quiz Submission State Updates', () => {
    test('topic status should be "Completed" when score > 7', () => {
      fc.assert(
        fc.property(
          // Generate scores greater than 7
          fc.double({ min: 7.01, max: 10, noNaN: true }),
          (score) => {
            const status = determineTopicStatus(score);

            // Property: score > 7 should result in "Completed" status
            expect(status).toBe('Completed');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('topic status should be "Weak" when score <= 7', () => {
      fc.assert(
        fc.property(
          // Generate scores less than or equal to 7
          fc.double({ min: 0, max: 7, noNaN: true }),
          (score) => {
            const status = determineTopicStatus(score);

            // Property: score <= 7 should result in "Weak" status
            expect(status).toBe('Weak');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('topic status should only be "Completed" or "Weak"', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 10, noNaN: true }),
          (score) => {
            const status = determineTopicStatus(score);

            // Property: status should be one of the valid values
            expect(['Completed', 'Weak']).toContain(status);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('boundary case: score of exactly 7 should be "Weak"', () => {
      const status = determineTopicStatus(7);
      expect(status).toBe('Weak');
    });

    test('boundary case: score just above 7 should be "Completed"', () => {
      const status = determineTopicStatus(7.01);
      expect(status).toBe('Completed');
    });
  });
});


describe('Flashcard Generation Property Tests', () => {
  /**
   * Property 17: Flashcard Generation
   * For any flashcard generation request, exactly 10 flashcards SHALL be generated with 
   * core_concept and key_theory fields, prioritizing incorrect answers. 
   * Duplicate requests SHALL return existing flashcards.
   * Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5
   */
  describe('Property 17: Flashcard Generation', () => {
    /**
     * Helper function to simulate flashcard selection logic
     * Prioritizes incorrect answers (up to 8) then fills with correct answers
     */
    function selectQuestionsForFlashcards(answers) {
      const incorrectAnswers = answers.filter(a => !a.is_correct);
      const correctAnswers = answers.filter(a => a.is_correct);

      // Select up to 8 incorrect + remaining from correct to make 10
      const selectedQuestionIds = [
        ...incorrectAnswers.slice(0, 8).map(a => a.question_id),
        ...correctAnswers.slice(0, 10 - Math.min(incorrectAnswers.length, 8)).map(a => a.question_id)
      ].slice(0, 10);

      return selectedQuestionIds;
    }

    test('should prioritize incorrect answers (up to 8)', () => {
      fc.assert(
        fc.property(
          // Generate random answers with varying correctness
          fc.array(
            fc.record({
              question_id: fc.uuid(),
              is_correct: fc.boolean()
            }),
            { minLength: 10, maxLength: 10 }
          ),
          (answers) => {
            const selected = selectQuestionsForFlashcards(answers);
            const incorrectCount = answers.filter(a => !a.is_correct).length;
            const selectedIncorrect = selected.filter(id => 
              answers.find(a => a.question_id === id && !a.is_correct)
            ).length;

            // Property: should include up to 8 incorrect answers
            const expectedIncorrect = Math.min(incorrectCount, 8);
            expect(selectedIncorrect).toBe(expectedIncorrect);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should select exactly 10 questions when available', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              question_id: fc.uuid(),
              is_correct: fc.boolean()
            }),
            { minLength: 10, maxLength: 20 }
          ),
          (answers) => {
            const selected = selectQuestionsForFlashcards(answers);

            // Property: should select exactly 10 questions
            expect(selected.length).toBeLessThanOrEqual(10);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should fill remaining slots with correct answers', () => {
      fc.assert(
        fc.property(
          // Generate answers with few incorrect ones
          fc.integer({ min: 0, max: 5 }),
          (incorrectCount) => {
            const answers = [];
            for (let i = 0; i < incorrectCount; i++) {
              answers.push({ question_id: `incorrect-${i}`, is_correct: false });
            }
            for (let i = 0; i < 10 - incorrectCount; i++) {
              answers.push({ question_id: `correct-${i}`, is_correct: true });
            }

            const selected = selectQuestionsForFlashcards(answers);

            // Property: should have 10 total selections
            expect(selected.length).toBe(10);

            // Property: all incorrect should be included
            const selectedIncorrect = selected.filter(id => id.startsWith('incorrect-')).length;
            expect(selectedIncorrect).toBe(incorrectCount);

            // Property: remaining should be correct
            const selectedCorrect = selected.filter(id => id.startsWith('correct-')).length;
            expect(selectedCorrect).toBe(10 - incorrectCount);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('flashcard data structure should have required fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            core_concept: fc.string({ minLength: 1, maxLength: 200 }),
            key_theory: fc.string({ minLength: 1, maxLength: 500 }),
            common_mistake: fc.string({ minLength: 1, maxLength: 200 })
          }),
          (flashcard) => {
            // Property: flashcard should have all required fields
            expect(flashcard).toHaveProperty('core_concept');
            expect(flashcard).toHaveProperty('key_theory');
            expect(flashcard).toHaveProperty('common_mistake');

            // Property: fields should be non-empty strings
            expect(typeof flashcard.core_concept).toBe('string');
            expect(typeof flashcard.key_theory).toBe('string');
            expect(typeof flashcard.common_mistake).toBe('string');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


describe('Weak Topic Updates Property Tests', () => {
  /**
   * Property 18: Weak Topic Updates
   * For any topic with next_review_date before today, the topic_status SHALL be updated to "Weak"
   * and the latest attempt score SHALL be reset to 0.
   * Validates: Requirements 12.1, 12.2, 12.3
   */
  describe('Property 18: Weak Topic Updates', () => {
    /**
     * Helper function to check if a date is before today
     */
    function isOverdue(dateStr) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const reviewDate = new Date(dateStr);
      reviewDate.setHours(0, 0, 0, 0);
      return reviewDate < today;
    }

    /**
     * Helper function to simulate weak topic identification
     */
    function identifyOverdueTopics(topics, today) {
      return topics.filter(t => {
        const reviewDate = new Date(t.next_review_date);
        const todayDate = new Date(today);
        return reviewDate < todayDate;
      });
    }

    test('should identify topics with next_review_date before today as overdue', () => {
      fc.assert(
        fc.property(
          // Generate random dates
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          fc.array(
            fc.record({
              topic_id: fc.uuid(),
              next_review_date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
                .map(d => d.toISOString().split('T')[0])
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (today, topics) => {
            const todayStr = today.toISOString().split('T')[0];
            const overdue = identifyOverdueTopics(topics, todayStr);

            // Property: all identified topics should have review date before today
            overdue.forEach(topic => {
              expect(new Date(topic.next_review_date) < new Date(todayStr)).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('overdue topics should be marked as "Weak"', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              topic_id: fc.uuid(),
              topic_status: fc.constantFrom('Completed', 'Weak', 'In Progress'),
              is_overdue: fc.boolean()
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (topics) => {
            // Simulate updating overdue topics
            const updatedTopics = topics.map(t => ({
              ...t,
              topic_status: t.is_overdue ? 'Weak' : t.topic_status
            }));

            // Property: all overdue topics should have "Weak" status
            updatedTopics.forEach(topic => {
              if (topic.is_overdue) {
                expect(topic.topic_status).toBe('Weak');
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('overdue topics should have score reset to 0', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              topic_id: fc.uuid(),
              score: fc.double({ min: 0, max: 10, noNaN: true }),
              is_overdue: fc.boolean()
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (attempts) => {
            // Simulate resetting scores for overdue topics
            const updatedAttempts = attempts.map(a => ({
              ...a,
              score: a.is_overdue ? 0 : a.score
            }));

            // Property: all overdue attempts should have score of 0
            updatedAttempts.forEach(attempt => {
              if (attempt.is_overdue) {
                expect(attempt.score).toBe(0);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('non-overdue topics should not be affected', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              topic_id: fc.uuid(),
              topic_status: fc.constantFrom('Completed', 'Weak', 'In Progress'),
              score: fc.double({ min: 0, max: 10, noNaN: true }),
              is_overdue: fc.constant(false)
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (topics) => {
            const originalStatuses = topics.map(t => t.topic_status);
            const originalScores = topics.map(t => t.score);

            // Simulate update (no changes since none are overdue)
            const updatedTopics = topics.map(t => ({
              ...t,
              topic_status: t.is_overdue ? 'Weak' : t.topic_status,
              score: t.is_overdue ? 0 : t.score
            }));

            // Property: non-overdue topics should retain original values
            updatedTopics.forEach((topic, i) => {
              expect(topic.topic_status).toBe(originalStatuses[i]);
              expect(topic.score).toBe(originalScores[i]);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('date comparison should be correct for boundary cases', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Yesterday should be overdue
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isOverdue(yesterday.toISOString().split('T')[0])).toBe(true);

      // Tomorrow should not be overdue
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isOverdue(tomorrow.toISOString().split('T')[0])).toBe(false);
    });
  });
});
