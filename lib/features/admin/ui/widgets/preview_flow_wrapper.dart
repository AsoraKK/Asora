// ignore_for_file: public_member_api_docs

/// LYTHAUS PREVIEW FLOW WRAPPER
///
/// 🎯 Purpose: Wraps actual app screens for preview in device emulator
/// 🏗️ Architecture: Maps PreviewFlow enum to actual screen widgets
/// 🎨 Features: Isolated preview state, mock providers where needed
/// 🧪 Live Test Mode: Toggle between mock preview and real API calls
/// 📱 Platform: Flutter with Riverpod state management
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/features/admin/application/live_test_mode_provider.dart';
import 'package:asora/features/admin/ui/app_preview_screen.dart';
import 'package:asora/ui/screens/onboarding/onboarding_intro.dart';
import 'package:asora/ui/screens/rewards/rewards_dashboard.dart';
import 'package:asora/ui/components/create_post_modal.dart';
import 'package:asora/screens/feed_screen.dart';
import 'package:asora/ui/screens/profile/profile_screen.dart';
import 'package:asora/ui/screens/profile/settings_screen.dart';

/// Provider for mock user posts in preview mode
final previewUserPostsProvider = StateProvider<List<_MockUserPost>>(
  (ref) => [],
);

/// Mock user post for preview
class _MockUserPost {
  final String id;
  final String text;
  final DateTime createdAt;
  final bool wasModerated;
  final String? moderationReason;

  _MockUserPost({
    required this.id,
    required this.text,
    required this.createdAt,
    this.wasModerated = false,
    this.moderationReason,
  });
}

/// Wraps actual app screens for preview, providing isolation
class PreviewFlowWrapper extends ConsumerStatefulWidget {
  final PreviewFlow flow;

  const PreviewFlowWrapper({super.key, required this.flow});

  @override
  ConsumerState<PreviewFlowWrapper> createState() => _PreviewFlowWrapperState();
}

class _PreviewFlowWrapperState extends ConsumerState<PreviewFlowWrapper> {
  final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();

  @override
  Widget build(BuildContext context) {
    final isLiveMode = ref.watch(isLiveTestModeProvider);

    // Wrap in MaterialApp to provide proper navigation context for preview
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: Theme.of(context),
      navigatorKey: _navigatorKey,
      home: _buildFlowScreen(isLiveMode),
      // Intercept navigation to stay within preview
      onGenerateRoute: (settings) {
        return MaterialPageRoute<void>(
          builder: (context) => _PreviewNavigationInterceptor(
            routeName: settings.name ?? 'unknown',
            onNavigate: (flowName) => _handleNavigation(flowName),
          ),
        );
      },
    );
  }

  Widget _buildFlowScreen(bool isLiveMode) {
    // In live mode, use real screens where possible
    if (isLiveMode) {
      return switch (widget.flow) {
        // Authentication - still use preview (user is already logged in as admin)
        PreviewFlow.authChoice => _PreviewAuthChoice(
          onContinue: () => _navigateToFlow(PreviewFlow.onboardingIntro),
        ),

        // Onboarding flows - use preview versions
        PreviewFlow.onboardingIntro => _PreviewOnboardingIntro(
          onContinue: () => _navigateToFlow(PreviewFlow.onboardingModeration),
        ),
        PreviewFlow.onboardingModeration => _PreviewOnboardingModeration(
          onContinue: () => _navigateToFlow(PreviewFlow.onboardingFeed),
        ),
        PreviewFlow.onboardingFeed => _PreviewOnboardingFeed(
          onContinue: () => _navigateToFlow(PreviewFlow.homeFeed),
        ),

        // Main app flows - USE REAL SCREENS in live mode
        PreviewFlow.homeFeed => const _LiveHomeFeed(),
        PreviewFlow.createPost => const _LiveCreatePost(),
        PreviewFlow.profile => const _LiveProfile(),
        PreviewFlow.settings => const _LiveSettings(),
        PreviewFlow.rewards => const RewardsDashboardScreen(),
      };
    }

    // Mock mode - use preview-safe screens
    return switch (widget.flow) {
      // Authentication flow
      PreviewFlow.authChoice => _PreviewAuthChoice(
        onContinue: () => _navigateToFlow(PreviewFlow.onboardingIntro),
      ),

      // Onboarding flows
      PreviewFlow.onboardingIntro => _PreviewOnboardingIntro(
        onContinue: () => _navigateToFlow(PreviewFlow.onboardingModeration),
      ),
      PreviewFlow.onboardingModeration => _PreviewOnboardingModeration(
        onContinue: () => _navigateToFlow(PreviewFlow.onboardingFeed),
      ),
      PreviewFlow.onboardingFeed => _PreviewOnboardingFeed(
        onContinue: () => _navigateToFlow(PreviewFlow.homeFeed),
      ),

      // Main app flows
      PreviewFlow.homeFeed => const _PreviewHomeFeed(),
      PreviewFlow.createPost => const _PreviewCreatePost(),
      PreviewFlow.profile => const _PreviewProfile(),
      PreviewFlow.settings => const _PreviewSettings(),
      PreviewFlow.rewards => const RewardsDashboardScreen(),
    };
  }

  void _navigateToFlow(PreviewFlow nextFlow) {
    ref.read(previewFlowProvider.notifier).state = nextFlow;
  }

  void _handleNavigation(String flowName) {
    // Map route names to flows if needed
    final flow = PreviewFlow.values
        .where((f) => f.name == flowName)
        .firstOrNull;
    if (flow != null) {
      _navigateToFlow(flow);
    }
  }
}

