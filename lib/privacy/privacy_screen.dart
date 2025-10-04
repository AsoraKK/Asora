import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../features/auth/application/auth_providers.dart';
import '../features/auth/presentation/auth_gate.dart';
import '../privacy/privacy_repository.dart';
import '../services/privacy_service.dart';
import 'save_file.dart';
import '../core/logging/app_logger.dart';

class PrivacyScreen extends ConsumerStatefulWidget {
  const PrivacyScreen({super.key});

  @override
  ConsumerState<PrivacyScreen> createState() => _PrivacyScreenState();
}

class _PrivacyScreenState extends ConsumerState<PrivacyScreen> {
  bool _loading = false;

  Future<void> _handleExport() async {
    setState(() => _loading = true);
    final repo = ref.read(privacyRepositoryProvider);
    final logger = ref.read(appLoggerProvider);

    try {
      final res = await repo.exportUserData();
      if (res.result == PrivacyOperationResult.success && res.data != null) {
        final jsonString = const JsonEncoder.withIndent('  ').convert(res.data);
        final filename =
            'asora-data-export-${DateTime.now().toIso8601String().split('T').first}.json';
        final saver = ref.read(saveFileProvider);
        final saved = await saver.saveAndShareJson(
          filename,
          jsonString,
          share: false,
        );
        logger.info('Export saved at ${saved.path}');
        if (mounted) {
          showDialog(
            context: context,
            builder: (c) => AlertDialog(
              title: const Text('Export ready'),
              content: Text('Saved to: ${saved.path}'),
              actions: [
                FilledButton(
                  onPressed: () => Navigator.pop(c),
                  child: const Text('OK'),
                ),
              ],
            ),
          );
        }
      } else if (res.result == PrivacyOperationResult.rateLimited) {
        _showMessage('Export rate limited', res.errorMessage ?? 'Try later');
      } else if (res.result == PrivacyOperationResult.unauthorized) {
        _showMessage(
          'Authentication required',
          res.errorMessage ?? 'Please sign in',
        );
      } else {
        _showMessage('Export failed', res.errorMessage ?? 'Unexpected error');
      }
    } catch (e) {
      logger.error('Export failed', e);
      _showMessage('Export failed', e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _handleDelete() async {
    final confirmed =
        await showDialog<bool>(
          context: context,
          builder: (c) => AlertDialog(
            title: const Text('Delete account?'),
            content: const Text('This cannot be undone. Are you sure?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(c, false),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(c, true),
                child: const Text('Delete'),
              ),
            ],
          ),
        ) ??
        false;

    if (!confirmed) return;

    setState(() => _loading = true);
    final repo = ref.read(privacyRepositoryProvider);
    final logger = ref.read(appLoggerProvider);

    try {
      final res = await repo.deleteAccount();
      if (res.result == PrivacyOperationResult.success) {
        logger.info('Account deletion succeeded; clearing local session');

        final authService = ref.read(enhancedAuthServiceProvider);

        try {
          await authService.signOut();
        } catch (error, stackTrace) {
          logger.warning('Sign-out after deletion failed', error, stackTrace);
        }

        ref.invalidate(authStateProvider);
        ref.invalidate(jwtProvider);
        ref.invalidate(tokenVersionProvider);

        if (mounted) {
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (_) => const AuthGate()),
            (_) => false,
          );
        }
      } else {
        _showMessage('Deletion failed', res.errorMessage ?? 'Unexpected error');
      }
    } catch (e) {
      logger.error('Deletion failed', e);
      _showMessage('Deletion failed', e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showMessage(String title, String message) {
    if (!mounted) return;
    showDialog(
      context: context,
      builder: (c) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          FilledButton(
            onPressed: () => Navigator.pop(c),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Privacy')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            ElevatedButton.icon(
              onPressed: _loading ? null : _handleExport,
              icon: const Icon(Icons.download_outlined),
              label: Text(_loading ? 'Working...' : 'Download my data (JSON)'),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _loading ? null : _handleDelete,
              icon: const Icon(Icons.delete_forever_outlined),
              label: const Text('Delete my account'),
              style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
            ),
          ],
        ),
      ),
    );
  }
}
