// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'package:asora/core/security/device_integrity_guard.dart';
import 'package:asora/core/utils/daily_limit_message.dart';
import 'package:asora/design_system/components/lyth_button.dart';
import 'package:asora/design_system/components/lyth_snackbar.dart';
import 'package:asora/design_system/components/lyth_text_field.dart';
import 'package:asora/design_system/theme/theme_build_context_x.dart';
import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/moderation/application/moderation_providers.dart';
import 'package:asora/features/moderation/domain/appeal.dart';
import 'package:asora/features/moderation/domain/moderation_repository.dart';

/// ASORA APPEAL DIALOG
///
/// 🎯 Purpose: Allow users to appeal flagged/hidden content
/// ✅ Features: Appeal type selection, detailed reasoning, progress tracking
/// 🔐 Security: JWT authentication and validation
/// 📱 UX: Multi-step form with clear instructions and feedback

class AppealDialog extends ConsumerStatefulWidget {
  final String contentId;
  final String contentType;
  final String? contentPreview;
  final ModerationStatus currentStatus;

  const AppealDialog({
    super.key,
    required this.contentId,
    required this.contentType,
    this.contentPreview,
    required this.currentStatus,
  });

  @override
  ConsumerState<AppealDialog> createState() => _AppealDialogState();
}

class _AppealDialogState extends ConsumerState<AppealDialog> {
  final _formKey = GlobalKey<FormState>();
  final _statementController = TextEditingController();

  String _appealType = 'false_positive';
  String _appealReason = '';
  bool _isSubmitting = false;

