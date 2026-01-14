# Implementation Plan: Backend JavaScript Migration

## Overview

This implementation plan migrates the Python/Flask backend to JavaScript/Node.js using Express.js. Tasks are organized to build incrementally, starting with project setup, then core services, routes, and finally integration testing.

## Tasks

- [x] 1. Project Setup and Configuration
  - [x] 1.1 Initialize Node.js project with package.json and install dependencies
    - Create package.json with all required dependencies
    - Install express, cors, dotenv, multer, @supabase/supabase-js, @pinecone-database/pinecone
    - Install @langchain/core, @langchain/google-genai, @langchain/groq, @langchain/community, langchain
    - Install pdf-parse, nodemailer, xgboost-scorer, uuid
    - Install dev dependencies: jest, fast-check, supertest
    - _Requirements: 1.1, 1.2_
  
  - [x] 1.2 Create project directory structure
    - Create src/, src/routes/, src/services/, src/utils/, src/middleware/, src/config/
    - Create tests/, tests/unit/, tests/property/, tests/integration/
    - Create uploads/ directory
    - _Requirements: 1.5_
  
  - [x] 1.3 Create configuration module (src/config/index.js)
    - Load environment variables using dotenv
    - Export configuration object with all env vars
    - _Requirements: 1.2_
  
  - [x] 1.4 Create Express app entry point (src/app.js)
    - Configure Express with JSON parsing
    - Configure CORS with dynamic origin from env
    - Configure static file serving for uploads
    - Set up error handling middleware
    - Create health check endpoint
    - _Requirements: 1.1, 1.3, 1.6_

- [x] 2. Database and External Service Clients
  - [x] 2.1 Create Supabase client utility (src/utils/supabase.js)
    - Initialize Supabase client with URL and key from config
    - Export client instance
    - _Requirements: 2.1_
  
  - [x] 2.2 Create Pinecone client utility (src/utils/pinecone.js)
    - Initialize Pinecone client with API key
    - Connect to document-index
    - Create index if not exists (768 dimensions, cosine metric)
    - _Requirements: 15.1, 15.2_

- [x] 3. Core Services Implementation
  - [x] 3.1 Implement LLM Service (src/services/llmService.js)
    - Initialize ChatGoogleGenerativeAI with gemini-2.5-flash model
    - Initialize ChatGroq with llama-3.1-8b-instant and gemma2-9b-it models
    - Implement message history management with sliding window of 10
    - Implement chat method with history
    - Implement generateTitle method
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [x] 3.2 Write property test for conversation history sliding window
    - **Property 2: Conversation History Sliding Window**
    - **Validates: Requirements 3.3**
  
  - [x] 3.3 Implement Embedding Service (src/services/embeddingService.js)
    - Initialize HuggingFaceInferenceEmbeddings with all-mpnet-base-v2
    - Implement embedDocuments method
    - Implement embedQuery method
    - _Requirements: 3.5_
  
  - [x] 3.4 Write property test for embedding dimensionality
    - **Property 3: Embedding Dimensionality**
    - **Validates: Requirements 3.5**
  
  - [x] 3.5 Implement PDF Processor Service (src/services/pdfProcessor.js)
    - Implement text extraction using pdf-parse
    - Implement text chunking with RecursiveCharacterTextSplitter (500 chars, 50 overlap)
    - Implement processForChat method (extract, chunk, embed, store, cleanup)
    - Implement processForQuiz method (extract, cluster, generate topics)
    - Implement file hash calculation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 3.6 Write property test for PDF text chunking
    - **Property 7: PDF Text Chunking**
    - **Validates: Requirements 5.1, 5.2**
  
  - [x] 3.7 Implement Quiz Generator Service (src/services/quizGenerator.js)
    - Implement MCQ prompt template
    - Implement parseResponse method for MCQ extraction
    - Implement generateMCQs method
    - Implement getPreviousMistakes method
    - Implement saveQuestions method
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [x] 3.8 Write property test for quiz question generation
    - **Property 12: Quiz Question Generation**
    - **Validates: Requirements 7.1, 7.5**
  
  - [x] 3.9 Implement ML Model Service (src/services/mlModelService.js)
    - Load XGBoost model from JSON file
    - Implement predictNextReviewDays method
    - _Requirements: 14.1, 14.2, 14.3_
  
  - [x] 3.10 Write property test for ML model prediction
    - **Property 20: ML Model Prediction**
    - **Validates: Requirements 14.2, 14.3**
  
  - [x] 3.11 Implement Email Service (src/services/emailService.js)
    - Configure Nodemailer with Gmail SMTP
    - Implement sendEmail method
    - Implement sendEmailAsync method (fire and forget)
    - Implement quiz results email template
    - _Requirements: 13.1, 13.2, 13.3_

- [x] 4. Checkpoint - Core Services
  - Ensure all services are implemented and unit tests pass
  - Ask the user if questions arise

- [x] 5. Middleware Implementation
  - [x] 5.1 Create file upload middleware (src/middleware/upload.js)
    - Configure Multer with 5MB limit
    - Configure allowed file types filter
    - _Requirements: 1.4, 5.6_
  
  - [x] 5.2 Write property test for file size validation
    - **Property 1: File Size Validation**
    - **Validates: Requirements 1.4**
  
  - [x] 5.3 Create error handler middleware (src/middleware/errorHandler.js)
    - Handle file size errors (413)
    - Handle validation errors (400)
    - Handle generic errors (500)
    - _Requirements: Error Handling section_

