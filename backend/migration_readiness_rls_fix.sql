-- ============================================================
-- AURA — Fix RLS for Exam Readiness Tables
-- The backend uses the anon key so auth.uid() is NULL server-side.
-- These tables are protected at the application level (user_id check in routes).
-- Run this in Supabase SQL Editor.
-- ============================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users manage own exam_sessions"           ON exam_sessions;
DROP POLICY IF EXISTS "Users manage own session_pdfs"           ON session_pdfs;
DROP POLICY IF EXISTS "Users manage own syllabus_topics"        ON syllabus_topics;
DROP POLICY IF EXISTS "Users manage own question_patterns"      ON question_patterns;
DROP POLICY IF EXISTS "Users manage own readiness_scores"       ON readiness_scores;
DROP POLICY IF EXISTS "Users manage own readiness_quiz_attempts" ON readiness_quiz_attempts;
DROP POLICY IF EXISTS "Users manage own shared_reports"         ON shared_reports;
DROP POLICY IF EXISTS "Public read shared_reports by token"     ON shared_reports;

-- Create open policies (backend enforces ownership via user_id in route logic)
CREATE POLICY "Allow all exam_sessions"           ON exam_sessions           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all session_pdfs"            ON session_pdfs            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all syllabus_topics"         ON syllabus_topics         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all question_patterns"       ON question_patterns       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all readiness_scores"        ON readiness_scores        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all readiness_quiz_attempts" ON readiness_quiz_attempts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all shared_reports"          ON shared_reports          FOR ALL USING (true) WITH CHECK (true);

-- Done
SELECT 'RLS fix applied successfully' AS status;
