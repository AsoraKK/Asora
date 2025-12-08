import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../state/models/feed_models.dart';
import '../screens/create/ai_scan_screen.dart';
import '../theme/spacing.dart';

class CreatePostModal extends ConsumerStatefulWidget {
  const CreatePostModal({super.key, this.canMarkNews = true, this.onSubmit});

  final bool canMarkNews;
  final void Function(ContentType type, String text, bool isNews)? onSubmit;

  @override
  ConsumerState<CreatePostModal> createState() => _CreatePostModalState();
}

class _CreatePostModalState extends ConsumerState<CreatePostModal> {
  ContentType selectedType = ContentType.text;
  bool isNews = false;
  bool _showingAiScan = false;
  final controller = TextEditingController();

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  void _submitPost() {
    if (controller.text.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Please write something')));
      return;
    }

    // Show AI scan screen
    setState(() => _showingAiScan = true);
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => Dialog(
        child: AiScanScreen(
          content: controller.text,
          onApprove: () {
            Navigator.of(context).maybePop(); // Close dialog
            widget.onSubmit?.call(selectedType, controller.text, isNews);
            Navigator.of(context).maybePop(); // Close modal
          },
          onCancel: () {
            Navigator.of(context).maybePop(); // Close dialog
            setState(() => _showingAiScan = false);
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
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
                    onSelected: (_) => setState(() => selectedType = type),
                  );
                })
                .toList(),
          ),
          const SizedBox(height: Spacing.md),
          TextField(
            controller: controller,
            maxLines: 4,
            decoration: const InputDecoration(
              hintText: 'Share an update...',
              border: OutlineInputBorder(),
            ),
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
              onChanged: (value) => setState(() => isNews = value),
            ),
          ],
          const SizedBox(height: Spacing.md),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.of(context).maybePop(),
                  child: const Text('Cancel'),
                ),
              ),
              const SizedBox(width: Spacing.sm),
              Expanded(
                child: FilledButton(
                  onPressed: _showingAiScan ? null : _submitPost,
                  child: Text(_showingAiScan ? 'Scanning...' : 'Post'),
                ),
              ),
            ],
          ),
        ],
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
}
