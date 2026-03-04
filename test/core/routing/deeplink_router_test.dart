import 'package:asora/core/routing/deeplink_router.dart';
import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/presentation/invite_redeem_screen.dart';
import 'package:asora/features/feed/application/post_creation_providers.dart';
import 'package:asora/features/feed/domain/models.dart';
import 'package:asora/features/feed/domain/post_repository.dart';
import 'package:asora/features/feed/presentation/post_detail_screen.dart';
import 'package:asora/features/notifications/presentation/notifications_settings_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Future<void> pumpRouterHost(
    WidgetTester tester, {
    List<Override> overrides = const [],
  }) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: overrides,
        child: const MaterialApp(home: Scaffold(body: Text('Home host'))),
      ),
    );
  }

  testWidgets('navigates to notification settings deep-link', (tester) async {
    await pumpRouterHost(tester);

    final context = tester.element(find.text('Home host'));
    DeeplinkRouter.navigate(context, '/settings/notifications');
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));

    expect(find.byType(NotificationsSettingsScreen), findsOneWidget);
  });

  testWidgets('navigates to invite redemption deep-link', (tester) async {
    await pumpRouterHost(tester);

    final context = tester.element(find.text('Home host'));
    DeeplinkRouter.navigate(context, '/invite/ABCD1234');
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));

    expect(find.byType(InviteRedeemScreen), findsOneWidget);
  });

  testWidgets('unknown deep-link does not navigate', (tester) async {
    await pumpRouterHost(tester);

    final context = tester.element(find.text('Home host'));
    DeeplinkRouter.navigate(context, '/unsupported/path');
    await tester.pump();

    expect(find.text('Home host'), findsOneWidget);
    expect(find.byType(Scaffold), findsOneWidget);
  });

  testWidgets('handleNotificationTap routes using deeplink payload', (
    tester,
  ) async {
    await pumpRouterHost(tester);

    final context = tester.element(find.text('Home host'));
    DeeplinkRouter.handleNotificationTap(context, const {
      'deeplink': '/settings/notifications',
    });
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));

    expect(find.byType(NotificationsSettingsScreen), findsOneWidget);
  });

  testWidgets('navigates to post detail for asora post deep-link', (
    tester,
  ) async {
    await pumpRouterHost(
      tester,
      overrides: [
        postRepositoryProvider.overrideWithValue(_FakePostRepository()),
        jwtProvider.overrideWith((ref) async => null),
      ],
    );

    final context = tester.element(find.text('Home host'));
    DeeplinkRouter.navigate(context, 'asora://post/post-123');
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));

    expect(find.byType(PostDetailScreen), findsOneWidget);
  });

  testWidgets('navigates to post detail for comment deep-link with postId', (
    tester,
  ) async {
    await pumpRouterHost(
      tester,
      overrides: [
        postRepositoryProvider.overrideWithValue(_FakePostRepository()),
        jwtProvider.overrideWith((ref) async => null),
      ],
    );

    final context = tester.element(find.text('Home host'));
    DeeplinkRouter.navigate(
      context,
      'asora://comment/comment-789?postId=post-123',
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));

    expect(find.byType(PostDetailScreen), findsOneWidget);
  });
}

class _FakePostRepository implements PostRepository {
  @override
  Future<CreatePostResult> createPost({
    required CreatePostRequest request,
    required String token,
  }) async {
    throw UnimplementedError();
  }

  @override
  Future<bool> deletePost({
    required String postId,
    required String token,
  }) async {
    throw UnimplementedError();
  }

  @override
  Future<Post> getPost({required String postId, String? token}) async {
    return Post(
      id: postId,
      authorId: 'user-1',
      authorUsername: 'lythaus_user',
      text: 'Deep-link test post',
      createdAt: DateTime.now(),
      timeline: const PostTrustTimeline(),
    );
  }

  @override
  Future<CreatePostResult> updatePost({
    required String postId,
    required UpdatePostRequest request,
    required String token,
  }) async {
    throw UnimplementedError();
  }
}
