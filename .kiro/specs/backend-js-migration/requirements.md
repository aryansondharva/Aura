# Requirements Document

## Introduction

This document specifies the requirements for migrating the existing Python/Flask backend to a JavaScript/Node.js backend. The migration will preserve all existing functionality while modernizing the codebase to use Express.js, LangChain.js, and compatible JavaScript libraries for AI/ML operations, database interactions, and email services.

## Glossary

- **Backend_Server**: The Express.js application that handles HTTP requests and serves the API
- **Supabase_Client**: The JavaScript client for interacting with Supabase database
- **LLM_Service**: The service layer that interfaces with Google Gemini and Groq AI models via LangChain.js
- **Embedding_Service**: The service that generates vector embeddings using HuggingFace models
- **Pinecone_Client**: The client for vector similarity search operations
- **PDF_Processor**: The module that extracts text from PDF files and chunks it for processing
- **Quiz_Generator**: The module that generates MCQ questions from topic content using AI
- **Email_Service**: The service that sends emails via SMTP (Gmail)
- **Conversation_Manager**: The module that manages chat conversations with memory
- **ML_Model**: The XGBoost model for predicting next review dates

## Requirements

### Requirement 1: Project Setup and Configuration

**User Story:** As a developer, I want a properly configured Node.js/Express backend, so that I can run and deploy the application.

#### Acceptance Criteria

1. THE Backend_Server SHALL use Express.js as the web framework
2. THE Backend_Server SHALL load environment variables from a .env file using dotenv
3. THE Backend_Server SHALL configure CORS to allow requests from the frontend origin
4. THE Backend_Server SHALL set maximum file upload size to 5MB
5. THE Backend_Server SHALL create an uploads directory if it does not exist
6. THE Backend_Server SHALL expose a health check endpoint at GET /health

### Requirement 2: Supabase Database Integration

**User Story:** As a developer, I want to interact with Supabase database, so that I can store and retrieve application data.

#### Acceptance Criteria

1. THE Supabase_Client SHALL connect using SUPABASE_URL and SUPABASE_KEY from environment variables
2. THE Supabase_Client SHALL support CRUD operations on tables: documents, topics, quiz_questions, quiz_answers, quiz_attempts, conversations, chat_logs, users, user_topic_progress, user_topic_review_features, flashcards
3. WHEN a database operation fails, THEN THE Supabase_Client SHALL log the error and return an appropriate error response

### Requirement 3: AI/LLM Integration

**User Story:** As a user, I want the system to use AI models for chat and content generation, so that I can get intelligent responses and quiz questions.

#### Acceptance Criteria

1. THE LLM_Service SHALL integrate with Google Gemini (gemini-2.5-flash) via LangChain.js
2. THE LLM_Service SHALL integrate with Groq (llama-3.1-8b-instant and gemma2-9b-it) via LangChain.js
3. THE Conversation_Manager SHALL maintain conversation history with a sliding window of 10 messages
4. WHEN generating chat responses, THE LLM_Service SHALL use the configured temperature settings (0.7 for Gemini, 0.3 for Groq)
5. THE Embedding_Service SHALL generate embeddings using HuggingFace all-mpnet-base-v2 model

### Requirement 4: Chat Functionality

**User Story:** As a user, I want to chat with an AI assistant, so that I can get help with learning topics.

#### Acceptance Criteria

1. WHEN a user sends a message to POST /chat, THE Backend_Server SHALL return an AI-generated response
2. WHEN a new conversation starts, THE Conversation_Manager SHALL create a conversation record in Supabase
3. WHEN the first message is sent in a conversation, THE Conversation_Manager SHALL generate a smart title using AI
4. THE Backend_Server SHALL store all chat messages in the chat_logs table with user_id, conversation_id, and timestamps
5. WHEN a user sends a message to POST /ask, THE Backend_Server SHALL route to summary, question generation, or document Q&A based on keywords

### Requirement 5: File Upload and PDF Processing

**User Story:** As a user, I want to upload PDF files, so that I can study from my documents.

#### Acceptance Criteria

1. WHEN a user uploads a file to POST /upload, THE PDF_Processor SHALL extract text from the PDF
2. THE PDF_Processor SHALL split text into chunks of 500 characters with 50 character overlap
3. THE PDF_Processor SHALL generate embeddings for each chunk and store in Supabase documents table
4. THE PDF_Processor SHALL upsert vectors to Pinecone for similarity search
5. WHEN a duplicate file is uploaded (same hash), THE Backend_Server SHALL return a 409 conflict response
6. IF the file type is not allowed (pdf, doc, docx, txt), THEN THE Backend_Server SHALL return a 400 error
7. THE PDF_Processor SHALL delete the uploaded file after processing

### Requirement 6: Quiz Topic Generation

**User Story:** As a user, I want to upload a PDF and have topics extracted, so that I can take quizzes on specific topics.

#### Acceptance Criteria

1. WHEN a user uploads a file to POST /quiz-question, THE PDF_Processor SHALL extract and cluster content into topics
2. THE PDF_Processor SHALL use agglomerative clustering on embeddings to group related content
3. THE PDF_Processor SHALL generate topic titles (max 5 words) and summaries using AI
4. THE PDF_Processor SHALL skip similar topic titles (>80% similarity) to avoid duplicates
5. THE PDF_Processor SHALL store topics in the topics table with merged_content, title, and summary
6. IF the number of topic groups exceeds 30, THEN THE Backend_Server SHALL return a warning about rate limits

