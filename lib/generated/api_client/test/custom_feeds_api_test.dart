import 'package:test/test.dart';
import 'package:asora_api_client/asora_api_client.dart';

/// tests for CustomFeedsApi
void main() {
  final instance = AsoraApiClient().getCustomFeedsApi();

  group(CustomFeedsApi, () {
    // Create a new custom feed
    //
    //Future<JsonObject> customFeedsCreate(JsonObject body) async
    test('test customFeedsCreate', () async {
      // TODO
    });

    // Delete a custom feed
    //
    //Future<JsonObject> customFeedsDelete(String id) async
    test('test customFeedsDelete', () async {
      // TODO
    });

    // Get a custom feed
    //
    //Future<JsonObject> customFeedsGet(String id) async
    test('test customFeedsGet', () async {
      // TODO
    });

    // List items in a custom feed
    //
    //Future<JsonObject> customFeedsItemsList(String id) async
    test('test customFeedsItemsList', () async {
      // TODO
    });

    // List custom feeds for the current user
    //
    //Future<JsonObject> customFeedsList() async
    test('test customFeedsList', () async {
      // TODO
    });

    // Update a custom feed
    //
    //Future<JsonObject> customFeedsUpdate(String id, JsonObject body) async
    test('test customFeedsUpdate', () async {
      // TODO
    });
  });
}
