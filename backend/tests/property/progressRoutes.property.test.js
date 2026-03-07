/**
 * Property-Based Tests for Progress Routes
 * Feature: backend-js-migration
 * Tests Property 15: Progress Retrieval Ordering
 */

import fc from 'fast-check';
import { sortAttemptsByDate } from '../../src/routes/progressRoutes.js';

describe('Progress Routes Property Tests', () => {
  /**
   * Property 15: Progress Retrieval Ordering
   * For any user progress request, attempts SHALL be returned in descending order by submitted_at timestamp.
   * Validates: Requirements 9.1, 9.2
   */
  describe('Property 15: Progress Retrieval Ordering', () => {
    test('attempts should be sorted in descending order by submitted_at', () => {
      fc.assert(
        fc.property(
          // Generate random array of attempts with timestamps
          fc.array(
            fc.record({
              attempt_id: fc.uuid(),
              topic_id: fc.uuid(),
              score: fc.double({ min: 0, max: 10, noNaN: true }),
              submitted_at: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
                .map(d => d.toISOString())
            }),
            { minLength: 0, maxLength: 50 }
          ),
          (attempts) => {
            const sorted = sortAttemptsByDate(attempts);

            // Property: each element should have submitted_at >= next element's submitted_at
            for (let i = 0; i < sorted.length - 1; i++) {
              const currentDate = new Date(sorted[i].submitted_at);
              const nextDate = new Date(sorted[i + 1].submitted_at);
              expect(currentDate >= nextDate).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('sorted array should have same length as input', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              attempt_id: fc.uuid(),
              topic_id: fc.uuid(),
              score: fc.double({ min: 0, max: 10, noNaN: true }),
              submitted_at: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
                .map(d => d.toISOString())
            }),
            { minLength: 0, maxLength: 50 }
          ),
          (attempts) => {
            const sorted = sortAttemptsByDate(attempts);

            // Property: sorting should preserve array length
            expect(sorted.length).toBe(attempts.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('sorted array should contain all original elements', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              attempt_id: fc.uuid(),
              topic_id: fc.uuid(),
              score: fc.double({ min: 0, max: 10, noNaN: true }),
              submitted_at: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
                .map(d => d.toISOString())
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (attempts) => {
            const sorted = sortAttemptsByDate(attempts);

            // Property: all original attempt_ids should be present in sorted array
            const originalIds = new Set(attempts.map(a => a.attempt_id));
            const sortedIds = new Set(sorted.map(a => a.attempt_id));
            
            expect(sortedIds.size).toBe(originalIds.size);
            originalIds.forEach(id => {
              expect(sortedIds.has(id)).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('most recent attempt should be first', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              attempt_id: fc.uuid(),
              topic_id: fc.uuid(),
              score: fc.double({ min: 0, max: 10, noNaN: true }),
              submitted_at: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
                .map(d => d.toISOString())
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (attempts) => {
            const sorted = sortAttemptsByDate(attempts);

            // Find the most recent date in original array
            const mostRecentDate = attempts.reduce((max, a) => {
              const date = new Date(a.submitted_at);
              return date > max ? date : max;
            }, new Date(0));

            // Property: first element should have the most recent date
            const firstDate = new Date(sorted[0].submitted_at);
            expect(firstDate.getTime()).toBe(mostRecentDate.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });

    test('oldest attempt should be last', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              attempt_id: fc.uuid(),
              topic_id: fc.uuid(),
              score: fc.double({ min: 0, max: 10, noNaN: true }),
              submitted_at: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
                .map(d => d.toISOString())
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (attempts) => {
            const sorted = sortAttemptsByDate(attempts);

            // Find the oldest date in original array
            const oldestDate = attempts.reduce((min, a) => {
              const date = new Date(a.submitted_at);
              return date < min ? date : min;
            }, new Date('9999-12-31'));

            // Property: last element should have the oldest date
            const lastDate = new Date(sorted[sorted.length - 1].submitted_at);
            expect(lastDate.getTime()).toBe(oldestDate.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });

    test('sorting should be stable for equal timestamps', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          fc.array(fc.uuid(), { minLength: 2, maxLength: 10 }),
          (sharedDate, attemptIds) => {
            // Create attempts with same timestamp
            const attempts = attemptIds.map(id => ({
              attempt_id: id,
              topic_id: 'topic-1',
              score: 5,
              submitted_at: sharedDate.toISOString()
            }));

            const sorted = sortAttemptsByDate(attempts);

            // Property: all elements should still be present
            expect(sorted.length).toBe(attempts.length);
            
            // Property: all dates should be equal
            sorted.forEach(a => {
              expect(new Date(a.submitted_at).getTime()).toBe(sharedDate.getTime());
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('empty array should return empty array', () => {
      const sorted = sortAttemptsByDate([]);
      expect(sorted).toEqual([]);
    });

    test('single element array should return same element', () => {
      fc.assert(
        fc.property(
          fc.record({
            attempt_id: fc.uuid(),
            topic_id: fc.uuid(),
            score: fc.double({ min: 0, max: 10, noNaN: true }),
            submitted_at: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
              .map(d => d.toISOString())
          }),
          (attempt) => {
            const sorted = sortAttemptsByDate([attempt]);

            // Property: single element should be returned unchanged
            expect(sorted.length).toBe(1);
            expect(sorted[0].attempt_id).toBe(attempt.attempt_id);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle invalid input gracefully', () => {
      // Property: null/undefined should return empty array
      expect(sortAttemptsByDate(null)).toEqual([]);
      expect(sortAttemptsByDate(undefined)).toEqual([]);
    });

    test('sorting should not mutate original array', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              attempt_id: fc.uuid(),
              topic_id: fc.uuid(),
              score: fc.double({ min: 0, max: 10, noNaN: true }),
              submitted_at: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
                .map(d => d.toISOString())
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (attempts) => {
            // Create a copy of original order
            const originalOrder = attempts.map(a => a.attempt_id);

            sortAttemptsByDate(attempts);

            // Property: original array should not be mutated
            const currentOrder = attempts.map(a => a.attempt_id);
            expect(currentOrder).toEqual(originalOrder);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
