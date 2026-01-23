// ignore_for_file: public_member_api_docs

/// ASORA CREATE POST SCREEN
///
/// 🎯 Purpose: UI for creating new posts
/// 🏗️ Architecture: Presentation layer - handles user interaction
/// 🔐 Requires authentication to submit
/// 📱 Platform: Flutter Material Design 3
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:asora/core/security/device_integrity_guard.dart';
import 'package:asora/features/feed/application/post_creation_providers.dart';
import 'package:asora/features/feed/domain/post_repository.dart';
import 'package:asora/core/analytics/analytics_events.dart';
import 'package:asora/core/analytics/analytics_providers.dart';
import 'package:asora/features/auth/application/auth_providers.dart';

/// Screen for creating a new post
class CreatePostScreen extends ConsumerStatefulWidget {
  const CreatePostScreen({super.key});

  @override
  ConsumerState<CreatePostScreen> createState() => _CreatePostScreenState();
}

class _CreatePostScreenState extends ConsumerState<CreatePostScreen> {
  static const String _policyReminderMessage =
      'AI-generated content is blocked at publish time.\n'
      "If content is blocked, you'll see a neutral notice.\n"
      'You can appeal decisions. Appeals are reviewed by the community and moderators.\n'
      'This is an invite-only beta focused on authentic human content.';

  final _textController = TextEditingController();
  final _focusNode = FocusNode();
  bool _policyReminderShown = false;
  final GlobalKey<TooltipState> _policyTooltipKey = GlobalKey<TooltipState>();

