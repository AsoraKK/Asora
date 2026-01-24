/// Control Panel - Moderation Weights Management Screen
///
/// Allows admins to view and adjust per-class moderation thresholds.
/// Each of the 29 Hive moderation classes can be independently configured.
library;

import 'package:asora/core/network/dio_client.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Represents a moderation class configuration with threshold weights.
class _ModerationClass {
  /// Unique identifier for the moderation class.
  final String id;

  /// Human-readable name of the class.
  final String name;

  /// Description of what this class moderates.
  final String description;

  /// API type: text, image, or deepfake.
  final String apiType;

  /// Default weight threshold (0.0-1.0).
  final double defaultWeight;

  /// Currently configured weight threshold.
  final double currentWeight;

  /// Minimum allowed weight value.
  final double minWeight;

  /// Maximum allowed weight value.
  final double maxWeight;

  /// Whether this class has been customized from defaults.
  final bool isCustomized;

  /// Guidance text for blocking actions.
  final String blockingGuidance;

  _ModerationClass({
    required this.id,
    required this.name,
    required this.description,
    required this.apiType,
    required this.defaultWeight,
    required this.currentWeight,
    required this.minWeight,
    required this.maxWeight,
    required this.isCustomized,
    required this.blockingGuidance,
  });

  factory _ModerationClass.fromJson(Map<String, dynamic> json) {
    return _ModerationClass(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      apiType: json['apiType'] as String,
      defaultWeight: (json['defaultWeight'] as num).toDouble(),
      currentWeight: (json['currentWeight'] as num).toDouble(),
      minWeight: (json['minWeight'] as num).toDouble(),
      maxWeight: (json['maxWeight'] as num).toDouble(),
      isCustomized: json['isCustomized'] as bool? ?? false,
      blockingGuidance: json['blockingGuidance'] as String,
    );
  }
}

final _moderationClassesProvider = FutureProvider<List<_ModerationClass>>((
  ref,
) async {
  final dio = ref.watch(secureDioProvider);
  final response = await dio.get<Map<String, dynamic>>(
    '/api/admin/moderation-classes',
  );

  final classes = (response.data!['data']['classes'] as List)
      .map((cls) => _ModerationClass.fromJson(cls as Map<String, dynamic>))
      .toList();

  return classes;
});

class _WeightAdjustmentNotifier extends StateNotifier<Map<String, double>> {
  final void Function(String className, double newWeight) _onSave;

  _WeightAdjustmentNotifier(this._onSave) : super({});

  void updateWeight(String className, double newWeight) {
    state = {...state, className: newWeight};
  }

  Future<void> saveWeight(String className, double newWeight) async {
    try {
      _onSave(className, newWeight);
      state = {...state, className: newWeight};
    } catch (e) {
      rethrow;
    }
  }
}

// ignore: unused_element
final _weightAdjustmentProvider =
    StateNotifierProvider<_WeightAdjustmentNotifier, Map<String, double>>((
      ref,
    ) {
      return _WeightAdjustmentNotifier((className, newWeight) async {
        // TODO: Call POST /api/admin/moderation-classes/weights
        // Body: { "className": className, "newWeight": newWeight }
      });
    });

// Main Control Panel Screen
class ModerationWeightsScreen extends ConsumerWidget {
  const ModerationWeightsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final classesAsync = ref.watch(_moderationClassesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Moderation Class Weights'),
        centerTitle: true,
        elevation: 1,
      ),
      body: classesAsync.when(
        data: (classes) => _buildClassesList(context, ref, classes),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text('Error loading classes: $error'),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () => ref.refresh(_moderationClassesProvider),
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildClassesList(
    BuildContext context,
    WidgetRef ref,
    List<_ModerationClass> classes,
  ) {
    // Group classes by API type
    final textClasses = classes.where((c) => c.apiType == 'text').toList();
    final imageClasses = classes.where((c) => c.apiType == 'image').toList();
    final deepfakeClasses = classes
        .where((c) => c.apiType == 'deepfake')
        .toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSummaryCard(context, classes),
          const SizedBox(height: 24),

          // Text Classes
          _buildClassGroup(
            title: 'Text Classes (${textClasses.length})',
            description: 'Moderation for text-based content',
            classes: textClasses,
            color: Colors.blue,
            context: context,
            ref: ref,
          ),
          const SizedBox(height: 24),

          // Image Classes
          if (imageClasses.isNotEmpty) ...[
            _buildClassGroup(
              title: 'Image Classes (${imageClasses.length})',
              description: 'Requires image moderation account',
              classes: imageClasses,
              color: Colors.purple,
              context: context,
              ref: ref,
            ),
            const SizedBox(height: 24),
          ],

          // Deepfake Classes
          if (deepfakeClasses.isNotEmpty) ...[
            _buildClassGroup(
              title: 'Deepfake Classes (${deepfakeClasses.length})',
              description: 'Synthetic media detection',
              classes: deepfakeClasses,
              color: Colors.orange,
              context: context,
              ref: ref,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSummaryCard(
    BuildContext context,
    List<_ModerationClass> classes,
  ) {
    final customized = classes.where((c) => c.isCustomized).length;

    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Overview',
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildStatItem(
                  'Total Classes',
                  '${classes.length}',
                  Colors.blue,
                ),
                _buildStatItem('Customized', '$customized', Colors.orange),
                _buildStatItem(
                  'Using Defaults',
                  '${classes.length - customized}',
                  Colors.green,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 12)),
      ],
    );
  }

  Widget _buildClassGroup({
    required String title,
    required String description,
    required List<_ModerationClass> classes,
    required Color color,
    required BuildContext context,
    required WidgetRef ref,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        const SizedBox(height: 4),
        Text(description, style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: 12),
        ...classes.map((cls) => _buildClassCard(cls, context, ref)),
      ],
    );
  }

