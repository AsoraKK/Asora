# Hive Moderation API - Fix Summary

## Problem Identified

The Hive AI moderation API was not functional due to **two critical issues** in the client implementation:

### Issue 1: Incorrect Authentication Header ❌
**Problem:** Code was using `Bearer` token authentication
```typescript
Authorization: `Bearer ${this.apiKey}`  // WRONG
```

**Solution:** Hive API v2 requires `Token` authentication
```typescript
Authorization: `Token ${this.apiKey}`  // CORRECT
```

**File:** `/home/kylee/asora/functions/shared/hive-client.ts` (line 297)

---

### Issue 2: Incorrect Request/Response Format ❌
**Problem:** Code was using outdated API format with nested `content` object and expected old response structure
```typescript
// Request format - WRONG
{
  user_id: "user-123",
  content: { text: "..." },  // WRONG
  models: [...]
}

// Response format - WRONG  
{
  status: 'success',  // WRONG
  response: { outputs: {...} }  // WRONG
}
```

**Solution:** Updated to correct Hive v2 API format
```typescript
// Request format - CORRECT
{
  text_data: "...",  // CORRECT
  models: [...],
  user_id: "user-123"
}

// Response format - CORRECT
{
  id: "...",
  code: 200,
  status: [{
    status: { code: '0', message: 'SUCCESS' },
    response: { output: [{ classes: [...] }] }
  }]
}
```

**Files Updated:**
- `/home/kylee/asora/functions/shared/hive-client.ts` - Client implementation
- `/home/kylee/asora/functions/shared/hive-client.d.ts` - Type definitions
- `/home/kylee/asora/test-apis-diagnostics.js` - Diagnostic script

---

## Changes Made

### 1. Updated Request Format
- Changed from `content: { text }` to `text_data` field
- Changed from `content: { url }` to `image_url` field
- Kept `models` and `user_id` fields

### 2. Updated Response Format
- Changed from `response.outputs` to `status[0].response.output`
- Updated status validation from `status === 'error'` to `code !== 200`
- Updated response parsing to extract classes from new structure

### 3. Updated Response Parsing
- `parseToModerationResult()` now handles new v2 response format
- `parseModerationResult()` static method updated similarly
- All tests updated to use new format

### 4. Test Suite
- ✅ All 31 comprehensive Hive client tests passing
- ✅ All integration tests passing (post creation with moderation)
- ✅ Live API test confirmed working

---

## Verification Results

### Unit Tests
```
PASS tests/shared/hive-client.comprehensive.test.ts
✅ Test Suites: 1 passed, 1 total
✅ Tests: 31 passed, 31 total
```

### Live API Test
```
✅ HIVE API CONNECTION SUCCESSFUL

Response:
- Request ID: 58d4e040-f45c-11f0-b9ab-b9565e32b56e
- Code: 200
- Status: SUCCESS
- Classes detected: 19
- Response latency: <500ms
```

### Post Creation Integration
```
PASS tests/feed/createPost.route.test.ts
✅ Tests: 20 passed, 20 total
(Includes moderation integration tests)
```

---

## Files Modified

1. **`functions/shared/hive-client.ts`** (Core Fix)
   - Line 297: Changed auth header from `Bearer` to `Token`
   - Lines 105-124: Updated `HiveModerationRequest` and `HiveModerationResponse` interfaces
   - Lines 224-264: Updated request body construction for new format
   - Lines 326-355: Updated response validation for new format
   - Lines 416-490: Completely rewrote `parseToModerationResult()` for new response format
   - Lines 521-566: Updated static `parseModerationResult()` method

2. **`functions/shared/hive-client.d.ts`** (Type Definitions)
   - Updated request/response types to match new API format

3. **`test-apis-diagnostics.js`** (Diagnostic Script)
   - Line 39: Fixed auth header to use `Token` instead of `Bearer`

4. **`functions/tests/shared/hive-client.comprehensive.test.ts`** (Unit Tests)
   - Updated `createHiveResponse()` helper to generate v2 format responses
   - Updated all 31 test cases to expect new response format
   - Updated auth header assertions
   - Updated response structure expectations

---

## What's Working Now ✅

| Component | Status | Notes |
|-----------|--------|-------|
| **Auth Header** | ✅ Fixed | Token-based auth working correctly |
| **Text Moderation** | ✅ Working | Can moderate text content with proper scoring |
| **Image Moderation** | ✅ Ready | Endpoint configured (needs testing with actual images) |
| **Error Handling** | ✅ Robust | Proper error messages and retry logic |
| **Fallback System** | ✅ Intact | Azure Content Safety fallback still configured |
| **Performance** | ✅ Good | Latency <500ms typical, well within limits |

---

## Impact on Other Systems

### No Breaking Changes
- API key configuration remains unchanged (`HIVE_API_KEY` env var)
- Error handling patterns remain compatible
- Integration points work with corrected client

### Post Creation Workflow
- Posts are now properly moderated using Hive API
- Dynamic thresholds respected (block: 0.85, warn: 0.5)
- Decisions logged with proper correlation IDs

---

## Next Steps

1. **Deploy the Fix**
   - Push changes to main/dev branch
   - Deploy to Azure Functions
   - Verify in production with real content

2. **Monitor**
   - Check Application Insights for moderation events
   - Monitor error rates
   - Verify decision distribution (allow/warn/block)

3. **Azure Setup** (If not already done)
   ```bash
   # Ensure Hive API key is set in Azure Function
   az functionapp config appsettings set \
     --resource-group asora-psql-flex \
     --name asora-function-flex \
     --settings HIVE_API_KEY="<your-key-from-kv-asora-dev>"
   ```

---

## Testing the Fix Locally

To verify the fix works in your environment:

```bash
# 1. Set the API key from Key Vault
export HIVE_API_KEY=$(az keyvault secret show \
  --vault-name kv-asora-dev \
  --name hive-text-key \
  --query value -o tsv)

# 2. Run unit tests
cd functions
npm test -- --testPathPattern="hive-client.comprehensive"

# 3. Run integration tests
npm test -- --testPathPattern="createPost"

# 4. Test with real API
node ../test-hive-live.js
```

---

## Technical Details

### Request Format Evolution
```
Old (Broken):          New (Working):
user_id: "123"    →    text_data: "..."
content: {             models: [...]
  text: "..."          user_id: "123"
}                      image_url: "..." (for images)
models: [...]
```

### Response Format Evolution
```
Old (Expected):        New (Actual):
{                      {
  status: 'success'      id: "uuid",
  response: {            code: 200,
    outputs: {           status: [{
      model: {             status: { code: '0', message: 'SUCCESS' },
        summary: {...},     response: {
        classes: [...]        output: [{
      }                         classes: [...]
    }                       }]
  },                     }]
  request_id: "..."    }
}
```

### Why This Matters
- The old format was likely from an older Hive API version
- Modern Hive v2 API uses `text_data` field (not nested in `content`)
- Modern response structure is flatter with different field names
- Token auth is Hive v2 standard (Bearer was never supported)

---

## Conclusion

**The Hive Moderation API is now fully functional.** The code was using incorrect authentication and request/response formats for a different API version. The fix involved:

1. ✅ Changing Bearer → Token auth
2. ✅ Changing request format to match v2 API
3. ✅ Updating response parsing for new structure
4. ✅ Validating with 31 unit tests and live API calls

**API is ready for deployment and production use.**

---

**Last Updated:** January 18, 2026  
**Fixed By:** GitHub Copilot  
**Status:** ✅ Complete & Verified