### Requirement 7: Quiz Question Generation

**User Story:** As a user, I want to generate quiz questions from topics, so that I can test my knowledge.

#### Acceptance Criteria

1. WHEN a user requests POST /generate-questions, THE Quiz_Generator SHALL generate 10 MCQ questions
2. THE Quiz_Generator SHALL support difficulty modes: easy, medium, hard
3. THE Quiz_Generator SHALL include previously incorrect questions (up to 4) from the user's last attempt
4. THE Quiz_Generator SHALL store questions in quiz_questions table with prompt, answer, options, and explanation
5. THE Quiz_Generator SHALL distribute correct answers randomly among A, B, C, D options

### Requirement 8: Quiz Submission and Evaluation

**User Story:** As a user, I want to submit quiz answers and get my score, so that I can track my progress.

#### Acceptance Criteria

1. WHEN a user submits answers to POST /submit-answers, THE Backend_Server SHALL evaluate correctness against stored answers
2. THE Backend_Server SHALL calculate score as (correct_count / total_questions) * 10
3. THE Backend_Server SHALL store the attempt in quiz_attempts and answers in quiz_answers tables
4. THE Backend_Server SHALL update user_topic_progress with last_score, attempts_count, and mastered status
5. THE Backend_Server SHALL update topic_status to "Completed" if score > 7, otherwise "Weak"
6. THE Backend_Server SHALL use the ML model to predict next_review_date based on user performance
7. WHEN email_id is provided, THE Email_Service SHALL send a quiz results email to the user

### Requirement 9: Progress Tracking

**User Story:** As a user, I want to view my quiz progress, so that I can see how I'm improving.

#### Acceptance Criteria

1. WHEN a user requests GET /api/progress/:user_id, THE Backend_Server SHALL return all quiz attempts and topic metadata
2. THE Backend_Server SHALL return attempts ordered by submitted_at descending
3. WHEN a user requests GET /api/answer-analysis, THE Backend_Server SHALL return detailed question-by-question analysis for a specific attempt

### Requirement 10: Conversation Management

**User Story:** As a user, I want to manage my chat conversations, so that I can organize my learning sessions.

#### Acceptance Criteria

1. WHEN a user requests GET /api/conversations, THE Backend_Server SHALL return all conversations for the user
2. WHEN a user requests POST /api/conversations, THE Backend_Server SHALL create a new conversation
3. WHEN a user requests PUT /api/conversations/:id, THE Backend_Server SHALL rename the conversation
4. WHEN a user requests DELETE /api/conversations/:id, THE Backend_Server SHALL delete the conversation and its chat logs
5. WHEN a user requests GET /api/conversations/:id/logs, THE Backend_Server SHALL return all chat messages for that conversation

### Requirement 11: Flashcard Generation

**User Story:** As a user, I want to generate flashcards from my quiz attempts, so that I can review key concepts.

#### Acceptance Criteria

1. WHEN a user requests POST /api/generate_flashcards, THE Backend_Server SHALL generate 10 flashcards from quiz questions
2. THE Backend_Server SHALL prioritize incorrect answers (up to 8) when selecting questions for flashcards
3. THE Backend_Server SHALL generate flashcards with core_concept, key_theory, and common_mistake fields
4. THE Backend_Server SHALL store flashcards in the flashcards table
5. IF flashcards already exist for the attempt, THE Backend_Server SHALL return the existing flashcards

### Requirement 12: Weak Topics Update

**User Story:** As a user, I want overdue topics to be marked as weak, so that I know what to review.

#### Acceptance Criteria

1. WHEN a user requests POST /api/update-weak-topics, THE Backend_Server SHALL find topics with next_review_date before today
2. THE Backend_Server SHALL update topic_status to "Weak" for overdue topics
3. THE Backend_Server SHALL reset the score to 0 for the latest attempt of overdue topics

### Requirement 13: Email Service

**User Story:** As a user, I want to receive email notifications, so that I can track my quiz results.

#### Acceptance Criteria

1. THE Email_Service SHALL connect to Gmail SMTP using GMAIL_USER and GMAIL_APP_PASSWORD
2. THE Email_Service SHALL send HTML-formatted emails asynchronously
3. WHEN sending an email fails, THE Email_Service SHALL log the error without crashing the application

### Requirement 14: ML Model Integration

**User Story:** As a system, I want to predict optimal review dates, so that users can learn efficiently.

#### Acceptance Criteria

1. THE Backend_Server SHALL load the XGBoost model from a file
2. THE ML_Model SHALL accept features: latest_score, avg_score, attempts_count, days_since_last_attempt
3. THE ML_Model SHALL predict the number of days until the next review
4. THE Backend_Server SHALL update next_review_date in user_topic_review_features table

### Requirement 15: Vector Search Integration

**User Story:** As a user, I want to search my documents semantically, so that I can find relevant information.

#### Acceptance Criteria

1. THE Pinecone_Client SHALL connect using PINECONE_API_KEY from environment variables
2. THE Pinecone_Client SHALL use the "document-index" index with 768 dimensions and cosine metric
3. WHEN a user asks a question about their documents, THE Backend_Server SHALL query Pinecone for similar chunks
4. THE Backend_Server SHALL filter Pinecone results by user_id
5. THE Backend_Server SHALL fetch full chunk content from Supabase and pass to LLM for answer generation
