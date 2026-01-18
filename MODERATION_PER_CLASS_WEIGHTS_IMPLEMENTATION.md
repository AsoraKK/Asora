# Per-Class Moderation Weights - Implementation Complete ✅

## What Was Implemented

You can now adjust moderation thresholds **individually for each of the 29 Hive AI classes** instead of using global thresholds. Each class (hate, violence, spam, etc.) has its own configurable weight.

---

## How It Works

### Before (Global Thresholds)
```typescript
// Old way: One threshold for everything
if (score >= 0.85) { block(); }  // All classes treated the same
```

### After (Per-Class Weights) ✅
```typescript
// New way: Each class has its own threshold
if (score >= classWeight['hate']) { block(); }        // 0.85 for hate
if (score >= classWeight['spam']) { block(); }        // 0.80 for spam  
if (score >= classWeight['sexual']) { block(); }      // 0.50 for sexual
```

---

## Files Modified/Created

### 1. `functions/shared/hive-classes-config.ts` (CREATED)
- **Purpose**: Source of truth for all 29 class definitions
- **Contents**: Default weights, min/max bounds, descriptions
- **Exports**:
  - `ALL_HIVE_CLASSES` - Array of 29 classes
  - `getDefaultWeights()` - Returns `{ hate: 0.85, spam: 0.80, ... }`
  - `getClassByName(name)` - Lookup helper
  - `getClassesByApiType(type)` - Filter by text/image/deepfake

### 2. `functions/shared/hive-client.ts` (MODIFIED)
- **Added**: `classWeights` field to `HiveClientConfig`
- **Changed**: Moderation logic now checks per-class weights
- **Improved**: Each class compared against its specific threshold

**Old Logic:**
```typescript
if (cls.score > 0.85) { block(); }  // Global threshold
```

**New Logic:**
```typescript
const classWeight = this.classWeights[cls.class] ?? 0.85;
if (cls.score >= classWeight) { block(); }  // Per-class weight
```

### 3. `functions/shared/moderation-weights-loader.ts` (CREATED)
- **Purpose**: Helper to load weights with Cosmos DB overrides
- **Functions**:
  - `loadModerationWeights(cosmosContainer?)` - Merges defaults + overrides
  - `saveWeightOverride()` - Save admin changes to Cosmos DB
  - `resetWeightToDefault()` - Delete override, use default
  - `createHiveClientWithWeights()` - Initialize client with weights

---

## Usage Examples

### Example 1: Use Defaults Only (No Database)

```typescript
import { createHiveClient } from './shared/hive-client';

// Uses default weights from hive-classes-config.ts
const client = createHiveClient({
  apiKey: process.env.HIVE_API_KEY
});

// Moderation now uses per-class defaults:
// - hate: 0.85 (block at 85%)
// - spam: 0.80 (block at 80%)
// - sexual: 0.50 (block at 50%)
```

### Example 2: Custom Weights (Hardcoded Override)

```typescript
import { HiveAIClient } from './shared/hive-client';

const client = new HiveAIClient({
  apiKey: process.env.HIVE_API_KEY,
  classWeights: {
    hate: 0.90,        // Stricter: only block very confident hate
    spam: 0.70,        // Looser: catch more spam
    violence: 0.75,    // Custom threshold
    // Others use defaults
  }
});
```

### Example 3: Load from Cosmos DB (Future Control Panel)

```typescript
import { createHiveClientWithWeights } from './shared/moderation-weights-loader';
import { CosmosClient } from '@azure/cosmos';

// Initialize Cosmos client
const cosmosClient = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const database = cosmosClient.database('asora-db');
const container = database.container('ModerationWeights');

// Load weights: defaults + any admin overrides from DB
const client = await createHiveClientWithWeights(
  process.env.HIVE_API_KEY,
  container
);

// Moderation uses merged weights:
// - Classes with DB overrides → use custom value
// - Classes without overrides → use default
```

---

## Control Panel Integration (Next Steps)

### Step 1: Create Cosmos DB Container

```bash
# Container name: ModerationWeights
# Partition key: /className
# Default TTL: None (persistent)
```

### Step 2: Create API Endpoints

