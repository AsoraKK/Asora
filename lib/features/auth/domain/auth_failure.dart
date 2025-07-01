// lib/features/auth/domain/auth_failure.dart
class AuthFailure {
  final String message;

  AuthFailure._(this.message);

  factory AuthFailure.cancelledByUser() => AuthFailure._('Cancelled by user');
  factory AuthFailure.serverError(String details) => AuthFailure._('Server error: $details');
}
