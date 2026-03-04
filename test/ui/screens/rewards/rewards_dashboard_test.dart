import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:asora/state/models/reputation.dart';
import 'package:asora/state/providers/reputation_providers.dart';
import 'package:asora/ui/screens/rewards/rewards_dashboard.dart';

void main() {
  const freeTier = ReputationTier(
    id: 'free',
    name: 'Free',
    minXP: 0,
    privileges: ['Discovery + News feeds'],
  );

  // Premium tier available for future tests:
  // const premiumTier = ReputationTier(
  //   id: 'premium',
  //   name: 'Premium',
  //   minXP: 1200,
  //   privileges: ['Discovery + News feeds', '2 custom feeds'],
  // );

  Widget buildDashboard({required AsyncValue<UserReputation> reputationValue}) {
    return ProviderScope(
      overrides: [
        reputationProvider.overrideWith(
          (ref) => reputationValue.when(
            data: (d) => Future.value(d),
            loading: () => Future.delayed(const Duration(days: 1)),
            error: (e, s) => Future.error(e, s),
          ),
        ),
        reputationTiersProvider.overrideWithValue(const [
          ReputationTier(
            id: 'free',
            name: 'Free',
            minXP: 0,
            privileges: ['Discovery + News feeds'],
          ),
          ReputationTier(
            id: 'premium',
            name: 'Premium',
            minXP: 1200,
            privileges: ['2 custom feeds'],
          ),
          ReputationTier(
            id: 'black',
            name: 'Black',
            minXP: 3200,
            privileges: ['All rewards'],
          ),
        ]),
      ],
      child: const MaterialApp(home: RewardsDashboardScreen()),
    );
  }

  group('RewardsDashboardScreen', () {
    testWidgets('shows app bar title', (tester) async {
      await tester.pumpWidget(
        buildDashboard(
          reputationValue: const AsyncValue.data(
            UserReputation(xp: 0, tier: freeTier),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Rewards & XP'), findsOneWidget);
    });

    testWidgets('shows error state with retry button', (tester) async {
      await tester.pumpWidget(
        buildDashboard(
          reputationValue: AsyncValue.error(
            Exception('Network error'),
            StackTrace.current,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Unable to load rewards right now.'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('shows XP and tier data when loaded', (tester) async {
      await tester.pumpWidget(
        buildDashboard(
          reputationValue: const AsyncValue.data(
            UserReputation(
              xp: 500,
              tier: freeTier,
              missions: [
                Mission(
                  id: 'm1',
                  title: 'Daily post limit: 5',
                  xpReward: 0,
                  completed: true,
                ),
              ],
              recentAchievements: ['Tier active: Free'],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Rewards & XP'), findsOneWidget);
      expect(find.text('500 XP'), findsOneWidget);
      expect(find.text('Missions'), findsOneWidget);
      expect(find.text('Daily post limit: 5'), findsOneWidget);
    });

    testWidgets('shows history section with achievements', (tester) async {
      await tester.pumpWidget(
        buildDashboard(
          reputationValue: const AsyncValue.data(
            UserReputation(
              xp: 100,
              tier: freeTier,
              recentAchievements: [
                'Tier active: Free',
                'Paid tier entitlements active',
              ],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('History'), findsOneWidget);
      expect(find.text('Tier active: Free'), findsOneWidget);
      expect(find.text('Paid tier entitlements active'), findsOneWidget);
    });

    testWidgets('shows upcoming rewards section', (tester) async {
      await tester.pumpWidget(
        buildDashboard(
          reputationValue: const AsyncValue.data(
            UserReputation(xp: 100, tier: freeTier),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Upcoming rewards'), findsOneWidget);
    });

    testWidgets('shows completed mission icon', (tester) async {
      await tester.pumpWidget(
        buildDashboard(
          reputationValue: const AsyncValue.data(
            UserReputation(
              xp: 400,
              tier: freeTier,
              missions: [
                Mission(
                  id: 'm1',
                  title: 'Complete me',
                  xpReward: 10,
                  completed: true,
                ),
              ],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.check_circle), findsOneWidget);
    });

    testWidgets('shows incomplete mission icon', (tester) async {
      await tester.pumpWidget(
        buildDashboard(
          reputationValue: const AsyncValue.data(
            UserReputation(
              xp: 400,
              tier: freeTier,
              missions: [
                Mission(
                  id: 'm2',
                  title: 'In progress',
                  xpReward: 20,
                  completed: false,
                ),
              ],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.timelapse_outlined), findsOneWidget);
    });

    testWidgets('shows XP reward for missions', (tester) async {
      await tester.pumpWidget(
        buildDashboard(
          reputationValue: const AsyncValue.data(
            UserReputation(
              xp: 100,
              tier: freeTier,
              missions: [
                Mission(id: 'm1', title: 'Test mission', xpReward: 50),
              ],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('+50 XP'), findsOneWidget);
    });

    testWidgets('renders at max tier with 100% progress', (tester) async {
      const blackTier = ReputationTier(
        id: 'black',
        name: 'Black',
        minXP: 3200,
        privileges: ['All rewards'],
      );

      await tester.pumpWidget(
        buildDashboard(
          reputationValue: const AsyncValue.data(
            UserReputation(xp: 5000, tier: blackTier),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('100%'), findsOneWidget);
    });
  });
}
