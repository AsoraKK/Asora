# Type Errors Follow-up Task

**Date:** October 23, 2025  
**Status:** 🔴 **OPEN**  
**Priority:** Medium  
**Assignee:** TBD

---

## Context

During API layout normalization, 6 pre-existing TypeScript type errors were discovered in 4 files. These errors are isolated and do not affect the core refactoring work but must be resolved before production deployment.

---

## Error Summary

### Build Output
```
Found 6 errors in 4 files.

Errors  Files
     2  src/auth/service/tokenService.ts:220
     2  src/moderation/routes/voteOnAppeal.ts:25
     1  src/moderation/service/voteService.ts:48
     1  src/privacy/service/deleteService.ts:356
```

### Detailed Errors

#### 1. tokenService.ts (Lines 220, 290)
```
error TS2739: Type '{ sub: string; email: string; role: string; tier: string; 
reputation: number; iss: string; aud: string; nonce: string; }' is missing the 
following properties from type 'TokenPayload': exp, iat, jti
```

**Issue:** TokenPayload interface requires exp, iat, jti but payload construction omits them.

#### 2. voteOnAppeal.ts (Line 25)
```
error TS2349: This expression is not callable.
  Type 'String' has no call signatures.

25     const appealId = req.params.get('appealId') ?? undefined;
```

**Issue:** req.params is a String constructor, not a Map-like object with .get() method.

#### 3. voteOnAppeal.ts (Line 31)
```
error TS2353: Object literal may only specify known properties, and 'appealId' 
does not exist in type 'VoteOnAppealParams'.

31       appealId,
```

**Issue:** VoteOnAppealParams type definition doesn't include appealId property.

#### 4. voteService.ts (Line 48)
```
error TS2339: Property 'appealId' does not exist on type 'VoteOnAppealParams'.

48   appealId: appealIdOverride,
```

**Issue:** Same as #3 - type mismatch between usage and definition.

#### 5. deleteService.ts (Line 356)
```
error TS2339: Property 'body' does not exist on type '{ status: number; message: string; }'.

356       return json(error.status, error.body);
```

**Issue:** Error object type doesn't include body property.

---

## Resolution Strategy

### Step 1: Standardize Service Return Types

Apply Result<T> pattern across all services:

```typescript
// shared/types.ts
export type Result<T> = 
  | { ok: true; value: T }
  | { ok: false; error: string; code?: number };

export interface ContextDeps {
  cosmos: CosmosClient;
  redis?: RedisClientType;
  now: () => Date;
}
```

**Rationale:** Services should return typed results only. HTTP concerns belong in routes.

### Step 2: Fix Token Service

**File:** `functions/src/auth/service/tokenService.ts`

**Changes Required:**
1. Update TokenPayload interface to match JWT spec:
```typescript
export interface TokenPayload {
  sub: string;
  iat?: number;  // issued at
  exp?: number;  // expiration
  scope?: string[];
  [key: string]: unknown;  // allow additional claims
}
```

2. Add type guard:
```typescript
export function isTokenPayload(x: unknown): x is TokenPayload {
  return !!x && typeof (x as any).sub === "string";
}
```

3. Ensure payload construction includes all required fields or makes them optional

**Lines to Fix:** 220, 290

### Step 3: Fix Vote Appeal Routes

**Files:** 
- `functions/src/moderation/routes/voteOnAppeal.ts`
- `functions/src/moderation/service/voteService.ts`

**Changes Required:**
1. Fix req.params usage (Azure Functions v4 uses different API):
```typescript
// Azure Functions v4 pattern
const appealId = req.params.appealId;  // Direct property access
// OR from route path parsing
const appealId = context.bindingData.appealId;
```

2. Unify Vote types:
```typescript
export type Vote = "up" | "down";

export interface VoteInput {
  appealId: string;
  voterId: string;
  vote: Vote;
}
```

3. Update VoteOnAppealParams to include appealId:
```typescript
export interface VoteOnAppealParams {
  appealId: string;  // ADD THIS
  request: HttpRequest;
  context: InvocationContext;
  userId: string;
}
```

**Lines to Fix:** voteOnAppeal.ts:25,31; voteService.ts:48

### Step 4: Fix Delete Service

**File:** `functions/src/privacy/service/deleteService.ts`

**Changes Required:**
1. Create discriminated error type:
```typescript
export type DeleteError = 
  | { kind: "not_found"; message: string; status: 404 }
  | { kind: "unauthorized"; message: string; status: 403 }
  | { kind: "invalid"; message: string; status: 400; body?: unknown };
```

