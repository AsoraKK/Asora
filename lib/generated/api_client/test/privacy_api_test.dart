import 'package:test/test.dart';
import 'package:asora_api_client/asora_api_client.dart';

/// tests for PrivacyApi
void main() {
  final instance = AsoraApiClient().getPrivacyApi();

  group(PrivacyApi, () {
    // Delete own account (GDPR Article 17)
    //
    // Permanently deletes the authenticated user's account and anonymises all authored content. Requires the `X-Confirm-Delete: true` header to guard against accidental invocations. This action is **irreversible**.
    //
    //Future<AccountDeleteResponse> deleteUserAccount(String xConfirmDelete) async
    test('test deleteUserAccount', () async {
      // TODO
    });

    // Export personal data (GDPR Article 20)
    //
    // Returns a structured copy of all personal data held for the authenticated user. Export cooldown periods are tier-gated. The `X-Export-ID` response header contains the export identifier for tracking.
    //
    //Future<DSRExportResponse> exportUserData() async
    test('test exportUserData', () async {
      // TODO
    });
  });
}
