CREATE TABLE identity.email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  token_hash bytea NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  token_hash bytea NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity.account_events (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id uuid NOT NULL REFERENCES identity.users(id),
  event_type text NOT NULL,
  actor_id uuid REFERENCES identity.users(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE social.profiles (
  user_id uuid PRIMARY KEY REFERENCES identity.users(id) ON DELETE CASCADE,
  bio text NOT NULL DEFAULT '' CHECK (length(bio) <= 2000),
  avatar_object_id uuid,
  public_visibility boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE social.profile_private_fields (
  user_id uuid PRIMARY KEY REFERENCES identity.users(id) ON DELETE CASCADE,
  encrypted_payload bytea NOT NULL,
  encryption_key_version text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE social.blocks (
  blocker_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE TABLE social.mutes (
  muter_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  muted_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (muter_id, muted_id),
  CHECK (muter_id <> muted_id)
);

CREATE TABLE social.bookmarks (
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES content.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE social.custom_feeds (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TABLE social.custom_feed_rules (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  feed_id uuid NOT NULL REFERENCES social.custom_feeds(id) ON DELETE CASCADE,
  rule jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE content.content_declarations (
  post_id uuid PRIMARY KEY REFERENCES content.posts(id) ON DELETE CASCADE,
  declared_creation_mode text NOT NULL CHECK (declared_creation_mode IN ('human', 'ai_assisted', 'ai_generated')),
  public_label text CHECK (public_label IN ('Human-authored', 'AI-assisted', 'AI-generated', 'Under review')),
  detector_provider text,
  detector_model_version text,
  detector_signal jsonb,
  declaration_conflict boolean NOT NULL DEFAULT false,
  review_required boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE feed.feed_events (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  recipient_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  post_id uuid REFERENCES content.posts(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  explanation_basis jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE feed.topic_memberships (
  topic text NOT NULL,
  post_id uuid NOT NULL REFERENCES content.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (topic, post_id)
);

CREATE TABLE feed.regional_memberships (
  region_code text NOT NULL,
  post_id uuid NOT NULL REFERENCES content.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (region_code, post_id)
);

CREATE TABLE feed.notifications (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  recipient_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE moderation.policy_versions (
  version text PRIMARY KEY,
  policy_hash text NOT NULL,
  effective_at timestamptz NOT NULL,
  retired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE moderation.enforcement_events (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  case_id uuid REFERENCES moderation.cases(id),
  subject_id uuid REFERENCES identity.users(id),
  action text NOT NULL,
  reason_code text NOT NULL,
  policy_version text NOT NULL,
  actor_id uuid REFERENCES identity.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE trust.source_citations (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  content_id uuid NOT NULL,
  author_id uuid REFERENCES identity.users(id),
  citation_url text NOT NULL,
  citation_hash text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE trust.accountability_signals (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id uuid NOT NULL REFERENCES identity.users(id),
  signal_type text NOT NULL,
  signal_value numeric NOT NULL,
  policy_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE trust.policy_versions (
  version text PRIMARY KEY,
  policy_hash text NOT NULL,
  effective_at timestamptz NOT NULL,
  retired_at timestamptz
);

CREATE TABLE media.ownership (
  object_id uuid PRIMARY KEY REFERENCES media.objects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES identity.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE VIEW media.storage_ledgers AS SELECT * FROM media.storage_ledger;

CREATE TABLE media.deletion_events (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  object_id uuid REFERENCES media.objects(id),
  owner_id uuid REFERENCES identity.users(id),
  reason_code text NOT NULL,
  completed_at timestamptz,
  evidence_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE editorial.applications (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id uuid NOT NULL REFERENCES identity.users(id),
  state text NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE editorial.portfolio_items (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  application_id uuid NOT NULL REFERENCES editorial.applications(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE editorial.peer_reviews (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  application_id uuid NOT NULL REFERENCES editorial.applications(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES identity.users(id),
  outcome text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE editorial.publications (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  membership_user_id uuid NOT NULL REFERENCES identity.users(id),
  title text NOT NULL,
  post_id uuid REFERENCES content.posts(id),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE system.feature_flags (
  flag_key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  policy_version text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE system.schema_migrations (
  version text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE system.outbox_events
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error_code text,
  ADD COLUMN IF NOT EXISTS correlation_id text;

CREATE INDEX email_verification_active_idx ON identity.email_verification_tokens (user_id, expires_at) WHERE consumed_at IS NULL;
CREATE INDEX password_reset_active_idx ON identity.password_reset_tokens (user_id, expires_at) WHERE consumed_at IS NULL;
CREATE INDEX blocks_blocked_idx ON social.blocks (blocked_id, created_at DESC);
CREATE INDEX mutes_muted_idx ON social.mutes (muted_id, created_at DESC);
CREATE INDEX feed_events_recipient_idx ON feed.feed_events (recipient_id, created_at DESC);
CREATE INDEX notifications_recipient_idx ON feed.notifications (recipient_id, created_at DESC);
CREATE INDEX moderation_enforcement_subject_idx ON moderation.enforcement_events (subject_id, created_at DESC);
CREATE INDEX media_deletion_owner_idx ON media.deletion_events (owner_id, created_at DESC);

CREATE OR REPLACE FUNCTION privacy.set_retention_rule(
  p_user_id uuid,
  p_content_type text,
  p_retention_period interval,
  p_policy_version text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = privacy, pg_temp
AS $$
BEGIN
  IF p_content_type NOT IN ('post', 'posts', 'media') THEN
    RAISE EXCEPTION 'invalid retention content type';
  END IF;
  IF p_retention_period < interval '30 days' OR p_retention_period > interval '10 years' THEN
    RAISE EXCEPTION 'retention period outside allowed range';
  END IF;
  DELETE FROM retention_rules WHERE user_id = p_user_id AND content_type = p_content_type;
  INSERT INTO retention_rules (user_id, content_type, retention_period, policy_version)
  VALUES (p_user_id, p_content_type, p_retention_period, p_policy_version);
END;
$$;

REVOKE ALL ON FUNCTION privacy.set_retention_rule(uuid, text, interval, text) FROM PUBLIC;