  @override
  void initState() {
    super.initState();
    // Request focus when screen opens
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _textController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(postCreationProvider);
    final canCreate = ref.watch(canCreatePostProvider);
    final theme = Theme.of(context);

    // Listen for successful post creation
    ref.listen<PostCreationState>(postCreationProvider, (previous, next) {
      if (next.isSuccess && previous?.isSuccess != true) {
        _onPostCreated(context, next.successResult!);
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Create Post',
          style: GoogleFonts.sora(fontWeight: FontWeight.w600),
        ),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => _handleClose(context),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Tooltip(
              key: _policyTooltipKey,
              message: _policyReminderMessage,
              triggerMode: TooltipTriggerMode.manual,
              showDuration: const Duration(seconds: 6),
              child: FilledButton(
                onPressed: state.isSubmitting || !state.isValid || !canCreate
                    ? null
                    : _handleSubmit,
                child: state.isSubmitting
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Text('Post', style: GoogleFonts.sora()),
              ),
            ),
          ),
        ],
      ),
      body: GestureDetector(
        onTap: () => _focusNode.requestFocus(),
        child: Column(
          children: [
            // Error banner
            if (state.isBlocked)
              _ContentBlockedBanner(result: state.blockedResult!),
            if (state.isLimitExceeded)
              _LimitExceededBanner(result: state.limitExceededResult!),
            if (state.hasError) _ErrorBanner(result: state.errorResult!),

            // Main content
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Auth required message
                    if (!canCreate) _AuthRequiredCard(theme: theme),

                    // Text input
                    Expanded(
                      child: TextField(
                        controller: _textController,
                        focusNode: _focusNode,
                        maxLines: null,
                        expands: true,
                        textAlignVertical: TextAlignVertical.top,
                        enabled: canCreate && !state.isSubmitting,
                        style: GoogleFonts.sora(fontSize: 16),
                        decoration: InputDecoration(
                          hintText: "What's on your mind?",
                          hintStyle: GoogleFonts.sora(color: theme.hintColor),
                          border: InputBorder.none,
                          errorText: state.validationError,
                          counterText:
                              '${state.text.length}/$postTextMaxLength',
                        ),
                        onChanged: (value) {
                          ref
                              .read(postCreationProvider.notifier)
                              .updateText(value);
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Bottom toolbar
            SafeArea(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  border: Border(
                    top: BorderSide(color: theme.dividerColor, width: 1),
                  ),
                ),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.image_outlined),
                      onPressed: canCreate && !state.isSubmitting
                          ? _handleAddMedia
                          : null,
                      tooltip: 'Add media',
                    ),
                    const Spacer(),
                    Text(
                      '${postTextMaxLength - state.text.length} characters remaining',
                      style: GoogleFonts.sora(
                        fontSize: 12,
                        color: state.text.length > postTextMaxLength * 0.9
                            ? theme.colorScheme.error
                            : theme.hintColor,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _handleSubmit() async {
    if (!_policyReminderShown) {
      _policyReminderShown = true;
      _policyTooltipKey.currentState?.ensureTooltipVisible();
    }

    await runWithDeviceGuard(
      context,
      ref,
      IntegrityUseCase.postContent,
      () async {
        final success = await ref.read(postCreationProvider.notifier).submit();
        if (!success && mounted) {
          // Error is shown via the banner
        }
      },
    );
  }

  void _handleClose(BuildContext context) {
    final state = ref.read(postCreationProvider);
    if (state.text.isNotEmpty && !state.isSuccess) {
      _showDiscardDialog(context);
    } else {
      ref.read(postCreationProvider.notifier).reset();
      Navigator.of(context).pop();
    }
  }

  void _showDiscardDialog(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Discard post?', style: GoogleFonts.sora()),
        content: Text(
          'Your post will be lost if you close this screen.',
          style: GoogleFonts.sora(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text('Keep editing', style: GoogleFonts.sora()),
          ),
          FilledButton(
            onPressed: () {
              ref.read(postCreationProvider.notifier).reset();
              Navigator.of(context).pop();
              Navigator.of(context).pop();
            },
            child: Text('Discard', style: GoogleFonts.sora()),
          ),
        ],
      ),
    );
  }

  void _handleAddMedia() {
    // TODO: Implement media picker
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Media upload coming soon')));
  }

  void _onPostCreated(BuildContext context, CreatePostSuccess result) {
    final user = ref.read(currentUserProvider);
    if (user != null) {
      ref
          .read(analyticsEventTrackerProvider)
          .logEventOnce(
            ref.read(analyticsClientProvider),
            AnalyticsEvents.firstPost,
            userId: user.id,
          );
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Post created successfully!', style: GoogleFonts.sora()),
        backgroundColor: Colors.green,
        behavior: SnackBarBehavior.floating,
      ),
    );

    // Reset and close
    ref.read(postCreationProvider.notifier).reset();
    Navigator.of(context).pop(result.post);
  }
}

/// Banner shown when content is blocked by moderation
class _ContentBlockedBanner extends StatelessWidget {
  final CreatePostBlocked result;

  const _ContentBlockedBanner({required this.result});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      color: theme.colorScheme.error.withValues(alpha: 0.1),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.block, color: theme.colorScheme.error, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Content Blocked',
                  style: GoogleFonts.sora(
                    fontWeight: FontWeight.w600,
                    color: theme.colorScheme.error,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(result.message, style: GoogleFonts.sora(fontSize: 14)),
          if (result.categories.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: result.categories.map((category) {
                return Chip(
                  label: Text(category, style: GoogleFonts.sora(fontSize: 12)),
                  visualDensity: VisualDensity.compact,
                  backgroundColor: theme.colorScheme.error.withValues(
                    alpha: 0.2,
                  ),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }
}

/// Banner shown when daily post limit is exceeded
class _LimitExceededBanner extends StatelessWidget {
  final CreatePostLimitExceeded result;

  const _LimitExceededBanner({required this.result});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hours = result.retryAfter.inHours;
    final minutes = result.retryAfter.inMinutes % 60;

    String retryText;
    if (hours > 0) {
      retryText = 'Try again in ${hours}h ${minutes}m';
    } else {
      retryText = 'Try again in ${minutes}m';
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      color: theme.colorScheme.secondary.withValues(alpha: 0.1),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.timer_outlined,
                color: theme.colorScheme.secondary,
                size: 20,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Daily Limit Reached',
                  style: GoogleFonts.sora(
                    fontWeight: FontWeight.w600,
                    color: theme.colorScheme.secondary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'You\'ve reached your daily limit of ${result.limit} posts '
            '(${result.tier} tier). $retryText.',
            style: GoogleFonts.sora(fontSize: 14),
          ),
        ],
      ),
    );
  }
}

/// Banner shown for generic errors
class _ErrorBanner extends StatelessWidget {
  final CreatePostError result;

  const _ErrorBanner({required this.result});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      color: theme.colorScheme.error.withValues(alpha: 0.1),
      child: Row(
        children: [
          Icon(Icons.error_outline, color: theme.colorScheme.error, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              result.message,
              style: GoogleFonts.sora(
                fontSize: 14,
                color: theme.colorScheme.error,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Card shown when user is not authenticated
class _AuthRequiredCard extends StatelessWidget {
  final ThemeData theme;

  const _AuthRequiredCard({required this.theme});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(Icons.lock_outline, color: theme.colorScheme.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Please sign in to create a post.',
                style: GoogleFonts.sora(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Floating action button for creating posts
class CreatePostFAB extends ConsumerWidget {
  const CreatePostFAB({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final canCreate = ref.watch(canCreatePostProvider);

    return FloatingActionButton.extended(
      onPressed: () => _openCreatePost(context, canCreate),
      icon: const Icon(Icons.edit),
      label: Text('Post', style: GoogleFonts.sora()),
      tooltip: canCreate ? 'Create a new post' : 'Sign in to create a post',
    );
  }

  void _openCreatePost(BuildContext context, bool canCreate) {
    if (!canCreate) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Please sign in to create a post',
            style: GoogleFonts.sora(),
          ),
        ),
      );
      return;
    }

    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (context) => const CreatePostScreen(),
        fullscreenDialog: true,
      ),
    );
  }
}
