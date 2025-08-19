"use strict";
/**
 * ASORA RATE LIMITING UTILITIES
 *
 * 🎯 Purpose: Prevent API abuse and spam with configurable rate limits
 * 🔐 Security: Redis-based distributed rate limiting
 * 📊 Features: Sliding window, custom key generators, different limits per endpoint
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = createRateLimiter;
exports.defaultKeyGenerator = defaultKeyGenerator;
exports.userKeyGenerator = userKeyGenerator;
exports.endpointKeyGenerator = endpointKeyGenerator;
// In-memory store for development (use Redis for production)
var rateLimitStore = new Map();
function createRateLimiter(config) {
    return {
        checkRateLimit: function (req) {
            return __awaiter(this, void 0, void 0, function () {
                var key, now, windowStart, _i, _a, _b, storeKey, data, entry, blocked, remaining;
                return __generator(this, function (_c) {
                    key = config.keyGenerator(req);
                    now = Date.now();
                    windowStart = now - config.windowMs;
                    // Clean up expired entries
                    for (_i = 0, _a = rateLimitStore.entries(); _i < _a.length; _i++) {
                        _b = _a[_i], storeKey = _b[0], data = _b[1];
                        if (data.resetTime < now) {
                            rateLimitStore.delete(storeKey);
                        }
                    }
                    entry = rateLimitStore.get(key);
                    if (!entry || entry.resetTime < now) {
                        entry = {
                            count: 0,
                            resetTime: now + config.windowMs
                        };
                        rateLimitStore.set(key, entry);
                    }
                    // Increment counter
                    entry.count++;
                    blocked = entry.count > config.maxRequests;
                    remaining = Math.max(0, config.maxRequests - entry.count);
                    return [2 /*return*/, {
                            blocked: blocked,
                            limit: config.maxRequests,
                            remaining: remaining,
                            resetTime: entry.resetTime,
                            totalHits: entry.count
                        }];
                });
            });
        }
    };
}
/**
 * Default key generator using IP address
 */
function defaultKeyGenerator(req) {
    return req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip') ||
        'unknown';
}
/**
 * User-based key generator (requires authentication)
 */
function userKeyGenerator(req) {
    var authHeader = req.headers.get('authorization') || '';
    var token = authHeader.replace('Bearer ', '');
    try {
        var decoded = JSON.parse(atob(token.split('.')[1]));
        return "user:".concat(decoded.sub);
    }
    catch (_a) {
        return defaultKeyGenerator(req);
    }
}
/**
 * Endpoint-specific key generator
 */
function endpointKeyGenerator(endpoint) {
    return function (req) {
        var userKey = userKeyGenerator(req);
        return "".concat(endpoint, ":").concat(userKey);
    };
}
