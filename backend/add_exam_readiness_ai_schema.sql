-- Exam Readiness AI schema extensions (idempotent)

ALTER TABLE topics
  ADD COLUMN IF NOT EXISTS branch TEXT,
  ADD COLUMN IF NOT EXISTS semester TEXT,
  ADD COLUMN IF NOT EXISTS subject_code TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT;

CREATE TABLE IF NOT EXISTS ml_prediction_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  topic_id UUID,
  model_version TEXT,
  prediction_source TEXT,
  confidence DECIMAL(5,4),
  latest_score DECIMAL(5,2),
  avg_score DECIMAL(5,2),
  attempts_count INTEGER,
  days_since_last_attempt INTEGER,
  recent_trend DECIMAL(6,3),
  repeated_wrong_count INTEGER,
  predicted_days INTEGER,
  predicted_next_review_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_prediction_logs_user_id ON ml_prediction_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_prediction_logs_topic_id ON ml_prediction_logs(topic_id);
CREATE INDEX IF NOT EXISTS idx_ml_prediction_logs_created_at ON ml_prediction_logs(created_at DESC);
