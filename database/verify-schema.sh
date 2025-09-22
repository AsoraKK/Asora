#!/bin/bash

# Schema Drift Detection for CI/CD Pipeline
# Validates that database schema matches expected structure

set -e

echo "🔍 Verifying database schema integrity..."

# Check if required environment variables are set
if [[ -z "$DATABASE_URL" ]]; then
    echo "❌ DATABASE_URL environment variable not set"
    exit 1
fi

# Expected table count and structure
EXPECTED_TABLES=(
    "users"
    "auth_identities" 
    "profiles"
    "follows"
    "blocks"
    "mutes"
    "moderation_cases"
    "appeals"
    "audit_log"
    "posts_admin_mirror"
    "outbox"
)

echo "📊 Checking table existence..."
MISSING_TABLES=()

for table in "${EXPECTED_TABLES[@]}"; do
    TABLE_EXISTS=$(psql "$DATABASE_URL" -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" -t | tr -d ' ')
    
    if [[ "$TABLE_EXISTS" != "t" ]]; then
        MISSING_TABLES+=("$table")
    fi
done

if [[ ${#MISSING_TABLES[@]} -gt 0 ]]; then
    echo "❌ Missing required tables: ${MISSING_TABLES[*]}"
    exit 1
fi

echo "✅ All required tables present"

# Check for required extensions
echo "🔧 Checking PostgreSQL extensions..."

REQUIRED_EXTENSIONS=("pgcrypto" "citext")
MISSING_EXTENSIONS=()

for ext in "${REQUIRED_EXTENSIONS[@]}"; do
    EXT_EXISTS=$(psql "$DATABASE_URL" -c "SELECT EXISTS (SELECT FROM pg_extension WHERE extname = '$ext');" -t | tr -d ' ')
    
    if [[ "$EXT_EXISTS" != "t" ]]; then
        MISSING_EXTENSIONS+=("$ext")
    fi
done

if [[ ${#MISSING_EXTENSIONS[@]} -gt 0 ]]; then
    echo "❌ Missing required extensions: ${MISSING_EXTENSIONS[*]}"
    exit 1
fi

echo "✅ All required extensions installed"

# Check UUID primary key structure
echo "🔑 Validating primary key structure..."

UUID_TABLES=("users" "auth_identities" "profiles" "follows" "blocks" "mutes" "moderation_cases" "appeals" "audit_log" "posts_admin_mirror" "outbox")

for table in "${UUID_TABLES[@]}"; do
    # Check if primary key is UUID type
    PK_TYPE=$(psql "$DATABASE_URL" -c "
        SELECT data_type 
        FROM information_schema.columns c
        JOIN information_schema.key_column_usage kcu ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
        JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY' 
        AND c.table_name = '$table'
        LIMIT 1;
    " -t | tr -d ' ')
    
    if [[ "$PK_TYPE" != "uuid" ]]; then
        echo "❌ Table $table does not have UUID primary key (found: $PK_TYPE)"
        exit 1
    fi
done

echo "✅ All tables have UUID primary keys"

# Check outbox table structure for durability features
echo "📤 Validating outbox table structure..."

OUTBOX_COLUMNS=(
    "id:uuid"
    "aggregate_type:character"
    "aggregate_id:uuid"
    "event_type:character"
    "payload:jsonb"
    "created_at:timestamp"
    "processed_at:timestamp"
    "retry_count:integer"
    "max_retries:integer"
    "next_retry_at:timestamp"
)

for col_spec in "${OUTBOX_COLUMNS[@]}"; do
    IFS=':' read -r col_name expected_type <<< "$col_spec"
    
    ACTUAL_TYPE=$(psql "$DATABASE_URL" -c "
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'outbox' AND column_name = '$col_name';
    " -t | tr -d ' ')
    
    if [[ -z "$ACTUAL_TYPE" ]]; then
        echo "❌ Outbox table missing column: $col_name"
        exit 1
    fi
    
    # Basic type matching (allowing for variations)
    if [[ "$expected_type" == "character" && "$ACTUAL_TYPE" != "character varying" ]] ||
       [[ "$expected_type" == "timestamp" && "$ACTUAL_TYPE" != "timestamp with time zone" ]] ||
       [[ "$expected_type" != "character" && "$expected_type" != "timestamp" && "$ACTUAL_TYPE" != "$expected_type" ]]; then
        echo "❌ Outbox column $col_name has wrong type: expected $expected_type, got $ACTUAL_TYPE"
        exit 1
    fi
done

echo "✅ Outbox table structure validated"

# Check unique constraint for outbox durability
echo "🔒 Checking outbox unique constraint..."

UNIQUE_CONSTRAINT_EXISTS=$(psql "$DATABASE_URL" -c "
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'outbox' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name = 'unique_outbox_event'
    );
" -t | tr -d ' ')

if [[ "$UNIQUE_CONSTRAINT_EXISTS" != "t" ]]; then
    echo "❌ Outbox table missing unique constraint for durability"
    exit 1
fi

echo "✅ Outbox unique constraint verified"

# Check RLS status for security tables
echo "🛡️  Checking Row Level Security status..."

RLS_TABLES=("users" "profiles" "posts_admin_mirror")

for table in "${RLS_TABLES[@]}"; do
    RLS_ENABLED=$(psql "$DATABASE_URL" -c "
        SELECT rowsecurity 
        FROM pg_tables 
        WHERE tablename = '$table';
    " -t | tr -d ' ')
    
    if [[ "$RLS_ENABLED" != "t" ]]; then
        echo "❌ RLS not enabled on security table: $table"
        exit 1
    fi
done

echo "✅ Row Level Security validated"

# Performance check: Verify critical indexes exist
echo "📈 Checking critical indexes..."

CRITICAL_INDEXES=(
    "idx_outbox_worker_query"
    "idx_auth_identities_lookup"
    "idx_profiles_privacy"
    "idx_follows_active"
    "idx_moderation_pending"
)

MISSING_INDEXES=()

for idx in "${CRITICAL_INDEXES[@]}"; do
    INDEX_EXISTS=$(psql "$DATABASE_URL" -c "
        SELECT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname = '$idx'
        );
    " -t | tr -d ' ')
    
    if [[ "$INDEX_EXISTS" != "t" ]]; then
        MISSING_INDEXES+=("$idx")
    fi
done

if [[ ${#MISSING_INDEXES[@]} -gt 0 ]]; then
    echo "⚠️  Missing performance indexes: ${MISSING_INDEXES[*]}"
    echo "   Consider running the full migration to add these indexes"
fi

# Final summary
echo ""
echo "🎉 Schema verification complete!"
echo "   ✅ All required tables present"
echo "   ✅ PostgreSQL extensions installed"
echo "   ✅ UUID primary keys validated"
echo "   ✅ Outbox durability features verified"
echo "   ✅ Row Level Security enabled"

if [[ ${#MISSING_INDEXES[@]} -eq 0 ]]; then
    echo "   ✅ All critical indexes present"
else
    echo "   ⚠️  ${#MISSING_INDEXES[@]} performance indexes missing"
fi

echo ""
echo "Database schema is production-ready! 🚀"