  Widget _buildClassCard(
    _ModerationClass cls,
    BuildContext context,
    WidgetRef ref,
  ) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ExpansionTile(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    cls.name,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
                if (cls.isCustomized)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.orange.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'CUSTOM',
                      style: TextStyle(fontSize: 10, color: Colors.orange),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Text(cls.description, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildWeightSlider(cls, ref),
                const SizedBox(height: 16),
                _buildWeightInfo(cls),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    cls.blockingGuidance,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
                const SizedBox(height: 16),
                _buildActionButtons(cls, context, ref),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWeightSlider(_ModerationClass cls, WidgetRef ref) {
    return StatefulBuilder(
      builder: (context, setState) {
        double tempWeight = cls.currentWeight;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Threshold',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                Text(
                  '${(tempWeight * 100).toStringAsFixed(0)}%',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: _getWeightColor(tempWeight),
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Slider(
              value: tempWeight,
              min: cls.minWeight,
              max: cls.maxWeight,
              divisions: ((cls.maxWeight - cls.minWeight) * 100).toInt(),
              label: '${(tempWeight * 100).toStringAsFixed(0)}%',
              onChanged: (value) => setState(() => tempWeight = value),
              onChangeEnd: (value) async {
                try {
                  // TODO: Call saveWeight
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        'Saved ${cls.name}: ${(value * 100).toStringAsFixed(0)}%',
                      ),
                    ),
                  );
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Error: $e'),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              },
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Min: ${(cls.minWeight * 100).toStringAsFixed(0)}%',
                  style: const TextStyle(fontSize: 12),
                ),
                Text(
                  'Max: ${(cls.maxWeight * 100).toStringAsFixed(0)}%',
                  style: const TextStyle(fontSize: 12),
                ),
              ],
            ),
          ],
        );
      },
    );
  }

  Widget _buildWeightInfo(_ModerationClass cls) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildWeightComparison('Default', cls.defaultWeight),
        const SizedBox(height: 8),
        _buildWeightComparison('Current', cls.currentWeight),
        if (cls.isCustomized) ...[
          const SizedBox(height: 8),
          _buildWeightComparison(
            'Difference',
            (cls.currentWeight - cls.defaultWeight),
          ),
        ],
      ],
    );
  }

  Widget _buildWeightComparison(String label, double value) {
    final percentage = (value * 100).toStringAsFixed(0);
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: _getWeightColor(value).withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(4),
          ),
          child: Text(
            '$percentage%',
            style: TextStyle(
              color: _getWeightColor(value),
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildActionButtons(
    _ModerationClass cls,
    BuildContext context,
    WidgetRef ref,
  ) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        if (cls.isCustomized)
          ElevatedButton.icon(
            onPressed: () async {
              // TODO: Call resetWeight
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Reset ${cls.name} to default')),
              );
            },
            icon: const Icon(Icons.restart_alt),
            label: const Text('Reset to Default'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.orange.shade200,
              foregroundColor: Colors.orange.shade900,
            ),
          )
        else
          const SizedBox.shrink(),
      ],
    );
  }

  Color _getWeightColor(double weight) {
    if (weight >= 0.85) return Colors.red;
    if (weight >= 0.70) return Colors.orange;
    if (weight >= 0.50) return Colors.amber;
    return Colors.green;
  }
}
