-- ============================================================
-- AURA — Complete Database Schema (Fresh Install)
-- Run this ONCE in Supabase SQL Editor on a fresh database.
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USERS
-- Mirrors Supabase auth.users for profile/app data
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    user_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT,
    email       TEXT UNIQUE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. DOCUMENTS
-- Stores chunked text content from uploaded PDFs (for RAG/chat)
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
    id          SERIAL PRIMARY KEY,
    chunk_id    TEXT UNIQUE,
    content     TEXT,
    metadata    JSONB,
    filename    TEXT,
    file_uuid   UUID,
    user_id     UUID,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    hash_file   TEXT
);

-- ============================================================
-- 3. UPLOADED_FILES
-- One row per unique file uploaded by a user.
-- Tracks history, size, chunk count, and when last used.
-- ============================================================
CREATE TABLE IF NOT EXISTS uploaded_files (
    file_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL,
    file_name    TEXT NOT NULL,
    file_uuid    UUID NOT NULL UNIQUE,
    hash_file    TEXT NOT NULL,
    file_size    BIGINT,
    chunk_count  INTEGER DEFAULT 0,
    upload_type  TEXT DEFAULT 'chat'
                 CHECK (upload_type IN ('chat', 'quiz')),
    uploaded_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 4. TOPICS
-- AI-generated topic clusters from quiz PDF uploads
-- ============================================================
CREATE TABLE IF NOT EXISTS topics (
    topic_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id              UUID,
    document_for_quiz_id UUID,
    title                TEXT,
    merged_content       TEXT,
    topic_summary        TEXT,
    topic_status         TEXT DEFAULT 'Not Started',
    file_name            TEXT,
    hash_file            TEXT,
    archive_status       TEXT DEFAULT 'not_archived',
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 5. QUIZ_QUESTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_questions (
    question_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    concept_id         UUID,
    prompt             TEXT,
    answer             CHAR(1),
    answer_option_text JSONB,
    explanation        TEXT,
    question_text      TEXT,
    options            JSONB,
    correct_answer     TEXT,
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 6. QUIZ_ATTEMPTS
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
    attempt_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID,
    topic_id     UUID,
    score        DECIMAL(5,2),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 7. QUIZ_ANSWERS
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_answers (
    answer_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id           UUID,
    question_id          UUID,
    selected_answer      CHAR(1),
    selected_answer_text TEXT,
    is_correct           BOOLEAN
);

-- ============================================================
-- 8. CONVERSATIONS
-- A conversation groups a set of chat messages together.
-- Each conversation can be linked to one or more uploaded PDFs.
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
    conversation_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id              UUID,
    title                TEXT DEFAULT 'New Conversation',
    document_count       INTEGER DEFAULT 0,
    last_message_preview TEXT,
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 9. CONVERSATION_FILES
-- Links a conversation to the PDF files used in that chat.
-- Enables resuming with the same document context.
-- ============================================================
CREATE TABLE IF NOT EXISTS conversation_files (
    id              SERIAL PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    file_id         UUID NOT NULL REFERENCES uploaded_files(file_id) ON DELETE CASCADE,
    linked_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (conversation_id, file_id)
);

-- ============================================================
-- 10. CHAT_LOGS
-- Stores every user↔AI message pair for a conversation.
-- Used to resume chat history after the user comes back.
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_logs (
    id               SERIAL PRIMARY KEY,
    user_id          UUID,
    conversation_id  UUID REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    user_message     TEXT,
    response_message TEXT,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message_id       UUID DEFAULT uuid_generate_v4()
);

-- ============================================================
-- 11. USER_TOPIC_PROGRESS
-- ============================================================
CREATE TABLE IF NOT EXISTS user_topic_progress (
    user_id       UUID,
    topic_id      UUID,
    last_score    DECIMAL(5,2),
    attempts_count INTEGER DEFAULT 0,
    mastered       BOOLEAN DEFAULT FALSE,
    last_attempt   TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (user_id, topic_id)
);

-- ============================================================
-- 12. USER_TOPIC_REVIEW_FEATURES (Spaced Repetition)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_topic_review_features (
    user_id           UUID,
    topic_id          UUID,
    latest_score      DECIMAL(5,2),
    avg_score         DECIMAL(5,2),
    attempts_count    INTEGER DEFAULT 0,
    last_attempt_date DATE,
    next_review_date  DATE,
    mastered          BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (user_id, topic_id)
);

-- ============================================================
-- 13. FLASHCARDS
-- ============================================================
CREATE TABLE IF NOT EXISTS flashcards (
    id             SERIAL PRIMARY KEY,
    user_id        UUID,
    attempt_id     UUID,
    topic_id       UUID,
    core_concept   TEXT,
    key_theory     TEXT,
    common_mistake TEXT,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 14. TODOS
-- ============================================================
CREATE TABLE IF NOT EXISTS todos (
    id          SERIAL PRIMARY KEY,
    user_id     UUID,
    title       TEXT,
    description TEXT,
    due_date    TIMESTAMP WITH TIME ZONE,
    status      TEXT DEFAULT 'todo',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_documents_user_id          ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_hash_file        ON documents(hash_file);
CREATE INDEX IF NOT EXISTS idx_documents_file_uuid        ON documents(file_uuid);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id     ON uploaded_files(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_hash        ON uploaded_files(hash_file);
CREATE INDEX IF NOT EXISTS idx_topics_user_id             ON topics(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id      ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id      ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at   ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_logs_conversation_id  ON chat_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at       ON chat_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_conv_files_conv_id         ON conversation_files(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_files_file_id         ON conversation_files(file_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id         ON flashcards(user_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Ensures users can only access their own data
-- ============================================================
ALTER TABLE users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents                ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files           ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_files       ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_topic_progress      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_topic_review_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards               ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos                    ENABLE ROW LEVEL SECURITY;

-- users
DROP POLICY IF EXISTS "Users manage own profile" ON users;
CREATE POLICY "Users manage own profile"
    ON users FOR ALL
    USING (auth.uid()::text = user_id::text);

-- documents
DROP POLICY IF EXISTS "Users manage own documents" ON documents;
CREATE POLICY "Users manage own documents"
    ON documents FOR ALL
    USING (auth.uid()::text = user_id::text);

-- uploaded_files
DROP POLICY IF EXISTS "Users manage own uploaded_files" ON uploaded_files;
CREATE POLICY "Users manage own uploaded_files"
    ON uploaded_files FOR ALL
    USING (auth.uid()::text = user_id::text);

-- topics
DROP POLICY IF EXISTS "Users manage own topics" ON topics;
CREATE POLICY "Users manage own topics"
    ON topics FOR ALL
    USING (auth.uid()::text = user_id::text);

-- quiz_attempts
DROP POLICY IF EXISTS "Users manage own quiz_attempts" ON quiz_attempts;
CREATE POLICY "Users manage own quiz_attempts"
    ON quiz_attempts FOR ALL
    USING (auth.uid()::text = user_id::text);

-- conversations
DROP POLICY IF EXISTS "Users manage own conversations" ON conversations;
CREATE POLICY "Users manage own conversations"
    ON conversations FOR ALL
    USING (auth.uid()::text = user_id::text);

-- conversation_files
DROP POLICY IF EXISTS "Users manage own conversation_files" ON conversation_files;
CREATE POLICY "Users manage own conversation_files"
    ON conversation_files FOR ALL
    USING (
        conversation_id IN (
            SELECT conversation_id FROM conversations WHERE user_id = auth.uid()
        )
    );

-- chat_logs
DROP POLICY IF EXISTS "Users manage own chat_logs" ON chat_logs;
CREATE POLICY "Users manage own chat_logs"
    ON chat_logs FOR ALL
    USING (auth.uid()::text = user_id::text);

-- flashcards
DROP POLICY IF EXISTS "Users manage own flashcards" ON flashcards;
CREATE POLICY "Users manage own flashcards"
    ON flashcards FOR ALL
    USING (auth.uid()::text = user_id::text);

-- todos
DROP POLICY IF EXISTS "Users manage own todos" ON todos;
CREATE POLICY "Users manage own todos"
    ON todos FOR ALL
    USING (auth.uid()::text = user_id::text);

-- ============================================================
-- HELPER FUNCTION
-- get_conversation_history(conversation_id)
-- Returns all messages in order for resuming a chat session
-- ============================================================
CREATE OR REPLACE FUNCTION get_conversation_history(p_conversation_id UUID)
RETURNS TABLE (
    message_id UUID,
    role       TEXT,
    content    TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cl.message_id,
        'user'::TEXT    AS role,
        cl.user_message AS content,
        cl.created_at
    FROM chat_logs cl
    WHERE cl.conversation_id = p_conversation_id

    UNION ALL

    SELECT
        cl.message_id,
        'assistant'::TEXT   AS role,
        cl.response_message AS content,
        cl.created_at
    FROM chat_logs cl
    WHERE cl.conversation_id = p_conversation_id

    ORDER BY created_at ASC, role DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