**GET /api/admin/moderation-classes**
```typescript
// Returns all 29 classes with current weights
import { ALL_HIVE_CLASSES } from './shared/hive-classes-config';
import { loadModerationWeights } from './shared/moderation-weights-loader';

const defaults = ALL_HIVE_CLASSES;
const currentWeights = await loadModerationWeights(cosmosContainer);

return {
  classes: defaults.map(cls => ({
    ...cls,
    currentWeight: currentWeights[cls.name] || cls.defaultWeight,
    isCustomized: cls.name in currentWeights
  }))
};
```

**POST /api/admin/moderation-classes/weights**
```typescript
// Save admin's weight adjustment
import { saveWeightOverride } from './shared/moderation-weights-loader';

const { className, newWeight, reason } = request.body;

await saveWeightOverride(
  cosmosContainer,
  className,
  newWeight,
  request.user.email,
  reason
);

return { success: true };
```

### Step 3: Build Dashboard UI

```typescript
// React/Vue component example
const [classes, setClasses] = useState([]);

useEffect(() => {
  fetch('/api/admin/moderation-classes')
    .then(res => res.json())
    .then(data => setClasses(data.classes));
}, []);

// Render table with sliders
{classes.map(cls => (
  <tr key={cls.id}>
    <td>{cls.name}</td>
    <td>{cls.description}</td>
    <td>
      <input 
        type="range"
        min={cls.minWeight}
        max={cls.maxWeight}
        step={0.05}
        value={cls.currentWeight}
        onChange={(e) => handleWeightChange(cls.name, e.target.value)}
      />
      {(cls.currentWeight * 100).toFixed(0)}%
    </td>
    <td>
      {cls.isCustomized && (
        <button onClick={() => resetToDefault(cls.name)}>
          Reset to Default
        </button>
      )}
    </td>
  </tr>
))}
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Moderation Flow                         │
└─────────────────────────────────────────────────────────────┘

1. POST Request → Create Post with text "I hate this"

2. hive-client.ts loads weights
   ├─ Default: hive-classes-config.ts (version controlled)
   └─ Overrides: Cosmos DB ModerationWeights (admin customized)

3. API Call to Hive AI
   ├─ POST https://api.thehive.ai/api/v2/task/sync
   └─ Response: { hate: 0.92, spam: 0.05, violence: 0.01 }

4. Per-Class Weight Check
   ├─ hate score: 0.92 >= classWeight['hate'] (0.85) → BLOCK ❌
   ├─ spam score: 0.05 <  classWeight['spam'] (0.80) → OK ✅
   └─ violence: 0.01 <  classWeight['violence'] (0.70) → OK ✅

5. Decision: BLOCK (hate exceeded its threshold)

6. Return: { action: 'BLOCK', reason: 'hate: 92.0% (threshold: 85%)' }
```

---

## Cosmos DB Schema

**Container:** `ModerationWeights`

**Sample Document:**
```json
{
  "id": "text_hate",
  "className": "hate",
  "apiType": "text",
  "customWeight": 0.90,
  "defaultWeight": 0.85,
  "lastModifiedBy": "admin@lythaus.com",
  "lastModifiedAt": "2026-01-18T14:30:00Z",
  "changeReason": "Too many false positives on political posts",
  "active": true
}
```

**Queries:**

Get all active overrides:
```sql
SELECT * FROM c WHERE c.active = true
```

Get single class override:
```sql
SELECT * FROM c WHERE c.className = 'hate'
```

Get overrides by API type:
```sql
SELECT * FROM c WHERE c.apiType = 'text' AND c.active = true
```

---

## Testing the Implementation

### Test 1: Default Weights Work

```typescript
import { createHiveClient } from './shared/hive-client';

const client = createHiveClient();
const result = await client.moderateTextContent({
  text: "I hate you",
  userId: "test-user"
});

// Expected: BLOCK (hate score likely > 0.85)
console.log(result.action); // "BLOCK"
console.log(result.reasons); // ["hate: 92.0% (threshold: 85%)"]
```

### Test 2: Custom Weights Override

