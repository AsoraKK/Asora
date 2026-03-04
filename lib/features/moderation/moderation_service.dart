// ignore_for_file: public_member_api_docs

import 'dart:convert';
import 'package:http/http.dart' as http;

class ModerationService {
  final String baseUrl;
  final http.Client _http;

  ModerationService(this.baseUrl, {http.Client? httpClient})
    : _http = (httpClient ?? http.Client());

  Future<Map<String, dynamic>> fetchReviewQueue({
    required String accessToken,
    int page = 1,
    int pageSize = 20,
    String status = 'pending',
  }) async {
    final uri = Uri.parse(
      '$baseUrl/api/moderation/review-queue?page=$page&pageSize=$pageSize&status=$status',
    );
    final res = await _http.get(
      uri,
      headers: {'Authorization': 'Bearer $accessToken'},
    );
    if (res.statusCode != 200) {
      throw Exception('Failed to fetch review queue');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<void> approve(String accessToken, String appealId) async {
    final uri = Uri.parse('$baseUrl/api/moderation/appeals/$appealId/approve');
    final res = await _http.post(
      uri,
      headers: {'Authorization': 'Bearer $accessToken'},
    );
    if (res.statusCode != 200) throw Exception('Approve failed');
  }

  Future<void> reject(String accessToken, String appealId) async {
    final uri = Uri.parse('$baseUrl/api/moderation/appeals/$appealId/reject');
    final res = await _http.post(
      uri,
      headers: {'Authorization': 'Bearer $accessToken'},
    );
    if (res.statusCode != 200) throw Exception('Reject failed');
  }

  Future<void> escalate(String accessToken, String appealId) async {
    final uri = Uri.parse('$baseUrl/api/moderation/appeals/$appealId/escalate');
    final res = await _http.post(
      uri,
      headers: {'Authorization': 'Bearer $accessToken'},
    );
    if (res.statusCode != 200) throw Exception('Escalate failed');
  }

  Future<void> vote(String accessToken, String appealId, String vote) async {
    final uri = Uri.parse('$baseUrl/api/moderation/appeals/$appealId/vote');
    final res = await _http.post(
      uri,
      headers: {
        'Authorization': 'Bearer $accessToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'vote': vote}),
    );
    if (res.statusCode != 200) throw Exception('Vote failed');
  }
}
