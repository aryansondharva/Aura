/**
 * Property-Based Tests for ML Model Service
 * Feature: backend-js-migration, Property 20: ML Model Prediction
 * Validates: Requirements 14.2, 14.3
 */

import fc from 'fast-check';
import { MLModelService } from '../../src/services/mlModelService.js';

describe('ML Model Service Property Tests', () => {
  /**
   * Property 20: ML Model Prediction
   * For any valid feature input (latest_score, avg_score, attempts_count, days_since_last_attempt),
   * the ML model SHALL return a positive integer representing days until next review.
   * Validates: Requirements 14.2, 14.3
   */
  describe('Property 20: ML Model Prediction', () => {
    let mlModelService;

    beforeEach(() => {
      mlModelService = new MLModelService();
    });

    test('prediction should always return a positive integer', () => {
      fc.assert(
        fc.property(
          // Generate valid feature inputs
          fc.float({ min: 0, max: 10, noNaN: true }), // latest_score
          fc.float({ min: 0, max: 10, noNaN: true }), // avg_score
          fc.integer({ min: 1, max: 100 }), // attempts_count
          fc.integer({ min: 0, max: 365 }), // days_since_last_attempt
          (latestScore, avgScore, attemptsCount, daysSinceLastAttempt) => {
            const prediction = mlModelService.predictNextReviewDays(
              latestScore,
              avgScore,
              attemptsCount,
              daysSinceLastAttempt
            );

            // Property: prediction should be a positive integer
            expect(Number.isInteger(prediction)).toBe(true);
            expect(prediction).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('prediction should be bounded within reasonable range', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 10, noNaN: true }),
          fc.float({ min: 0, max: 10, noNaN: true }),
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 0, max: 365 }),
          (latestScore, avgScore, attemptsCount, daysSinceLastAttempt) => {
            const prediction = mlModelService.predictNextReviewDays(
              latestScore,
              avgScore,
              attemptsCount,
              daysSinceLastAttempt
            );

            // Property: prediction should be between 1 and 60 days
            expect(prediction).toBeGreaterThanOrEqual(1);
            expect(prediction).toBeLessThanOrEqual(60);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('higher scores should generally lead to longer review intervals', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }),
          fc.integer({ min: 0, max: 30 }),
          (attemptsCount, daysSinceLastAttempt) => {
            // Compare predictions for low vs high scores
            const lowScorePrediction = mlModelService.predictNextReviewDays(
              3, // low score
              3, // low avg
              attemptsCount,
              daysSinceLastAttempt
            );

            const highScorePrediction = mlModelService.predictNextReviewDays(
              9, // high score
              9, // high avg
              attemptsCount,
              daysSinceLastAttempt
            );

            // Property: high scores should lead to equal or longer intervals
            expect(highScorePrediction).toBeGreaterThanOrEqual(lowScorePrediction);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('prediction should handle edge case inputs gracefully', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(0, 10, -1, 11, null, undefined, NaN),
          fc.constantFrom(0, 10, -1, 11, null, undefined, NaN),
          fc.constantFrom(0, 1, -1, null, undefined),
          fc.constantFrom(0, -1, null, undefined),
          (latestScore, avgScore, attemptsCount, daysSinceLastAttempt) => {
            // Should not throw and should return valid prediction
            const prediction = mlModelService.predictNextReviewDays(
              latestScore,
              avgScore,
              attemptsCount,
              daysSinceLastAttempt
            );

            // Property: should always return a positive integer even with edge cases
            expect(Number.isInteger(prediction)).toBe(true);
            expect(prediction).toBeGreaterThan(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('prediction should be deterministic for same inputs', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 10, noNaN: true }),
          fc.float({ min: 0, max: 10, noNaN: true }),
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 0, max: 365 }),
          (latestScore, avgScore, attemptsCount, daysSinceLastAttempt) => {
            const prediction1 = mlModelService.predictNextReviewDays(
              latestScore,
              avgScore,
              attemptsCount,
              daysSinceLastAttempt
            );

            const prediction2 = mlModelService.predictNextReviewDays(
              latestScore,
              avgScore,
              attemptsCount,
              daysSinceLastAttempt
            );

            // Property: same inputs should produce same output
            expect(prediction1).toBe(prediction2);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('model info should be consistent', () => {
      const info = mlModelService.getModelInfo();
      
      expect(info).toHaveProperty('loaded');
      expect(info).toHaveProperty('path');
      expect(info).toHaveProperty('type');
      expect(typeof info.loaded).toBe('boolean');
      expect(typeof info.path).toBe('string');
      expect(typeof info.type).toBe('string');
    });
  });
});
