// ASORA PRIVACY SETTINGS SCREEN
//
// 🎯 Purpose: User privacy controls and GDPR/POPIA compliance UI
// 🔐 Security: Data export/deletion with confirmation flows
// 📱 UX: Clean Material Design with clear privacy actions
// 📊 Telemetry: Privacy action tracking and user education

import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import '../services/privacy_service.dart';
import '../core/logging/app_logger.dart';

class PrivacySettingsScreen extends ConsumerStatefulWidget {
  const PrivacySettingsScreen({super.key});

  @override
  ConsumerState<PrivacySettingsScreen> createState() =>
      _PrivacySettingsScreenState();
}

class _PrivacySettingsScreenState extends ConsumerState<PrivacySettingsScreen> {
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Privacy Settings'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeaderSection(),
            const SizedBox(height: 24),
            _buildDataExportSection(),
            const SizedBox(height: 24),
            _buildAccountDeletionSection(),
            const SizedBox(height: 24),
            _buildPrivacyPolicySection(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.privacy_tip_outlined,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 12),
                Text(
                  'Your Privacy Rights',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              'Asora respects your privacy. You have the right to access, export, and delete your personal data in accordance with GDPR and POPIA regulations.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDataExportSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.download_outlined,
                  color: Theme.of(context).colorScheme.secondary,
                ),
                const SizedBox(width: 12),
                Text(
                  'Export Your Data',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              'Download a copy of all your data including posts, comments, likes, and profile information. This may take a few minutes to prepare.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isLoading ? null : _handleDataExport,
                icon: _isLoading
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.file_download),
                label: Text(
                  _isLoading ? 'Preparing Export...' : 'Export My Data',
                ),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.all(16),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Note: You can request an export once every 24 hours.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAccountDeletionSection() {
    return Card(
      color: Theme.of(context).colorScheme.errorContainer,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.delete_forever_outlined,
                  color: Theme.of(context).colorScheme.error,
                ),
                const SizedBox(width: 12),
                Text(
                  'Delete Your Account',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: Theme.of(context).colorScheme.onErrorContainer,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              'Permanently delete your account and all associated data. This action cannot be undone. Your posts and comments will be marked as deleted but may remain visible for thread context.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onErrorContainer,
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _isLoading ? null : _handleAccountDeletion,
                icon: const Icon(Icons.warning_outlined),
                label: const Text('Delete My Account'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.all(16),
                  foregroundColor: Theme.of(context).colorScheme.error,
                  side: BorderSide(color: Theme.of(context).colorScheme.error),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPrivacyPolicySection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.policy_outlined,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 12),
                Text(
                  'Privacy Information',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ],
            ),
            const SizedBox(height: 12),
            ListTile(
              dense: true,
              leading: const Icon(Icons.description_outlined),
              title: const Text('Privacy Policy'),
              subtitle: const Text('How we collect and use your data'),
              trailing: const Icon(Icons.arrow_forward_ios, size: 16),
              onTap: () => _showInfoDialog(
                'Privacy Policy',
                'Asora collects minimal personal data necessary for platform functionality. We do not sell or share your data with third parties for marketing purposes.',
              ),
            ),
            ListTile(
              dense: true,
              leading: const Icon(Icons.security_outlined),
              title: const Text('Data Security'),
              subtitle: const Text('How we protect your information'),
              trailing: const Icon(Icons.arrow_forward_ios, size: 16),
              onTap: () => _showInfoDialog(
                'Data Security',
                'We use industry-standard encryption, certificate pinning, and secure cloud infrastructure to protect your data.',
              ),
            ),
            ListTile(
              dense: true,
              leading: const Icon(Icons.contact_support_outlined),
              title: const Text('Privacy Questions'),
              subtitle: const Text('Contact us about your privacy'),
              trailing: const Icon(Icons.arrow_forward_ios, size: 16),
              onTap: () => _showInfoDialog(
                'Contact Us',
                'For privacy-related questions, please contact us at privacy@asora.com. We respond to all privacy inquiries within 72 hours.',
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleDataExport() async {
    setState(() => _isLoading = true);

    final logger = ref.read(appLoggerProvider);
    final privacyService = ref.read(privacyServiceProvider);

    try {
      logger.info('User initiated data export');

      final result = await privacyService.exportUserData();

      switch (result.result) {
        case PrivacyOperationResult.success:
          await _saveAndShareExport(result.data!);
          _showSuccessDialog(
            'Data Export Complete',
            'Your data has been exported successfully. You can find the file in your downloads or share it using the options provided.',
          );
          break;

        case PrivacyOperationResult.rateLimited:
          _showErrorDialog(
            'Export Rate Limited',
            result.errorMessage ??
                'You can only export your data once every 24 hours. Please try again later.',
          );
          break;

        case PrivacyOperationResult.unauthorized:
          _showErrorDialog(
            'Authentication Required',
            'Please sign in to export your data.',
          );
          break;

        case PrivacyOperationResult.networkError:
          _showErrorDialog(
            'Network Error',
            result.errorMessage ??
                'Please check your internet connection and try again.',
          );
          break;

        default:
          _showErrorDialog(
            'Export Failed',
            result.errorMessage ??
                'An unexpected error occurred. Please try again.',
          );
      }
    } catch (e) {
      logger.error('Unexpected error during data export', e);
      _showErrorDialog(
        'Export Failed',
        'An unexpected error occurred. Please try again.',
      );
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _handleAccountDeletion() async {
    final confirmed = await _showDeleteConfirmationDialog();
    if (!confirmed) return;

    setState(() => _isLoading = true);

    final logger = ref.read(appLoggerProvider);
    final privacyService = ref.read(privacyServiceProvider);

    try {
      logger.info('User initiated account deletion');

      final result = await privacyService.deleteAccountAndSignOut(ref);

      switch (result.result) {
        case PrivacyOperationResult.success:
          _showSuccessDialog(
            'Account Deleted',
            'Your account has been deleted successfully. You have been signed out.',
          );
          // Navigate back to close the privacy screen after account deletion
          if (mounted) {
            Navigator.of(context).pop();
          }
          break;

        case PrivacyOperationResult.unauthorized:
          _showErrorDialog(
            'Authentication Required',
            'Please sign in to delete your account.',
          );
          break;

        case PrivacyOperationResult.networkError:
          _showErrorDialog(
            'Network Error',
            result.errorMessage ??
                'Please check your internet connection and try again.',
          );
          break;

        default:
          _showErrorDialog(
            'Deletion Failed',
            result.errorMessage ??
                'An unexpected error occurred. Please try again.',
          );
      }
    } catch (e) {
      logger.error('Unexpected error during account deletion', e);
      _showErrorDialog(
        'Deletion Failed',
        'An unexpected error occurred. Please try again.',
      );
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _saveAndShareExport(Map<String, dynamic> data) async {
    try {
      // Convert data to pretty-printed JSON
      final jsonString = const JsonEncoder.withIndent('  ').convert(data);

      // Generate filename with timestamp
      final timestamp = DateTime.now().toIso8601String().split('T')[0];
      final filename = 'asora-data-export-$timestamp.json';

      // Get app documents directory
      final directory = await getApplicationDocumentsDirectory();
      final file = File('${directory.path}/$filename');

      // Write the file
      await file.writeAsString(jsonString);

      // Share the file
      final result = await Share.shareXFiles(
        [XFile(file.path)],
        text: 'Your Asora data export from $timestamp',
        subject: 'Asora Data Export - $timestamp',
      );

      // Also copy to clipboard as backup
      await Clipboard.setData(ClipboardData(text: jsonString));

      // Show success message
      if (mounted && result.status == ShareResultStatus.success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Data export shared successfully! File saved as $filename',
            ),
            duration: const Duration(seconds: 3),
            action: SnackBarAction(
              label: 'OK',
              onPressed: () =>
                  ScaffoldMessenger.of(context).hideCurrentSnackBar(),
            ),
          ),
        );
      }
    } catch (e) {
      ref.read(appLoggerProvider).error('Failed to save/share export', e);

      // Fallback: try clipboard only
      try {
        final jsonString = const JsonEncoder.withIndent('  ').convert(data);
        await Clipboard.setData(ClipboardData(text: jsonString));

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Could not save file, but data copied to clipboard!',
              ),
              duration: Duration(seconds: 4),
            ),
          );
        }
      } catch (clipboardError) {
        _showErrorDialog(
          'Export Failed',
          'Could not export or copy the data. Please try again.',
        );
      }
    }
  }

  Future<bool> _showDeleteConfirmationDialog() async {
    return await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            icon: Icon(
              Icons.warning_amber_outlined,
              color: Theme.of(context).colorScheme.error,
              size: 32,
            ),
            title: const Text('Delete Account?'),
            content: const Text(
              'This action cannot be undone. Your account and all personal data will be permanently deleted.\n\n'
              'Your posts and comments may remain visible but will be marked as deleted.\n\n'
              'Are you absolutely sure you want to continue?',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Cancel'),
              ),
              FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.error,
                ),
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('Delete My Account'),
              ),
            ],
          ),
        ) ??
        false;
  }

  void _showSuccessDialog(String title, String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        icon: const Icon(
          Icons.check_circle_outlined,
          color: Colors.green,
          size: 32,
        ),
        title: Text(title),
        content: Text(message),
        actions: [
          FilledButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showErrorDialog(String title, String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        icon: Icon(
          Icons.error_outline,
          color: Theme.of(context).colorScheme.error,
          size: 32,
        ),
        title: Text(title),
        content: Text(message),
        actions: [
          FilledButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showInfoDialog(String title, String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}
