import 'package:test/test.dart';
import 'package:asora_api_client/asora_api_client.dart';


/// tests for PrivacyAdminApi
void main() {
  final instance = AsoraApiClient().getPrivacyAdminApi();

  group(PrivacyAdminApi, () {
    // Clear an existing legal hold
    //
    //Future clearLegalHold(LegalHoldClear legalHoldClear) async
    test('test clearLegalHold', () async {
      // TODO
    });

    // Enqueue a Data Subject Request delete
    //
    //Future<DsrRequestSummary> enqueueDsrDelete(DsrRequestInput dsrRequestInput) async
    test('test enqueueDsrDelete', () async {
      // TODO
    });

    // Enqueue a Data Subject Request export
    //
    //Future<DsrRequestSummary> enqueueDsrExport(DsrRequestInput dsrRequestInput) async
    test('test enqueueDsrExport', () async {
      // TODO
    });

    // Place a legal hold
    //
    //Future<LegalHoldRecord> placeLegalHold(LegalHoldInput legalHoldInput) async
    test('test placeLegalHold', () async {
      // TODO
    });

  });
}
