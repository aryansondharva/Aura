/**
 * Integration Tests for Chat Flow
 * Tests: send message → receive response → verify storage
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Create mock functions
const mockSupabaseFrom = jest.fn();
const mockPineconeQuery = jest.fn();
const mockPineconeUpsert = jest.fn();
const mockGeminiInvoke = jest.fn();

// Mock all external dependencies before any imports
jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockSupabaseFrom
  }))
}));

jest.unstable_mockModule('@pinecone-database/pinecone', () => ({
  Pinecone: jest.fn().mockImplementation(() => ({
    listIndexes: jest.fn().mockResolvedValue({ indexes: [{ name: 'document-index' }] }),
    index: jest.fn().mockReturnValue({
      query: mockPineconeQuery,
      upsert: mockPineconeUpsert
    }),
    createIndex: jest.fn()
  }))
}));

jest.unstable_mockModule('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    invoke: mockGeminiInvoke
  }))
}));

jest.unstable_mockModule('@langchain/groq', () => ({
  ChatGroq: jest.fn().mockImplementation(() => ({
    invoke: jest.fn().mockResolvedValue({ content: 'Groq response' })
  }))
}));

jest.unstable_mockModule('@huggingface/inference', () => ({
  HfInference: jest.fn().mockImplementation(() => ({
    featureExtraction: jest.fn().mockResolvedValue(new Array(768).fill(0.1))
  }))
}));

jest.unstable_mockModule('pdf-parse', () => ({
  default: jest.fn().mockResolvedValue({ text: 'PDF content' })
}));

jest.unstable_mockModule('nodemailer', () => ({
  default: {
    createTransport: jest.fn().mockReturnValue({
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
    })
  }
}));

// Now import the app and supertest
const request = (await import('supertest')).default;
const { default: app } = await import('../../src/app.js');

describe('Chat Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock for Gemini
    mockGeminiInvoke.mockResolvedValue({ content: 'AI generated response' });
    
    // Setup default mock implementations for Supabase
    mockSupabaseFrom.mockImplementation((table) => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null, data: null });
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          }),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
          limit: jest.fn().mockResolvedValue({ data: [], error: null })
        }),
        in: jest.fn().mockResolvedValue({ data: [], error: null })
      });
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null })
      });
      
      return {
        insert: mockInsert,
        select: mockSelect,
        update: mockUpdate
      };
    });
    
    // Setup default mock for Pinecone
    mockPineconeQuery.mockResolvedValue({ matches: [] });
  });

  describe('POST /api/chat - General Chat', () => {
    /**
     * Test: Send message and receive AI response
     * Requirements: 4.1
     */
    it('should return AI-generated response for valid message', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Hello, how are you?',
          user_id: 'test-user-123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
      expect(typeof response.body.response).toBe('string');
      expect(response.body.response.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('conversation_id');
    });

    /**
     * Test: Create new conversation when not provided
     * Requirements: 4.2
     */
    it('should create new conversation when conversation_id not provided', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Start a new conversation',
          user_id: 'test-user-123'
        });

      expect(response.status).toBe(200);
      expect(response.body.conversation_id).toBeDefined();
      expect(typeof response.body.conversation_id).toBe('string');
      // Verify conversation was created (supabase.from('conversations') was called)
      expect(mockSupabaseFrom).toHaveBeenCalledWith('conversations');
    });

    /**
     * Test: Store chat messages in database
     * Requirements: 4.4
     */
    it('should store chat messages in chat_logs table', async () => {
      await request(app)
        .post('/api/chat')
        .send({
          message: 'Store this message',
          user_id: 'test-user-123'
        });

      // Verify chat_logs insert was called
      expect(mockSupabaseFrom).toHaveBeenCalledWith('chat_logs');
    });

    /**
     * Test: Return 400 for empty message
     */
    it('should return 400 for empty message', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: '',
          user_id: 'test-user-123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    /**
     * Test: Return 400 for missing message
     */
    it('should return 400 for missing message', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          user_id: 'test-user-123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    /**
     * Test: Chat works without user_id (anonymous chat)
     */
    it('should work without user_id for anonymous chat', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Anonymous message'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
    });
  });

  describe('POST /api/ask - Document-aware Chat', () => {
    /**
     * Test: Return 400 for missing user_id
     */
    it('should return 400 for missing user_id', async () => {
      const response = await request(app)
        .post('/api/ask')
        .send({
          message: 'What is in my document?'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('User ID');
    });

    /**
     * Test: Return 400 for empty message
     */
    it('should return 400 for empty message', async () => {
      const response = await request(app)
        .post('/api/ask')
        .send({
          message: '',
          user_id: 'test-user-123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    /**
     * Test: Handle document query with no documents found
     */
    it('should handle query when no documents found', async () => {
      mockPineconeQuery.mockResolvedValue({ matches: [] });

      const response = await request(app)
        .post('/api/ask')
        .send({
          message: 'What is in my document?',
          user_id: 'test-user-123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
      expect(response.body).toHaveProperty('documents_found', 0);
    });
  });
});
