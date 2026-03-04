import 'package:asora/core/network/dio_client.dart';
import 'package:asora/screens/admin/moderation_weights_screen.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class MockDio extends Mock implements Dio {}

void main() {
  testWidgets('renders moderation classes and saves adjustments', (
    tester,
  ) async {
    tester.binding.platformDispatcher.textScaleFactorTestValue = 0.8;
    addTearDown(
      () => tester.binding.platformDispatcher.clearTextScaleFactorTestValue(),
    );

    final dio = MockDio();
    when(
      () => dio.get<Map<String, dynamic>>('/api/admin/moderation-classes'),
    ).thenAnswer(
      (_) async => Response<Map<String, dynamic>>(
        data: {
          'data': {
            'classes': [
              {
                'id': 'toxicity',
                'name': 'Toxicity',
                'description': 'Toxic speech detection',
                'apiType': 'text',
                'defaultWeight': 0.7,
                'currentWeight': 0.8,
                'minWeight': 0.1,
                'maxWeight': 1.0,
                'isCustomized': true,
                'blockingGuidance': 'Block toxic speech',
              },
              {
                'id': 'nudity',
                'name': 'Nudity',
                'description': 'Nudity detection',
                'apiType': 'image',
                'defaultWeight': 0.6,
                'currentWeight': 0.6,
                'minWeight': 0.2,
                'maxWeight': 1.0,
                'isCustomized': false,
                'blockingGuidance': 'Block explicit images',
              },
              {
                'id': 'deepfake',
                'name': 'Deepfake',
                'description': 'Synthetic media detection',
                'apiType': 'deepfake',
                'defaultWeight': 0.5,
                'currentWeight': 0.55,
                'minWeight': 0.3,
                'maxWeight': 1.0,
                'isCustomized': false,
                'blockingGuidance': 'Block deepfakes',
              },
            ],
          },
        },
        statusCode: 200,
        requestOptions: RequestOptions(path: '/api/admin/moderation-classes'),
      ),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [secureDioProvider.overrideWith((ref) => dio)],
        child: const MaterialApp(home: ModerationWeightsScreen()),
      ),
    );
    await tester.pump();
    await tester.pumpAndSettle();

    expect(find.text('Moderation Class Weights'), findsOneWidget);
    expect(find.text('Text Classes (1)'), findsOneWidget);
    expect(find.text('Image Classes (1)'), findsOneWidget);
    expect(find.text('Deepfake Classes (1)'), findsOneWidget);
    expect(find.text('CUSTOM'), findsOneWidget);

    await tester.tap(find.text('Toxicity'));
    await tester.pumpAndSettle();
    await tester.drag(find.byType(Slider).first, const Offset(200, 0));
    await tester.pumpAndSettle();

    expect(find.textContaining('Saved Toxicity'), findsOneWidget);
  });

  testWidgets('shows error state when classes fail to load', (tester) async {
    final dio = MockDio();
    when(
      () => dio.get<Map<String, dynamic>>('/api/admin/moderation-classes'),
    ).thenThrow(
      DioException(
        requestOptions: RequestOptions(path: '/api/admin/moderation-classes'),
        type: DioExceptionType.badResponse,
      ),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [secureDioProvider.overrideWith((ref) => dio)],
        child: const MaterialApp(home: ModerationWeightsScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('Error loading classes'), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
  });
}
