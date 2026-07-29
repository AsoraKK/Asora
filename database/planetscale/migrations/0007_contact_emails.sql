CREATE TABLE identity.contact_emails (
  user_id uuid PRIMARY KEY REFERENCES identity.users(id) ON DELETE CASCADE,
  email_ciphertext bytea NOT NULL,
  email_lookup_hmac bytea NOT NULL UNIQUE,
  encryption_key_version text NOT NULL,
  source_provider text NOT NULL CHECK (source_provider IN ('google', 'email', 'migration')),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE identity.contact_emails IS
  'Verified encrypted contact address for account continuity and recovery; provider subjects remain in identity.provider_links.';

ALTER TABLE social.profiles
  ADD COLUMN IF NOT EXISTS trust_passport_visibility text NOT NULL DEFAULT 'public_minimal'
    CHECK (trust_passport_visibility IN ('public_expanded', 'public_minimal', 'private'));

CREATE UNIQUE INDEX IF NOT EXISTS privacy_export_manifest_request_object_idx
  ON privacy.export_manifests (request_id, object_key);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'privacy'
       AND table_name = 'subject_data_locations'
       AND column_name = 'id'
  ) THEN
    DROP TABLE privacy.subject_data_locations;
    CREATE TABLE privacy.subject_data_locations (
      subject_id uuid NOT NULL REFERENCES identity.users(id),
      store_type text NOT NULL,
      resource_reference text NOT NULL,
      entity_type text NOT NULL,
      entity_id uuid,
      entity_key text GENERATED ALWAYS AS (COALESCE(entity_id::text, 'aggregate')) STORED,
      authoritative_or_derived text NOT NULL CHECK (authoritative_or_derived IN ('authoritative', 'derived')),
      retention_class text NOT NULL,
      legal_hold_state text NOT NULL DEFAULT 'none',
      deletion_state text NOT NULL DEFAULT 'present',
      last_verified_at timestamptz,
      PRIMARY KEY (subject_id, store_type, resource_reference, entity_type, entity_key)
    );
    CREATE INDEX privacy_subject_idx ON privacy.subject_data_locations (subject_id, deletion_state);
  END IF;
END
$$;

DROP FUNCTION IF EXISTS privacy.set_retention_rule(uuid, text, interval, text);

CREATE OR REPLACE FUNCTION privacy.set_retention_rule(
  p_rule_id uuid,
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
  INSERT INTO retention_rules (id, user_id, content_type, retention_period, policy_version)
  VALUES (p_rule_id, p_user_id, p_content_type, p_retention_period, p_policy_version);
END;
$$;

REVOKE ALL ON FUNCTION privacy.set_retention_rule(uuid, uuid, text, interval, text) FROM PUBLIC;
