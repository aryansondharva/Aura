-- ============================================================
-- AURA — Exam Readiness AI Feature Migration
-- Run this in Supabase SQL Editor
-- Branch: feature/exam-readiness-ai
-- ============================================================

-- ============================================================
-- 1. EXAM_SESSIONS
-- Groups a batch of uploaded question papers into one study session
-- ============================================================
CREATE TABLE IF NOT EXISTS exam_sessions (
    session_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL,
    session_name    TEXT NOT NULL,
    subject_name    TEXT,
    exam_date       DATE,
    total_pdfs      INTEGER DEFAULT 0,
    status          TEXT DEFAULT 'processing'
                    CHECK (status IN ('processing','analyzing','ready','completed')),
    readiness_score DECIMAL(5,2) DEFAULT 0,
    syllabus_raw    TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. SESSION_PDFS
-- Individual PDFs uploaded to a session (question papers)
-- ============================================================
CREATE TABLE IF NOT EXISTS session_pdfs (
    pdf_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id   UUID NOT NULL REFERENCES exam_sessions(session_id) ON DELETE CASCADE,
    user_id      UUID NOT NULL,
    file_name    TEXT NOT NULL,
    file_hash    TEXT,
    page_count   INTEGER DEFAULT 0,
    chunk_count  INTEGER DEFAULT 0,
    raw_text     TEXT,
    processed    BOOLEAN DEFAULT FALSE,
    uploaded_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3. SYLLABUS_TOPICS
-- User-defined syllabus breakdown (compulsory + optional)
-- ============================================================
CREATE TABLE IF NOT EXISTS syllabus_topics (
    syllabus_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id   UUID NOT NULL REFERENCES exam_sessions(session_id) ON DELETE CASCADE,
    user_id      UUID NOT NULL,
    topic_name   TEXT NOT NULL,
    unit_number  INTEGER,
    is_optional  BOOLEAN DEFAULT FALSE,
    is_selected  BOOLEAN DEFAULT TRUE,
    weight       DECIMAL(3,2) DEFAULT 1.0,
    coverage_pct DECIMAL(5,2) DEFAULT 0,
    mastery_pct  DECIMAL(5,2) DEFAULT 0,
    question_count INTEGER DEFAULT 0,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 4. QUESTION_PATTERNS
-- AI-extracted questions with frequency analysis
-- ============================================================
CREATE TABLE IF NOT EXISTS question_patterns (
    pattern_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id        UUID NOT NULL REFERENCES exam_sessions(session_id) ON DELETE CASCADE,
    syllabus_id       UUID REFERENCES syllabus_topics(syllabus_id) ON DELETE SET NULL,
    question_text     TEXT NOT NULL,
    question_type     TEXT DEFAULT 'theory'
                      CHECK (question_type IN ('mcq','theory','numerical','short_answer','long_answer')),
    frequency_count   INTEGER DEFAULT 1,
    importance_score  DECIMAL(3,2) DEFAULT 0.5,
    source_pdfs       JSONB DEFAULT '[]',
    year_appearances  JSONB DEFAULT '[]',
    difficulty        TEXT DEFAULT 'medium'
                      CHECK (difficulty IN ('easy','medium','hard')),
    marks             INTEGER,
    ai_answer         TEXT,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 5. READINESS_SCORES
-- Historical readiness score tracking over time
-- ============================================================
CREATE TABLE IF NOT EXISTS readiness_scores (
    score_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id        UUID NOT NULL REFERENCES exam_sessions(session_id) ON DELETE CASCADE,
    user_id           UUID NOT NULL,
    overall_score     DECIMAL(5,2) DEFAULT 0,
    topic_scores      JSONB DEFAULT '{}',
    quiz_velocity     DECIMAL(5,2) DEFAULT 0,
    coverage_score    DECIMAL(5,2) DEFAULT 0,
    mastery_score     DECIMAL(5,2) DEFAULT 0,
    consistency_score DECIMAL(5,2) DEFAULT 0,
    calculated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 6. READINESS_QUIZ_ATTEMPTS
-- Quiz attempts linked to readiness sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS readiness_quiz_attempts (
    attempt_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id   UUID NOT NULL REFERENCES exam_sessions(session_id) ON DELETE CASCADE,
    user_id      UUID NOT NULL,
    pattern_id   UUID REFERENCES question_patterns(pattern_id) ON DELETE SET NULL,
    syllabus_id  UUID REFERENCES syllabus_topics(syllabus_id) ON DELETE SET NULL,
    score        DECIMAL(5,2),
    total_questions INTEGER DEFAULT 0,
    correct_count   INTEGER DEFAULT 0,
    time_taken_sec  INTEGER,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 7. SHARED_REPORTS
-- Shareable analysis links for classmates
-- ============================================================
CREATE TABLE IF NOT EXISTS shared_reports (
    report_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id     UUID NOT NULL REFERENCES exam_sessions(session_id) ON DELETE CASCADE,
    user_id        UUID NOT NULL,
    share_token    TEXT UNIQUE NOT NULL,
    shared_with_name TEXT,
    include_chat   BOOLEAN DEFAULT TRUE,
    include_scores BOOLEAN DEFAULT TRUE,
    include_patterns BOOLEAN DEFAULT TRUE,
    expires_at     TIMESTAMP WITH TIME ZONE,
    views_count    INTEGER DEFAULT 0,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_exam_sessions_user_id       ON exam_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_session_pdfs_session_id     ON session_pdfs(session_id);
CREATE INDEX IF NOT EXISTS idx_session_pdfs_user_id        ON session_pdfs(user_id);
CREATE INDEX IF NOT EXISTS idx_syllabus_session_id         ON syllabus_topics(session_id);
CREATE INDEX IF NOT EXISTS idx_question_patterns_session   ON question_patterns(session_id);
CREATE INDEX IF NOT EXISTS idx_question_patterns_syllabus  ON question_patterns(syllabus_id);
CREATE INDEX IF NOT EXISTS idx_question_patterns_freq      ON question_patterns(frequency_count DESC);
CREATE INDEX IF NOT EXISTS idx_readiness_scores_session    ON readiness_scores(session_id);
CREATE INDEX IF NOT EXISTS idx_readiness_quiz_session      ON readiness_quiz_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_shared_reports_token        ON shared_reports(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_reports_session      ON shared_reports(session_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE exam_sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_pdfs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE syllabus_topics         ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_patterns       ENABLE ROW LEVEL SECURITY;
ALTER TABLE readiness_scores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE readiness_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_reports          ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users manage own exam_sessions" ON exam_sessions;
CREATE POLICY "Users manage own exam_sessions"
    ON exam_sessions FOR ALL
    USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users manage own session_pdfs" ON session_pdfs;
CREATE POLICY "Users manage own session_pdfs"
    ON session_pdfs FOR ALL
    USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users manage own syllabus_topics" ON syllabus_topics;
CREATE POLICY "Users manage own syllabus_topics"
    ON syllabus_topics FOR ALL
    USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users manage own question_patterns" ON question_patterns;
CREATE POLICY "Users manage own question_patterns"
    ON question_patterns FOR ALL
    USING (
        session_id IN (
            SELECT session_id FROM exam_sessions WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users manage own readiness_scores" ON readiness_scores;
CREATE POLICY "Users manage own readiness_scores"
    ON readiness_scores FOR ALL
    USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users manage own readiness_quiz_attempts" ON readiness_quiz_attempts;
CREATE POLICY "Users manage own readiness_quiz_attempts"
    ON readiness_quiz_attempts FOR ALL
    USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users manage own shared_reports" ON shared_reports;
CREATE POLICY "Users manage own shared_reports"
    ON shared_reports FOR ALL
    USING (auth.uid()::text = user_id::text);

-- Public read access for shared reports via token
DROP POLICY IF EXISTS "Public read shared_reports by token" ON shared_reports;
CREATE POLICY "Public read shared_reports by token"
    ON shared_reports FOR SELECT
    USING (true);

-- ============================================================
-- DONE
-- ============================================================
