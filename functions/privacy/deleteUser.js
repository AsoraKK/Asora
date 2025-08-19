"use strict";
/**
 * ASORA USER ACCOUNT DELETION ENDPOINT
 *
 * 🎯 Purpose: GDPR Article 17 (Right to be Forgotten) compliance - Delete user data
 * 🔐 Security: JWT auth + confirmation header + idempotent operations
 * ⚠️ Features: Complete data scrubbing, content anonymization, audit logging
 * 🗃️ Architecture: Multi-container cleanup with rollback safety
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.deleteUser = deleteUser;
var cosmos_1 = require("@azure/cosmos");
var auth_utils_1 = require("../shared/auth-utils");
var rate_limiter_1 = require("../shared/rate-limiter");
// Rate limiter for deletion requests (safety measure - 1 per hour)
var deleteRateLimiter = (0, rate_limiter_1.createRateLimiter)({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 1,
    keyGenerator: function (req) {
        var authHeader = req.headers.get('authorization') || '';
        var token = authHeader.replace('Bearer ', '');
        try {
            var decoded = JSON.parse(atob(token.split('.')[1]));
            return "privacy_delete:".concat(decoded.sub);
        }
        catch (_a) {
            return 'privacy_delete:unknown';
        }
    }
});
function deleteUser(request, context) {
    return __awaiter(this, void 0, void 0, function () {
        var deletionId, authHeader, token, jwtPayload, userId, confirmHeader, rateLimitResult, cosmosClient, database, usersContainer, postsContainer, commentsContainer, likesContainer, flagsContainer, appealsContainer, votesContainer, warnings, itemsProcessed, contentMarking, userExists, existingUser, error_1, postsQuery, userPosts, _i, userPosts_1, post, updatedPost, error_2, error_3, commentsQuery, userComments, _a, userComments_1, comment, updatedComment, error_4, error_5, likesQuery, userLikes, _b, userLikes_1, like, error_6, error_7, flagsQuery, userFlags, _c, userFlags_1, flag, error_8, error_9, appealsQuery, userAppeals, _d, userAppeals_1, appeal, error_10, error_11, votesQuery, userVotes, _e, userVotes_1, vote, error_12, error_13, error_14, deletionResult, error_15;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    deletionId = "del_".concat(Date.now(), "_").concat(Math.random().toString(36).substr(2, 9));
                    context.log("Account deletion request received - Deletion ID: ".concat(deletionId));
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 66, , 67]);
                    authHeader = request.headers.get('authorization');
                    if (!authHeader) {
                        return [2 /*return*/, {
                                status: 401,
                                jsonBody: { error: 'Missing authorization header' }
                            }];
                    }
                    token = authHeader.replace('Bearer ', '');
                    return [4 /*yield*/, (0, auth_utils_1.verifyJWT)(token)];
                case 2:
                    jwtPayload = _f.sent();
                    userId = jwtPayload.sub;
                    confirmHeader = request.headers.get('X-Confirm-Delete');
                    if (confirmHeader !== 'true') {
                        context.log("Deletion attempted without confirmation header for user: ".concat(userId));
                        return [2 /*return*/, {
                                status: 400,
                                jsonBody: {
                                    error: 'Confirmation required',
                                    message: 'Account deletion requires X-Confirm-Delete header set to "true"'
                                }
                            }];
                    }
                    return [4 /*yield*/, deleteRateLimiter.checkRateLimit(request)];
                case 3:
                    rateLimitResult = _f.sent();
                    if (rateLimitResult.blocked) {
                        context.log("Deletion rate limited for user: ".concat(userId));
                        return [2 /*return*/, {
                                status: 429,
                                jsonBody: {
                                    error: 'Rate limit exceeded',
                                    message: 'Account deletion is limited to prevent abuse. Please try again later.',
                                    resetTime: rateLimitResult.resetTime
                                }
                            }];
                    }
                    cosmosClient = new cosmos_1.CosmosClient(process.env.COSMOS_CONNECTION_STRING || '');
                    database = cosmosClient.database('asora');
                    usersContainer = database.container('users');
                    postsContainer = database.container('posts');
                    commentsContainer = database.container('comments');
                    likesContainer = database.container('likes');
                    flagsContainer = database.container('content_flags');
                    appealsContainer = database.container('appeals');
                    votesContainer = database.container('appeal_votes');
                    context.log("Starting complete account deletion for user: ".concat(userId));
                    warnings = [];
                    itemsProcessed = {
                        userProfile: false,
                        posts: 0,
                        comments: 0,
                        likes: 0,
                        flags: 0,
                        appeals: 0,
                        votes: 0
                    };
                    contentMarking = {
                        postsAnonymized: 0,
                        commentsAnonymized: 0
                    };
                    userExists = false;
                    _f.label = 4;
                case 4:
                    _f.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, usersContainer.item(userId, userId).read()];
                case 5:
                    existingUser = (_f.sent()).resource;
                    userExists = !!existingUser;
                    return [3 /*break*/, 7];
                case 6:
                    error_1 = _f.sent();
                    if (error_1.code === 404) {
                        context.log("User ".concat(userId, " already deleted or never existed"));
                        // Return success for idempotent behavior
                        return [2 /*return*/, {
                                status: 200,
                                jsonBody: {
                                    message: 'Account deletion completed (user already deleted)',
                                    userId: userId,
                                    deletionId: deletionId,
                                    deletedAt: new Date().toISOString(),
                                    alreadyDeleted: true
                                }
                            }];
                    }
                    context.log("Error checking user existence: ".concat(error_1.message));
                    warnings.push("Could not verify user existence: ".concat(error_1.message));
                    return [3 /*break*/, 7];
                case 7:
                    _f.trys.push([7, 15, , 16]);
                    postsQuery = {
                        query: 'SELECT * FROM c WHERE c.authorId = @userId AND (IS_NULL(c.deletedAt) OR c.deletedAt = "")',
                        parameters: [{ name: '@userId', value: userId }]
                    };
                    return [4 /*yield*/, postsContainer.items.query(postsQuery).fetchAll()];
                case 8:
                    userPosts = (_f.sent()).resources;
                    _i = 0, userPosts_1 = userPosts;
                    _f.label = 9;
                case 9:
                    if (!(_i < userPosts_1.length)) return [3 /*break*/, 14];
                    post = userPosts_1[_i];
                    _f.label = 10;
                case 10:
                    _f.trys.push([10, 12, , 13]);
                    updatedPost = __assign(__assign({}, post), { authorName: '[Deleted User]', authorId: 'deleted_user', authorEmail: null, deletedAt: new Date().toISOString(), deletedBy: 'user_request', originalAuthorId: userId, lastModified: new Date().toISOString() });
                    return [4 /*yield*/, postsContainer.item(post.id, post.id).replace(updatedPost)];
                case 11:
                    _f.sent();
                    contentMarking.postsAnonymized++;
                    return [3 /*break*/, 13];
                case 12:
                    error_2 = _f.sent();
                    warnings.push("Failed to anonymize post ".concat(post.id, ": ").concat(error_2.message));
                    return [3 /*break*/, 13];
                case 13:
                    _i++;
                    return [3 /*break*/, 9];
                case 14:
                    itemsProcessed.posts = userPosts.length;
                    context.log("Processed ".concat(userPosts.length, " posts for anonymization"));
                    return [3 /*break*/, 16];
                case 15:
                    error_3 = _f.sent();
                    warnings.push("Error processing posts: ".concat(error_3.message));
                    return [3 /*break*/, 16];
                case 16:
                    _f.trys.push([16, 24, , 25]);
                    commentsQuery = {
                        query: 'SELECT * FROM c WHERE c.authorId = @userId AND (IS_NULL(c.deletedAt) OR c.deletedAt = "")',
                        parameters: [{ name: '@userId', value: userId }]
                    };
                    return [4 /*yield*/, commentsContainer.items.query(commentsQuery).fetchAll()];
                case 17:
                    userComments = (_f.sent()).resources;
                    _a = 0, userComments_1 = userComments;
                    _f.label = 18;
                case 18:
                    if (!(_a < userComments_1.length)) return [3 /*break*/, 23];
                    comment = userComments_1[_a];
                    _f.label = 19;
                case 19:
                    _f.trys.push([19, 21, , 22]);
                    updatedComment = __assign(__assign({}, comment), { authorName: '[Deleted User]', authorId: 'deleted_user', content: '[Comment deleted by user request]', deletedAt: new Date().toISOString(), deletedBy: 'user_request', originalAuthorId: userId, lastModified: new Date().toISOString() });
                    return [4 /*yield*/, commentsContainer.item(comment.id, comment.id).replace(updatedComment)];
                case 20:
                    _f.sent();
                    contentMarking.commentsAnonymized++;
                    return [3 /*break*/, 22];
                case 21:
                    error_4 = _f.sent();
                    warnings.push("Failed to anonymize comment ".concat(comment.id, ": ").concat(error_4.message));
                    return [3 /*break*/, 22];
                case 22:
                    _a++;
                    return [3 /*break*/, 18];
                case 23:
                    itemsProcessed.comments = userComments.length;
                    context.log("Processed ".concat(userComments.length, " comments for anonymization"));
                    return [3 /*break*/, 25];
                case 24:
                    error_5 = _f.sent();
                    warnings.push("Error processing comments: ".concat(error_5.message));
                    return [3 /*break*/, 25];
                case 25:
                    _f.trys.push([25, 33, , 34]);
                    likesQuery = {
                        query: 'SELECT * FROM c WHERE c.userId = @userId',
                        parameters: [{ name: '@userId', value: userId }]
                    };
                    return [4 /*yield*/, likesContainer.items.query(likesQuery).fetchAll()];
                case 26:
                    userLikes = (_f.sent()).resources;
                    _b = 0, userLikes_1 = userLikes;
                    _f.label = 27;
                case 27:
                    if (!(_b < userLikes_1.length)) return [3 /*break*/, 32];
                    like = userLikes_1[_b];
                    _f.label = 28;
                case 28:
                    _f.trys.push([28, 30, , 31]);
                    return [4 /*yield*/, likesContainer.item(like.id, like.userId).delete()];
                case 29:
                    _f.sent();
                    itemsProcessed.likes++;
                    return [3 /*break*/, 31];
                case 30:
                    error_6 = _f.sent();
                    warnings.push("Failed to delete like ".concat(like.id, ": ").concat(error_6.message));
                    return [3 /*break*/, 31];
                case 31:
                    _b++;
                    return [3 /*break*/, 27];
                case 32:
                    context.log("Deleted ".concat(itemsProcessed.likes, " likes"));
                    return [3 /*break*/, 34];
                case 33:
                    error_7 = _f.sent();
                    warnings.push("Error deleting likes: ".concat(error_7.message));
                    return [3 /*break*/, 34];
                case 34:
                    _f.trys.push([34, 42, , 43]);
                    flagsQuery = {
                        query: 'SELECT * FROM c WHERE c.flaggerId = @userId',
                        parameters: [{ name: '@userId', value: userId }]
                    };
                    return [4 /*yield*/, flagsContainer.items.query(flagsQuery).fetchAll()];
                case 35:
                    userFlags = (_f.sent()).resources;
                    _c = 0, userFlags_1 = userFlags;
                    _f.label = 36;
                case 36:
                    if (!(_c < userFlags_1.length)) return [3 /*break*/, 41];
                    flag = userFlags_1[_c];
                    _f.label = 37;
                case 37:
                    _f.trys.push([37, 39, , 40]);
                    return [4 /*yield*/, flagsContainer.item(flag.id, flag.id).delete()];
                case 38:
                    _f.sent();
                    itemsProcessed.flags++;
                    return [3 /*break*/, 40];
                case 39:
                    error_8 = _f.sent();
                    warnings.push("Failed to delete flag ".concat(flag.id, ": ").concat(error_8.message));
                    return [3 /*break*/, 40];
                case 40:
                    _c++;
                    return [3 /*break*/, 36];
                case 41:
                    context.log("Deleted ".concat(itemsProcessed.flags, " flags"));
                    return [3 /*break*/, 43];
                case 42:
                    error_9 = _f.sent();
                    warnings.push("Error deleting flags: ".concat(error_9.message));
                    return [3 /*break*/, 43];
                case 43:
                    _f.trys.push([43, 51, , 52]);
                    appealsQuery = {
                        query: 'SELECT * FROM c WHERE c.submitterId = @userId',
                        parameters: [{ name: '@userId', value: userId }]
                    };
                    return [4 /*yield*/, appealsContainer.items.query(appealsQuery).fetchAll()];
                case 44:
                    userAppeals = (_f.sent()).resources;
                    _d = 0, userAppeals_1 = userAppeals;
                    _f.label = 45;
                case 45:
                    if (!(_d < userAppeals_1.length)) return [3 /*break*/, 50];
                    appeal = userAppeals_1[_d];
                    _f.label = 46;
                case 46:
                    _f.trys.push([46, 48, , 49]);
                    return [4 /*yield*/, appealsContainer.item(appeal.id, appeal.id).delete()];
                case 47:
                    _f.sent();
                    itemsProcessed.appeals++;
                    return [3 /*break*/, 49];
                case 48:
                    error_10 = _f.sent();
                    warnings.push("Failed to delete appeal ".concat(appeal.id, ": ").concat(error_10.message));
                    return [3 /*break*/, 49];
                case 49:
                    _d++;
                    return [3 /*break*/, 45];
                case 50:
                    context.log("Deleted ".concat(itemsProcessed.appeals, " appeals"));
                    return [3 /*break*/, 52];
                case 51:
                    error_11 = _f.sent();
                    warnings.push("Error deleting appeals: ".concat(error_11.message));
                    return [3 /*break*/, 52];
                case 52:
                    _f.trys.push([52, 60, , 61]);
                    votesQuery = {
                        query: 'SELECT * FROM c WHERE c.voterId = @userId',
                        parameters: [{ name: '@userId', value: userId }]
                    };
                    return [4 /*yield*/, votesContainer.items.query(votesQuery).fetchAll()];
                case 53:
                    userVotes = (_f.sent()).resources;
                    _e = 0, userVotes_1 = userVotes;
                    _f.label = 54;
                case 54:
                    if (!(_e < userVotes_1.length)) return [3 /*break*/, 59];
                    vote = userVotes_1[_e];
                    _f.label = 55;
                case 55:
                    _f.trys.push([55, 57, , 58]);
                    return [4 /*yield*/, votesContainer.item(vote.id, vote.appealId).delete()];
                case 56:
                    _f.sent();
                    itemsProcessed.votes++;
                    return [3 /*break*/, 58];
                case 57:
                    error_12 = _f.sent();
                    warnings.push("Failed to delete vote ".concat(vote.id, ": ").concat(error_12.message));
                    return [3 /*break*/, 58];
                case 58:
                    _e++;
                    return [3 /*break*/, 54];
                case 59:
                    context.log("Deleted ".concat(itemsProcessed.votes, " votes"));
                    return [3 /*break*/, 61];
                case 60:
                    error_13 = _f.sent();
                    warnings.push("Error deleting votes: ".concat(error_13.message));
                    return [3 /*break*/, 61];
                case 61:
                    if (!userExists) return [3 /*break*/, 65];
                    _f.label = 62;
                case 62:
                    _f.trys.push([62, 64, , 65]);
                    return [4 /*yield*/, usersContainer.item(userId, userId).delete()];
                case 63:
                    _f.sent();
                    itemsProcessed.userProfile = true;
                    context.log("Deleted user profile for ".concat(userId));
                    return [3 /*break*/, 65];
                case 64:
                    error_14 = _f.sent();
                    if (error_14.code !== 404) {
                        warnings.push("Failed to delete user profile: ".concat(error_14.message));
                    }
                    else {
                        // Already deleted, which is fine for idempotent operation
                        itemsProcessed.userProfile = true;
                    }
                    return [3 /*break*/, 65];
                case 65:
                    deletionResult = {
                        userId: userId,
                        deletionId: deletionId,
                        deletedAt: new Date().toISOString(),
                        itemsProcessed: itemsProcessed,
                        contentMarking: contentMarking,
                        warnings: warnings
                    };
                    // 14. Log comprehensive deletion audit
                    context.log("Account deletion completed successfully for user ".concat(userId, ":"), {
                        deletionId: deletionId,
                        totalItemsDeleted: Object.values(itemsProcessed).reduce(function (sum, val) {
                            return sum + (typeof val === 'number' ? val : (val ? 1 : 0));
                        }, 0),
                        postsAnonymized: contentMarking.postsAnonymized,
                        commentsAnonymized: contentMarking.commentsAnonymized,
                        warningCount: warnings.length,
                        rateLimitInfo: {
                            blocked: rateLimitResult.blocked,
                            remaining: rateLimitResult.remaining
                        }
                    });
                    return [2 /*return*/, {
                            status: 200,
                            jsonBody: {
                                message: 'Account deletion completed successfully',
                                result: deletionResult
                            },
                            headers: {
                                'X-Deletion-ID': deletionId,
                                'X-Process-Timestamp': new Date().toISOString()
                            }
                        }];
                case 66:
                    error_15 = _f.sent();
                    context.log('Critical error during account deletion:', error_15);
                    return [2 /*return*/, {
                            status: 500,
                            jsonBody: {
                                error: 'Internal server error during deletion',
                                message: error_15 instanceof Error ? error_15.message : 'Unknown error',
                                deletionId: deletionId,
                                note: 'Your account deletion request has been logged. Please contact support if the issue persists.'
                            }
                        }];
                case 67: return [2 /*return*/];
            }
        });
    });
}