  @override
  void dispose() {
    _statementController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(context.radius.dialog),
      ),
      child: Container(
        width: MediaQuery.of(context).size.width * 0.9,
        constraints: const BoxConstraints(maxWidth: 500, maxHeight: 700),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              padding: EdgeInsets.all(spacing.lg),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(context.radius.dialog),
                  topRight: Radius.circular(context.radius.dialog),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.gavel,
                    color: Theme.of(context).colorScheme.onPrimaryContainer,
                  ),
                  SizedBox(width: spacing.md),
                  Expanded(
                    child: Text(
                      'Appeal Content Decision',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: Theme.of(context).colorScheme.onPrimaryContainer,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: Icon(
                      Icons.close,
                      color: Theme.of(context).colorScheme.onPrimaryContainer,
                    ),
                  ),
                ],
              ),
            ),

            // Content
            Expanded(
              child: SingleChildScrollView(
                padding: EdgeInsets.all(spacing.lg),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Current status info
                      _buildStatusInfo(),
                      SizedBox(height: spacing.lg),

                      // Content preview (if available)
                      if (widget.contentPreview != null) _buildContentPreview(),

                      // Appeal type selection
                      _buildAppealTypeSelection(),
                      SizedBox(height: spacing.lg),

                      // Appeal reason
                      _buildAppealReasonField(),
                      SizedBox(height: spacing.lg),

                      // User statement
                      _buildUserStatementField(),
                      SizedBox(height: spacing.lg),

                      // Appeal process info
                      _buildAppealProcessInfo(),
                    ],
                  ),
                ),
              ),
            ),

            // Actions
            Container(
              padding: EdgeInsets.all(spacing.lg),
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(color: Theme.of(context).dividerColor),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  LythButton.tertiary(
                    label: 'Cancel',
                    onPressed: _isSubmitting
                        ? null
                        : () => Navigator.pop(context),
                  ),
                  SizedBox(width: spacing.md),
                  LythButton.primary(
                    label: 'Submit Appeal',
                    onPressed: _isSubmitting ? null : _submitAppeal,
                    isLoading: _isSubmitting,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusInfo() {
    final scheme = Theme.of(context).colorScheme;
    final spacing = context.spacing;
    String statusText;
    Color statusColor;
    IconData statusIcon;

    switch (widget.currentStatus) {
      case ModerationStatus.flagged:
        statusText = 'This content has been flagged by the community';
        statusColor = scheme.primary;
        statusIcon = Icons.flag;
        break;
      case ModerationStatus.hidden:
        statusText = 'This content has been blocked by moderators';
        statusColor = scheme.error;
        statusIcon = Icons.visibility_off;
        break;
      case ModerationStatus.communityRejected:
        statusText = 'This content was rejected by community vote';
        statusColor = scheme.error;
        statusIcon = Icons.cancel;
        break;
      default:
        statusText = 'This content is blocked';
        statusColor = scheme.error;
        statusIcon = Icons.visibility_off;
    }

    return Container(
      padding: EdgeInsets.all(spacing.lg),
      decoration: BoxDecoration(
        color: statusColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(context.radius.md),
        border: Border.all(color: statusColor.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(statusIcon, color: statusColor),
          SizedBox(width: spacing.md),
          Expanded(
            child: Text(
              statusText,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: statusColor,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContentPreview() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Content Preview:', style: Theme.of(context).textTheme.titleSmall),
        SizedBox(height: context.spacing.sm),
        Container(
          width: double.infinity,
          padding: EdgeInsets.all(context.spacing.md),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(context.radius.md),
          ),
          child: Text(
            widget.contentPreview!,
            style: Theme.of(context).textTheme.bodyMedium,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        SizedBox(height: context.spacing.lg),
      ],
    );
  }

  Widget _buildAppealTypeSelection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Why are you appealing this decision?',
          style: Theme.of(context).textTheme.titleSmall,
        ),
        SizedBox(height: context.spacing.md),
        ...AppealType.values.map((type) {
          final isSelected = _appealType == type.value;
          return ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(
              isSelected
                  ? Icons.radio_button_checked
                  : Icons.radio_button_unchecked,
              color: isSelected
                  ? Theme.of(context).colorScheme.primary
                  : Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            title: Text(type.displayName),
            subtitle: Text(
              type.description,
              style: Theme.of(context).textTheme.bodySmall,
            ),
            onTap: () {
              setState(() {
                _appealType = type.value;
              });
            },
          );
        }),
      ],
    );
  }

  Widget _buildAppealReasonField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Appeal Reason', style: Theme.of(context).textTheme.titleSmall),
        SizedBox(height: context.spacing.sm),
        LythTextField(
          placeholder: 'Briefly explain the reason for your appeal...',
          maxLines: 2,
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return 'Please provide a reason for your appeal';
            }
            if (value.trim().length < 10) {
              return 'Appeal reason must be at least 10 characters';
            }
            return null;
          },
          onChanged: (value) {
            _appealReason = value;
          },
        ),
      ],
    );
  }

  Widget _buildUserStatementField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Detailed Statement',
          style: Theme.of(context).textTheme.titleSmall,
        ),
        SizedBox(height: context.spacing.sm),
        LythTextField(
          controller: _statementController,
          placeholder:
              'Provide a detailed explanation of why you believe this decision should be reversed...',
          maxLines: 5,
          maxLength: 1000,
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return 'Please provide a detailed statement';
            }
            if (value.trim().length < 50) {
              return 'Statement must be at least 50 characters';
            }
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildAppealProcessInfo() {
    return Container(
      padding: EdgeInsets.all(context.spacing.lg),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(context.radius.md),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.info_outline,
                size: 20,
                color: Theme.of(context).colorScheme.onSurface,
              ),
              SizedBox(width: context.spacing.sm),
              Text(
                'Appeal Process',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
            ],
          ),
          SizedBox(height: context.spacing.sm),
          Text(
            '1. Your appeal will be reviewed by moderators first\n'
            '2. If rejected, eligible community members can vote\n'
            '3. Community voting runs for 5 minutes\n'
            '4. The community outcome is applied unless overridden by admins\n'
            '5. You\'ll receive notifications about the decision',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _submitAppeal() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    // Guard: Block appeals on compromised devices
    await runWithDeviceGuard(context, ref, IntegrityUseCase.appeal, () async {
      await _doSubmitAppeal();
    });

    if (mounted) {
      setState(() {
        _isSubmitting = false;
      });
    }
  }

  Future<void> _doSubmitAppeal() async {
    try {
      final client = ref.read(moderationClientProvider);
      final token = await ref.read(jwtProvider.future);
      if (token == null || token.isEmpty) {
        throw const ModerationException('User not authenticated');
      }

      final result = await client.submitAppeal(
        contentId: widget.contentId,
        contentType: widget.contentType,
        appealType: _appealType,
        appealReason: _appealReason,
        userStatement: _statementController.text,
        token: token,
      );

      if (mounted) {
        Navigator.pop(context, true);
        LythSnackbar.success(
          context: context,
          message: 'Appeal submitted successfully - ID: ${result.appealId}',
          action: SnackBarAction(
            label: 'View Status',
            onPressed: () {
              // Navigate to appeal history
              // This will be implemented when we create the appeal history page
            },
          ),
        );
      }
    } catch (error) {
      if (mounted) {
        String errorMessage = 'Failed to submit appeal';
        if (error is DioException) {
          final data = error.response?.data;
          if (data is Map<String, dynamic> &&
              data['code'] == 'DAILY_APPEAL_LIMIT_EXCEEDED') {
            errorMessage = dailyLimitMessage(
              payload: data,
              actionLabel: 'appeals',
            );
          } else if (error.response?.statusCode == 401) {
            errorMessage = 'Please log in to submit an appeal';
          } else if (error.response?.statusCode == 409) {
            errorMessage =
                'You have already submitted an appeal for this content';
          } else if (data is Map<String, dynamic> && data['error'] != null) {
            errorMessage = data['error'] as String;
          }
        } else if (error is ModerationException) {
          final handled = await showDeviceIntegrityBlockedForCode(
            context,
            code: error.code,
          );
          if (handled) {
            return;
          }
          errorMessage = error.message;
        } else {
          errorMessage = error.toString();
        }

        LythSnackbar.error(context: context, message: errorMessage);
      }
    }
  }
}

/// Appeal types enum
enum AppealType {
  falsePositive(
    'false_positive',
    'False Positive',
    'The content was incorrectly flagged and doesn\'t violate guidelines',
  ),
  contextMissing(
    'context_missing',
    'Missing Context',
    'Important context was not considered in the moderation decision',
  ),
  other(
    'other',
    'Other Reason',
    'The decision was wrong for reasons not listed above',
  );

  const AppealType(this.value, this.displayName, this.description);

  final String value;
  final String displayName;
  final String description;
}

/// Helper function to show appeal dialog
Future<bool?> showAppealDialog({
  required BuildContext context,
  required String contentId,
  required String contentType,
  String? contentPreview,
  required ModerationStatus currentStatus,
}) {
  return showDialog<bool>(
    context: context,
    builder: (context) => AppealDialog(
      contentId: contentId,
      contentType: contentType,
      contentPreview: contentPreview,
      currentStatus: currentStatus,
    ),
  );
}
