"use strict";
/**
 * ASORA AUTHENTICATION UTILITIES
 *
 * 🎯 Purpose: JWT token verification and user extraction
 * 🔐 Security: Token validation with Azure AD B2C integration
 * 📊 Features: Token parsing, user ID extraction, role verification
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
exports.verifyJWT = verifyJWT;
exports.extractUserIdFromJWT = extractUserIdFromJWT;
exports.hasRole = hasRole;
exports.extractUserInfo = extractUserInfo;
var jwt = require("jsonwebtoken");
/**
 * Verify JWT token and extract payload
 */
function verifyJWT(token) {
    return __awaiter(this, void 0, void 0, function () {
        var decoded, payload, now;
        return __generator(this, function (_a) {
            try {
                decoded = jwt.decode(token, { complete: true });
                if (!decoded || typeof decoded === 'string') {
                    throw new Error('Invalid token format');
                }
                payload = decoded.payload;
                if (!payload.sub) {
                    throw new Error('Token missing subject (user ID)');
                }
                now = Math.floor(Date.now() / 1000);
                if (payload.exp && payload.exp < now) {
                    throw new Error('Token expired');
                }
                return [2 /*return*/, payload];
            }
            catch (error) {
                throw new Error("JWT verification failed: ".concat(error instanceof Error ? error.message : 'Unknown error'));
            }
            return [2 /*return*/];
        });
    });
}
/**
 * Extract user ID from JWT token in Authorization header
 */
function extractUserIdFromJWT(authHeader) {
    try {
        var token = authHeader.replace('Bearer ', '');
        var decoded = jwt.decode(token);
        return (decoded === null || decoded === void 0 ? void 0 : decoded.sub) || '';
    }
    catch (_a) {
        return '';
    }
}
/**
 * Check if user has required role
 */
function hasRole(payload, requiredRole) {
    var _a, _b;
    return (_b = (_a = payload.roles) === null || _a === void 0 ? void 0 : _a.includes(requiredRole)) !== null && _b !== void 0 ? _b : false;
}
/**
 * Extract user information from JWT payload
 */
function extractUserInfo(payload) {
    return {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        roles: payload.roles || []
    };
}