2. Update error handling to use Result<T> pattern:
```typescript
export async function deleteService(
  input: DeleteInput,
  deps: ContextDeps
): Promise<Result<{ deleted: boolean }>> {
  try {
    // ... deletion logic
    return { ok: true, value: { deleted: true } };
  } catch (e) {
    return { 
      ok: false, 
      error: e instanceof Error ? e.message : "Unknown error",
      code: 500
    };
  }
}
```

3. Route maps Result to HTTP response:
```typescript
const result = await deleteService(input, deps);
if (!result.ok) {
  return result.code === 404 ? notFound() : serverError(result.error);
}
return ok(result.value);
```

**Lines to Fix:** 356

---

## Implementation Checklist

### Phase 1: Type Definitions
- [ ] Create `functions/src/shared/types.ts` with Result<T> and ContextDeps
- [ ] Update `functions/src/auth/types.ts` with TokenPayload and isTokenPayload
- [ ] Update `functions/src/moderation/types.ts` with Vote and VoteInput
- [ ] Create branded types for PostId, UserId in privacy types

### Phase 2: Service Layer Fixes
- [ ] Refactor tokenService to return Result<TokenData>
- [ ] Fix tokenService payload construction (lines 220, 290)
- [ ] Refactor voteService to accept VoteInput and return Result
- [ ] Fix voteService appealId handling (line 48)
- [ ] Refactor deleteService to return Result<{ deleted: boolean }>
- [ ] Fix deleteService error handling (line 356)

### Phase 3: Route Layer Fixes
- [ ] Update voteOnAppeal route to parse appealId correctly (line 25)
- [ ] Fix VoteOnAppealParams construction (line 31)
- [ ] Update all affected routes to use Result<T> pattern
- [ ] Remove HttpResponseInit from service return types

### Phase 4: Testing
- [ ] Add tests for tokenService (happy path, invalid payload, expired token)
- [ ] Add tests for voteService (up vote, down vote, invalid appealId)
- [ ] Add tests for deleteService (user delete, post delete, unauthorized)
- [ ] Add tests for voteOnAppeal route (401 guest, 200 valid, 400 invalid)

### Phase 5: Verification
- [ ] Run `npm run build:functions` - must pass with 0 errors
- [ ] Run `npm run test:functions` - all tests pass
- [ ] Run `npm run verify:routes` - smoke tests pass
- [ ] Search for remaining `as Type` casts: `rg -n 'as\s+' functions/src`
- [ ] Search for remaining `any` types: `rg -n ': any' functions/src`

---

## Helper Commands

```bash
# Find const arrow functions (anti-pattern)
rg -n 'export const .*=\s*async' functions/src | rg -v 'node_modules'

# Find type casts (should be guards)
rg -n 'as\s+' functions/src | rg -v 'node_modules'

# Find services returning HTTP types (anti-pattern)
rg -n 'HttpResponseInit' functions/src/**/service

# Find 'any' types (tighten to unknown)
rg -n ': any' functions/src

# Check for implicit Promise<void>
rg -n 'Promise<void>' functions/src
```

---

## Constraints

### Must Preserve
- ✅ `strict: true` in tsconfig
- ✅ All current tsconfig compiler options
- ✅ Azure Functions v4 programmatic model
- ✅ Existing route paths and HTTP contracts
- ✅ Authentication middleware patterns

### Must Change
- ❌ Services returning HttpResponseInit (move to routes only)
- ❌ Type assertions (`as Type`) without guards
- ❌ `any` types (replace with `unknown` + guards)
- ❌ Implicit Promise<void> (add explicit types)

---

## Success Criteria

1. ✅ `npm run build:functions` exits with code 0
2. ✅ `npm run test:functions` shows 100% passing tests
3. ✅ Zero type errors in VS Code TypeScript server
4. ✅ All services follow Result<T> pattern
5. ✅ All routes handle errors with proper HTTP codes
6. ✅ Type guards replace type assertions where feasible
7. ✅ Test coverage for all 4 affected files

---

## Estimated Effort

- **Phase 1-3 (Fixes):** 3-4 hours
- **Phase 4 (Tests):** 2-3 hours
- **Phase 5 (Verification):** 1 hour
- **Total:** 6-8 hours

---

## References

- **Service Pattern Examples:** `functions/src/feed/service/feedService.ts`
- **Route Pattern Examples:** `functions/src/feed/routes/getFeed.ts`
- **Auth Middleware:** `functions/src/shared/middleware/auth.ts`
- **HTTP Utilities:** `functions/src/shared/utils/http.ts`
- **Type Guards Example:** `functions/src/shared/utils/validate.ts`

