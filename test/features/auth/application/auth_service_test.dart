// test/features/auth/application/auth_service_test.dart
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:local_auth/local_auth.dart';
import 'package:http/http.dart' as http;

import 'package:asora/features/auth/application/auth_service.dart';
import 'package:asora/features/auth/application/oauth2_service.dart';
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

  // Add getter for test access
  Map<String, String> get storage => _storage;

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
  GoogleSignInAccount? _mockAccount;

  void setThrowException(Exception exception) {
    shouldThrow = true;
    exceptionToThrow = exception;
  }

  void setMockAccount(
    GoogleSignInAccount? account,
    GoogleSignInAuthentication? auth,
  ) {
    _mockAccount = account;
    // auth parameter removed as it was unused
  }

  @override
  Future<GoogleSignInAccount?> signIn() async {
    if (shouldThrow && exceptionToThrow != null) {
      throw exceptionToThrow!;
    }
    return _mockAccount;
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

// Mock Google Sign In Account
class MockGoogleSignInAccount implements GoogleSignInAccount {
  @override
  final String id;
  final GoogleSignInAuthentication? _auth;

  MockGoogleSignInAccount({required this.id, GoogleSignInAuthentication? auth})
    : _auth = auth;

  @override
  Future<GoogleSignInAuthentication> get authentication async => _auth!;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

// Mock Google Sign In Authentication
class MockGoogleSignInAuthentication implements GoogleSignInAuthentication {
  @override
  final String? idToken;
  @override
  final String? accessToken;

  MockGoogleSignInAuthentication({this.idToken, this.accessToken});

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

// Mock Local Authentication
class MockLocalAuthentication implements LocalAuthentication {
  bool canCheckBiometricsResult = false;
  bool authenticateResult = false;

  @override
  Future<bool> get canCheckBiometrics async => canCheckBiometricsResult;

  @override
  dynamic noSuchMethod(Invocation invocation) {
    if (invocation.memberName == #authenticate) {
      return Future.value(authenticateResult);
    }
    return super.noSuchMethod(invocation);
  }
}

// Mock OAuth2 Service
class MockOAuth2Service implements OAuth2Service {
  User? _signInResult;
  User? _refreshResult;
  String? _accessToken;
  Exception? _signInException;
  Exception? _refreshException;

  void setSignInResult(User user) {
    _signInResult = user;
    _signInException = null;
  }

  void setSignInException(Exception exception) {
    _signInException = exception;
    _signInResult = null;
  }

  void setRefreshResult(User? user) {
    _refreshResult = user;
    _refreshException = null;
  }

  void setRefreshException(Exception exception) {
    _refreshException = exception;
    _refreshResult = null;
  }

  void setAccessToken(String? token) {
    _accessToken = token;
  }

  @override
  Future<User> signInWithOAuth2() async {
    if (_signInException != null) {
      throw _signInException!;
    }
    return _signInResult!;
  }

  @override
  Future<User?> refreshToken() async {
    if (_refreshException != null) {
      throw _refreshException!;
    }
    return _refreshResult;
  }

  @override
  Future<String?> getAccessToken() async {
    return _accessToken;
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
    late MockLocalAuthentication mockLocalAuth;
    late MockOAuth2Service mockOAuth2Service;

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
      mockLocalAuth = MockLocalAuthentication();
      mockOAuth2Service = MockOAuth2Service();

      authService = AuthService(
        httpClient: mockHttpClient,
        secureStorage: mockSecureStorage,
        googleSignIn: mockGoogleSignIn,
        localAuth: mockLocalAuth,
        oauth2Service: mockOAuth2Service,
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

      test(
        'should throw AuthFailure.serverError for missing user in response',
        () async {
          // Arrange
          final responseBody = {
            'token': testToken,
            // Missing user key
          };

          mockHttpClient.setResponse('$testAuthUrl/authEmail', responseBody);

          // Act & Assert
          expect(
            () => authService.loginWithEmail(testEmail, testPassword),
            throwsA(isA<AuthFailure>()),
          );
        },
      );

      test(
        'should throw AuthFailure.serverError for non-200 status code',
        () async {
          // Arrange
          mockHttpClient.setResponse('$testAuthUrl/authEmail', {
            'error': 'Not found',
          }, statusCode: 404);

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

    group('signInWithGoogle', () {
      test(
        'should return session token when Google sign-in succeeds',
        () async {
          // Arrange
          final mockAuth = MockGoogleSignInAuthentication(
            idToken: 'mock-id-token',
          );
          final mockAccount = MockGoogleSignInAccount(
            id: 'test-id',
            auth: mockAuth,
          );
          mockGoogleSignIn.setMockAccount(mockAccount, mockAuth);

          mockHttpClient.setResponse(testAuthUrl, {
            'sessionToken': testToken,
          }, statusCode: 200);

          // Act
          final result = await authService.signInWithGoogle();

          // Assert
          expect(result, testToken);
          expect(mockSecureStorage.storage['sessionToken'], testToken);
        },
      );

      test(
        'should throw AuthFailure.cancelledByUser when user cancels',
        () async {
          // Arrange
          mockGoogleSignIn.setMockAccount(null, null);

          // Act & Assert
          expect(
            () => authService.signInWithGoogle(),
            throwsA(isA<AuthFailure>()),
          );
        },
      );

      test(
        'should throw AuthFailure.serverError when backend verification fails',
        () async {
          // Arrange
          final mockAuth = MockGoogleSignInAuthentication(
            idToken: 'mock-id-token',
          );
          final mockAccount = MockGoogleSignInAccount(
            id: 'test-id',
            auth: mockAuth,
          );
          mockGoogleSignIn.setMockAccount(mockAccount, mockAuth);

          mockHttpClient.setResponse(testAuthUrl, {
            'error': 'Invalid token',
          }, statusCode: 400);

          // Act & Assert
          expect(
            () => authService.signInWithGoogle(),
            throwsA(isA<AuthFailure>()),
          );
        },
      );

      test(
        'should throw AuthFailure.serverError when network error occurs',
        () async {
          // Arrange
          final mockAuth = MockGoogleSignInAuthentication(
            idToken: 'mock-id-token',
          );
          final mockAccount = MockGoogleSignInAccount(
            id: 'test-id',
            auth: mockAuth,
          );
          mockGoogleSignIn.setMockAccount(mockAccount, mockAuth);

          mockHttpClient.setException(testAuthUrl, Exception('Network error'));

          // Act & Assert
          expect(
            () => authService.signInWithGoogle(),
            throwsA(isA<AuthFailure>()),
          );
        },
      );
    });

    group('verifyTokenWithBackend', () {
      test('should return session token when verification succeeds', () async {
        // Arrange
        mockHttpClient.setResponse(testAuthUrl, {
          'sessionToken': testToken,
        }, statusCode: 200);

        // Act
        final result = await authService.verifyTokenWithBackend(
          'mock-id-token',
        );

        // Assert
        expect(result, testToken);
        expect(mockSecureStorage.storage['sessionToken'], testToken);
      });

      test(
        'should throw AuthFailure.serverError for non-200 response',
        () async {
          // Arrange
          mockHttpClient.setResponse(testAuthUrl, {
            'error': 'Invalid token',
          }, statusCode: 400);

          // Act & Assert
          expect(
            () => authService.verifyTokenWithBackend('mock-id-token'),
            throwsA(isA<AuthFailure>()),
          );
        },
      );

      test(
        'should throw AuthFailure.serverError when sessionToken is missing',
        () async {
          // Arrange
          mockHttpClient.setResponse(
            testAuthUrl,
            {'success': true}, // Missing sessionToken
            statusCode: 200,
          );

          // Act & Assert
          expect(
            () => authService.verifyTokenWithBackend('mock-id-token'),
            throwsA(isA<AuthFailure>()),
          );
        },
      );

      test('should throw AuthFailure.serverError for network error', () async {
        // Arrange
        mockHttpClient.setException(testAuthUrl, Exception('Network error'));

        // Act & Assert
        expect(
          () => authService.verifyTokenWithBackend('mock-id-token'),
          throwsA(isA<AuthFailure>()),
        );
      });
    });

    group('getSessionToken', () {
      test('should return session token when it exists', () async {
        // Arrange
        await mockSecureStorage.write(key: 'sessionToken', value: testToken);

        // Act
        final result = await authService.getSessionToken();

        // Assert
        expect(result, testToken);
      });

      test('should return null when session token does not exist', () async {
        // Act
        final result = await authService.getSessionToken();

        // Assert
        expect(result, isNull);
      });
    });

    group('clearSessionToken', () {
      test('should clear session token', () async {
        // Arrange
        await mockSecureStorage.write(key: 'sessionToken', value: testToken);

        // Act
        await authService.clearSessionToken();

        // Assert
        final result = await mockSecureStorage.read(key: 'sessionToken');
        expect(result, isNull);
      });
    });

    group('authenticateWithBiometrics', () {
      test(
        'should return true when biometric authentication succeeds',
        () async {
          // Arrange
          mockLocalAuth.canCheckBiometricsResult = true;
          mockLocalAuth.authenticateResult = true;

          // Act
          final result = await authService.authenticateWithBiometrics();

          // Assert
          expect(result, isTrue);
        },
      );

      test('should return false when biometrics are not available', () async {
        // Arrange
        mockLocalAuth.canCheckBiometricsResult = false;

        // Act
        final result = await authService.authenticateWithBiometrics();

        // Assert
        expect(result, isFalse);
      });

      test('should return false when biometric authentication fails', () async {
        // Arrange
        mockLocalAuth.canCheckBiometricsResult = true;
        mockLocalAuth.authenticateResult = false;

        // Act
        final result = await authService.authenticateWithBiometrics();

        // Assert
        expect(result, isFalse);
      });
    });

    group('signOut', () {
      test('should call logout method', () async {
        // Arrange
        await mockSecureStorage.write(key: 'jwt', value: testToken);
        await mockSecureStorage.write(
          key: 'userData',
          value: jsonEncode(testUser.toJson()),
        );

        // Act
        await authService.signOut();

        // Assert
        final jwtToken = await mockSecureStorage.read(key: 'jwt');
        final userData = await mockSecureStorage.read(key: 'userData');
        expect(jwtToken, isNull);
        expect(userData, isNull);
      });
    });

    group('signInWithOAuth2', () {
      test('should return user when OAuth2 sign-in succeeds', () async {
        // Arrange
        mockOAuth2Service.setSignInResult(testUser);
        mockOAuth2Service.setAccessToken(testToken);

        // Act
        final result = await authService.signInWithOAuth2();

        // Assert
        expect(result.id, testUser.id);
        expect(result.email, testUser.email);
        expect(mockSecureStorage.storage['jwt'], testToken);
        expect(
          mockSecureStorage.storage['userData'],
          jsonEncode(testUser.toJson()),
        );
      });

      test('should throw AuthFailure when OAuth2 service fails', () async {
        // Arrange
        mockOAuth2Service.setSignInException(
          AuthFailure.serverError('OAuth2 failed'),
        );

        // Act & Assert
        expect(
          () => authService.signInWithOAuth2(),
          throwsA(isA<AuthFailure>()),
        );
      });

      test('should handle generic exceptions as server errors', () async {
        // Arrange
        mockOAuth2Service.setSignInException(Exception('Generic error'));

        // Act & Assert
        expect(
          () => authService.signInWithOAuth2(),
          throwsA(isA<AuthFailure>()),
        );
      });
    });

    group('refreshOAuth2Token', () {
      test(
        'should refresh token and update storage when refresh succeeds',
        () async {
          // Arrange
          mockOAuth2Service.setRefreshResult(testUser);
          mockOAuth2Service.setAccessToken(testToken);

          // Act
          await authService.refreshOAuth2Token();

          // Assert
          expect(mockSecureStorage.storage['jwt'], testToken);
          expect(
            mockSecureStorage.storage['userData'],
            jsonEncode(testUser.toJson()),
          );
        },
      );

      test(
        'should logout and throw AuthFailure when refresh returns null',
        () async {
          // Arrange
          mockOAuth2Service.setRefreshResult(null);

          // Act & Assert
          expect(
            () => authService.refreshOAuth2Token(),
            throwsA(isA<AuthFailure>()),
          );
        },
      );

      test(
        'should logout and rethrow AuthFailure when OAuth2 service fails',
        () async {
          // Arrange
          mockOAuth2Service.setRefreshException(
            AuthFailure.invalidCredentials('Refresh failed'),
          );

          // Act & Assert
          expect(
            () => authService.refreshOAuth2Token(),
            throwsA(isA<AuthFailure>()),
          );
        },
      );

      test(
        'should logout and handle generic exceptions as server errors',
        () async {
          // Arrange
          mockOAuth2Service.setRefreshException(Exception('Generic error'));

          // Act & Assert
          expect(
            () => authService.refreshOAuth2Token(),
            throwsA(isA<AuthFailure>()),
          );
        },
      );
    });

    group('validateAndRefreshToken', () {
      test('should return true when token is valid', () async {
        // Arrange
        await mockSecureStorage.write(key: 'jwt', value: testToken);
        mockHttpClient.setResponse('$testAuthUrl/userinfo', {
          'valid': true,
        }, statusCode: 200);

        // Act
        final result = await authService.validateAndRefreshToken();

        // Assert
        expect(result, isTrue);
      });

      test('should return false when no token exists', () async {
        // Act
        final result = await authService.validateAndRefreshToken();

        // Assert
        expect(result, isFalse);
      });

      test(
        'should refresh token and return true when token is expired',
        () async {
          // Arrange
          await mockSecureStorage.write(key: 'jwt', value: testToken);
          mockHttpClient.setResponse('$testAuthUrl/userinfo', {
            'error': 'Token expired',
          }, statusCode: 401);
          mockOAuth2Service.setRefreshResult(testUser);
          mockOAuth2Service.setAccessToken('new-token');

          // Act
          final result = await authService.validateAndRefreshToken();

          // Assert
          expect(result, isTrue);
        },
      );

      test('should return false when token refresh fails', () async {
        // Arrange
        await mockSecureStorage.write(key: 'jwt', value: testToken);
        mockHttpClient.setResponse('$testAuthUrl/userinfo', {
          'error': 'Token expired',
        }, statusCode: 401);
        mockOAuth2Service.setRefreshException(Exception('Refresh failed'));

        // Act
        final result = await authService.validateAndRefreshToken();

        // Assert
        expect(result, isFalse);
      });

      test('should return false for non-401 error responses', () async {
        // Arrange
        await mockSecureStorage.write(key: 'jwt', value: testToken);
        mockHttpClient.setResponse('$testAuthUrl/userinfo', {
          'error': 'Server error',
        }, statusCode: 500);

        // Act
        final result = await authService.validateAndRefreshToken();

        // Assert
        expect(result, isFalse);
      });

      test('should return false when network error occurs', () async {
        // Arrange
        await mockSecureStorage.write(key: 'jwt', value: testToken);
        mockHttpClient.setException(
          '$testAuthUrl/userinfo',
          Exception('Network error'),
        );

        // Act
        final result = await authService.validateAndRefreshToken();

        // Assert
        expect(result, isFalse);
      });
    });
  });
}
