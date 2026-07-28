-- Run each query while connected as the named role. The expected results are
-- documented so CI can fail closed if a grant becomes broader.

SELECT has_table_privilege(current_user, 'privacy.legal_holds', 'SELECT') AS must_be_false;
SELECT has_schema_privilege(current_user, 'content', 'CREATE') AS must_be_false_for_runtime;
SELECT has_schema_privilege(current_user, 'privacy', 'CREATE') AS must_be_false_for_jobs;
SELECT has_database_privilege(current_user, current_database(), 'CREATE') AS must_be_false_for_runtime;
SELECT COALESCE((SELECT rolcreaterole FROM pg_roles WHERE rolname = current_user), false) AS must_be_false_for_admin;
SELECT has_schema_privilege(current_user, 'system', 'CREATE') AS must_be_false_for_runtime;
SELECT has_table_privilege(current_user, 'privacy.legal_holds', 'UPDATE') AS must_be_false_for_runtime;
SELECT has_database_privilege(current_user, current_database(), 'CREATE') AS must_be_false_for_jobs;
SELECT COALESCE((SELECT rolcreaterole FROM pg_roles WHERE rolname = current_user), false) AS must_be_false_for_jobs;
SELECT has_table_privilege(current_user, 'identity.email_credentials', 'SELECT') AS must_be_false_for_privacy_key_boundary;
