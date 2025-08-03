// test/features/auth/application/auth_service_test.dart
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;

import 'package:asora/features/auth/application/auth_service.dart';
import 'package:asora/features/auth/domain/auth_failure.dart';
import 'package:asora/features/auth/domain/user.dart';

// Mock HTTP Client for testing
class MockHttpClient implements http.Client {
  final Map<String, dynamic> responses = {};
  final Map<String, int> statusCodes = {};
  final Map<String, Exception> exceptions = {};

  void setResponse(
    String url,
    Map<String, dynamic> response, {
    int statusCode = 200,
  }) {
    responses[url] = response;
    statusCodes[url] = statusCode;
  }

  void setException(String url, Exception exception) {
    exceptions[url] = exception;
  }

  @override
  Future<http.Response> post(
    Uri url, {
    Map<String, String>? headers,
    Object? body,
    Encoding? encoding,
  }) async {
    final urlString = url.toString();

    if (exceptions.containsKey(urlString)) {
      throw exceptions[urlString]!;
    }

    final statusCode = statusCodes[urlString] ?? 200;
    final response = responses[urlString] ?? {};

    return http.Response(
      jsonEncode(response),
      statusCode,
      headers: {'content-type': 'application/json'},
    );
  }

  @override
  Future<http.Response> get(Uri url, {Map<String, String>? headers}) async {
    final urlString = url.toString();

    if (exceptions.containsKey(urlString)) {
      throw exceptions[urlString]!;
    }

    final statusCode = statusCodes[urlString] ?? 200;
    final response = responses[urlString] ?? {};

    return http.Response(
      jsonEncode(response),
      statusCode,
      headers: {'content-type': 'application/json'},
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

// Mock Secure Storage
class MockSecureStorage implements FlutterSecureStorage {
  final Map<String, String> _storage = {};
  final Map<String, Exception> _exceptions = {};

  void setException(String key, Exception exception) {
    _exceptions[key] = exception;
  }

  @override
  Future<void> write({
    required String key,
    required String? value,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    if (_exceptions.containsKey(key)) {
      throw _exceptions[key]!;
    }
    if (value != null) {
      _storage[key] = value;
    }
  }

  @override
  Future<String?> read({
    required String key,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    if (_exceptions.containsKey(key)) {
      throw _exceptions[key]!;
    }
    return _storage[key];
  }

  @override
  Future<void> delete({
    required String key,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    if (_exceptions.containsKey(key)) {
      throw _exceptions[key]!;
    }
    _storage.remove(key);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

// Mock Google Sign In
class MockGoogleSignIn implements GoogleSignIn {
  bool shouldThrow = false;
  Exception? exceptionToThrow;

  void setThrowException(Exception exception) {
    shouldThrow = true;
    exceptionToThrow = exception;
  }

  @override
  Future<GoogleSignInAccount?> signOut() async {
    if (shouldThrow && exceptionToThrow != null) {
      throw exceptionToThrow!;
    }
    return null;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  group('AuthService', () {
    late AuthService authService;
    late MockHttpClient mockHttpClient;
    late MockSecureStorage mockSecureStorage;
    late MockGoogleSignIn mockGoogleSignIn;

    const testAuthUrl = 'https://test-api.asora.app';
    const testEmail = 'test@asora.app';
    const testPassword = 'password123';
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';

    final testUser = User(
      id: 'user123',
      email: testEmail,
      role: UserRole.user,
      tier: UserTier.bronze,
      reputationScore: 100,
      createdAt: DateTime.parse('2023-01-01T00:00:00Z'),
      lastLoginAt: DateTime.now(),
      isTemporary: false,
    );

    setUp(() {
      mockHttpClient = MockHttpClient();
      mockSecureStorage = MockSecureStorage();
      mockGoogleSignIn = MockGoogleSignIn();

      authService = AuthService(
        httpClient: mockHttpClient,
        secureStorage: mockSecureStorage,
        googleSignIn: mockGoogleSignIn,
        authUrl: testAuthUrl,
      );
    });

    group('loginWithEmail', () {
      test('should login successfully with valid credentials', () async {
        // Arrange
        final responseBody = {'token': testToken, 'user': testUser.toJson()};

        mockHttpClient.setResponse('$testAuthUrl/authEmail', responseBody);

        // Act
        final result = await authService.loginWithEmail(
          testEmail,
          testPassword,
        );

        // Assert
        expect(result, isA<User>());
        expect(result.email, testEmail);
        expect(result.id, testUser.id);

        // Check that data was stored
        final storedToken = await mockSecureStorage.read(key: 'jwt');
        final storedUserData = await mockSecureStorage.read(key: 'userData');

        expect(storedToken, testToken);
        expect(storedUserData, isNotNull);
        expect(jsonDecode(storedUserData!), testUser.toJson());
      });

      test(
        'should throw AuthFailure.invalidCredentials for empty email',
        () async {
          // Act & Assert
          expect(
            () => authService.loginWithEmail('', testPassword),
            throwsA(isA<AuthFailure>()),
          );
        },
      );

      test(
        'should throw AuthFailure.invalidCredentials for empty password',
        () async {
          // Act & Assert
          expect(
            () => authService.loginWithEmail(testEmail, ''),
            throwsA(isA<AuthFailure>()),
          );
        },
      );

      test(
        'should throw AuthFailure.invalidCredentials for 401 response',
        () async {
          // Arrange
          mockHttpClient.setResponse('$testAuthUrl/authEmail', {
            'error': 'Invalid email or password',
          }, statusCode: 401);

          // Act & Assert
          expect(
            () => authService.loginWithEmail(testEmail, testPassword),
            throwsA(isA<AuthFailure>()),
          );
        },
      );

      test('should throw AuthFailure.serverError for 500 response', () async {
        // Arrange
        mockHttpClient.setResponse('$testAuthUrl/authEmail', {
          'error': 'Internal Server Error',
        }, statusCode: 500);

        // Act & Assert
        expect(
          () => authService.loginWithEmail(testEmail, testPassword),
          throwsA(isA<AuthFailure>()),
        );
      });

      test(
        'should throw AuthFailure.serverError for missing token in response',
        () async {
          // Arrange
          final responseBody = {
            'user': testUser.toJson(),
            // Missing token
          };

          mockHttpClient.setResponse('$testAuthUrl/authEmail', responseBody);

          // Act & Assert
          expect(
            () => authService.loginWithEmail(testEmail, testPassword),
            throwsA(isA<AuthFailure>()),
          );
        },
      );

      test('should throw AuthFailure.serverError for network error', () async {
        // Arrange
        mockHttpClient.setException(
          '$testAuthUrl/authEmail',
          Exception('Network error'),
        );

        // Act & Assert
        expect(
          () => authService.loginWithEmail(testEmail, testPassword),
          throwsA(isA<AuthFailure>()),
        );
      });
    });

    group('getCurrentUser', () {
      test(
        'should return user when valid data is stored and server responds',
        () async {
          // Arrange
          await mockSecureStorage.write(
            key: 'userData',
            value: jsonEncode(testUser.toJson()),
          );
          await mockSecureStorage.write(key: 'jwt', value: testToken);

          mockHttpClient.setResponse('$testAuthUrl/getMe', {
            'user': testUser.toJson(),
          });

          // Act
          final result = await authService.getCurrentUser();

          // Assert
          expect(result, isA<User>());
          expect(result!.email, testEmail);
          expect(result.id, testUser.id);
        },
      );

      test('should return null when no stored data', () async {
        // Act
        final result = await authService.getCurrentUser();

        // Assert
        expect(result, isNull);
      });

      test('should logout and return null when token is invalid', () async {
        // Arrange
        await mockSecureStorage.write(
          key: 'userData',
          value: jsonEncode(testUser.toJson()),
        );
        await mockSecureStorage.write(key: 'jwt', value: testToken);

        mockHttpClient.setResponse('$testAuthUrl/getMe', {
          'error': 'Unauthorized',
        }, statusCode: 401);

        // Act
        final result = await authService.getCurrentUser();

        // Assert
        expect(result, isNull);

        // Check that data was cleared
        final storedToken = await mockSecureStorage.read(key: 'jwt');
        final storedUserData = await mockSecureStorage.read(key: 'userData');
        expect(storedToken, isNull);
        expect(storedUserData, isNull);
      });

      test('should return cached user when server error occurs', () async {
        // Arrange
        await mockSecureStorage.write(
          key: 'userData',
          value: jsonEncode(testUser.toJson()),
        );
        await mockSecureStorage.write(key: 'jwt', value: testToken);

        mockHttpClient.setResponse('$testAuthUrl/getMe', {
          'error': 'Server Error',
        }, statusCode: 500);

        // Act
        final result = await authService.getCurrentUser();

        // Assert
        expect(result, isA<User>());
        expect(result!.email, testEmail);
      });

      test('should return cached user when network error occurs', () async {
        // Arrange
        await mockSecureStorage.write(
          key: 'userData',
          value: jsonEncode(testUser.toJson()),
        );
        await mockSecureStorage.write(key: 'jwt', value: testToken);

        mockHttpClient.setException(
          '$testAuthUrl/getMe',
          Exception('Network error'),
        );

        // Act
        final result = await authService.getCurrentUser();

        // Assert
        expect(result, isA<User>());
        expect(result!.email, testEmail);
      });
    });

    group('logout', () {
      test('should clear all stored data', () async {
        // Arrange - Set up some data to clear
        await mockSecureStorage.write(key: 'jwt', value: testToken);
        await mockSecureStorage.write(
          key: 'userData',
          value: jsonEncode(testUser.toJson()),
        );
        await mockSecureStorage.write(key: 'sessionToken', value: 'session123');

        // Act
        await authService.logout();

        // Assert
        final jwtToken = await mockSecureStorage.read(key: 'jwt');
        final userData = await mockSecureStorage.read(key: 'userData');
        final sessionToken = await mockSecureStorage.read(key: 'sessionToken');

        expect(jwtToken, isNull);
        expect(userData, isNull);
        expect(sessionToken, isNull);
      });

      test('should not throw error when storage operations fail', () async {
        // Arrange
        mockSecureStorage.setException('jwt', Exception('Storage error'));
        mockGoogleSignIn.setThrowException(Exception('Google sign out error'));

        // Act & Assert
        expect(() => authService.logout(), returnsNormally);
      });
    });

    group('isAuthenticated', () {
      test('should return true when JWT token exists', () async {
        // Arrange
        await mockSecureStorage.write(key: 'jwt', value: testToken);

        // Act
        final result = await authService.isAuthenticated();

        // Assert
        expect(result, isTrue);
      });

      test('should return false when JWT token is null', () async {
        // Act
        final result = await authService.isAuthenticated();

        // Assert
        expect(result, isFalse);
      });

      test('should return false when storage operation fails', () async {
        // Arrange
        mockSecureStorage.setException('jwt', Exception('Storage error'));

        // Act
        final result = await authService.isAuthenticated();

        // Assert
        expect(result, isFalse);
      });
    });

    group('getJwtToken', () {
      test('should return token when it exists', () async {
        // Arrange
        await mockSecureStorage.write(key: 'jwt', value: testToken);

        // Act
        final result = await authService.getJwtToken();

        // Assert
        expect(result, testToken);
      });

      test('should return null when token does not exist', () async {
        // Act
        final result = await authService.getJwtToken();

        // Assert
        expect(result, isNull);
      });

      test('should return null when storage operation fails', () async {
        // Arrange
        mockSecureStorage.setException('jwt', Exception('Storage error'));

        // Act
        final result = await authService.getJwtToken();

        // Assert
        expect(result, isNull);
      });
    });
  });
}
