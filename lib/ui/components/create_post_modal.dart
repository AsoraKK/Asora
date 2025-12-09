import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/feed/application/post_creation_providers.dart';
import '../../features/feed/domain/post_repository.dart';
import '../../state/models/feed_models.dart';
import '../theme/spacing.dart';

class CreatePostModal extends ConsumerStatefulWidget {
  const CreatePostModal({super.key, this.canMarkNews = true});

  final bool canMarkNews;

  @override
  ConsumerState<CreatePostModal> createState() => _CreatePostModalState();
}

class _CreatePostModalState extends ConsumerState<CreatePostModal> {
  ContentType selectedType = ContentType.text;
  bool isNews = false;
  late final TextEditingController controller;
  late final TextEditingController mediaController;

  @override
  void initState() {
    super.initState();
    final state = ref.read(postCreationProvider);
    controller = TextEditingController(text: state.text);
    mediaController = TextEditingController(text: state.mediaUrl);
    isNews = state.isNews;
    selectedType = _typeFromString(state.contentType);
  }

  @override
  void dispose() {
    controller.dispose();
    mediaController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    final notifier = ref.read(postCreationProvider.notifier);
    notifier.updateText(controller.text);
    notifier.setIsNews(isNews);
    notifier.setContentType(selectedType.name);

    final success = await notifier.submit();
    if (!mounted) return;
    final state = ref.read(postCreationProvider);

    if (state.isBlocked && state.blockedResult != null) {
      _showAiScan(state.blockedResult!);
      return;
    }

    if (state.isLimitExceeded && state.limitExceededResult != null) {
      _showLimitSheet(state.limitExceededResult!);
      return;
    }

    if (success) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Posted to Asora')));
      notifier.reset();
      Navigator.of(context).maybePop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(postCreationProvider);
    final canCreate = ref.watch(canCreatePostProvider);
    final notifier = ref.read(postCreationProvider.notifier);

    return Padding(
      padding: const EdgeInsets.all(Spacing.md),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Create',
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: Spacing.md),
          Wrap(
            spacing: Spacing.xs,
            children: ContentType.values
                .where((type) => type != ContentType.mixed)
                .map((type) {
                  final selected = selectedType == type;
                  return ChoiceChip(
                    label: Text(_label(type)),
                    selected: selected,
                    onSelected: (_) {
                      setState(() => selectedType = type);
                      notifier.setContentType(type.name);
                    },
                  );
                })
                .toList(),
          ),
          const SizedBox(height: Spacing.md),
          TextField(
            controller: controller,
            onChanged: notifier.updateText,
            maxLines: 4,
            decoration: InputDecoration(
              hintText: 'Share an update...',
              border: const OutlineInputBorder(),
              errorText: state.validationError,
            ),
          ),
          const SizedBox(height: Spacing.md),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: _openMediaPicker,
              icon: const Icon(Icons.attach_file_outlined),
              label: const Text('Add media'),
            ),
          ),
          const SizedBox(height: Spacing.xs),
          if (state.mediaUrl != null)
            Wrap(
              spacing: Spacing.xs,
              runSpacing: Spacing.xs,
              children: [
                InputChip(
                  label: Text(state.mediaUrl!),
                  onDeleted: () => notifier.updateMediaUrl(null),
                ),
              ],
            ),
          if (widget.canMarkNews) ...[
            const SizedBox(height: Spacing.sm),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('This is News'),
              subtitle: const Text(
                'Only contributors and journalists can mark as news',
              ),
              value: isNews,
              onChanged: (value) {
                setState(() => isNews = value);
                notifier.setIsNews(value);
              },
            ),
          ],
          if (state.hasError && state.errorResult != null)
            Padding(
              padding: const EdgeInsets.only(top: Spacing.sm),
              child: Text(
                state.errorResult!.message,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          const SizedBox(height: Spacing.md),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: state.isSubmitting
                      ? null
                      : () => Navigator.of(context).maybePop(),
                  child: const Text('Cancel'),
                ),
              ),
              const SizedBox(width: Spacing.sm),
              Expanded(
                child: FilledButton(
                  onPressed: state.isSubmitting || !canCreate
                      ? null
                      : _handleSubmit,
                  child: state.isSubmitting
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(canCreate ? 'Post' : 'Sign in first'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showAiScan(CreatePostBlocked blocked) {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (_) => Padding(
        padding: const EdgeInsets.all(Spacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'AI Scan',
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: Spacing.sm),
            Text(blocked.message),
            const SizedBox(height: Spacing.sm),
            Wrap(
              spacing: Spacing.xs,
              children: blocked.categories
                  .map((c) => Chip(label: Text(c)))
                  .toList(),
            ),
            const SizedBox(height: Spacing.md),
            FilledButton(
              onPressed: () => Navigator.of(context).maybePop(),
              child: const Text('Close'),
            ),
          ],
        ),
      ),
    );
  }

  void _showLimitSheet(CreatePostLimitExceeded limit) {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (_) => Padding(
        padding: const EdgeInsets.all(Spacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Post limit reached',
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: Spacing.sm),
            Text(limit.message),
            const SizedBox(height: Spacing.sm),
            Text('Tier: ${limit.tier} • Limit: ${limit.limit}'),
            Text('Retry after: ${limit.retryAfter.inMinutes} minutes'),
            const SizedBox(height: Spacing.md),
            FilledButton(
              onPressed: () => Navigator.of(context).maybePop(),
              child: const Text('Got it'),
            ),
          ],
        ),
      ),
    );
  }

  void _openMediaPicker() {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (_) => Padding(
        padding: const EdgeInsets.all(Spacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Add media',
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: Spacing.sm),
            TextField(
              controller: mediaController,
              decoration: const InputDecoration(
                labelText: 'Media URL',
                helperText:
                    'Paste an image/video URL. Native picker hooks in later.',
              ),
            ),
            const SizedBox(height: Spacing.md),
            FilledButton(
              onPressed: () {
                ref
                    .read(postCreationProvider.notifier)
                    .updateMediaUrl(mediaController.text.trim());
                Navigator.of(context).maybePop();
              },
              child: const Text('Attach'),
            ),
          ],
        ),
      ),
    );
  }

  String _label(ContentType type) {
    return switch (type) {
      ContentType.text => 'Text',
      ContentType.image => 'Image',
      ContentType.video => 'Video',
      ContentType.mixed => 'Mixed',
    };
  }

  ContentType _typeFromString(String value) {
    return ContentType.values.firstWhere(
      (type) => type.name == value,
      orElse: () => ContentType.text,
    );
  }
}
