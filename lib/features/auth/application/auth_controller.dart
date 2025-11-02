import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../services/oauth2_service.dart';
import '../../../services/service_providers.dart';

/// Authentication state for UI
class AuthControllerState {
  final bool isAuthenticated;
  final bool isLoading;
  final String? error;

  const AuthControllerState({
    this.isAuthenticated = false,
    this.isLoading = false,
    this.error,
  });

  AuthControllerState copyWith({
    bool? isAuthenticated,
    bool? isLoading,
    String? error,
  }) {
    return AuthControllerState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

/// Auth controller provider
final authControllerProvider =
    StateNotifierProvider<AuthController, AuthControllerState>((ref) {
      final oauth2Service = ref.watch(oauth2ServiceProvider);
      return AuthController(oauth2Service);
    });

/// Auth controller manages authentication state and actions
class AuthController extends StateNotifier<AuthControllerState> {
  final OAuth2Service _oauth2Service;

  AuthController(this._oauth2Service) : super(const AuthControllerState()) {
    _init();
  }

  Future<void> _init() async {
    // Listen to auth service state changes
    _oauth2Service.authState.listen((authState) {
      switch (authState) {
        case AuthState.authenticated:
          state = state.copyWith(
            isAuthenticated: true,
            isLoading: false,
            error: null,
          );
          break;
        case AuthState.authenticating:
          state = state.copyWith(isLoading: true, error: null);
          break;
        case AuthState.unauthenticated:
          state = state.copyWith(
            isAuthenticated: false,
            isLoading: false,
            error: null,
          );
          break;
        case AuthState.error:
          state = state.copyWith(isLoading: false);
          break;
      }
    });

    // Initialize OAuth2 service
    await _oauth2Service.initialize();
  }

  /// Sign in with email (B2C email/password)
  Future<void> signInEmail() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _oauth2Service.signInEmail();
      // State updated via stream listener
    } on AuthException catch (e) {
      state = state.copyWith(isLoading: false, error: _formatError(e));
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Sign-in failed. Please try again.',
      );
    }
  }

  /// Sign in with Google (B2C social IdP)
  Future<void> signInGoogle() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _oauth2Service.signInGoogle();
      // State updated via stream listener
    } on AuthException catch (e) {
      state = state.copyWith(isLoading: false, error: _formatError(e));
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Sign-in failed. Please try again.',
      );
    }
  }

  /// Sign out
  Future<void> signOut() async {
    try {
      await _oauth2Service.signOut();
      // State updated via stream listener
    } catch (e) {
      state = state.copyWith(error: 'Sign-out failed. Please try again.');
    }
  }

  /// Get access token (for API calls)
  Future<String?> getAccessToken({bool forceRefresh = false}) async {
    try {
      return await _oauth2Service.getAccessToken(forceRefresh: forceRefresh);
    } catch (e) {
      return null;
    }
  }

  /// Format auth exception for display
  String _formatError(AuthException e) {
    switch (e.error) {
      case AuthError.cancelled:
        return 'Sign-in cancelled';
      case AuthError.network:
        return 'Network error. Please check your connection.';
      case AuthError.policyNotFound:
        return 'Authentication configuration error';
      case AuthError.accountUnavailable:
        return 'Account unavailable';
      case AuthError.transient:
        return 'Temporary error. Please try again.';
      case AuthError.unknown:
        return e.message;
    }
  }
}
