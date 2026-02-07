import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mocktail/mocktail.dart';
import 'package:asora/services/media/media_upload_service.dart';

class MockDio extends Mock implements Dio {}

class MockImagePicker extends Mock implements ImagePicker {}

class FakeXFile extends Fake implements XFile {
  @override
  String get name => 'test_image.jpg';

  @override
  Future<Uint8List> readAsBytes() async => Uint8List.fromList([0xFF, 0xD8]);
}

void main() {
  late MockDio mockApiDio;
  late MockDio mockUploadDio;
  late MockImagePicker mockPicker;
  late MediaUploadService service;

  setUpAll(() {
    registerFallbackValue(Options());
    registerFallbackValue(Stream.fromIterable(<List<int>>[]));
  });

  setUp(() {
    mockApiDio = MockDio();
    mockUploadDio = MockDio();
    mockPicker = MockImagePicker();
    service = MediaUploadService(
      apiDio: mockApiDio,
      uploadDio: mockUploadDio,
      picker: mockPicker,
    );
  });

  group('UploadUrlResponse', () {
    test('fromJson parses correctly', () {
      final json = {
        'uploadUrl': 'https://blob.core/upload?sig=abc',
        'blobUrl': 'https://blob.core/media/img.jpg',
        'expiresAt': '2025-01-01T00:00:00Z',
      };

      final result = UploadUrlResponse.fromJson(json);

      expect(result.uploadUrl, 'https://blob.core/upload?sig=abc');
      expect(result.blobUrl, 'https://blob.core/media/img.jpg');
      expect(result.expiresAt, '2025-01-01T00:00:00Z');
    });
  });

  group('pickFromGallery', () {
    test('delegates to ImagePicker.pickImage with gallery source', () async {
      when(
        () => mockPicker.pickImage(
          source: ImageSource.gallery,
          maxWidth: any(named: 'maxWidth'),
          imageQuality: any(named: 'imageQuality'),
        ),
      ).thenAnswer((_) async => null);

      await service.pickFromGallery();

      verify(
        () => mockPicker.pickImage(
          source: ImageSource.gallery,
          maxWidth: 2048.0,
          imageQuality: 85,
        ),
      ).called(1);
    });
  });

  group('pickFromCamera', () {
    test('delegates to ImagePicker.pickImage with camera source', () async {
      when(
        () => mockPicker.pickImage(
          source: ImageSource.camera,
          maxWidth: any(named: 'maxWidth'),
          imageQuality: any(named: 'imageQuality'),
        ),
      ).thenAnswer((_) async => null);

      await service.pickFromCamera();

      verify(
        () => mockPicker.pickImage(
          source: ImageSource.camera,
          maxWidth: 2048.0,
          imageQuality: 85,
        ),
      ).called(1);
    });
  });

  group('uploadFile', () {
    test('returns MediaUploadSuccess on successful flow', () async {
      final fakeFile = FakeXFile();

      // Mock: POST /api/media/upload-url
      when(
        () => mockApiDio.post<Map<String, dynamic>>(
          '/api/media/upload-url',
          data: any(named: 'data'),
          options: any(named: 'options'),
        ),
      ).thenAnswer(
        (_) async => Response(
          data: {
            'uploadUrl': 'https://blob.core/upload?sig=abc',
            'blobUrl': 'https://blob.core/media/img.jpg',
            'expiresAt': '2025-01-01T00:00:00Z',
          },
          statusCode: 200,
          requestOptions: RequestOptions(path: '/api/media/upload-url'),
        ),
      );

      // Mock: PUT to blob storage
      when(
        () => mockUploadDio.put<void>(
          any(),
          data: any(named: 'data'),
          options: any(named: 'options'),
          onSendProgress: any(named: 'onSendProgress'),
        ),
      ).thenAnswer(
        (_) async =>
            Response(statusCode: 201, requestOptions: RequestOptions(path: '')),
      );

      final result = await service.uploadFile(
        file: fakeFile,
        token: 'test-token',
      );

      expect(result, isA<MediaUploadSuccess>());
      expect(
        (result as MediaUploadSuccess).blobUrl,
        'https://blob.core/media/img.jpg',
      );

      // Verify upload URL request included auth header
      final captured = verify(
        () => mockApiDio.post<Map<String, dynamic>>(
          '/api/media/upload-url',
          data: captureAny(named: 'data'),
          options: any(named: 'options'),
        ),
      ).captured;

      final requestData = captured.first as Map<String, dynamic>;
      expect(requestData['fileName'], 'test_image.jpg');
      expect(requestData['contentType'], 'image/jpeg');
      expect(requestData['fileSizeBytes'], 2);
    });

    test('returns MediaUploadError on DioException with error body', () async {
      final fakeFile = FakeXFile();

      when(
        () => mockApiDio.post<Map<String, dynamic>>(
          '/api/media/upload-url',
          data: any(named: 'data'),
          options: any(named: 'options'),
        ),
      ).thenThrow(
        DioException(
          requestOptions: RequestOptions(path: '/api/media/upload-url'),
          response: Response(
            statusCode: 400,
            data: {
              'error': {'message': 'File too large', 'code': 'file_too_large'},
            },
            requestOptions: RequestOptions(path: '/api/media/upload-url'),
          ),
        ),
      );

      final result = await service.uploadFile(
        file: fakeFile,
        token: 'test-token',
      );

      expect(result, isA<MediaUploadError>());
      final error = result as MediaUploadError;
      expect(error.message, 'File too large');
      expect(error.code, 'file_too_large');
    });

    test('returns MediaUploadError on blob upload failure', () async {
      final fakeFile = FakeXFile();

      when(
        () => mockApiDio.post<Map<String, dynamic>>(
          '/api/media/upload-url',
          data: any(named: 'data'),
          options: any(named: 'options'),
        ),
      ).thenAnswer(
        (_) async => Response(
          data: {
            'uploadUrl': 'https://blob.core/upload?sig=abc',
            'blobUrl': 'https://blob.core/media/img.jpg',
            'expiresAt': '2025-01-01T00:00:00Z',
          },
          statusCode: 200,
          requestOptions: RequestOptions(path: '/api/media/upload-url'),
        ),
      );

      when(
        () => mockUploadDio.put<void>(
          any(),
          data: any(named: 'data'),
          options: any(named: 'options'),
          onSendProgress: any(named: 'onSendProgress'),
        ),
      ).thenThrow(
        DioException(
          requestOptions: RequestOptions(path: ''),
          response: Response(
            statusCode: 403,
            data: null,
            requestOptions: RequestOptions(path: ''),
          ),
        ),
      );

      final result = await service.uploadFile(
        file: fakeFile,
        token: 'test-token',
      );

      expect(result, isA<MediaUploadError>());
      expect((result as MediaUploadError).message, 'Upload failed');
    });

    test('returns MediaUploadError on unexpected exception', () async {
      final fakeFile = FakeXFile();

      when(
        () => mockApiDio.post<Map<String, dynamic>>(
          '/api/media/upload-url',
          data: any(named: 'data'),
          options: any(named: 'options'),
        ),
      ).thenThrow(Exception('Network down'));

      final result = await service.uploadFile(
        file: fakeFile,
        token: 'test-token',
      );

      expect(result, isA<MediaUploadError>());
      expect((result as MediaUploadError).message, contains('Network down'));
    });
  });
}
