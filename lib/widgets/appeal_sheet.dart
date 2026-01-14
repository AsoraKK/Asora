// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asora/services/appeal_provider.dart';

class AppealSheet extends ConsumerStatefulWidget {
  final String postId;
  const AppealSheet({super.key, required this.postId});
  @override
  ConsumerState<AppealSheet> createState() => _AppealSheetState();
}

class _AppealSheetState extends ConsumerState<AppealSheet> {
  final _ctrl = TextEditingController();
  bool _loading = false;
  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 16,
        right: 16,
        top: 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'Appeal decision',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _ctrl,
            maxLines: 5,
            decoration: const InputDecoration(
              hintText: 'Explain why this was a mistake',
            ),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _loading
                ? null
                : () async {
                    setState(() => _loading = true);
                    final ok = await ref
                        .read(appealProvider)
                        .submit(widget.postId, _ctrl.text);
                    setState(() => _loading = false);
                    if (!context.mounted) return;
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          ok ? 'Appeal submitted' : 'Failed to submit appeal',
                        ),
                      ),
                    );
                  },
            child: Text(_loading ? 'Submitting...' : 'Submit'),
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }
}
