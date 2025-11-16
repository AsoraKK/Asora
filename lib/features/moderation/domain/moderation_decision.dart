/// Models representing moderator decisions and escalations
library;

enum ModerationDecisionAction { allow, remove, warn, ban }

extension ModerationDecisionActionExt on ModerationDecisionAction {
  String get label {
    return switch (this) {
      ModerationDecisionAction.allow => 'Allow',
      ModerationDecisionAction.remove => 'Remove',
      ModerationDecisionAction.warn => 'Warn User',
      ModerationDecisionAction.ban => 'Ban User',
    };
  }
}

class ModerationDecisionInput {
  const ModerationDecisionInput({
    required this.action,
    required this.rationale,
    this.policyTest = false,
  });

  final ModerationDecisionAction action;
  final String rationale;
  final bool policyTest;

  Map<String, dynamic> toJson() {
    return {
      'decision': action.name,
      'rationale': rationale,
      'policyTest': policyTest,
    };
  }
}

class ModerationEscalationInput {
  const ModerationEscalationInput({
    required this.reason,
    required this.targetQueue,
  });

  final String reason;
  final String targetQueue;

  Map<String, dynamic> toJson() {
    return {
      'reason': reason,
      'targetQueue': targetQueue,
    };
  }
}

class ModerationDecisionResult {
  const ModerationDecisionResult({
    required this.success,
    this.message,
    this.caseId,
  });

  final bool success;
  final String? message;
  final String? caseId;

  factory ModerationDecisionResult.fromJson(Map<String, dynamic> json) {
    return ModerationDecisionResult(
      success: json['success'] == true,
      message: json['message']?.toString(),
      caseId: json['caseId']?.toString(),
    );
  }
}
