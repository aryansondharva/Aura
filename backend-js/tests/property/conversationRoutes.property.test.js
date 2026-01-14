/**
 * Property-Based Tests for Conversation Routes
 * Feature: backend-js-migration
 * Tests Property 16: Conversation CRUD Consistency
 */

import fc from 'fast-check';
import {
  validateConversationCreate,
  validateConversationUpdate,
  createConversationObject,
  createConversationUpdateObject,
  verifyCrudCreateConsistency,
  verifyCrudUpdateConsistency,
  verifyCrudDeleteConsistency
} from '../../src/routes/conversationRoutes.js';

describe('Conversation Routes Property Tests', () => {
  /**
   * Property 16: Conversation CRUD Consistency
   * For any conversation, creating it SHALL make it retrievable, updating it SHALL change the title,
   * and deleting it SHALL remove both the conversation and all associated chat logs.
   * Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5
   */
  describe('Property 16: Conversation CRUD Consistency', () => {
    
    // Test validation for create operation
    describe('Create Validation', () => {
      test('valid user_id should pass validation', () => {
        fc.assert(
          fc.property(
            fc.uuid(),
            (userId) => {
              const result = validateConversationCreate({ user_id: userId });
              expect(result.valid).toBe(true);
              expect(result.error).toBeUndefined();
            }
          ),
          { numRuns: 100 }
        );
      });

      test('missing user_id should fail validation', () => {
        fc.assert(
          fc.property(
            fc.record({
              title: fc.option(fc.string(), { nil: undefined })
            }),
            (data) => {
              const result = validateConversationCreate(data);
              expect(result.valid).toBe(false);
              expect(result.error).toBe('User ID is required');
            }
          ),
          { numRuns: 100 }
        );
      });

      test('null/undefined data should fail validation', () => {
        expect(validateConversationCreate(null).valid).toBe(false);
        expect(validateConversationCreate(undefined).valid).toBe(false);
      });
    });

    // Test validation for update operation
    describe('Update Validation', () => {
      test('valid non-empty title should pass validation', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            (title) => {
              const result = validateConversationUpdate({ title });
              expect(result.valid).toBe(true);
              expect(result.error).toBeUndefined();
            }
          ),
          { numRuns: 100 }
        );
      });

      test('empty or whitespace-only title should fail validation', () => {
        fc.assert(
          fc.property(
            fc.constantFrom('', '   ', '\t', '\n', '  \t\n  '),
            (title) => {
              const result = validateConversationUpdate({ title });
              expect(result.valid).toBe(false);
              expect(result.error).toBe('Title is required');
            }
          ),
          { numRuns: 100 }
        );
      });

      test('missing title should fail validation', () => {
        const result = validateConversationUpdate({});
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Title is required');
      });

      test('null/undefined data should fail validation', () => {
        expect(validateConversationUpdate(null).valid).toBe(false);
        expect(validateConversationUpdate(undefined).valid).toBe(false);
      });
    });

    // Test conversation object creation
    describe('Conversation Object Creation', () => {
      test('created conversation should have valid UUID', () => {
        fc.assert(
          fc.property(
            fc.uuid(),
            fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
            (userId, title) => {
              const conversation = createConversationObject(userId, title);
              
              // Should have a valid UUID format for conversation_id
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              expect(conversation.conversation_id).toMatch(uuidRegex);
            }
          ),
          { numRuns: 100 }
        );
      });

      test('created conversation should preserve user_id', () => {
        fc.assert(
          fc.property(
            fc.uuid(),
            fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
            (userId, title) => {
              const conversation = createConversationObject(userId, title);
              expect(conversation.user_id).toBe(userId);
            }
          ),
          { numRuns: 100 }
        );
      });

      test('created conversation should have provided title or default', () => {
        fc.assert(
          fc.property(
            fc.uuid(),
            fc.string({ minLength: 1, maxLength: 100 }),
            (userId, title) => {
              const conversation = createConversationObject(userId, title);
              expect(conversation.title).toBe(title);
            }
          ),
          { numRuns: 100 }
        );
      });

      test('created conversation should use default title when not provided', () => {
        fc.assert(
          fc.property(
            fc.uuid(),
            (userId) => {
              const conversation = createConversationObject(userId);
              expect(conversation.title).toBe('New Conversation');
            }
          ),
          { numRuns: 100 }
        );
      });

      test('created conversation should have valid ISO timestamps', () => {
        fc.assert(
          fc.property(
            fc.uuid(),
            (userId) => {
              const conversation = createConversationObject(userId);
              
              // Both timestamps should be valid ISO strings
              expect(() => new Date(conversation.created_at)).not.toThrow();
              expect(() => new Date(conversation.updated_at)).not.toThrow();
              
              // Timestamps should be equal at creation
              expect(conversation.created_at).toBe(conversation.updated_at);
            }
          ),
          { numRuns: 100 }
        );
      });

      test('each created conversation should have unique ID', () => {
        fc.assert(
          fc.property(
            fc.uuid(),
            fc.integer({ min: 2, max: 10 }),
            (userId, count) => {
              const conversations = Array.from({ length: count }, () => 
                createConversationObject(userId)
              );
              
              const ids = conversations.map(c => c.conversation_id);
              const uniqueIds = new Set(ids);
              
              // All IDs should be unique
              expect(uniqueIds.size).toBe(count);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    // Test update object creation
    describe('Update Object Creation', () => {
      test('update object should trim title', () => {
        fc.assert(
          fc.property(
            // Generate strings that are already trimmed (no leading/trailing whitespace)
            fc.string({ minLength: 1, maxLength: 100 })
              .map(s => s.trim())
              .filter(s => s.length > 0),
            (title) => {
              const paddedTitle = `  ${title}  `;
              const updateObj = createConversationUpdateObject(paddedTitle);
              // After trimming the padded title, we should get back the original trimmed title
              expect(updateObj.title).toBe(title);
            }
          ),
          { numRuns: 100 }
        );
      });

      test('update object should have valid updated_at timestamp', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 100 }),
            (title) => {
              const before = new Date();
              const updateObj = createConversationUpdateObject(title);
              const after = new Date();
              
              const updatedAt = new Date(updateObj.updated_at);
              expect(updatedAt >= before).toBe(true);
              expect(updatedAt <= after).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    // Test CRUD consistency verification functions
    describe('CRUD Consistency Verification', () => {
      test('create consistency: matching conversations should be consistent', () => {
        fc.assert(
          fc.property(
            fc.uuid(),
            fc.uuid(),
            fc.string({ minLength: 1, maxLength: 100 }),
            (conversationId, userId, title) => {
              const created = {
                conversation_id: conversationId,
                user_id: userId,
                title: title
              };
              const retrieved = { ...created };
              
              expect(verifyCrudCreateConsistency(created, retrieved)).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });

      test('create consistency: mismatched IDs should be inconsistent', () => {
        fc.assert(
          fc.property(
            fc.uuid(),
            fc.uuid(),
            fc.uuid(),
            fc.string({ minLength: 1, maxLength: 100 }),
            (conversationId1, conversationId2, userId, title) => {
              fc.pre(conversationId1 !== conversationId2);
              
              const created = {
                conversation_id: conversationId1,
                user_id: userId,
                title: title
              };
              const retrieved = {
                conversation_id: conversationId2,
                user_id: userId,
                title: title
              };
              
              expect(verifyCrudCreateConsistency(created, retrieved)).toBe(false);
            }
          ),
          { numRuns: 100 }
        );
      });

      test('create consistency: null values should be inconsistent', () => {
        expect(verifyCrudCreateConsistency(null, {})).toBe(false);
        expect(verifyCrudCreateConsistency({}, null)).toBe(false);
        expect(verifyCrudCreateConsistency(null, null)).toBe(false);
      });

      test('update consistency: title change should be consistent', () => {
        fc.assert(
          fc.property(
            fc.uuid(),
            fc.string({ minLength: 1, maxLength: 100 }),
            fc.string({ minLength: 1, maxLength: 100 }),
            (conversationId, oldTitle, newTitle) => {
              const now = new Date();
              const original = {
                conversation_id: conversationId,
                title: oldTitle,
                updated_at: new Date(now.getTime() - 1000).toISOString()
              };
              const updated = {
                conversation_id: conversationId,
                title: newTitle.trim(),
                updated_at: now.toISOString()
              };
              
              expect(verifyCrudUpdateConsistency(original, updated, newTitle)).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });

      test('update consistency: wrong title should be inconsistent', () => {
        fc.assert(
          fc.property(
            fc.uuid(),
            fc.string({ minLength: 1, maxLength: 50 }),
            fc.string({ minLength: 1, maxLength: 50 }),
            fc.string({ minLength: 1, maxLength: 50 }),
            (conversationId, oldTitle, actualTitle, expectedTitle) => {
              fc.pre(actualTitle.trim() !== expectedTitle.trim());
              
              const now = new Date();
              const original = {
                conversation_id: conversationId,
                title: oldTitle,
                updated_at: new Date(now.getTime() - 1000).toISOString()
              };
              const updated = {
                conversation_id: conversationId,
                title: actualTitle,
                updated_at: now.toISOString()
              };
              
              expect(verifyCrudUpdateConsistency(original, updated, expectedTitle)).toBe(false);
            }
          ),
          { numRuns: 100 }
        );
      });

      test('update consistency: null values should be inconsistent', () => {
        expect(verifyCrudUpdateConsistency(null, {}, 'title')).toBe(false);
        expect(verifyCrudUpdateConsistency({}, null, 'title')).toBe(false);
      });

      test('delete consistency: null conversation and empty logs should be consistent', () => {
        expect(verifyCrudDeleteConsistency(null, [])).toBe(true);
        expect(verifyCrudDeleteConsistency(null, null)).toBe(true);
        expect(verifyCrudDeleteConsistency(null, undefined)).toBe(true);
      });

      test('delete consistency: existing conversation should be inconsistent', () => {
        fc.assert(
          fc.property(
            fc.record({
              conversation_id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 })
            }),
            (conversation) => {
              expect(verifyCrudDeleteConsistency(conversation, [])).toBe(false);
            }
          ),
          { numRuns: 100 }
        );
      });

      test('delete consistency: remaining chat logs should be inconsistent', () => {
        fc.assert(
          fc.property(
            fc.array(
              fc.record({
                id: fc.integer({ min: 1 }),
                message: fc.string()
              }),
              { minLength: 1, maxLength: 10 }
            ),
            (chatLogs) => {
              expect(verifyCrudDeleteConsistency(null, chatLogs)).toBe(false);
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});
