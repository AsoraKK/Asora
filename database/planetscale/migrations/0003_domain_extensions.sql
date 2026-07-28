CREATE TABLE moderation.appeal_votes (
  appeal_id uuid NOT NULL REFERENCES moderation.appeals(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL REFERENCES identity.users(id),
  vote text NOT NULL CHECK (vote IN ('approve', 'reject')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (appeal_id, voter_id)
);

CREATE TABLE privacy.retention_rules (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES identity.users(id),
  content_type text NOT NULL,
  retention_period interval NOT NULL,
  policy_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE trust.reputation_events (
  id uuid PRIMARY KEY,
  subject_user_id uuid NOT NULL REFERENCES identity.users(id),
  content_id uuid,
  event_type text NOT NULL,
  policy_version text NOT NULL,
  points_delta numeric NOT NULL,
  reversal_reference uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE trust.reputation_balances (
  user_id uuid PRIMARY KEY REFERENCES identity.users(id),
  points numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE media.variants (
  id uuid PRIMARY KEY,
  object_id uuid NOT NULL REFERENCES media.objects(id) ON DELETE CASCADE,
  object_key text NOT NULL UNIQUE,
  content_type text NOT NULL,
  byte_size bigint NOT NULL,
  width integer,
  height integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE media.moderation_results (
  id uuid PRIMARY KEY,
  object_id uuid NOT NULL REFERENCES media.objects(id) ON DELETE CASCADE,
  provider text NOT NULL,
  model_version text NOT NULL,
  signal jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE editorial.memberships (
  user_id uuid PRIMARY KEY REFERENCES identity.users(id),
  state text NOT NULL CHECK (state IN ('applied', 'active', 'revoked')),
  policy_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE TABLE editorial.membership_events (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES identity.users(id),
  event_type text NOT NULL,
  reason_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_membership_subject_idx ON identity.admin_memberships (access_subject_hmac) WHERE active;
CREATE INDEX appeal_votes_appeal_idx ON moderation.appeal_votes (appeal_id, created_at);
CREATE INDEX reputation_events_subject_idx ON trust.reputation_events (subject_user_id, created_at DESC);
