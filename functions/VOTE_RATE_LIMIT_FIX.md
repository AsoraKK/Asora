# Vote Rate Limit Fix - Rolling 1 Hour Window

## 🎯 **Changes Made**

### **voteOnAppeal.ts - Rate Limit Logic Update**
- **BEFORE**: Rate limit used "since midnight" (daily reset at 00:00)
- **AFTER**: Rate limit uses rolling 1-hour window (60 minutes from current time)

### **Key Changes**:

1. **Time Window Calculation**:
   ```typescript
   // OLD: Daily reset
   const todayStart = new Date();
   todayStart.setHours(0, 0, 0, 0);
   
   // NEW: Rolling 1-hour window
   const now = new Date();
   const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
   ```

2. **Database Query Update**:
   ```typescript
   // OLD: Since midnight
   query: 'SELECT * FROM c WHERE c.userId = @userId AND c.timestamp > @todayStart'
   
   // NEW: Last hour
   query: 'SELECT * FROM c WHERE c.userId = @userId AND c.timestamp > @oneHourAgo'
   ```

3. **Reset Time Calculation**:
   ```typescript
   // OLD: Next midnight (up to 24 hours)
   const resetTime = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000).toISOString();
   
   // NEW: 1 hour from now
   const resetTime = new Date(now.getTime() + 3600 * 1000).toISOString();
   ```

4. **Response Interface Update**:
   ```typescript
   // OLD
   rateLimitInfo: {
       votesToday: number;
       maxPerHour: number;
       resetTime: string;
   }
   
   // NEW
   rateLimitInfo: {
       votesInLastHour: number;
       maxPerHour: number;
       resetTime: string;
   }
   ```

### **HTTP Response Changes**:

1. **Rate Limit Exceeded (429)**:
   ```json
   {
     "error": "Vote rate limit exceeded",
     "votesInLastHour": 20,
     "maxPerHour": 20,
     "resetTime": "2025-08-13T17:26:14.337Z"
   }
   ```

2. **Successful Vote (201)**:
   ```json
   {
     "success": true,
     "rateLimitInfo": {
       "votesInLastHour": 15,
       "maxPerHour": 20,
       "resetTime": "2025-08-13T17:26:14.337Z"
     }
   }
   ```

## 🧪 **Tests Added**

### **Unit Tests** (`voteOnAppeal.rateLimiting.test.ts`):
- ✅ Allow votes when under rate limit (19/20)
- ✅ Block votes when rate limit exceeded (20/20)
- ✅ Allow 21st vote after 1 hour window rolls
- ✅ Use rolling window, not fixed daily reset
- ✅ Calculate correct reset time (1 hour from now)
- ✅ Return correct error format when rate limited
- ✅ Return correct rate limit info in successful response

### **Integration Tests** (`voteOnAppeal.integration.test.ts`):
- ✅ **21st vote within 60 minutes returns HTTP 429**
- ✅ **21st vote after 60 minutes returns HTTP 200**
- ✅ Use proper time calculations for rolling window

## 🎯 **Success Criteria Met**

### ✅ **Local Test Results**:
- **21st vote within 60 min** → **HTTP 429** ✅
- **21st vote after 60 min** → **HTTP 200** ✅

### ✅ **Technical Validation**:
- TypeScript compiles without errors ✅
- All 10 tests pass ✅
- Function.json generation works ✅
- Rate limit uses `now - 60*60*1000` ✅
- Reset time is `now + 3600s` ✅

## 📊 **Behavior Change Summary**

| **Scenario** | **OLD (Daily Reset)** | **NEW (Rolling Hour)** |
|--------------|----------------------|----------------------|
| User votes 20 times at 11:30 PM | Can vote again at 12:00 AM (30 min) | Can vote again at 12:30 AM (60 min) |
| User votes 20 times at 2:00 PM | Can vote again at 12:00 AM (10 hours) | Can vote again at 3:00 PM (60 min) |
| Rate limit fairness | Unfair - depends on time of day | Fair - always 60 minutes |
| Gaming potential | High - reset at midnight | Low - no predictable reset |

The new implementation provides **consistent, fair rate limiting** with a true rolling 1-hour window, eliminating the gaming potential of the old "since midnight" approach.
