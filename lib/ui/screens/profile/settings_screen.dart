// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/state/providers/settings_providers.dart';
import 'package:asora/ui/theme/spacing.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsProvider);
    final controller = ref.read(settingsProvider.notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.all(Spacing.md),
        children: [
          SwitchListTile(
            title: const Text('Left-handed mode (mirror nav)'),
            value: settings.leftHandedMode,
            onChanged: (_) => controller.toggleLeftHanded(),
          ),
          SwitchListTile(
            title: const Text('Horizontal swipe between feeds'),
            value: settings.horizontalSwipeEnabled,
            onChanged: (_) => controller.toggleSwipeEnabled(),
          ),
          SwitchListTile(
            title: const Text('Haptics'),
            value: settings.hapticsEnabled,
            onChanged: (_) => controller.toggleHaptics(),
          ),
        ],
      ),
    );
  }
}
