import 'package:test/test.dart';
import 'package:asora_api_client/asora_api_client.dart';

/// tests for PostsApi
void main() {
  final instance = AsoraApiClient().getPostsApi();

  group(PostsApi, () {
    // Create a new post
    //
    // Create a new post.
    //
    //Future<CreatePost201Response> createPost(CreatePostRequest createPostRequest) async
    test('test createPost', () async {
      // TODO
    });
  });
}
