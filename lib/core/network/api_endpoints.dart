// ignore_for_file: public_member_api_docs

/**
 * LYTHAUS API ENDPOINTS
 * 
 * 🎯 Purpose: Centralized API endpoint definitions
 * 🔗 Network: Native Lythaus REST API routes
 * 📱 Platform: Flutter HTTP client integration
 */

/// API endpoint constants for the native Lythaus backend.
class ApiEndpoints {
  // Base path constants
  static const String _baseApi = '/api';

  // Authentication endpoints
  static const String authEmail = '$_baseApi/auth/email';
  static const String getMe = '$_baseApi/users/me';

  // User management
  static const String getUserAuth = '$_baseApi/users/auth';

  // Privacy & GDPR endpoints
  static const String privacyRequests = '$_baseApi/privacy/requests';
  static const String exportUser = privacyRequests;
  static const String exportStatus = '$privacyRequests?requestType=export';
  static const String deleteUser = privacyRequests;

  // Feed & Posts
  static const String getFeed = '$_baseApi/feed';
  static const String createPost = '$_baseApi/posts';
  static String getPost(String id) => '$_baseApi/posts/$id';
  static String deletePost(String id) => '$_baseApi/posts/$id';

  // Comments
  static String getComments(String postId) =>
      '$_baseApi/posts/$postId/comments';
  static String createComment(String postId) =>
      '$_baseApi/posts/$postId/comments';

  // Likes
  static String likePost(String postId) => '$_baseApi/posts/$postId/like';
  static String unlikePost(String postId) => '$_baseApi/posts/$postId/unlike';

  // Moderation
  static String flagContent(String contentId) =>
      '$_baseApi/moderation/flag/$contentId';
  static String appealFlag(String flagId) =>
      '$_baseApi/moderation/appeal/$flagId';

  // Prevent instantiation
  ApiEndpoints._();
}
