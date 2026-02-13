import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:asora/state/models/reputation.dart';
import 'package:asora/state/providers/reputation_providers.dart';

void main() {
  group('reputationTiersProvider', () {
    test('provides three tiers', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final tiers = container.read(reputationTiersProvider);

      expect(tiers, hasLength(3));
    });

    test('tiers are ordered by minXP', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final tiers = container.read(reputationTiersProvider);

      expect(tiers[0].id, 'free');
      expect(tiers[0].minXP, 0);
      expect(tiers[1].id, 'premium');
      expect(tiers[1].minXP, 1200);
      expect(tiers[2].id, 'black');
      expect(tiers[2].minXP, 3200);
    });

    test('free tier has expected privileges', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final tiers = container.read(reputationTiersProvider);
      final free = tiers.firstWhere((t) => t.id == 'free');

      expect(free.privileges, isNotEmpty);
      expect(free.privileges.length, 3);
    });

    test('premium tier has expected privileges', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final tiers = container.read(reputationTiersProvider);
      final premium = tiers.firstWhere((t) => t.id == 'premium');

      expect(premium.name, 'Premium');
      expect(premium.privileges, isNotEmpty);
    });

    test('black tier has expected privileges', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final tiers = container.read(reputationTiersProvider);
      final black = tiers.firstWhere((t) => t.id == 'black');

      expect(black.name, 'Black');
      expect(black.minXP, 3200);
      expect(black.privileges, isNotEmpty);
    });

    test('each tier has a unique id', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final tiers = container.read(reputationTiersProvider);
      final ids = tiers.map((t) => t.id).toSet();

      expect(ids.length, tiers.length);
    });
  });
}
