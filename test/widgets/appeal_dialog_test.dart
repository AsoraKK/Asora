import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/moderation/application/moderation_providers.dart';
import 'package:asora/features/moderation/domain/appeal.dart';
import 'package:asora/features/moderation/domain/moderation_repository.dart';
import 'package:asora/widgets/appeal_dialog.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class MockModerationRepository extends Mock implements ModerationRepository {}

void main() {
  late MockModerationRepository mockRepository;

  setUp(() {
    mockRepository = MockModerationRepository();
  });

  testWidgets(
    'shows daily appeal limit message when the API rejects the request',
    (tester) async {
      final now = DateTime.utc(2025, 1, 1, 10, 0, 0);
      final resetAt = now.add(const Duration(hours: 2));
      final requestOptions = RequestOptions(path: '/api/appealContent');
      final response = Response(
        requestOptions: requestOptions,
        statusCode: 429,
        data: {
          'code': 'DAILY_APPEAL_LIMIT_EXCEEDED',
          'tier': 'free',
          'limit': 1,
          'resetAt': resetAt.toIso8601String(),
        },
      );
      final error = DioException(
        requestOptions: requestOptions,
        response: response,
      );

      when(
        () => mockRepository.submitAppeal(
          contentId: any(named: 'contentId'),
          contentType: any(named: 'contentType'),
          appealType: any(named: 'appealType'),
          appealReason: any(named: 'appealReason'),
          userStatement: any(named: 'userStatement'),
          token: any(named: 'token'),
        ),
      ).thenThrow(error);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            moderationClientProvider.overrideWithValue(mockRepository),
            jwtProvider.overrideWith((_) async => 'jwt-token'),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: AppealDialog(
                contentId: 'post-123',
                contentType: 'post',
                currentStatus: ModerationStatus.hidden,
              ),
            ),
          ),
        ),
      );

      await tester.enterText(
        find.byType(TextField).at(0),
        'Valid reason that exceeds ten characters',
      );
      await tester.enterText(
        find.byType(TextField).at(1),
        'Detailed statement that contains more than fifty characters for validation.',
      );
      await tester.pump();

      await tester.tap(find.widgetWithText(ElevatedButton, 'Submit Appeal'));
      await tester.pumpAndSettle();

      expect(
        find.textContaining('daily appeals limit', findRichText: false),
        findsOneWidget,
      );
    },
  );
}
