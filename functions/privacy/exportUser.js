'use strict';
/**
 * ASORA USER DATA EXPORT ENDPOINT
 *
 * 🎯 Purpose: GDPR Article 20 (Data Portability) compliance - Export user data
 * 🔐 Security: JWT authentication + user ownership verification + rate limiting
 * 📊 Features: Complete data aggregation, rate limiting, privacy-safe export
 * 🏗️ Architecture: Multi-source data collection with structured JSON output
 */
const __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
const __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    let _ = {
        label: 0,
        sent() {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g = Object.create((typeof Iterator === 'function' ? Iterator : Object).prototype);
    return (
      (g.next = verb(0)),
      (g['throw'] = verb(1)),
      (g['return'] = verb(2)),
      typeof Symbol === 'function' &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError('Generator is already executing.');
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y['return']
                  : op[0]
                    ? y['throw'] || ((t = y['return']) && t.call(y), 0)
                    : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            /* falls through */
            case 0:
            /* falls through */
            case 1:
              t = op;
              break;
            /* falls through */
            case 4:
              _.label++;
              return { value: op[1], done: false };
            /* falls through */
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            /* falls through */
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.exportUser = exportUser;
const cosmos_1 = require('@azure/cosmos');
const auth_utils_1 = require('../shared/auth-utils');
const rate_limiter_1 = require('../shared/rate-limiter');
// Rate limiter for export requests (1 per 24 hours per user)
const exportRateLimiter = (0, rate_limiter_1.createRateLimiter)({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  maxRequests: 1,
  keyGenerator(req) {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      return 'privacy_export:'.concat(decoded.sub);
    } catch (_a) {
      return 'privacy_export:unknown';
    }
  },
});
function exportUser(request, context) {
  return __awaiter(this, void 0, void 0, function () {
    let exportId,
      authHeader,
      token,
      jwtPayload,
      userId,
      rateLimitResult,
      cosmosClient,
      database,
      usersContainer,
      postsContainer,
      commentsContainer,
      flagsContainer,
      appealsContainer,
      votesContainer,
      likesContainer,
      userProfile,
      accountCreationDate,
      user,
      error_1,
      userPosts_1,
      postsQuery,
      posts,
      error_2,
      userComments_1,
      commentsQuery,
      comments,
      error_3,
      userLikes_1,
      likesQuery,
      likes,
      error_4,
      userFlags_1,
      flagsQuery,
      flags,
      error_5,
      userAppeals_1,
      appealsQuery,
      appeals,
      error_6,
      userVotes_1,
      votesQuery,
      votes,
      error_7,
      previousExports,
      dataRequests,
      exportData,
      error_8;
    return __generator(this, function (_a) {
      switch (_a.label) {
        /* falls through */
        case 0:
          exportId = 'exp_'.concat(Date.now(), '_').concat(Math.random().toString(36).substr(2, 9));
          context.log('Data export request received - Export ID: '.concat(exportId));
          _a.label = 1;
        /* falls through */
        case 1:
          _a.trys.push([1, 32, 33]);
          authHeader = request.headers.get('authorization');
          if (!authHeader) {
            return [
              2 /*return*/,
              {
                status: 401,
                jsonBody: { error: 'Missing authorization header' },
              },
            ];
          }
          token = authHeader.replace('Bearer ', '');
          return [4 /*yield*/, (0, auth_utils_1.verifyJWT)(token)];
        /* falls through */
        case 2:
          jwtPayload = _a.sent();
          userId = jwtPayload.sub;
          return [4 /*yield*/, exportRateLimiter.checkRateLimit(request)];
        /* falls through */
        case 3:
          rateLimitResult = _a.sent();
          if (rateLimitResult.blocked) {
            context.log('Export rate limited for user: '.concat(userId));
            return [
              2 /*return*/,
              {
                status: 429,
                jsonBody: {
                  error: 'Rate limit exceeded',
                  message: 'You can only export your data once every 24 hours',
                  resetTime: rateLimitResult.resetTime,
                  limit: rateLimitResult.limit,
                },
              },
            ];
          }
          cosmosClient = new cosmos_1.CosmosClient(process.env.COSMOS_CONNECTION_STRING || '');
          database = cosmosClient.database('asora');
          usersContainer = database.container('users');
          postsContainer = database.container('posts');
          commentsContainer = database.container('comments');
          flagsContainer = database.container('content_flags');
          appealsContainer = database.container('appeals');
          votesContainer = database.container('appeal_votes');
          likesContainer = database.container('likes');
          context.log('Starting comprehensive data export for user: '.concat(userId));
          userProfile = {};
          accountCreationDate = new Date();
          _a.label = 4;
        /* falls through */
        case 4:
          _a.trys.push([4, 6, 7]);
          return [4 /*yield*/, usersContainer.item(userId, userId).read()];
        /* falls through */
        case 5:
          user = _a.sent().resource;
          if (user) {
            accountCreationDate = new Date(user.createdAt || '2020-01-01');
            userProfile = {
              id: user.id,
              displayName: user.displayName || user.name || 'Anonymous',
              email: user.email,
              createdAt: user.createdAt,
              lastLoginAt: user.lastLoginAt || user.lastLogin,
              tier: user.tier || 'freemium',
              preferences: user.preferences || {},
              statistics: {
                totalPosts: 0, // Will be calculated below
                totalComments: 0, // Will be calculated below
                totalLikes: 0, // Will be calculated below
                totalFlags: 0, // Will be calculated below
                accountAgeInDays: Math.round(
                  (Date.now() - accountCreationDate.getTime()) / (1000 * 60 * 60 * 24)
                ),
              },
            };
          } else {
            context.log(
              'Warning: User profile not found for '.concat(userId, ', using minimal data')
            );
            userProfile = {
              id: userId,
              displayName: 'User',
              createdAt: new Date().toISOString(),
              tier: 'freemium',
              statistics: {
                totalPosts: 0,
                totalComments: 0,
                totalLikes: 0,
                totalFlags: 0,
                accountAgeInDays: 0,
              },
            };
          }
          return [3 /*break*/, 7];
        /* falls through */
        case 6:
          error_1 = _a.sent();
          context.log('Error fetching user profile for '.concat(userId, ':'), error_1);
          userProfile = {
            id: userId,
            displayName: 'User',
            createdAt: new Date().toISOString(),
            tier: 'freemium',
            statistics: {
              totalPosts: 0,
              totalComments: 0,
              totalLikes: 0,
              totalFlags: 0,
              accountAgeInDays: 0,
            },
          };
          return [3 /*break*/, 7];
        /* falls through */
        case 7:
          userPosts_1 = [];
          _a.label = 8;
        /* falls through */
        case 8:
          _a.trys.push([8, 10, 11]);
          postsQuery = {
            query: 'SELECT * FROM c WHERE c.authorId = @userId ORDER BY c.createdAt DESC',
            parameters: [{ name: '@userId', value: userId }],
          };
          return [4 /*yield*/, postsContainer.items.query(postsQuery).fetchAll()];
        /* falls through */
        case 9:
          posts = _a.sent().resources;
          posts.forEach(function (post) {
            userPosts_1.push({
              id: post.id,
              content: post.content || post.text || '',
              createdAt: post.createdAt,
              updatedAt: post.updatedAt,
              status: post.status || 'published',
              likes: post.likes || 0,
              comments: post.commentCount || post.comments || 0,
              tags: post.tags || [],
              imageUrls: post.imageUrls || post.images || [],
              moderationInfo: {
                flagged: post.isFlagged || false,
                flagReason: post.flagReason,
                flaggedAt: post.flaggedAt,
              },
            });
          });
          userProfile.statistics.totalPosts = userPosts_1.length;
          context.log('Found '.concat(userPosts_1.length, ' posts for user ').concat(userId));
          return [3 /*break*/, 11];
        /* falls through */
        case 10:
          error_2 = _a.sent();
          context.log('Error fetching posts for '.concat(userId, ':'), error_2);
          return [3 /*break*/, 11];
        /* falls through */
        case 11:
          userComments_1 = [];
          _a.label = 12;
        /* falls through */
        case 12:
          _a.trys.push([12, 14, 15]);
          commentsQuery = {
            query: 'SELECT * FROM c WHERE c.authorId = @userId ORDER BY c.createdAt DESC',
            parameters: [{ name: '@userId', value: userId }],
          };
          return [4 /*yield*/, commentsContainer.items.query(commentsQuery).fetchAll()];
        /* falls through */
        case 13:
          comments = _a.sent().resources;
          comments.forEach(function (comment) {
            userComments_1.push({
              id: comment.id,
              content: comment.content || comment.text || '',
              createdAt: comment.createdAt,
              postId: comment.postId,
              parentCommentId: comment.parentCommentId,
              likes: comment.likes || 0,
              status: comment.status || 'published',
            });
          });
          userProfile.statistics.totalComments = userComments_1.length;
          context.log('Found '.concat(userComments_1.length, ' comments for user ').concat(userId));
          return [3 /*break*/, 15];
        /* falls through */
        case 14:
          error_3 = _a.sent();
          context.log('Error fetching comments for '.concat(userId, ':'), error_3);
          return [3 /*break*/, 15];
        /* falls through */
        case 15:
          userLikes_1 = [];
          _a.label = 16;
        /* falls through */
        case 16:
          _a.trys.push([16, 18, 19]);
          likesQuery = {
            query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC',
            parameters: [{ name: '@userId', value: userId }],
          };
          return [4 /*yield*/, likesContainer.items.query(likesQuery).fetchAll()];
        /* falls through */
        case 17:
          likes = _a.sent().resources;
          likes.forEach(function (like) {
            userLikes_1.push({
              contentId: like.contentId || like.postId,
              contentType: like.contentType || 'post',
              likedAt: like.createdAt || like.likedAt,
            });
          });
          userProfile.statistics.totalLikes = userLikes_1.length;
          context.log('Found '.concat(userLikes_1.length, ' likes for user ').concat(userId));
          return [3 /*break*/, 19];
        /* falls through */
        case 18:
          error_4 = _a.sent();
          context.log('Error fetching likes for '.concat(userId, ':'), error_4);
          return [3 /*break*/, 19];
        /* falls through */
        case 19:
          userFlags_1 = [];
          _a.label = 20;
        /* falls through */
        case 20:
          _a.trys.push([20, 22, 23]);
          flagsQuery = {
            query: 'SELECT * FROM c WHERE c.flaggerId = @userId ORDER BY c.createdAt DESC',
            parameters: [{ name: '@userId', value: userId }],
          };
          return [4 /*yield*/, flagsContainer.items.query(flagsQuery).fetchAll()];
        /* falls through */
        case 21:
          flags = _a.sent().resources;
          flags.forEach(function (flag) {
            userFlags_1.push({
              id: flag.id,
              contentId: flag.contentId,
              contentType: flag.contentType,
              reason: flag.reason,
              description: flag.description,
              flaggedAt: flag.createdAt,
              status: flag.status,
            });
          });
          userProfile.statistics.totalFlags = userFlags_1.length;
          context.log('Found '.concat(userFlags_1.length, ' flags for user ').concat(userId));
          return [3 /*break*/, 23];
        /* falls through */
        case 22:
          error_5 = _a.sent();
          context.log('Error fetching flags for '.concat(userId, ':'), error_5);
          return [3 /*break*/, 23];
        /* falls through */
        case 23:
          userAppeals_1 = [];
          _a.label = 24;
        /* falls through */
        case 24:
          _a.trys.push([24, 26, 27]);
          appealsQuery = {
            query: 'SELECT * FROM c WHERE c.submitterId = @userId ORDER BY c.createdAt DESC',
            parameters: [{ name: '@userId', value: userId }],
          };
          return [4 /*yield*/, appealsContainer.items.query(appealsQuery).fetchAll()];
        /* falls through */
        case 25:
          appeals = _a.sent().resources;
          appeals.forEach(function (appeal) {
            userAppeals_1.push({
              id: appeal.id,
              contentId: appeal.contentId,
              reason: appeal.reason,
              status: appeal.status,
              submittedAt: appeal.createdAt,
              resolvedAt: appeal.resolvedAt,
              finalDecision: appeal.finalDecision,
            });
          });
          context.log('Found '.concat(userAppeals_1.length, ' appeals for user ').concat(userId));
          return [3 /*break*/, 27];
        /* falls through */
        case 26:
          error_6 = _a.sent();
          context.log('Error fetching appeals for '.concat(userId, ':'), error_6);
          return [3 /*break*/, 27];
        /* falls through */
        case 27:
          userVotes_1 = [];
          _a.label = 28;
        /* falls through */
        case 28:
          _a.trys.push([28, 30, 31]);
          votesQuery = {
            query: 'SELECT * FROM c WHERE c.voterId = @userId ORDER BY c.createdAt DESC',
            parameters: [{ name: '@userId', value: userId }],
          };
          return [4 /*yield*/, votesContainer.items.query(votesQuery).fetchAll()];
        /* falls through */
        case 29:
          votes = _a.sent().resources;
          votes.forEach(function (vote) {
            userVotes_1.push({
              appealId: vote.appealId,
              vote: vote.vote,
              reason: vote.reason,
              votedAt: vote.createdAt,
            });
          });
          context.log('Found '.concat(userVotes_1.length, ' votes for user ').concat(userId));
          return [3 /*break*/, 31];
        /* falls through */
        case 30:
          error_7 = _a.sent();
          context.log('Error fetching votes for '.concat(userId, ':'), error_7);
          return [3 /*break*/, 31];
        /* falls through */
        case 31:
          previousExports = [];
          dataRequests = [];
          exportData = {
            metadata: {
              exportedAt: new Date().toISOString(),
              exportedBy: userId,
              dataVersion: '1.0',
              exportId,
              retentionPeriod:
                'This export contains your personal data as of the export date. Data may be deleted from our systems according to our retention policy.',
            },
            userProfile,
            content: {
              posts: userPosts_1,
              comments: userComments_1,
            },
            interactions: {
              likes: userLikes_1,
              flags: userFlags_1,
            },
            moderation: {
              appeals: userAppeals_1,
              votes: userVotes_1,
            },
            privacy: {
              previousExports,
              dataRequests,
            },
          };
          // 13. Log export completion for audit
          context.log('Data export completed successfully for user '.concat(userId, ':'), {
            exportId,
            totalPosts: userPosts_1.length,
            totalComments: userComments_1.length,
            totalLikes: userLikes_1.length,
            totalFlags: userFlags_1.length,
            totalAppeals: userAppeals_1.length,
            totalVotes: userVotes_1.length,
          });
          // 14. Rate limiting is automatically handled by the checkRateLimit call above
          context.log('Data export request processed with rate limit status:', {
            rateLimited: rateLimitResult.blocked,
            remaining: rateLimitResult.remaining,
            resetTime: rateLimitResult.resetTime,
          });
          return [
            2 /*return*/,
            {
              status: 200,
              jsonBody: exportData,
              headers: {
                'Content-Type': 'application/json',
                'X-Export-ID': exportId,
                'X-Data-Version': '1.0',
              },
            },
          ];
        /* falls through */
        case 32:
          error_8 = _a.sent();
          context.log('Error during user data export:', error_8);
          return [
            2 /*return*/,
            {
              status: 500,
              jsonBody: {
                error: 'Internal server error',
                message: error_8 instanceof Error ? error_8.message : 'Unknown error',
                exportId,
              },
            },
          ];
        /* falls through */
        case 33:
          return [2 /*return*/];
      }
    });
  });
}
