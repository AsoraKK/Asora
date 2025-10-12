import 'package:test/test.dart';
import 'package:asora_api_client/asora_api_client.dart';

/// tests for DefaultApi
void main() {
  final instance = AsoraApiClient().getDefaultApi();

  group(DefaultApi, () {
    // Create a new post
    //
    //Future<CreatePost201Response> createPost(CreatePostRequest createPostRequest) async
    test('test createPost', () async {
      // TODO
    });

    // Flag content for moderation review
    //
    //Future<FlagContent202Response> flagContent(FlagContentRequest flagContentRequest) async
    test('test flagContent', () async {
      // TODO
    });

    // Retrieve personalized feed items
    //
    //Future<GetFeed200Response> getFeed({ String cursor, int limit }) async
    test('test getFeed', () async {
      // TODO
    });
  });
}