```typescript
import { HiveAIClient } from './shared/hive-client';

const client = new HiveAIClient({
  apiKey: process.env.HIVE_API_KEY,
  classWeights: {
    hate: 0.95  // Make hate threshold stricter
  }
});

const result = await client.moderateTextContent({
  text: "I hate you",
  userId: "test-user"
});

// Expected: ALLOW or WARN (hate score ~0.92 < 0.95)
console.log(result.action); // "WARN" or "ALLOW"
```

### Test 3: Cosmos DB Integration

```typescript
import { saveWeightOverride, loadModerationWeights } from './shared/moderation-weights-loader';

// Save admin override
await saveWeightOverride(
  cosmosContainer,
  'hate',
  0.90,
  'admin@lythaus.com',
  'Reducing false positives'
);

// Load merged weights
const weights = await loadModerationWeights(cosmosContainer);

console.log(weights['hate']); // 0.90 (custom)
console.log(weights['spam']); // 0.80 (default)
```

---

## Benefits

✅ **Fine-Grained Control**: Each class independently tunable  
✅ **Safety Guardrails**: Min/max bounds prevent dangerous configs  
✅ **Hot Reload**: Change weights without redeploying code  
✅ **Audit Trail**: Track who changed what and when  
✅ **Backward Compatible**: Works with existing code (defaults to global thresholds if no classWeights provided)  
✅ **Flexible**: Can use defaults only, hardcoded overrides, or Cosmos DB persistence  

---

## Example Scenarios

### Scenario 1: Too Much Spam Blocking
- **Problem**: "spam" set to 0.80, legitimate posts blocked
- **Solution**: Admin opens Control Panel, adjusts spam slider to 0.70
- **Result**: Fewer false positives, slightly more spam may slip through

### Scenario 2: Missing Hate Speech
- **Problem**: "hate" set to 0.85, borderline hate getting through
- **Solution**: Admin lowers hate threshold to 0.75
- **Result**: More aggressive hate detection, some edge cases caught

### Scenario 3: NSFW Content Too Strict
- **Problem**: "sexual" set to 0.75, art/education posts blocked
- **Solution**: Admin raises sexual threshold to 0.85
- **Result**: More lenient, only block clear violations

---

## Migration Path

### Phase 1: ✅ COMPLETE (Current)
- [x] Create class config with defaults
- [x] Integrate per-class weights into hive-client
- [x] Create weight loader helpers
- [x] All existing code continues to work (backward compatible)

### Phase 2: Cosmos DB Setup (Next)
- [ ] Create `ModerationWeights` container in Cosmos DB
- [ ] Add Cosmos client to Azure Functions
- [ ] Update Functions to use `loadModerationWeights()`

### Phase 3: Control Panel API (Future)
- [ ] Create GET endpoint for class listings
- [ ] Create POST endpoint for weight updates
- [ ] Add authentication/authorization for admin-only access

### Phase 4: Control Panel UI (Future)
- [ ] Build dashboard page with class table
- [ ] Add weight sliders (bounded by min/max)
- [ ] Show current vs default weights
- [ ] Add reset to default button

---

## Quick Reference

| Task | Code |
|------|------|
| Get all defaults | `import { getDefaultWeights } from './shared/hive-classes-config'` |
| Use defaults only | `createHiveClient({ apiKey: 'xxx' })` |
| Hardcode weights | `new HiveAIClient({ apiKey: 'xxx', classWeights: { hate: 0.90 } })` |
| Load from Cosmos | `await loadModerationWeights(cosmosContainer)` |
| Save override | `await saveWeightOverride(container, 'hate', 0.90, 'admin@example.com')` |
| Reset to default | `await resetWeightToDefault(container, 'hate')` |

---

## Summary

✨ **What Changed:**
- Moderation engine now supports per-class thresholds instead of global 0.85/0.5
- Each of 29 classes can be independently configured
- Weights can come from: defaults (code) → hardcoded overrides → Cosmos DB (future)

🎯 **What's Ready:**
- All moderation code updated to use per-class weights
- Helper functions for loading/saving weights
- Complete class definitions with sensible defaults

🚀 **What's Next:**
- Hook up Cosmos DB container
- Build Control Panel API endpoints
- Create dashboard UI for admins to adjust weights

**Everything is backward compatible - existing code continues to work unchanged!**