---

## Copilot Prompt (Ready to Use)

```
Title: Fix type errors in tokenService, voteOnAppeal, voteService, deleteService

Goal:
Eliminate the 6 TypeScript errors without altering behavior. Conform to our service and handler contracts used across functions/src/{auth,feed,moderation,privacy}.

Constraints:
- Runtime: Azure Functions v4, Node/TS.
- Handlers use export async function handler(...).
- Return HttpResponseInit from route handlers. Services return typed results only.
- Do not relax tsconfig. Keep strict: true and current options.

Tasks:
1. Standardize service signatures
   Apply this pattern to each service:
   
   // types
   export type Result<T> = { ok: true; value: T } | { ok: false; error: string; code?: number };
   
   // service
   export interface ContextDeps { cosmos: CosmosClient; redis?: RedisClientType; now: () => Date; }
   
   export async function someService(input: { userId: string; [k: string]: unknown }, deps: ContextDeps): Promise<Result<Out>> {
     // validate input (zod or guards)
     // return { ok: true, value } or { ok: false, error, code }
   }

   Remove HttpResponseInit from any service return types. Only routes compose HTTP.

2. Token service fixes
   Make token payload explicit and compatible with RS256 verification.
   
   export interface TokenPayload { sub: string; iat?: number; exp?: number; scope?: string[]; }
   export function isTokenPayload(x: unknown): x is TokenPayload {
     return !!x && typeof (x as any).sub === "string";
   }
   
   Where decoding occurs, narrow with isTokenPayload before property access.

3. voteOnAppeal / voteService fixes
   Unify vote enums and input schema:
   
   export type Vote = "up" | "down";
   export interface VoteInput { appealId: string; voterId: string; vote: Vote; }
   
   Ensure functions that read vote switch on both literals and return never in default to satisfy exhaustiveness:
   
   function weightFor(v: Vote): number {
     switch (v) { case "up": return 1; case "down": return -1; }
   }

4. deleteService fixes
   Make IDs branded to catch mixups:
   
   export type PostId = string & { readonly __brand: "PostId" };
   export type UserId = string & { readonly __brand: "UserId" };
   
   Accept a discriminated input to remove optional chaining errors:
   
   export type DeleteInput =
     | { kind: "post"; postId: PostId; requester: UserId }
     | { kind: "comment"; commentId: string; requester: UserId };
   
   Return Result<{ deleted: boolean }> and let route map to 200/404.

5. Route glue stays thin
   For each affected route:
   
   import { ok, notFound, badRequest, serverError } from "@shared/utils/http";
   import { parseAuth, authRequired } from "@shared/middleware/auth";
   import { someService } from "../service/someService";
   
   export async function handler(req: HttpRequest): Promise<HttpResponseInit> {
     try {
       const p = parseAuth(req); try { authRequired(p); } catch { return unauthorized(); }
       const body = await req.json().catch(() => null);
       if (!body) return badRequest("invalid json");
       
       const r = await someService({ ...body, userId: p.id }, deps());
       if (!r.ok) return (r.code === 404 ? notFound() : badRequest(r.error));
       return ok(r.value);
     } catch { return serverError(); }
   }

6. Tighten types locally, not globally
   - Replace any with unknown + type guards.
   - Add explicit return types to exported functions.
   - Replace as Type casts with guards where feasible.
   - Ensure all Promise chains are awaited to fix implicit Promise<void> errors.

7. Unit tests for the four files
   Add tests covering:
   - happy path
   - invalid input path (schema failure)
   - service error path
   - auth guard path (401 as guest)
   
   Keep tests in functions/tests/{module}/.

Verification:
- npm run build:functions passes.
- npm test passes.
- npm run verify:routes shows expected 401/2xx outcomes.

Search-and-fix helpers:
- rg -n 'export const .*=\s*async' functions/src | rg -v 'node_modules'
- rg -n 'as\s+' functions/src | rg -v 'node_modules'
- rg -n 'HttpResponseInit' functions/src/**/service

If a type error persists, print the exact file, line, inferred vs expected types, and propose the minimal local guard or signature change.
```

---

## Notes

- These errors are **pre-existing** from CodeX's work, not introduced by API layout normalization
- They are **isolated** to 4 files and don't affect the core refactoring
- They must be fixed before production deployment but don't block development
- The comprehensive prompt above provides a clear path to resolution
