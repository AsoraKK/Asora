import 'package:flutter/material.dart';

/// ASORA CONTENT TYPE HELPER
///
/// 🎯 Purpose: Centralized content type utility functions
/// 🔍 Single Responsibility: Content type mapping only

class ContentTypeHelper {
  /// Get the appropriate icon for a content type
  static IconData getIcon(String contentType) {
    switch (contentType.toLowerCase()) {
      case 'post':
        return Icons.article;
      case 'comment':
        return Icons.comment;
      case 'user':
        return Icons.person;
      default:
        return Icons.content_copy;
    }
  }

  /// Get a human-readable label for a content type
  static String getLabel(String contentType) {
    switch (contentType.toLowerCase()) {
      case 'post':
        return 'Post';
      case 'comment':
        return 'Comment';
      case 'user':
        return 'User Profile';
      default:
        return 'Content';
    }
  }

  /// Get a color associated with a content type
  static Color getColor(String contentType) {
    switch (contentType.toLowerCase()) {
      case 'post':
        return Colors.blue;
      case 'comment':
        return Colors.green;
      case 'user':
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }
}
