enum AuthStatus { loading, guest, authed }

class AuthState {
  final AuthStatus status;
  final String? userId;
  const AuthState(this.status, {this.userId});

  const AuthState.loading() : this(AuthStatus.loading);
  const AuthState.guest() : this(AuthStatus.guest);
  const AuthState.authed(String userId)
    : this(AuthStatus.authed, userId: userId);
}
