import 'dart:convert';
import 'package:http/http.dart' as http;

class ProfileService {
  final String baseUrl;
  final http.Client _http;

  ProfileService(this.baseUrl, {http.Client? httpClient}) : _http = (httpClient ?? http.Client());

  Future<void> upsertProfile({required String accessToken, required String displayName, String? bio, String? location, String? website}) async {
    final res = await _http.post(
      Uri.parse('$baseUrl/api/users/profile'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
      body: jsonEncode({ 'displayName': displayName, 'bio': bio, 'location': location, 'website': website }),
    );
    if (res.statusCode == 200) return;

    final data = jsonDecode(res.body);
    if (res.statusCode == 400 && (data['error'] == 'moderation_rejected')) {
      throw Exception('Profile rejected: please remove profane or toxic content');
    }
    if (res.statusCode == 200) return; // no-op
    throw Exception(data['message'] ?? 'Profile update failed');
  }
}

