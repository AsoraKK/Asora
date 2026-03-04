// ignore_for_file: public_member_api_docs

import 'package:dio/dio.dart';

class InviteRedeemService {
  InviteRedeemService(this._dio);

  final Dio _dio;

  Future<void> redeemInvite({
    required String accessToken,
    required String inviteCode,
  }) async {
    await _dio.post<Map<String, dynamic>>(
      '/api/auth/redeem-invite',
      data: {'inviteCode': inviteCode},
      options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
    );
  }
}
