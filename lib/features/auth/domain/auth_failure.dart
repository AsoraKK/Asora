// lib/features/auth/domain/auth_failure.dart

class AuthFailure implements Exception {
  final String message;
  const AuthFailure._(this.message);

  factory AuthFailure.cancelledByUser() =>
      const AuthFailure._('Cancelled by user');

  factory AuthFailure.serverError([String message = 'Server error']) =>
      AuthFailure._(message);

  @override
  String toString() => message;
}

