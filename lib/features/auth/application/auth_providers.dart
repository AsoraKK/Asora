/// ASORA OAUTH2 PROVIDERS
///
/// 🎯 Purpose: Riverpod providers for OAuth2 authentication state management
/// 🏗️ Architecture: Reactive state management with Riverpod
/// 🔐 Security: Secure token management and automatic refresh
/// 📱 Platform: Multi-platform authentication support
/// 🤖 OAuth2: Complete PKCE flow integration
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import '../domain/user.dart';
import '../domain/auth_failure.dart';
import 'oauth2_service.dart';
import 'auth_service.dart';

/// OAuth2Service provider - manages OAuth2 PKCE flow
final oauth2ServiceProvider = Provider<OAuth2Service>((ref) {
  return OAuth2Service();
});

/// Enhanced AuthService provider with OAuth2 support
final enhancedAuthServiceProvider = Provider<AuthService>((ref) {
  final oauth2Service = ref.read(oauth2ServiceProvider);

  return AuthService(
    oauth2Service: oauth2Service,
    secureStorage: const FlutterSecureStorage(),
    httpClient: http.Client(),
  );
});

/// Token version provider used to invalidate cached JWT reads when the
/// underlying authentication state changes (sign-in, refresh, logout).
final tokenVersionProvider = StateProvider<int>((ref) => 0);

/// Current user authentication state provider
final authStateProvider =
    StateNotifierProvider<AuthStateNotifier, AsyncValue<User?>>((ref) {
      final authService = ref.read(enhancedAuthServiceProvider);
      return AuthStateNotifier(ref, authService);
    });

/// Authentication state notifier
class AuthStateNotifier extends StateNotifier<AsyncValue<User?>> {
  AuthStateNotifier(this._ref, this._authService)
    : super(const AsyncValue.loading()) {
    _loadCurrentUser();
  }

  final Ref _ref;
  final AuthService _authService;

  void _bumpTokenVersion() {
    final notifier = _ref.read(tokenVersionProvider.notifier);
    notifier.state = notifier.state + 1;
  }

  /// Load current authenticated user on app startup
  Future<void> _loadCurrentUser() async {
    try {
      final user = await _authService.getCurrentUser();
      state = AsyncValue.data(user);
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }

  /// Sign in with OAuth2
  Future<void> signInWithOAuth2() async {
    try {
      state = const AsyncValue.loading();
      final user = await _authService.signInWithOAuth2();
      state = AsyncValue.data(user);
      _bumpTokenVersion();
    } on AuthFailure catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    } catch (error, stackTrace) {
      state = AsyncValue.error(
        AuthFailure.serverError('OAuth2 sign-in failed: ${error.toString()}'),
        stackTrace,
      );
    }
  }

  /// Sign in with email and password
  Future<void> signInWithEmail(String email, String password) async {
    try {
      state = const AsyncValue.loading();
      final user = await _authService.loginWithEmail(email, password);
      state = AsyncValue.data(user);
      _bumpTokenVersion();
    } on AuthFailure catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    } catch (error, stackTrace) {
      state = AsyncValue.error(
        AuthFailure.serverError('Email sign-in failed: ${error.toString()}'),
        stackTrace,
      );
    }
  }

  /// Refresh authentication token
  Future<void> refreshToken() async {
    try {
      await _authService.refreshOAuth2Token();
      _bumpTokenVersion();
    } on AuthFailure catch (error, stackTrace) {
      // Token refresh failed, user needs to sign in again
      state = AsyncValue.error(error, stackTrace);
    } catch (error, stackTrace) {
      state = AsyncValue.error(
        AuthFailure.serverError('Token refresh failed: ${error.toString()}'),
        stackTrace,
      );
    }
  }

  /// Sign out current user
  Future<void> signOut() async {
    try {
      await _authService.logout();
      state = const AsyncValue.data(null);
      _bumpTokenVersion();
    } catch (error) {
      state = const AsyncValue.data(null);
      _bumpTokenVersion();
    }
  }

  /// Validate current token and refresh if needed
  Future<void> validateToken() async {
    try {
      final isValid = await _authService.validateAndRefreshToken();

      if (!isValid) {
        // Token invalid and refresh failed, sign out user
        state = const AsyncValue.data(null);
        _bumpTokenVersion();
      } else {
        // Token is valid, reload user data
        final user = await _authService.getCurrentUser();
        state = AsyncValue.data(user);
        _bumpTokenVersion();
      }
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }
}

/// Convenience provider for checking if user is authenticated
final isAuthenticatedProvider = Provider<bool>((ref) {
  final authState = ref.watch(authStateProvider);
  return authState.maybeWhen(data: (user) => user != null, orElse: () => false);
});

/// Convenience provider for getting current user
final currentUserProvider = Provider<User?>((ref) {
  final authState = ref.watch(authStateProvider);
  return authState.maybeWhen(data: (user) => user, orElse: () => null);
});

/// Provider for authentication loading state
final isAuthLoadingProvider = Provider<bool>((ref) {
  final authState = ref.watch(authStateProvider);
  return authState.maybeWhen(loading: () => true, orElse: () => false);
});

/// Provider for authentication error state
final authErrorProvider = Provider<AuthFailure?>((ref) {
  final authState = ref.watch(authStateProvider);
  return authState.maybeWhen(
    error: (error, _) => error is AuthFailure ? error : null,
    orElse: () => null,
  );
});

/// Reactive JWT provider that refreshes whenever [tokenVersionProvider] is
/// incremented. Returns `null` when the user is unauthenticated.
final jwtProvider = FutureProvider<String?>((ref) async {
  // Recompute whenever auth state bumps the token version counter.
  ref.watch(tokenVersionProvider);

  final oauth2 = ref.watch(oauth2ServiceProvider);
  try {
    final oauthToken = await oauth2.getAccessToken();
    if (oauthToken != null && oauthToken.isNotEmpty) {
      return oauthToken;
    }
  } catch (_) {
    // Ignore and fall back to stored token.
  }

  final authService = ref.watch(enhancedAuthServiceProvider);
  final stored = await authService.getJwtToken();
  if (stored != null && stored.isNotEmpty) {
    return stored;
  }

  return null;
});