/// Auth choice screen with preview-specific behavior
class _PreviewAuthChoice extends StatelessWidget {
  final VoidCallback onContinue;

  const _PreviewAuthChoice({required this.onContinue});

  @override
  Widget build(BuildContext context) {
    // We use a custom wrapper to intercept auth actions
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo / Brand
                  Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primaryContainer,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.wb_sunny_rounded,
                      size: 48,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                  const SizedBox(height: 32),

                  Text(
                    'Welcome to Lythaus',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Your mindful social experience',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 48),

                  // Sign in button
                  FilledButton.icon(
                    onPressed: onContinue,
                    icon: const Icon(Icons.login),
                    label: const Text('Sign in with Google'),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(48),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Continue as guest
                  OutlinedButton(
                    onPressed: onContinue,
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(48),
                    ),
                    child: const Text('Continue as Guest'),
                  ),
                  const SizedBox(height: 24),

                  // Preview indicator
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.amber.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.amber),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.preview,
                          size: 16,
                          color: Colors.amber,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Preview Mode - Tap to continue',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: Colors.amber[800]),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Onboarding intro with preview-specific behavior
class _PreviewOnboardingIntro extends StatelessWidget {
  final VoidCallback onContinue;

  const _PreviewOnboardingIntro({required this.onContinue});

  @override
  Widget build(BuildContext context) {
    return OnboardingIntroScreen(onContinue: onContinue);
  }
}

/// Home feed with preview-safe behavior
class _PreviewHomeFeed extends ConsumerWidget {
  const _PreviewHomeFeed();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Return a simplified version that doesn't make network calls
    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: 5,
        itemBuilder: (context, index) => _MockPostCard(index: index),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          ref.read(previewFlowProvider.notifier).state = PreviewFlow.createPost;
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}

/// Mock post card for preview
class _MockPostCard extends StatelessWidget {
  final int index;

  const _MockPostCard({required this.index});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Author row
            Row(
              children: [
                CircleAvatar(
                  radius: 20,
                  backgroundColor: theme.colorScheme.primaryContainer,
                  child: Text(
                    ['A', 'B', 'C', 'D', 'E'][index % 5],
                    style: TextStyle(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      ['Alex', 'Blake', 'Casey', 'Dana', 'Ellis'][index % 5],
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      '${(index + 1) * 2}h ago',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Post content
            Text(
              _mockPostContent[index % _mockPostContent.length],
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),

            // Action row
            Row(
              children: [
                _ActionButton(
                  icon: Icons.favorite_border,
                  label: '${(index + 1) * 12}',
                ),
                const SizedBox(width: 24),
                _ActionButton(
                  icon: Icons.chat_bubble_outline,
                  label: '${index + 3}',
                ),
                const SizedBox(width: 24),
                const _ActionButton(icon: Icons.share_outlined, label: 'Share'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  static const _mockPostContent = [
    'Just discovered this amazing coffee shop downtown. The atmosphere is perfect for working remotely! ☕',
    'Thinking about starting a new creative project. Any suggestions for inspiration?',
    'Beautiful sunset tonight. Sometimes you just need to stop and appreciate the little things. 🌅',
    'Finally finished that book I\'ve been reading for months. Highly recommend it!',
    'Weekend hiking adventures with friends. Nature is the best therapy. 🏔️',
  ];
}

/// Simple action button for mock posts
class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;

  const _ActionButton({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: 18,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

/// Intercepts navigation attempts and shows a preview-friendly screen
class _PreviewNavigationInterceptor extends StatelessWidget {
  final String routeName;
  final ValueChanged<String> onNavigate;

  const _PreviewNavigationInterceptor({
    required this.routeName,
    required this.onNavigate,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Navigation')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.route,
                size: 64,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: 16),
              Text(
                'Navigation Intercepted',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text(
                'Route: $routeName',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Use the flow selector panel to navigate between screens in preview mode.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Preview-Safe Onboarding Screens
// ─────────────────────────────────────────────────────────────

/// Preview-safe moderation preferences screen
class _PreviewOnboardingModeration extends StatefulWidget {
  final VoidCallback onContinue;

  const _PreviewOnboardingModeration({required this.onContinue});

  @override
  State<_PreviewOnboardingModeration> createState() =>
      _PreviewOnboardingModerationState();
}

class _PreviewOnboardingModerationState
    extends State<_PreviewOnboardingModeration> {
  double _sensitivity = 0.5;
  bool _hideNsfw = true;
  bool _hidePolitical = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Spacer(),
              Icon(
                Icons.shield_outlined,
                size: 48,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(height: 16),
              Text(
                'Content Preferences',
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Customize what content you see in your feed.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 32),

              Text('Moderation Sensitivity', style: theme.textTheme.titleSmall),
              Slider(
                value: _sensitivity,
                onChanged: (v) => setState(() => _sensitivity = v),
                divisions: 4,
                label: _sensitivityLabel,
              ),
              Text(
                _sensitivityDescription,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),

              const SizedBox(height: 24),

              SwitchListTile(
                title: const Text('Hide NSFW content'),
                subtitle: const Text('Blur potentially sensitive images'),
                value: _hideNsfw,
                onChanged: (v) => setState(() => _hideNsfw = v),
              ),
              SwitchListTile(
                title: const Text('Reduce political content'),
                subtitle: const Text('Show less political posts in feed'),
                value: _hidePolitical,
                onChanged: (v) => setState(() => _hidePolitical = v),
              ),

              const Spacer(),
              FilledButton(
                onPressed: widget.onContinue,
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                ),
                child: const Text('Continue'),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  String get _sensitivityLabel => switch (_sensitivity) {
    < 0.25 => 'Minimal',
    < 0.5 => 'Low',
    < 0.75 => 'Standard',
    _ => 'Strict',
  };

  String get _sensitivityDescription => switch (_sensitivity) {
    < 0.25 => 'Only block clearly harmful content',
    < 0.5 => 'Block most harmful content',
    < 0.75 => 'Balanced moderation (recommended)',
    _ => 'Strictest filtering, may hide borderline content',
  };
}

/// Preview-safe feed customization screen
class _PreviewOnboardingFeed extends StatefulWidget {
  final VoidCallback onContinue;

  const _PreviewOnboardingFeed({required this.onContinue});

  @override
  State<_PreviewOnboardingFeed> createState() => _PreviewOnboardingFeedState();
}

class _PreviewOnboardingFeedState extends State<_PreviewOnboardingFeed> {
  final Set<String> _selectedTopics = {'technology', 'art'};

  static const _topics = [
    ('technology', Icons.computer, 'Tech & Innovation'),
    ('art', Icons.palette, 'Art & Design'),
    ('music', Icons.music_note, 'Music'),
    ('gaming', Icons.games, 'Gaming'),
    ('sports', Icons.sports_soccer, 'Sports'),
    ('food', Icons.restaurant, 'Food & Cooking'),
    ('travel', Icons.flight, 'Travel'),
    ('books', Icons.book, 'Books & Writing'),
    ('science', Icons.science, 'Science'),
    ('nature', Icons.park, 'Nature & Outdoors'),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.tune, size: 48, color: theme.colorScheme.primary),
              const SizedBox(height: 16),
              Text(
                'Personalize Your Feed',
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Select topics you\'re interested in to customize your experience.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 24),

              Expanded(
                child: GridView.count(
                  crossAxisCount: 2,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 2.5,
                  children: _topics.map((topic) {
                    final (id, icon, label) = topic;
                    final selected = _selectedTopics.contains(id);
                    return FilterChip(
                      avatar: Icon(icon, size: 18),
                      label: Text(label),
                      selected: selected,
                      onSelected: (v) {
                        setState(() {
                          if (v) {
                            _selectedTopics.add(id);
                          } else {
                            _selectedTopics.remove(id);
                          }
                        });
                      },
                    );
                  }).toList(),
                ),
              ),

              const SizedBox(height: 16),
              FilledButton(
                onPressed: _selectedTopics.isNotEmpty
                    ? widget.onContinue
                    : null,
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                ),
                child: Text('Continue (${_selectedTopics.length} selected)'),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Preview-Safe Create Post Screen with Moderation Simulation
// ─────────────────────────────────────────────────────────────

/// Preview-safe post creation with simulated Hive AI moderation
class _PreviewCreatePost extends ConsumerStatefulWidget {
  const _PreviewCreatePost();

  @override
  ConsumerState<_PreviewCreatePost> createState() => _PreviewCreatePostState();
}

class _PreviewCreatePostState extends ConsumerState<_PreviewCreatePost> {
  final _textController = TextEditingController();
  bool _isSubmitting = false;
  _ModerationResult? _moderationResult;

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  /// Simulate Hive AI moderation on the text
  Future<_ModerationResult> _simulateModeration(String text) async {
    // Simulate API latency
    await Future<void>.delayed(const Duration(milliseconds: 800));

    final lowerText = text.toLowerCase();
    final classifications = <_ModerationClass>[];

    // Simulate class detection based on keywords
    if (lowerText.contains('hate') || lowerText.contains('terrible')) {
      classifications.add(
        _ModerationClass('hate', 0.75, 'Potential hate speech detected'),
      );
    }
    if (lowerText.contains('kill') || lowerText.contains('attack')) {
      classifications.add(
        _ModerationClass('violence', 0.82, 'Violence-related content'),
      );
    }
    if (lowerText.contains('spam') ||
        lowerText.contains('buy now') ||
        lowerText.contains('click here')) {
      classifications.add(
        _ModerationClass('spam', 0.90, 'Spam patterns detected'),
      );
    }
    if (lowerText.contains('fake') || lowerText.contains('hoax')) {
      classifications.add(
        _ModerationClass('misinformation', 0.65, 'Potential misinformation'),
      );
    }
    if (RegExp(r'(.)\1{4,}').hasMatch(lowerText)) {
      classifications.add(
        _ModerationClass('gibberish', 0.70, 'Repetitive text pattern'),
      );
    }

    // Determine action based on highest score
    final blocked = classifications.any((c) => c.score >= 0.85);
    final warned = classifications.any(
      (c) => c.score >= 0.70 && c.score < 0.85,
    );

    return _ModerationResult(
      action: blocked ? 'BLOCK' : (warned ? 'WARN' : 'ALLOW'),
      classifications: classifications,
      processingTimeMs: 150 + (text.length ~/ 10),
    );
  }

  Future<void> _submitPost() async {
    final text = _textController.text.trim();
    if (text.isEmpty) return;

    setState(() {
      _isSubmitting = true;
      _moderationResult = null;
    });

    // Run simulated moderation
    final result = await _simulateModeration(text);

    setState(() {
      _moderationResult = result;
      _isSubmitting = false;
    });

    if (result.action == 'ALLOW') {
      // Add to mock posts
      ref
          .read(previewUserPostsProvider.notifier)
          .update(
            (posts) => [
              _MockUserPost(
                id: 'post_${DateTime.now().millisecondsSinceEpoch}',
                text: text,
                createdAt: DateTime.now(),
              ),
              ...posts,
            ],
          );

      _textController.clear();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Post created! (Preview mode)'),
            backgroundColor: Colors.green,
          ),
        );
        // Navigate back to feed
        ref.read(previewFlowProvider.notifier).state = PreviewFlow.homeFeed;
      }
    }
    // For WARN and BLOCK, the moderation result is already shown in UI
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textLength = _textController.text.length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Post'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () {
            ref.read(previewFlowProvider.notifier).state = PreviewFlow.homeFeed;
          },
        ),
        actions: [
          TextButton(
            onPressed: _isSubmitting || textLength == 0 ? null : _submitPost,
            child: _isSubmitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Post'),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Preview mode banner
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer.withValues(
                  alpha: 0.3,
                ),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: theme.colorScheme.primary.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.science,
                    size: 20,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Preview Mode - Simulating Hive AI moderation',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // User avatar row
            Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: theme.colorScheme.primaryContainer,
                  child: Text(
                    'Y',
                    style: TextStyle(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'You (Preview User)',
                      style: theme.textTheme.titleSmall,
                    ),
                    Text(
                      'Posting to Lythaus',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Text input
            TextField(
              controller: _textController,
              maxLines: 6,
              maxLength: 5000,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                hintText:
                    'What\'s on your mind?\n\nTry typing words like "hate", "spam", or "buy now" to see moderation in action!',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: theme.colorScheme.surfaceContainerHighest.withValues(
                  alpha: 0.5,
                ),
              ),
            ),

            // Moderation result display
            if (_moderationResult != null) ...[
              const SizedBox(height: 16),
              _buildModerationResult(theme),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildModerationResult(ThemeData theme) {
    final result = _moderationResult!;
    final isBlocked = result.action == 'BLOCK';
    final isWarned = result.action == 'WARN';

    final color = isBlocked
        ? Colors.red
        : (isWarned ? Colors.orange : Colors.green);
    final icon = isBlocked
        ? Icons.block
        : (isWarned ? Icons.warning : Icons.check_circle);
    final title = isBlocked
        ? 'Content Blocked'
        : (isWarned ? 'Review Suggested' : 'Content Approved');

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color),
              const SizedBox(width: 8),
              Text(
                title,
                style: theme.textTheme.titleMedium?.copyWith(
                  color: color,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              Text(
                '${result.processingTimeMs}ms',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),

          if (result.classifications.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              'Detected Classifications:',
              style: theme.textTheme.labelMedium,
            ),
            const SizedBox(height: 8),
            ...result.classifications.map(
              (c) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    Container(
                      width: 100,
                      height: 6,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(3),
                        color: theme.colorScheme.surfaceContainerHighest,
                      ),
                      child: FractionallySizedBox(
                        alignment: Alignment.centerLeft,
                        widthFactor: c.score,
                        child: Container(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(3),
                            color: c.score >= 0.85
                                ? Colors.red
                                : (c.score >= 0.7
                                      ? Colors.orange
                                      : Colors.green),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        '${c.name}: ${(c.score * 100).toInt()}%',
                        style: theme.textTheme.bodySmall,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],

          if (isBlocked || isWarned) ...[
            const SizedBox(height: 12),
            Text(
              isBlocked
                  ? 'This content violates community guidelines and cannot be posted.'
                  : 'This content may violate guidelines. Please review before posting.',
              style: theme.textTheme.bodySmall?.copyWith(color: color),
            ),
            if (isWarned) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  OutlinedButton(
                    onPressed: () {
                      setState(() => _moderationResult = null);
                    },
                    child: const Text('Edit'),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: () {
                      // Allow posting with warning
                      ref
                          .read(previewUserPostsProvider.notifier)
                          .update(
                            (posts) => [
                              _MockUserPost(
                                id: 'post_${DateTime.now().millisecondsSinceEpoch}',
                                text: _textController.text.trim(),
                                createdAt: DateTime.now(),
                                wasModerated: true,
                                moderationReason:
                                    result.classifications.first.reason,
                              ),
                              ...posts,
                            ],
                          );
                      _textController.clear();
                      setState(() => _moderationResult = null);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Posted with moderation flag'),
                        ),
                      );
                      ref.read(previewFlowProvider.notifier).state =
                          PreviewFlow.homeFeed;
                    },
                    child: const Text('Post Anyway'),
                  ),
                ],
              ),
            ],
          ],
        ],
      ),
    );
  }
}

class _ModerationResult {
  final String action;
  final List<_ModerationClass> classifications;
  final int processingTimeMs;

  _ModerationResult({
    required this.action,
    required this.classifications,
    required this.processingTimeMs,
  });
}

class _ModerationClass {
  final String name;
  final double score;
  final String reason;

  _ModerationClass(this.name, this.score, this.reason);
}

// ─────────────────────────────────────────────────────────────
// Preview-Safe Profile & Settings
// ─────────────────────────────────────────────────────────────

/// Preview-safe profile screen
class _PreviewProfile extends ConsumerWidget {
  const _PreviewProfile();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final userPosts = ref.watch(previewUserPostsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () {
              ref.read(previewFlowProvider.notifier).state =
                  PreviewFlow.settings;
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Profile header
          Row(
            children: [
              CircleAvatar(
                radius: 40,
                backgroundColor: theme.colorScheme.primaryContainer,
                child: Text(
                  'Y',
                  style: TextStyle(
                    fontSize: 32,
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Preview User',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      '@preview_user',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.secondaryContainer,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        'Newcomer',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: theme.colorScheme.onSecondaryContainer,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Stats row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _StatItem(value: '${userPosts.length}', label: 'Posts'),
              const _StatItem(value: '0', label: 'Followers'),
              const _StatItem(value: '0', label: 'Following'),
              const _StatItem(value: '100', label: 'Rep Score'),
            ],
          ),

          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 16),

          // User's posts
          Text(
            'Your Posts',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),

          if (userPosts.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest.withValues(
                  alpha: 0.5,
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Icon(
                    Icons.post_add,
                    size: 48,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'No posts yet',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 12),
                  FilledButton.icon(
                    onPressed: () {
                      ref.read(previewFlowProvider.notifier).state =
                          PreviewFlow.createPost;
                    },
                    icon: const Icon(Icons.add),
                    label: const Text('Create your first post'),
                  ),
                ],
              ),
            )
          else
            ...userPosts.map(
              (post) => Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            _formatTime(post.createdAt),
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                          if (post.wasModerated) ...[
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.orange.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                'Reviewed',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: Colors.orange,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(post.text),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          ref.read(previewFlowProvider.notifier).state = PreviewFlow.createPost;
        },
        child: const Icon(Icons.add),
      ),
    );
  }

  String _formatTime(DateTime time) {
    final diff = DateTime.now().difference(time);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}

class _StatItem extends StatelessWidget {
  final String value;
  final String label;

  const _StatItem({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

/// Preview-safe settings screen
class _PreviewSettings extends ConsumerWidget {
  const _PreviewSettings();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            ref.read(previewFlowProvider.notifier).state = PreviewFlow.profile;
          },
        ),
      ),
      body: ListView(
        children: [
          const _SettingsSection(title: 'Account'),
          ListTile(
            leading: const Icon(Icons.person_outline),
            title: const Text('Edit Profile'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.lock_outline),
            title: const Text('Privacy'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {},
          ),

          const _SettingsSection(title: 'Preferences'),
          SwitchListTile(
            secondary: const Icon(Icons.dark_mode_outlined),
            title: const Text('Dark Mode'),
            value: Theme.of(context).brightness == Brightness.dark,
            onChanged: (_) {},
          ),
          SwitchListTile(
            secondary: const Icon(Icons.notifications_outlined),
            title: const Text('Push Notifications'),
            value: true,
            onChanged: (_) {},
          ),

          const _SettingsSection(title: 'About'),
          const ListTile(
            leading: Icon(Icons.info_outline),
            title: Text('Version'),
            trailing: Text('1.0.0 (Preview)'),
          ),
        ],
      ),
    );
  }
}

class _SettingsSection extends StatelessWidget {
  final String title;

  const _SettingsSection({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
      child: Text(
        title,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
          color: Theme.of(context).colorScheme.primary,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// LIVE MODE SCREENS - Real API calls with test data marking
// ─────────────────────────────────────────────────────────────

/// Live mode banner widget
class _LiveModeBanner extends StatelessWidget {
  const _LiveModeBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.red.withValues(alpha: 0.1),
        border: Border(
          bottom: BorderSide(color: Colors.red.withValues(alpha: 0.3)),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
              color: Colors.red,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            'LIVE TEST MODE',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: Colors.red,
              fontWeight: FontWeight.bold,
              letterSpacing: 1,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '• Real APIs • Real Moderation',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: Colors.red.withValues(alpha: 0.7),
            ),
          ),
        ],
      ),
    );
  }
}

/// Live Home Feed - Uses real FeedScreen with live mode indicator
class _LiveHomeFeed extends ConsumerWidget {
  const _LiveHomeFeed();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: const Column(
        children: [
          // Live mode banner
          SafeArea(child: _LiveModeBanner()),

          // Real feed screen (without its own app bar)
          Expanded(child: FeedScreen(key: Key('live_feed'))),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          ref.read(previewFlowProvider.notifier).state = PreviewFlow.createPost;
        },
        backgroundColor: Colors.red,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }
}

/// Live Create Post - Uses real CreatePostModal with live mode indicator
class _LiveCreatePost extends ConsumerWidget {
  const _LiveCreatePost();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionId = ref.watch(testSessionIdProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Post'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () {
            ref.read(previewFlowProvider.notifier).state = PreviewFlow.homeFeed;
          },
        ),
        backgroundColor: Colors.red.withValues(alpha: 0.1),
      ),
      body: Column(
        children: [
          // Live mode banner with session info
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.red.withValues(alpha: 0.1),
              border: Border(
                bottom: BorderSide(color: Colors.red.withValues(alpha: 0.3)),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'LIVE TEST MODE',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: Colors.red,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '• Real Hive AI moderation • Posts marked as test data',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.red.withValues(alpha: 0.7),
                  ),
                ),
                if (sessionId != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    'Session: $sessionId',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.red.withValues(alpha: 0.5),
                      fontSize: 10,
                    ),
                  ),
                ],
              ],
            ),
          ),

          // Real create post modal
          const Expanded(
            child: SingleChildScrollView(
              child: CreatePostModal(canMarkNews: false),
            ),
          ),
        ],
      ),
    );
  }
}

/// Live Profile - Uses real ProfileScreen
class _LiveProfile extends ConsumerWidget {
  const _LiveProfile();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return const Scaffold(
      body: Column(
        children: [
          // Live mode banner
          SafeArea(child: _LiveModeBanner()),

          // Real profile screen
          Expanded(child: ProfileScreen()),
        ],
      ),
    );
  }
}

/// Live Settings - Uses real SettingsScreen
class _LiveSettings extends ConsumerWidget {
  const _LiveSettings();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return const Scaffold(
      body: Column(
        children: [
          // Live mode banner
          SafeArea(child: _LiveModeBanner()),

          // Real settings screen
          Expanded(child: SettingsScreen()),
        ],
      ),
    );
  }
}
