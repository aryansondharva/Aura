/**
 * Property-Based Tests for LLM Service
 * Feature: backend-js-migration, Property 2: Conversation History Sliding Window
 * Validates: Requirements 3.3
 */

import fc from 'fast-check';
import { LLMService } from '../../src/services/llmService.js';

describe('LLM Service Property Tests', () => {
  /**
   * Property 2: Conversation History Sliding Window
   * For any conversation with more than 10 messages, only the most recent 10 messages
   * SHALL be retained in memory and used for context.
   * Validates: Requirements 3.3
   */
  describe('Property 2: Conversation History Sliding Window', () => {
    let llmService;

    beforeEach(() => {
      llmService = new LLMService();
    });

    test('sliding window should never return more than 10 messages', () => {
      fc.assert(
        fc.property(
          // Generate a random number of messages (1 to 50)
          fc.integer({ min: 1, max: 50 }),
          // Generate a random session ID
          fc.string({ minLength: 1, maxLength: 20 }),
          (messageCount, sessionId) => {
            // Add messages to history
            for (let i = 0; i < messageCount; i++) {
              const role = i % 2 === 0 ? 'user' : 'assistant';
              llmService.addToHistory(sessionId, role, `Message ${i}`);
            }

            // Get recent messages (sliding window)
            const recentMessages = llmService.getRecentMessages(sessionId);

            // Property: should never exceed 10 messages
            expect(recentMessages.length).toBeLessThanOrEqual(10);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('sliding window should return exactly min(messageCount, 10) messages', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }),
          fc.uuid(),
          (messageCount, sessionId) => {
            // Add messages to history
            for (let i = 0; i < messageCount; i++) {
              const role = i % 2 === 0 ? 'user' : 'assistant';
              llmService.addToHistory(sessionId, role, `Message ${i}`);
            }

            const recentMessages = llmService.getRecentMessages(sessionId);
            const expectedCount = Math.min(messageCount, 10);

            // Property: should return exactly min(messageCount, 10) messages
            expect(recentMessages.length).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('sliding window should preserve the most recent messages', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 11, max: 50 }),
          fc.uuid(),
          (messageCount, sessionId) => {
            // Add messages to history with identifiable content
            for (let i = 0; i < messageCount; i++) {
              const role = i % 2 === 0 ? 'user' : 'assistant';
              llmService.addToHistory(sessionId, role, `Message ${i}`);
            }

            const recentMessages = llmService.getRecentMessages(sessionId);
            const fullHistory = llmService.getMessageHistory(sessionId);

            // Property: the recent messages should be the last 10 from full history
            const expectedMessages = fullHistory.slice(-10);
            
            expect(recentMessages.length).toBe(10);
            
            // Verify each message content matches
            for (let i = 0; i < 10; i++) {
              expect(recentMessages[i].content).toBe(expectedMessages[i].content);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('different sessions should have independent histories', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 1, max: 20 }),
          (sessionId1, sessionId2, count1, count2) => {
            // Ensure different session IDs
            fc.pre(sessionId1 !== sessionId2);

            // Add different number of messages to each session
            for (let i = 0; i < count1; i++) {
              llmService.addToHistory(sessionId1, 'user', `Session1 Message ${i}`);
            }
            for (let i = 0; i < count2; i++) {
              llmService.addToHistory(sessionId2, 'user', `Session2 Message ${i}`);
            }

            const history1 = llmService.getMessageHistory(sessionId1);
            const history2 = llmService.getMessageHistory(sessionId2);

            // Property: sessions should be independent
            expect(history1.length).toBe(count1);
            expect(history2.length).toBe(count2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