- [x] 6. Route Implementation - Chat
  - [x] 6.1 Implement chat routes (src/routes/chatRoutes.js)
    - POST /chat - General chat with AI
    - POST /ask - Document-aware chat with keyword routing
    - Implement keyword detection for summary/questions/Q&A routing
    - Implement chat log storage
    - Implement conversation creation and title generation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 6.2 Write property test for message routing
    - **Property 6: Message Routing by Keywords**
    - **Validates: Requirements 4.5**
  
  - [x] 6.3 Write property test for chat response generation
    - **Property 4: Chat Response Generation**
    - **Validates: Requirements 4.1**

- [x] 7. Route Implementation - File Upload
  - [x] 7.1 Implement file routes (src/routes/fileRoutes.js)
    - POST /upload - Upload PDF for chat
    - POST /quiz-question - Upload PDF for quiz topics
    - Implement duplicate file detection
    - Implement file type validation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [x] 7.2 Write property test for duplicate file detection
    - **Property 9: Duplicate File Detection**
    - **Validates: Requirements 5.5**
  
  - [x] 7.3 Write property test for file type validation
    - **Property 10: File Type Validation**
    - **Validates: Requirements 5.6**

- [x] 8. Route Implementation - Quiz
  - [x] 8.1 Implement quiz routes (src/routes/quizRoutes.js)
    - POST /generate-questions - Generate MCQ questions
    - POST /submit-answers - Submit and evaluate quiz
    - GET /api/answer-analysis - Get detailed answer analysis
    - POST /api/update-weak-topics - Update overdue topics
    - POST /api/generate_flashcards - Generate flashcards
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 9.3, 11.1, 11.2, 11.3, 11.4, 11.5, 12.1, 12.2, 12.3_
  
  - [x] 8.2 Write property test for quiz scoring
    - **Property 13: Quiz Scoring Calculation**
    - **Validates: Requirements 8.1, 8.2**
  
  - [x] 8.3 Write property test for quiz submission state updates
    - **Property 14: Quiz Submission State Updates**
    - **Validates: Requirements 8.3, 8.4, 8.5**
  
  - [x] 8.4 Write property test for flashcard generation
    - **Property 17: Flashcard Generation**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**
  
  - [x] 8.5 Write property test for weak topic updates
    - **Property 18: Weak Topic Updates**
    - **Validates: Requirements 12.1, 12.2, 12.3**

- [x] 9. Route Implementation - Progress
  - [x] 9.1 Implement progress routes (src/routes/progressRoutes.js)
    - GET /api/progress/:user_id - Get user progress
    - _Requirements: 9.1, 9.2_
  
  - [x] 9.2 Write property test for progress ordering
    - **Property 15: Progress Retrieval Ordering**
    - **Validates: Requirements 9.1, 9.2**

- [x] 10. Route Implementation - Conversations
  - [x] 10.1 Implement conversation routes (src/routes/conversationRoutes.js)
    - GET /api/conversations - List user conversations
    - POST /api/conversations - Create conversation
    - PUT /api/conversations/:id - Rename conversation
    - DELETE /api/conversations/:id - Delete conversation
    - GET /api/conversations/:id/logs - Get chat logs
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [x] 10.2 Write property test for conversation CRUD
    - **Property 16: Conversation CRUD Consistency**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

- [x] 11. Checkpoint - Routes Complete
  - Ensure all routes are implemented
  - Ensure all unit tests pass
  - Ask the user if questions arise

- [x] 12. Integration and Wiring
  - [x] 12.1 Wire all routes to Express app
    - Register all route modules in app.js
    - Configure route prefixes
    - _Requirements: All route requirements_
  
  - [x] 12.2 Create server entry point (src/server.js)
    - Import app from app.js
    - Start server on configured port
    - Log startup message
    - _Requirements: 1.1_
  
  - [x] 12.3 Convert XGBoost model from .pkl to JSON format
    - Create Python script to export model as JSON
    - Save as model.json in project root
    - _Requirements: 14.1_
  
  - [x] 12.4 Create .env.example file
    - Document all required environment variables
    - _Requirements: 1.2_
  
  - [x] 12.5 Update frontend .env to use new backend URL
    - Move VITE_BACKEND_URL to frontend/.env if needed
    - _Requirements: Environment configuration_

- [x] 13. Integration Tests
  - [x] 13.1 Write integration test for chat flow
    - Test send message → receive response → verify storage
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 13.2 Write integration test for file upload flow
    - Test upload PDF → verify chunks in DB → verify vectors in Pinecone
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 13.3 Write integration test for quiz flow
    - Test generate questions → submit answers → verify scoring
    - _Requirements: 7.1, 8.1, 8.2, 8.3_

- [x] 14. Final Checkpoint
  - Ensure all tests pass
  - Verify all endpoints work correctly
  - Ask the user if questions arise

## Notes

- All tasks including tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The XGBoost model needs to be converted from Python .pkl format to JSON for use with xgboost-scorer
