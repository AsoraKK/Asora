import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio();
  // NOTE(asora-appeals): configure baseUrl and auth header via interceptors when auth wiring is complete.
  return dio;
});

final appealProvider = Provider<AppealService>((ref) => AppealService(ref));

class AppealService {
  final Ref ref;
  AppealService(this.ref);
  Future<bool> submit(String postId, String reason) async {
    try {
      final dio = ref.read(dioProvider);
      await dio.post(
        "/api/appeals",
        data: {"postId": postId, "reason": reason},
      );
      return true;
    } catch (_) {
      return false;
    }
  }
}
