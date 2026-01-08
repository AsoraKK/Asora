# DSR Drills

Executable drill scripts for Data Subject Request (DSR) operations per [docs/runbooks/dsr.md](../../docs/runbooks/dsr.md).

## Prerequisites

1. **Authentication**: Obtain a JWT with `privacy_admin` role
   ```bash
   export BEARER_TOKEN="<your_jwt_here>"
   ```

2. **Azure CLI**: Authenticated with appropriate permissions for Drill 3

3. **Test User ID**: A UUIDv7 test user ID (use a synthetic/test account)

## Drill 1: Export Flow

Tests the full export pipeline: enqueue → worker → review → release.

```bash
./drill1-export.sh <test_user_id>
```

**Expected outcome:**
- Export request transitions: `queued` → `running` → `awaiting_review`
- Worker produces ZIP in storage
- Two-reviewer flow accessible

## Drill 2: Delete with Legal Hold

Tests that legal holds block delete operations appropriately.

```bash
./drill2-legal-hold.sh <test_user_id>
```

**Expected outcome:**
- Legal hold placed successfully
- Delete request blocked with audit entry
- After hold cleared, delete proceeds

## Drill 3: Storage Role Rotation

Tests MI permissions after storage role rotation.

```bash
./drill3-role-rotation.sh
```

**Expected outcome:**
- Rotation script executes cleanly
- DSR operations work post-rotation
- Health endpoint remains healthy

## Results

Drill results are saved to `results/` directory as JSON files for audit trail.

## Scheduling

| Drill | Frequency | Owner |
|-------|-----------|-------|
| Drill 1 | Monthly | Privacy Eng |
| Drill 2 | Quarterly | Privacy Eng |
| Drill 3 | After any storage config change | Platform |

## Troubleshooting

**Export stuck in queued:**
- Check Function app logs for worker errors
- Verify storage queue is processing
- Confirm MI has `Storage Blob Data Contributor` role

**Legal hold not blocking:**
- Verify hold is active in `legal_holds` container
- Check worker logs for hold detection
- Confirm `scopeId` matches user ID format

**Role rotation fails:**
- Verify Azure CLI authentication
- Check subscription/resource group context
- Review rotation script for hard-coded values
