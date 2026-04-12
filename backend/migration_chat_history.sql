-- ============================================================
-- Migration: PDF Upload History + Resumable Chat Session
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Extension (should already exist)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------
-- 1. uploaded_files: tracks every PDF a user uploads
--    One row per unique file (deduplicated by hash_file)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS uploaded_files (
    file_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL,
    file_name     TEXT NOT NULL,              -- original filename shown to user
    file_uuid     UUID NOT NULL UNIQUE,       -- internal UUID used in documents table
    hash_file     TEXT NOT NULL,              -- SHA-256 hash for dedup detection
    file_size     BIGINT,                     -- bytes
    chunk_count   INTEGER DEFAULT 0,          -- how many chunks were stored
    upload_type   TEXT DEFAULT 'chat'         -- 'chat' | 'quiz'
                  CHECK (upload_type IN ('chat', 'quiz')),
    uploaded_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 2. conversation_files: links a conversation to its PDFs
--    One conversation can have multiple files; one file can
--    be used in multiple conversations.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversation_files (
    id              SERIAL PRIMARY KEY,
    conversation_id UUID NOT NULL,
    file_id         UUID NOT NULL REFERENCES uploaded_files(file_id) ON DELETE CASCADE,
    linked_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (conversation_id, file_id)
);

-- ----------------------------------------------------------
-- 3. Add document_count column to conversations for quick UI
-- ----------------------------------------------------------
ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS document_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_message_preview TEXT;

-- ----------------------------------------------------------
-- 4. Indexes for performance
-- ----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id   ON uploaded_files(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_hash      ON uploaded_files(hash_file);
CREATE INDEX IF NOT EXISTS idx_conv_files_conv_id       ON conversation_files(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_files_file_id       ON conversation_files(file_id);

-- ----------------------------------------------------------
-- 5. RLS Policies (if you use Row Level Security)
-- ----------------------------------------------------------
ALTER TABLE uploaded_files     ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_files ENABLE ROW LEVEL SECURITY;

-- uploaded_files: users can only see/edit their own files
DROP POLICY IF EXISTS "Users manage own uploaded_files" ON uploaded_files;
CREATE POLICY "Users manage own uploaded_files"
    ON uploaded_files FOR ALL
    USING (auth.uid()::text = user_id::text);

-- conversation_files: users can only see links for their own conversations
DROP POLICY IF EXISTS "Users manage own conversation_files" ON conversation_files;
CREATE POLICY "Users manage own conversation_files"
    ON conversation_files FOR ALL
    USING (
        conversation_id IN (
            SELECT conversation_id FROM conversations WHERE user_id = auth.uid()
        )
    );

-- ----------------------------------------------------------
-- 6. Helper function: get full chat history for a conversation
--    Returns messages in order — use this to resume any chat
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION get_conversation_history(p_conversation_id UUID)
RETURNS TABLE (
    message_id        UUID,
    role              TEXT,
    content           TEXT,
    created_at        TIMESTAMP WITH TIME ZONE
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
        'assistant'::TEXT      AS role,
        cl.response_message    AS content,
        cl.created_at
    FROM chat_logs cl
    WHERE cl.conversation_id = p_conversation_id

    ORDER BY created_at ASC, role DESC; -- user message before assistant per pair
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
