# Quick Reference Card - Per-Class Moderation Weights

## Files & Locations

| File | Purpose |
|------|---------|
| `functions/shared/hive-classes-config.ts` | 29 class definitions (source of truth) |
| `functions/src/admin/get-moderation-classes.function.ts` | GET /api/admin/moderation-classes |
| `functions/src/admin/save-weight-override.function.ts` | POST /api/admin/moderation-classes/weights |
| `functions/src/admin/reset-weight-override.function.ts` | POST /api/admin/moderation-classes/{name}/reset |
| `setup-cosmos-moderation-weights.sh` | Setup script for Cosmos DB |
| `lib/screens/admin/moderation_weights_screen.dart` | Flutter Control Panel screen |

## Key Functions

```typescript
// Load weights (defaults + Cosmos overrides)
import { loadModerationWeights } from './shared/moderation-weights-loader';
const weights = await loadModerationWeights(cosmosContainer);

// Save override
import { saveWeightOverride } from './shared/moderation-weights-loader';
await saveWeightOverride(cosmosContainer, 'hate', 0.90, 'admin@example.com', 'Reason');

// Reset to default
import { resetWeightToDefault } from './shared/moderation-weights-loader';
await resetWeightToDefault(cosmosContainer, 'hate');

// Create client with weights
const client = new HiveAIClient({
  apiKey: process.env.HIVE_API_KEY,
  classWeights: weights  // ← Per-class control
});

// Moderate text (uses per-class weights automatically)
const result = await client.moderateTextContent({ text, userId });
```

## API Endpoints

**GET /api/admin/moderation-classes**
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:7072/api/admin/moderation-classes
```

**POST /api/admin/moderation-classes/weights**
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"className":"hate","newWeight":0.90}' \
  http://localhost:7072/api/admin/moderation-classes/weights
```

**POST /api/admin/moderation-classes/{className}/reset**
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  http://localhost:7072/api/admin/moderation-classes/hate/reset
```

## Cosmos DB Queries

```sql
-- All active overrides
SELECT * FROM c WHERE c.active = true

-- Single class
SELECT * FROM c WHERE c.className = 'hate'

-- By API type
SELECT * FROM c WHERE c.apiType = 'text' AND c.active = true

-- Recently modified
SELECT * FROM c ORDER BY c.lastModifiedAt DESC
```

## Default Weights by Priority

**Critical (99% - Block immediately)**
- child_exploitation: 0.99
- self_harm_intent: 0.95

**High (85-90% - Zero tolerance)**
- hate: 0.85
- weapons: 0.80
- violent_description: 0.85

**Medium (70-80% - Strict)**
- spam: 0.80
- violence: 0.70
- bullying: 0.80

**Low (50% - Flexible)**
- sexual: 0.50
- phone_number: 0.50

## Deployment Steps

```bash
# 1. Build functions
cd functions && npm run build

# 2. Setup Cosmos DB
bash setup-cosmos-moderation-weights.sh asora-rg asora-cosmos

# 3. Get connection string
COSMOS_CONN=$(az cosmosdb keys list \
  --resource-group asora-rg --name asora-cosmos \
  --type connection-strings \
  --query connectionStrings[0].connectionString -o tsv)

# 4. Set environment
az functionapp config appsettings set \
  --resource-group asora-rg --name asora-functions \
  --settings COSMOS_CONNECTION_STRING="$COSMOS_CONN"

# 5. Deploy (via CI/CD)
git push  # Triggers deployment pipeline
```

## Debugging

```bash
# Check if endpoints registered
func host start

# Test endpoint
curl -X GET http://localhost:7072/api/admin/moderation-classes

# Check Cosmos DB
az cosmosdb sql query \
  --resource-group asora-rg --account-name asora-cosmos \
  --database-name asora-db --container-name ModerationWeights \
  --query 'SELECT * FROM c'

# View logs
func logs  # Or Azure Portal > Logs
```

## 29 Classes Checklist

**Text (19)** ✅
- bullying, child_exploitation, child_safety, drugs, gibberish
- hate, minor_explicitly_mentioned, minor_implicitly_mentioned
- phone_number, promotions, redirection, self_harm, self_harm_intent
- sexual, sexual_description, spam, violence, violent_description, weapons

**Image (9)** ✅
- adult_content, general_image_classification, gore
- hate_symbols, illegal_activity, nudity, self_harm_image
- violence_image_detection, weapons_image

**Deepfake (1)** ✅
- deepfake_detection

## Troubleshooting Quick Links

| Error | Solution |
|-------|----------|
| "COSMOS_CONNECTION_STRING not configured" | Set env var (see Deployment Steps #4) |
| "Unauthorized" (401) | Add `Authorization: Bearer TOKEN` header |
| "Unknown class" | Check spelling (case-sensitive) |
| "Weight out of bounds" | Ensure newWeight is between minWeight and maxWeight |
| Weight change not applying | Verify saved to Cosmos DB, restart Functions |

## Monitoring

```kusto
// Weight adjustments
customEvents
| where name == 'Weight override saved'
| summarize count() by className

// Error rate
exceptions
| where method == 'saveWeightOverride'
| summarize count() by type
```

## Full Documentation

- **Setup & Integration**: `CONTROL_PANEL_COMPLETE_SETUP_GUIDE.md`
- **Class Reference**: `HIVE_CLASSES_CONTROL_PANEL_GUIDE.md`
- **Architecture Details**: `MODERATION_PER_CLASS_WEIGHTS_IMPLEMENTATION.md`
- **Code Examples**: `functions/examples/per-class-weights-examples.ts`
- **Final Summary**: `CONTROL_PANEL_FINAL_SUMMARY.md`

---

**Everything is built, tested, and ready for deployment! 🚀**
