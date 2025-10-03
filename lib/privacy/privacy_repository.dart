import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/privacy_service.dart';

/// Small repository wrapper around the PrivacyService to decouple UI and tests.
class PrivacyRepository {
  final PrivacyService _service;

  PrivacyRepository(this._service);

  Future<
    ({
      PrivacyOperationResult result,
      Map<String, dynamic>? data,
      String? errorMessage,
    })
  >
  exportUserData() async {
    return _service.exportUserData();
  }

  Future<({PrivacyOperationResult result, String? errorMessage})>
  deleteAccount() async {
    return _service.deleteAccount();
  }
}

/// Provider for the repository so UIs can depend on it and tests can override.
final privacyRepositoryProvider = Provider<PrivacyRepository>((ref) {
  final svc = ref.watch(privacyServiceProvider);
  return PrivacyRepository(svc);
});
