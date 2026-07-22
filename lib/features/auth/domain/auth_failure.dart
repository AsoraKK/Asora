// ignore_for_file: public_member_api_docs

// lib/features/auth/domain/auth_failure.dart

class AuthFailure implements Exception {
  final String message;
  final bool retryable;
  const AuthFailure._(this.message, {this.retryable = false});

  factory AuthFailure.cancelledByUser() =>
      const AuthFailure._('Cancelled by user');

  factory AuthFailure.serverError([
    String message = 'Server error',
    bool retryable = false,
  ]) =>
      AuthFailure._(message, retryable: retryable);

  factory AuthFailure.invalidCredentials([
    String message = 'Invalid credentials',
  ]) => AuthFailure._(message);

  factory AuthFailure.networkError([String message = 'Network error']) =>
      AuthFailure._(message, retryable: true);

  factory AuthFailure.platformError([String message = 'Platform error']) =>
      AuthFailure._(message);

  factory AuthFailure.providerUnavailable() =>
      const AuthFailure._('This sign-in method is not available yet.');

  factory AuthFailure.callbackInvalid() =>
      const AuthFailure._('Sign-in could not be completed. Please try again.');

  @override
  String toString() => message;
}
