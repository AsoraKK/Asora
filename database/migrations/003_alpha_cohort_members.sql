BEGIN;

CREATE TABLE IF NOT EXISTS alpha_cohort_members (
  user_id UUID PRIMARY KEY,
  invite_id TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (
    stage IN ('technical_alpha', 'controlled_alpha', 'expanded_alpha')
  ),
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alpha_cohort_members_stage_activated
  ON alpha_cohort_members (stage, activated_at DESC);

COMMIT;
