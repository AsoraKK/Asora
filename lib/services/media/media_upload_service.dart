// ignore_for_file: public_member_api_docs

/// LYTHAUS MEDIA UPLOAD SERVICE
///
/// Handles image upload flow:
/// 1. Request presigned SAS URL from backend
/// 2. Upload file directly to Azure Blob Storage
/// 3. Return the final blob URL for post creation
library;

import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';

/// Result of requesting an upload URL from the backend
class UploadUrlResponse {
  final String uploadUrl;
  final String blobUrl;
  final String expiresAt;

  const UploadUrlResponse({
    required this.uploadUrl,
    required this.blobUrl,
    required this.expiresAt,
  });

  factory UploadUrlResponse.fromJson(Map<String, dynamic> json) {
    return UploadUrlResponse(
      uploadUrl: json['uploadUrl'] as String,
      blobUrl: json['blobUrl'] as String,
      expiresAt: json['expiresAt'] as String,
    );
  }
}

/// Result of a media upload operation
sealed class MediaUploadResult {
  const MediaUploadResult();
}

class MediaUploadSuccess extends MediaUploadResult {
  final String blobUrl;
  const MediaUploadSuccess(this.blobUrl);
}

class MediaUploadError extends MediaUploadResult {
  final String message;
  final String? code;
  const MediaUploadError({required this.message, this.code});
}

/// Service for uploading media files to Azure Blob Storage via presigned URLs
class MediaUploadService {
  final Dio _apiDio;

  /// Separate Dio instance for blob uploads (no base URL, no cert pinning)
  final Dio _uploadDio;

  final ImagePicker _picker;

  MediaUploadService({required Dio apiDio, Dio? uploadDio, ImagePicker? picker})
    : _apiDio = apiDio,
      _uploadDio = uploadDio ?? Dio(),
      _picker = picker ?? ImagePicker();

  /// Pick an image from the gallery
  Future<XFile?> pickFromGallery({int maxWidth = 2048, int quality = 85}) {
    return _picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: maxWidth.toDouble(),
      imageQuality: quality,
    );
  }

  /// Pick an image from the camera
  Future<XFile?> pickFromCamera({int maxWidth = 2048, int quality = 85}) {
    return _picker.pickImage(
      source: ImageSource.camera,
      maxWidth: maxWidth.toDouble(),
      imageQuality: quality,
    );
  }

  /// Upload a picked file and return the public blob URL
  ///
  /// Flow:
  /// 1. POST /api/media/upload-url with file metadata
  /// 2. PUT fileBytes to the returned SAS URL
  /// 3. Return the public blob URL
  Future<MediaUploadResult> uploadFile({
    required XFile file,
    required String token,
    void Function(int sent, int total)? onProgress,
  }) async {
    try {
      final fileName = file.name;
      final contentType = _inferContentType(fileName);
      final fileBytes = await file.readAsBytes();
      final fileSizeBytes = fileBytes.length;

      // Step 1: Get presigned upload URL from backend
      final urlResponse = await _requestUploadUrl(
        fileName: fileName,
        contentType: contentType,
        fileSizeBytes: fileSizeBytes,
        token: token,
      );

      // Step 2: Upload directly to Azure Blob Storage
      await _uploadToBlob(
        uploadUrl: urlResponse.uploadUrl,
        fileBytes: fileBytes,
        contentType: contentType,
        onProgress: onProgress,
      );

      return MediaUploadSuccess(urlResponse.blobUrl);
    } on DioException catch (e) {
      final data = e.response?.data;
      String message = 'Upload failed';
      String? code;

      if (data is Map<String, dynamic>) {
        final error = data['error'] as Map<String, dynamic>?;
        message =
            error?['message'] as String? ??
            data['message'] as String? ??
            message;
        code = error?['code'] as String? ?? data['code'] as String?;
      }

      return MediaUploadError(message: message, code: code);
    } catch (e) {
      return MediaUploadError(message: 'Upload failed: $e');
    }
  }

  /// Request a presigned upload URL from the backend
  Future<UploadUrlResponse> _requestUploadUrl({
    required String fileName,
    required String contentType,
    required int fileSizeBytes,
    required String token,
  }) async {
    final response = await _apiDio.post<Map<String, dynamic>>(
      '/api/media/upload-url',
      data: {
        'fileName': fileName,
        'contentType': contentType,
        'fileSizeBytes': fileSizeBytes,
      },
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );

    return UploadUrlResponse.fromJson(response.data!);
  }

  /// Upload file bytes directly to Azure Blob Storage via SAS URL
  Future<void> _uploadToBlob({
    required String uploadUrl,
    required Uint8List fileBytes,
    required String contentType,
    void Function(int sent, int total)? onProgress,
  }) async {
    await _uploadDio.put<void>(
      uploadUrl,
      data: Stream.fromIterable([fileBytes]),
      options: Options(
        headers: {
          'x-ms-blob-type': 'BlockBlob',
          'Content-Type': contentType,
          'Content-Length': fileBytes.length.toString(),
        },
      ),
      onSendProgress: onProgress,
    );
  }

  /// Infer MIME type from file extension
  String _inferContentType(String fileName) {
    final ext = fileName.split('.').last.toLowerCase();
    return switch (ext) {
      'jpg' || 'jpeg' => 'image/jpeg',
      'png' => 'image/png',
      'gif' => 'image/gif',
      'webp' => 'image/webp',
      'heic' => 'image/heic',
      _ => 'application/octet-stream',
    };
  }
}
