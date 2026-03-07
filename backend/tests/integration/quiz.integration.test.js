/**
 * Integration Tests for Quiz Flow
 * Tests: generate questions → submit answers → verify scoring
 * Requirements: 7.1, 8.1, 8.2, 8.3
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

describe('Quiz Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock for Gemini - generate MCQ questions
    mockGeminiInvoke.mockResolvedValue({ 
      content: `Question 1: What is the capital of France?
A) London
B) Paris
C) Berlin
D) Madrid
Answer: B - Paris
Explanation: Paris is the capital city of France.

Question 2: What is 2 + 2?
A) 3
B) 4
C) 5
D) 6
Answer: B - 4
Explanation: Basic arithmetic.`
    });
    
    // Setup default mock implementations for Supabase
    mockSupabaseFrom.mockImplementation((table) => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null, data: null });
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          }),
          single: jest.fn().mockResolvedValue({ 
            data: { merged_content: 'Topic content for quiz generation', title: 'Test Topic' }, 
            error: null 
          }),
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

  describe('POST /api/generate-questions - Quiz Question Generation', () => {
    /**
     * Test: Generate MCQ questions from topic
     * Requirements: 7.1
     */
    it('should generate MCQ questions for a topic', async () => {
      const response = await request(app)
        .post('/api/generate-questions')
        .send({
          topic_id: 'test-topic-123',
          user_id: 'test-user-123',
          difficulty_mode: 'medium'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('questions');
      expect(Array.isArray(response.body.questions)).toBe(true);
    });

    /**
     * Test: Return 400 for missing topic_id
     */
    it('should return 400 for missing topic_id', async () => {
      const response = await request(app)
        .post('/api/generate-questions')
        .send({
          user_id: 'test-user-123',
          difficulty_mode: 'medium'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Topic ID');
    });

    /**
     * Test: Return 400 for invalid difficulty mode
     */
    it('should return 400 for invalid difficulty mode', async () => {
      const response = await request(app)
        .post('/api/generate-questions')
        .send({
          topic_id: 'test-topic-123',
          user_id: 'test-user-123',
          difficulty_mode: 'invalid'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('difficulty');
    });

    /**
     * Test: Support different difficulty modes
     * Requirements: 7.2
     */
    it('should support easy difficulty mode', async () => {
      const response = await request(app)
        .post('/api/generate-questions')
        .send({
          topic_id: 'test-topic-123',
          user_id: 'test-user-123',
          difficulty_mode: 'easy'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should support hard difficulty mode', async () => {
      const response = await request(app)
        .post('/api/generate-questions')
        .send({
          topic_id: 'test-topic-123',
          user_id: 'test-user-123',
          difficulty_mode: 'hard'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('POST /api/submit-answers - Quiz Submission', () => {
    /**
     * Test: Submit answers and calculate score
     * Requirements: 8.1, 8.2
     */
    it('should evaluate answers and calculate score', async () => {
      // Mock quiz questions in database
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'quiz_questions') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [
                  { question_id: 'q1', answer: 'A', answer_option_text: ['Option A', 'Option B', 'Option C', 'Option D'], prompt: 'Question 1' },
                  { question_id: 'q2', answer: 'B', answer_option_text: ['Option A', 'Option B', 'Option C', 'Option D'], prompt: 'Question 2' }
                ],
                error: null
              })
            }),
            insert: jest.fn().mockResolvedValue({ error: null })
          };
        }
        if (table === 'topics') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { title: 'Test Topic' }, error: null })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null })
            })
          };
        }
        if (table === 'user_topic_progress' || table === 'user_topic_review_features') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null, error: null })
                })
              })
            }),
            insert: jest.fn().mockResolvedValue({ error: null }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null })
              })
            })
          };
        }
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null })
            })
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
          })
        };
      });

      const response = await request(app)
        .post('/api/submit-answers')
        .send({
          user_id: 'test-user-123',
          topic_id: 'test-topic-123',
          submitted_answers: [
            { question_id: 'q1', selected_answer: 'A' },
            { question_id: 'q2', selected_answer: 'B' }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('score');
      expect(response.body).toHaveProperty('total_questions', 2);
      expect(response.body).toHaveProperty('correct_answers', 2);
      // Score should be (2/2) * 10 = 10
      expect(response.body.score).toBe(10);
    });

    /**
     * Test: Calculate partial score
     */
    it('should calculate partial score for mixed answers', async () => {
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'quiz_questions') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [
                  { question_id: 'q1', answer: 'A', answer_option_text: ['A', 'B', 'C', 'D'], prompt: 'Q1' },
                  { question_id: 'q2', answer: 'B', answer_option_text: ['A', 'B', 'C', 'D'], prompt: 'Q2' }
                ],
                error: null
              })
            }),
            insert: jest.fn().mockResolvedValue({ error: null })
          };
        }
        if (table === 'topics') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { title: 'Test Topic' }, error: null })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null })
            })
          };
        }
        if (table === 'user_topic_progress' || table === 'user_topic_review_features') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null, error: null })
                })
              })
            }),
            insert: jest.fn().mockResolvedValue({ error: null }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null })
              })
            })
          };
        }
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null })
            })
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
          })
        };
      });

      const response = await request(app)
        .post('/api/submit-answers')
        .send({
          user_id: 'test-user-123',
          topic_id: 'test-topic-123',
          submitted_answers: [
            { question_id: 'q1', selected_answer: 'A' }, // Correct
            { question_id: 'q2', selected_answer: 'C' }  // Wrong (should be B)
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.correct_answers).toBe(1);
      // Score should be (1/2) * 10 = 5
      expect(response.body.score).toBe(5);
    });

    /**
     * Test: Store attempt in database
     * Requirements: 8.3
     */
    it('should store quiz attempt in database', async () => {
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'quiz_questions') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [{ question_id: 'q1', answer: 'A', answer_option_text: ['A', 'B', 'C', 'D'], prompt: 'Q1' }],
                error: null
              })
            }),
            insert: jest.fn().mockResolvedValue({ error: null })
          };
        }
        if (table === 'topics') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { title: 'Test Topic' }, error: null })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null })
            })
          };
        }
        if (table === 'user_topic_progress' || table === 'user_topic_review_features') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null, error: null })
                })
              })
            }),
            insert: jest.fn().mockResolvedValue({ error: null }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null })
              })
            })
          };
        }
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null })
            })
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
          })
        };
      });

      const response = await request(app)
        .post('/api/submit-answers')
        .send({
          user_id: 'test-user-123',
          topic_id: 'test-topic-123',
          submitted_answers: [
            { question_id: 'q1', selected_answer: 'A' }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('attempt_id');
      // Verify quiz_attempts table was accessed
      expect(mockSupabaseFrom).toHaveBeenCalledWith('quiz_attempts');
      // Verify quiz_answers table was accessed
      expect(mockSupabaseFrom).toHaveBeenCalledWith('quiz_answers');
    });

    /**
     * Test: Return 400 for missing user_id
     */
    it('should return 400 for missing user_id', async () => {
      const response = await request(app)
        .post('/api/submit-answers')
        .send({
          topic_id: 'test-topic-123',
          submitted_answers: [{ question_id: 'q1', selected_answer: 'A' }]
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('User ID');
    });

    /**
     * Test: Return 400 for missing topic_id
     */
    it('should return 400 for missing topic_id', async () => {
      const response = await request(app)
        .post('/api/submit-answers')
        .send({
          user_id: 'test-user-123',
          submitted_answers: [{ question_id: 'q1', selected_answer: 'A' }]
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Topic ID');
    });

    /**
     * Test: Return 400 for missing submitted_answers
     */
    it('should return 400 for missing submitted_answers', async () => {
      const response = await request(app)
        .post('/api/submit-answers')
        .send({
          user_id: 'test-user-123',
          topic_id: 'test-topic-123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    /**
     * Test: Return topic status based on score
     * Requirements: 8.5
     */
    it('should return Completed status for score > 7', async () => {
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'quiz_questions') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [
                  { question_id: 'q1', answer: 'A', answer_option_text: ['A', 'B', 'C', 'D'], prompt: 'Q1' }
                ],
                error: null
              })
            }),
            insert: jest.fn().mockResolvedValue({ error: null })
          };
        }
        if (table === 'topics') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { title: 'Test Topic' }, error: null })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null })
            })
          };
        }
        if (table === 'user_topic_progress' || table === 'user_topic_review_features') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null, error: null })
                })
              })
            }),
            insert: jest.fn().mockResolvedValue({ error: null }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null })
              })
            })
          };
        }
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null })
            })
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
          })
        };
      });

      const response = await request(app)
        .post('/api/submit-answers')
        .send({
          user_id: 'test-user-123',
          topic_id: 'test-topic-123',
          submitted_answers: [
            { question_id: 'q1', selected_answer: 'A' } // 100% correct = score 10
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.topic_status).toBe('Completed');
    });
  });

  describe('GET /api/answer-analysis - Answer Analysis', () => {
    /**
     * Test: Get detailed answer analysis
     * Requirements: 9.3
     */
    it('should return detailed answer analysis for an attempt', async () => {
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'quiz_attempts') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ 
                    data: { attempt_id: 'attempt-123', user_id: 'test-user-123' }, 
                    error: null 
                  })
                })
              })
            })
          };
        }
        if (table === 'quiz_answers') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [
                  { question_id: 'q1', selected_answer: 'A', is_correct: true, selected_answer_text: 'Option A' }
                ],
                error: null
              })
            })
          };
        }
        if (table === 'quiz_questions') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [
                  { question_id: 'q1', prompt: 'Question 1', answer: 'A', answer_option_text: ['A', 'B', 'C', 'D'], explanation: 'Explanation' }
                ],
                error: null
              })
            })
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        };
      });

      const response = await request(app)
        .get('/api/answer-analysis')
        .query({ attempt_id: 'attempt-123', user_id: 'test-user-123' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('attempt_id', 'attempt-123');
      expect(response.body).toHaveProperty('analysis');
      expect(Array.isArray(response.body.analysis)).toBe(true);
    });

    /**
     * Test: Return 400 for missing attempt_id
     */
    it('should return 400 for missing attempt_id', async () => {
      const response = await request(app)
        .get('/api/answer-analysis')
        .query({ user_id: 'test-user-123' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Attempt ID');
    });
  });
});
