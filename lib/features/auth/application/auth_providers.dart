import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_state.dart';

final authStateProvider = StateProvider<AuthState>(
  (ref) => const AuthState.loading(),
);
