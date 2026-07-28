CREATE TABLE identity.users (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted', 'locked')),
  display_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE identity.provider_links (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id uuid NOT NULL REFERENCES identity.users(id),
  provider text NOT NULL CHECK (provider IN ('google', 'apple', 'world_id', 'email')),
  provider_subject_ciphertext bytea,
  provider_subject_hmac bytea,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_subject_hmac)
);

CREATE TABLE identity.handles (
  user_id uuid PRIMARY KEY REFERENCES identity.users(id),
  handle text NOT NULL,
  handle_normalized text NOT NULL UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity.email_credentials (
  user_id uuid PRIMARY KEY REFERENCES identity.users(id),
  email_ciphertext bytea NOT NULL,
  email_lookup_hmac bytea NOT NULL UNIQUE,
  encryption_key_version text NOT NULL,
  hmac_key_version text NOT NULL,
  password_hash jsonb NOT NULL,
  verified_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity.refresh_token_families (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id uuid NOT NULL REFERENCES identity.users(id),
  family_version integer NOT NULL DEFAULT 1,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity.auth_sessions (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id uuid NOT NULL REFERENCES identity.users(id),
  refresh_family_id uuid NOT NULL REFERENCES identity.refresh_token_families(id),
  refresh_token_hash bytea NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity.consent_records (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id uuid NOT NULL REFERENCES identity.users(id),
  purpose text NOT NULL,
  policy_version text NOT NULL,
  granted boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity.user_region_preferences (
  user_id uuid PRIMARY KEY REFERENCES identity.users(id),
  country_code text,
  region_code text,
  municipality_code text,
  visibility_level text NOT NULL DEFAULT 'private' CHECK (visibility_level IN ('private', 'region', 'country')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity.admin_memberships (
  user_id uuid PRIMARY KEY REFERENCES identity.users(id),
  access_subject_hmac bytea NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('moderator', 'privacy_operator', 'administrator')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE TABLE content.places (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  parent_id uuid REFERENCES content.places(id),
  display_name text NOT NULL,
  place_type text NOT NULL,
  country_code text,
  region_code text,
  municipality_code text,
  -- Provider-neutral representation used until PostGIS is available.
  boundary_geojson jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    EXECUTE 'ALTER TABLE content.places ADD COLUMN IF NOT EXISTS boundary geography(MultiPolygon, 4326)';
  ELSE
    RAISE NOTICE 'PostGIS unavailable; content.places.boundary remains disabled';
  END IF;
END
$$;

CREATE TABLE content.posts (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  author_id uuid NOT NULL REFERENCES identity.users(id),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 100000),
  declared_creation_mode text NOT NULL CHECK (declared_creation_mode IN ('human', 'ai_assisted', 'ai_generated')),
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'private')),
  moderation_state text NOT NULL DEFAULT 'under_review' CHECK (moderation_state IN ('under_review', 'allowed', 'blocked')),
  geo_scope text NOT NULL DEFAULT 'none' CHECK (geo_scope IN ('global', 'country', 'province', 'municipality', 'community', 'none')),
  place_id uuid REFERENCES content.places(id),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE content.post_locations (
  post_id uuid PRIMARY KEY REFERENCES content.posts(id) ON DELETE CASCADE,
  place_id uuid REFERENCES content.places(id),
  location_source text NOT NULL CHECK (location_source IN ('user_selected', 'editorial_verified', 'profile_default')),
  location_precision text NOT NULL CHECK (location_precision IN ('country', 'province', 'municipality', 'community')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE content.comments (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  post_id uuid NOT NULL REFERENCES content.posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES identity.users(id),
  parent_id uuid REFERENCES content.comments(id),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 20000),
  moderation_state text NOT NULL DEFAULT 'under_review',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE social.follows (
  follower_id uuid NOT NULL REFERENCES identity.users(id),
  followed_id uuid NOT NULL REFERENCES identity.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id),
  CHECK (follower_id <> followed_id)
);

CREATE TABLE social.reactions (
  user_id uuid NOT NULL REFERENCES identity.users(id),
  post_id uuid NOT NULL REFERENCES content.posts(id) ON DELETE CASCADE,
  reaction_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id, reaction_type)
);

CREATE TABLE feed.user_inbox (
  user_id uuid NOT NULL REFERENCES identity.users(id),
  post_id uuid NOT NULL REFERENCES content.posts(id) ON DELETE CASCADE,
  source text NOT NULL,
  explanation_basis jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE feed.author_outbox (
  post_id uuid PRIMARY KEY REFERENCES content.posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES identity.users(id),
  published_at timestamptz NOT NULL
);

CREATE TABLE feed.discovery_candidates (
  post_id uuid PRIMARY KEY REFERENCES content.posts(id) ON DELETE CASCADE,
  country_code text,
  region_code text,
  language_code text,
  topic text,
  trust_band text,
  ranking_features jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz NOT NULL
);

CREATE TABLE moderation.content_flags (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  reporter_id uuid NOT NULL REFERENCES identity.users(id),
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  reason_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, content_type, content_id, reason_code)
);

CREATE TABLE moderation.cases (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  state text NOT NULL DEFAULT 'open',
  policy_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE moderation.detector_runs (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  provider text NOT NULL,
  model_version text NOT NULL,
  signal jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE moderation.decisions (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  case_id uuid NOT NULL REFERENCES moderation.cases(id),
  outcome text NOT NULL CHECK (outcome IN ('allow', 'block', 'queue')),
  public_label text,
  policy_version text NOT NULL,
  decided_by uuid REFERENCES identity.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE moderation.appeals (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  case_id uuid NOT NULL REFERENCES moderation.cases(id),
  appellant_id uuid NOT NULL REFERENCES identity.users(id),
  state text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE privacy.requests (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  subject_id uuid NOT NULL REFERENCES identity.users(id),
  request_type text NOT NULL CHECK (request_type IN ('export', 'delete', 'rectify')),
  state text NOT NULL DEFAULT 'received',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE privacy.request_events (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  request_id uuid NOT NULL REFERENCES privacy.requests(id),
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE privacy.legal_holds (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  subject_id uuid NOT NULL REFERENCES identity.users(id),
  reason text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz
);

CREATE TABLE privacy.subject_data_locations (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  subject_id uuid NOT NULL REFERENCES identity.users(id),
  store_type text NOT NULL,
  resource_reference text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  authoritative_or_derived text NOT NULL CHECK (authoritative_or_derived IN ('authoritative', 'derived')),
  retention_class text NOT NULL,
  legal_hold_state text NOT NULL DEFAULT 'none',
  deletion_state text NOT NULL DEFAULT 'present',
  last_verified_at timestamptz,
  UNIQUE (subject_id, store_type, resource_reference, entity_type, entity_id)
);

CREATE TABLE privacy.deletion_tombstones (
  subject_id uuid PRIMARY KEY REFERENCES identity.users(id),
  completed_at timestamptz NOT NULL DEFAULT now(),
  evidence_hash text NOT NULL
);

CREATE TABLE privacy.export_manifests (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  request_id uuid NOT NULL REFERENCES privacy.requests(id),
  object_key text NOT NULL,
  package_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE trust.provenance_events (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  content_id uuid NOT NULL,
  author_id uuid NOT NULL REFERENCES identity.users(id),
  declared_creation_mode text NOT NULL,
  detected_content_class text,
  detector_provider text,
  detector_model_version text,
  policy_version text NOT NULL,
  appeal_state text,
  final_decision text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE trust.human_contribution_events (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  subject_user_id uuid NOT NULL REFERENCES identity.users(id),
  content_id uuid,
  human_authorship_eligibility boolean NOT NULL,
  quality_signal numeric,
  source_signal numeric,
  behaviour_signal numeric,
  policy_version text NOT NULL,
  points_delta numeric NOT NULL,
  reversal_reference uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE media.upload_sessions (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id uuid NOT NULL REFERENCES identity.users(id),
  object_key text NOT NULL UNIQUE,
  content_type text NOT NULL,
  expected_bytes bigint NOT NULL CHECK (expected_bytes > 0),
  checksum_sha256 text NOT NULL CHECK (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  observed_bytes bigint,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'approved', 'rejected', 'expired')),
  expires_at timestamptz NOT NULL,
  finalised_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE media.storage_ledger (
  user_id uuid PRIMARY KEY REFERENCES identity.users(id),
  bytes_reserved bigint NOT NULL DEFAULT 0,
  bytes_uploaded bigint NOT NULL DEFAULT 0,
  bytes_approved bigint NOT NULL DEFAULT 0,
  bytes_rejected bigint NOT NULL DEFAULT 0,
  bytes_exports bigint NOT NULL DEFAULT 0,
  object_count bigint NOT NULL DEFAULT 0,
  last_reconciled_at timestamptz
);

CREATE TABLE media.objects (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_id uuid NOT NULL REFERENCES identity.users(id),
  object_key text NOT NULL UNIQUE,
  content_type text NOT NULL,
  byte_size bigint NOT NULL,
  sha256 text,
  state text NOT NULL DEFAULT 'quarantine',
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE system.outbox_events (
  id uuid PRIMARY KEY,
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  actor_id uuid REFERENCES identity.users(id),
  payload jsonb NOT NULL,
  attempted_at timestamptz,
  dispatched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE system.consumer_inbox (
  consumer_name text NOT NULL,
  event_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  state text NOT NULL DEFAULT 'processing' CHECK (state IN ('processing', 'completed')),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (consumer_name, event_id)
);

CREATE TABLE system.idempotency_keys (
  scope text NOT NULL,
  key text NOT NULL,
  actor_id uuid REFERENCES identity.users(id),
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, key)
);

CREATE TABLE system.audit_events (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  actor_id uuid,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  reason_code text,
  correlation_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX posts_public_feed_idx ON content.posts (moderation_state, visibility, published_at DESC);
CREATE INDEX posts_author_idx ON content.posts (author_id, created_at DESC);
CREATE INDEX comments_post_idx ON content.comments (post_id, created_at ASC);
CREATE INDEX follows_followed_idx ON social.follows (followed_id, created_at DESC);
CREATE INDEX inbox_user_idx ON feed.user_inbox (user_id, created_at DESC);
CREATE INDEX discovery_region_idx ON feed.discovery_candidates (country_code, region_code, published_at DESC);
CREATE INDEX privacy_subject_idx ON privacy.subject_data_locations (subject_id, deletion_state);
CREATE INDEX outbox_pending_idx ON system.outbox_events (created_at) WHERE dispatched_at IS NULL;
