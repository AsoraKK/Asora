import 'package:test/test.dart';
import 'package:asora_api_client/asora_api_client.dart';

/// tests for ModerationApi
void main() {
  final instance = AsoraApiClient().getModerationApi();

  group(ModerationApi, () {
    // Flag content for moderation review
    //
    // Flag content for review.
    //
    //Future<FlagContent202Response> flagContent(FlagContentRequest flagContentRequest) async
    test('test flagContent', () async {
      // TODO
    });
  });
}
