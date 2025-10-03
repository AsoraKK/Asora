import 'package:asora/privacy/privacy_repository.dart';
import 'package:asora/services/privacy_service.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeService implements PrivacyService {
  @override
  Future<
    ({
      PrivacyOperationResult result,
      Map<String, dynamic>? data,
      String? errorMessage,
    })
  >
  exportUserData() async {
    return (
      result: PrivacyOperationResult.success,
      data: {'ok': true},
      errorMessage: null,
    );
  }

  @override
  Future<({PrivacyOperationResult result, String? errorMessage})>
  deleteAccount() async {
    return (result: PrivacyOperationResult.success, errorMessage: null);
  }

  // The service class has other methods in the real implementation; tests only need the above.
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  test('repository export delegates to service', () async {
    final repo = PrivacyRepository(_FakeService());
    final res = await repo.exportUserData();
    expect(res.result, PrivacyOperationResult.success);
    expect(res.data, isNotNull);
  });

  test('repository delete delegates to service', () async {
    final repo = PrivacyRepository(_FakeService());
    final res = await repo.deleteAccount();
    expect(res.result, PrivacyOperationResult.success);
  });
}
