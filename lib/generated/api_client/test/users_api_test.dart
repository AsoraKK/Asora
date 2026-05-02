import 'package:test/test.dart';
import 'package:asora_api_client/asora_api_client.dart';

/// tests for UsersApi
void main() {
  final instance = AsoraApiClient().getUsersApi();

  group(UsersApi, () {
    // Follow a user
    //
    //Future<JsonObject> usersFollowCreate(String id, JsonObject body) async
    test('test usersFollowCreate', () async {
      // TODO
    });

    // Unfollow a user
    //
    //Future<JsonObject> usersFollowDelete(String id) async
    test('test usersFollowDelete', () async {
      // TODO
    });

    // Get follow status for a user
    //
    //Future<JsonObject> usersFollowGet(String id) async
    test('test usersFollowGet', () async {
      // TODO
    });

    // Get a public user profile
    //
    //Future<JsonObject> usersGet(String id) async
    test('test usersGet', () async {
      // TODO
    });

    // List posts by a user
    //
    //Future<JsonObject> usersPostsList(String userId) async
    test('test usersPostsList', () async {
      // TODO
    });

    // Get trust passport for a user
    //
    //Future<JsonObject> usersTrustPassport(String id) async
    test('test usersTrustPassport', () async {
      // TODO
    });
  });
}
