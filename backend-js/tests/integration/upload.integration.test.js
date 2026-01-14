/**
 * Integration Tests for File Upload Flow
 * Tests: upload PDF → verify chunks in DB → verify vectors in Pinecone
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create mock functions
const mockSupabaseFrom = jest.fn();
const mockPineconeQuery = jest.fn();
const mockPineconeUpsert = jest.fn();
const mockGeminiInvoke = jest.fn();
const mockPdfParse = jest.fn();
const mockEmbedDocuments = jest.fn();

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
    featureExtraction: mockEmbedDocuments
  }))
}));

jest.unstable_mockModule('pdf-parse', () => ({
  default: mockPdfParse
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

// Create a test PDF file
const testPdfPath = path.join(__dirname, 'test-upload.pdf');

describe('File Upload Flow Integration Tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Create a minimal test file (not a real PDF, but enough for testing)
    await fs.writeFile(testPdfPath, 'Test PDF content for integration testing');
    
    // Setup default mock for PDF parsing
    mockPdfParse.mockResolvedValue({ 
      text: 'This is the extracted text from the PDF document. It contains multiple sentences that will be chunked for processing. The content is educational and covers various topics for learning purposes.' 
    });
    
    // Setup default mock for embeddings - return array of embeddings
    mockEmbedDocuments.mockResolvedValue(new Array(768).fill(0.1));
    
    // Setup default mock for Gemini
    mockGeminiInvoke.mockResolvedValue({ content: 'AI generated response' });
    
    // Setup default mock for Pinecone
    mockPineconeUpsert.mockResolvedValue({ upsertedCount: 1 });
    
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
  });

  afterAll(async () => {
    // Cleanup test file
    try {
      await fs.unlink(testPdfPath);
    } catch (e) {
      // File may already be deleted
    }
  });

  describe('POST /api/upload - PDF Upload for Chat', () => {
    /**
     * Test: Upload PDF and extract text
     * Requirements: 5.1
     */
    it('should extract text from uploaded PDF', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('file', testPdfPath)
        .field('user_id', 'test-user-123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(mockPdfParse).toHaveBeenCalled();
    });

    /**
     * Test: Split text into chunks
     * Requirements: 5.2
     */
    it('should split text into chunks and return chunk count', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('file', testPdfPath)
        .field('user_id', 'test-user-123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('chunkCount');
      expect(response.body.chunkCount).toBeGreaterThan(0);
    });

    /**
     * Test: Store chunks in Supabase documents table
     * Requirements: 5.3
     */
    it('should store chunks in Supabase documents table', async () => {
      await request(app)
        .post('/api/upload')
        .attach('file', testPdfPath)
        .field('user_id', 'test-user-123');

      // Verify documents table was accessed
      expect(mockSupabaseFrom).toHaveBeenCalledWith('documents');
    });

    /**
     * Test: Upsert vectors to Pinecone
     * Requirements: 5.4
     */
    it('should upsert vectors to Pinecone', async () => {
      await request(app)
        .post('/api/upload')
        .attach('file', testPdfPath)
        .field('user_id', 'test-user-123');

      // Verify Pinecone upsert was called
      expect(mockPineconeUpsert).toHaveBeenCalled();
    });

    /**
     * Test: Return file info on successful upload
     */
    it('should return file info on successful upload', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('file', testPdfPath)
        .field('user_id', 'test-user-123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('fileName');
      expect(response.body).toHaveProperty('fileUuid');
    });

    /**
     * Test: Return 400 for missing file
     */
    it('should return 400 for missing file', async () => {
      const response = await request(app)
        .post('/api/upload')
        .field('user_id', 'test-user-123');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    /**
     * Test: Return 400 for missing user_id
     */
    it('should return 400 for missing user_id', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('file', testPdfPath);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('User ID');
    });

    /**
     * Test: Detect duplicate file upload
     * Requirements: 5.5
     */
    it('should return 409 for duplicate file upload', async () => {
      // Mock Supabase to return existing document with same hash
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'documents') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ 
                    data: [{ id: 1 }], // Existing document found
                    error: null 
                  })
                })
              })
            }),
            insert: jest.fn().mockResolvedValue({ error: null })
          };
        }
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        };
      });

      const response = await request(app)
        .post('/api/upload')
        .attach('file', testPdfPath)
        .field('user_id', 'test-user-123');

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('already uploaded');
    });

    /**
     * Test: Handle empty PDF
     */
    it('should return error for empty PDF', async () => {
      mockPdfParse.mockResolvedValue({ text: '' });

      const response = await request(app)
        .post('/api/upload')
        .attach('file', testPdfPath)
        .field('user_id', 'test-user-123');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/quiz-question - PDF Upload for Quiz Topics', () => {
    /**
     * Test: Upload PDF and generate topics
     * Requirements: 6.1
     */
    it('should process PDF and generate topics', async () => {
      // Mock topic generation
      mockGeminiInvoke.mockResolvedValue({ content: 'Topic Title' });

      const response = await request(app)
        .post('/api/quiz-question')
        .attach('file', testPdfPath)
        .field('user_id', 'test-user-123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('topics');
    });

    /**
     * Test: Return 400 for missing user_id
     */
    it('should return 400 for missing user_id', async () => {
      const response = await request(app)
        .post('/api/quiz-question')
        .attach('file', testPdfPath);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('User ID');
    });

    /**
     * Test: Return 400 for missing file
     */
    it('should return 400 for missing file', async () => {
      const response = await request(app)
        .post('/api/quiz-question')
        .field('user_id', 'test-user-123');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});
