-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    email TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    chunk_id TEXT UNIQUE,
    content TEXT,
    metadata JSONB,
    filename TEXT,
    file_uuid UUID,
    user_id UUID,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    hash_file TEXT
);

-- Topics table
CREATE TABLE topics (
    topic_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    document_for_quiz_id UUID,
    title TEXT,
    merged_content TEXT,
    topic_summary TEXT,
    topic_status TEXT DEFAULT 'Not Started',
    file_name TEXT,
    hash_file TEXT,
    archive_status TEXT DEFAULT 'not_archived',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz Questions table
CREATE TABLE quiz_questions (
    question_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    concept_id UUID,
    prompt TEXT,
    answer CHAR(1),
    answer_option_text JSONB,
    explanation TEXT,
    question_text TEXT,
    options JSONB,
    correct_answer TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz Attempts table
CREATE TABLE quiz_attempts (
    attempt_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    topic_id UUID,
    score DECIMAL(5,2),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz Answers table
CREATE TABLE quiz_answers (
    answer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID,
    question_id UUID,
    selected_answer CHAR(1),
    selected_answer_text TEXT,
    is_correct BOOLEAN
);

-- Conversations table
CREATE TABLE conversations (
    conversation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    title TEXT DEFAULT 'New Conversation',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Logs table
CREATE TABLE chat_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    conversation_id UUID,
    user_message TEXT,
    response_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message_id UUID DEFAULT uuid_generate_v4()
);

-- User Topic Progress table
CREATE TABLE user_topic_progress (
    user_id UUID,
    topic_id UUID,
    last_score DECIMAL(5,2),
    attempts_count INTEGER DEFAULT 0,
    mastered BOOLEAN DEFAULT FALSE,
    last_attempt TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (user_id, topic_id)
);

-- User Topic Review Features table
CREATE TABLE user_topic_review_features (
    user_id UUID,
    topic_id UUID,
    latest_score DECIMAL(5,2),
    avg_score DECIMAL(5,2),
    attempts_count INTEGER DEFAULT 0,
    last_attempt_date DATE,
    next_review_date DATE,
    mastered BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (user_id, topic_id)
);

-- Flashcards table
CREATE TABLE flashcards (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    attempt_id UUID,
    topic_id UUID,
    core_concept TEXT,
    key_theory TEXT,
    common_mistake TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Todos table
CREATE TABLE todos (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    title TEXT,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'todo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_hash_file ON documents(hash_file);
CREATE INDEX idx_topics_user_id ON topics(user_id);
CREATE INDEX idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_chat_logs_conversation_id ON chat_logs(conversation_id);
CREATE INDEX idx_flashcards_user_id ON flashcards(user_id);
