// ignore_for_file: public_member_api_docs

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asora/core/network/dio_client.dart';

final appealProvider = Provider<AppealService>((ref) => AppealService(ref));

class AppealService {
  final Ref ref;
  AppealService(this.ref);
  Future<bool> submit(String postId, String reason) async {
    try {
      final dio = ref.read(secureDioProvider);
      await dio.post<void>(
        '/appeals',
        data: {'postId': postId, 'reason': reason},
      );
      return true;
    } catch (_) {
      return false;
    }
  }
}
