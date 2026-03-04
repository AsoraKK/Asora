import 'package:test/test.dart';
import 'package:asora_api_client/asora_api_client.dart';

/// tests for FeedApi
void main() {
  final instance = AsoraApiClient().getFeedApi();

  group(FeedApi, () {
    // Retrieve personalized feed items
    //
    // Return a page of feed items.
    //
    //Future<GetFeed200Response> getFeed({ String cursor, int limit }) async
    test('test getFeed', () async {
      // TODO
    });
  });
}
