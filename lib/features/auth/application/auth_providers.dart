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

/// Current user authentication state provider
final authStateProvider =
    StateNotifierProvider<AuthStateNotifier, AsyncValue<User?>>((ref) {
      final authService = ref.read(enhancedAuthServiceProvider);
      return AuthStateNotifier(authService);
    });

/// Authentication state notifier
class AuthStateNotifier extends StateNotifier<AsyncValue<User?>> {
  AuthStateNotifier(this._authService) : super(const AsyncValue.loading()) {
    _loadCurrentUser();
  }

  final AuthService _authService;

  /// Load current authenticated user on app startup
  Future<void> _loadCurrentUser() async {
    try {
      final user = await _authService.getCurrentUser();
      state = AsyncValue.data(user);
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }

  /// Sign in with OAuth2 PKCE flow
  Future<void> signInWithOAuth2() async {
    state = const AsyncValue.loading();

    try {
      final user = await _authService.signInWithOAuth2();
      state = AsyncValue.data(user);
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
    state = const AsyncValue.loading();

    try {
      final user = await _authService.loginWithEmail(email, password);
      state = AsyncValue.data(user);
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

      // Reload current user after token refresh
      final user = await _authService.getCurrentUser();
      state = AsyncValue.data(user);
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
    } catch (error) {
      // Even if logout fails, clear the state
      state = const AsyncValue.data(null);
    }
  }

  /// Validate current token and refresh if needed
  Future<void> validateToken() async {
    try {
      final isValid = await _authService.validateAndRefreshToken();

      if (!isValid) {
        // Token invalid and refresh failed, sign out user
        state = const AsyncValue.data(null);
      } else {
        // Token is valid, reload user data
        final user = await _authService.getCurrentUser();
        state = AsyncValue.data(user);
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
