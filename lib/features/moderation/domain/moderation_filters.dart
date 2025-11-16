/// Filter models for the moderation console
library;

enum ModerationItemFilter { all, flag, appeal }

enum ModerationSeverityFilter { all, low, medium, high }

enum ModerationAgeFilter { all, underHour, underDay, underWeek }

enum ModerationQueueFilter { all, defaultQueue, escalated, policyTest }

enum ModerationAuditActionFilter {
  all,
  decision,
  escalation,
  appeal,
  aiSignal,
}

class ModerationFilters {
  const ModerationFilters({
    this.itemType = ModerationItemFilter.all,
    this.severity = ModerationSeverityFilter.all,
    this.age = ModerationAgeFilter.all,
    this.queue = ModerationQueueFilter.all,
  });

  final ModerationItemFilter itemType;
  final ModerationSeverityFilter severity;
  final ModerationAgeFilter age;
  final ModerationQueueFilter queue;

  ModerationFilters copyWith({
    ModerationItemFilter? itemType,
    ModerationSeverityFilter? severity,
    ModerationAgeFilter? age,
    ModerationQueueFilter? queue,
  }) {
    return ModerationFilters(
      itemType: itemType ?? this.itemType,
      severity: severity ?? this.severity,
      age: age ?? this.age,
      queue: queue ?? this.queue,
    );
  }

  Map<String, dynamic> toQueryParams() {
    final params = <String, dynamic>{};

    if (itemType != ModerationItemFilter.all) {
      params['type'] = itemType.name;
    }
    if (severity != ModerationSeverityFilter.all) {
      params['severity'] = severity.name;
    }
    if (age != ModerationAgeFilter.all) {
      params['age'] = _ageToQueryValue(age);
    }
    if (queue != ModerationQueueFilter.all) {
      params['queue'] = _queueToQueryValue(queue);
    }

    return params;
  }

  static String _ageToQueryValue(ModerationAgeFilter value) {
    return switch (value) {
      ModerationAgeFilter.underHour => '1h',
      ModerationAgeFilter.underDay => '24h',
      ModerationAgeFilter.underWeek => '7d',
      _ => '',
    };
  }

  static String _queueToQueryValue(ModerationQueueFilter value) {
    return switch (value) {
      ModerationQueueFilter.defaultQueue => 'default',
      ModerationQueueFilter.escalated => 'escalated',
      ModerationQueueFilter.policyTest => 'policy-test',
      _ => '',
    };
  }
}

class ModerationAuditSearchFilters {
  const ModerationAuditSearchFilters({
    this.contentId,
    this.userId,
    this.moderatorId,
    this.action = ModerationAuditActionFilter.all,
    this.from,
    this.to,
    this.page = 1,
    this.pageSize = 20,
  });

  final String? contentId;
  final String? userId;
  final String? moderatorId;
  final ModerationAuditActionFilter action;
  final DateTime? from;
  final DateTime? to;
  final int page;
  final int pageSize;

  ModerationAuditSearchFilters copyWith({
    String? contentId,
    String? userId,
    String? moderatorId,
    ModerationAuditActionFilter? action,
    DateTime? from,
    DateTime? to,
    int? page,
    int? pageSize,
  }) {
    return ModerationAuditSearchFilters(
      contentId: contentId ?? this.contentId,
      userId: userId ?? this.userId,
      moderatorId: moderatorId ?? this.moderatorId,
      action: action ?? this.action,
      from: from ?? this.from,
      to: to ?? this.to,
      page: page ?? this.page,
      pageSize: pageSize ?? this.pageSize,
    );
  }

  Map<String, dynamic> toQueryParams() {
    final params = <String, dynamic>{
      'page': page,
      'pageSize': pageSize,
    };

    if (contentId != null && contentId!.isNotEmpty) {
      params['contentId'] = contentId;
    }
    if (userId != null && userId!.isNotEmpty) {
      params['userId'] = userId;
    }
    if (moderatorId != null && moderatorId!.isNotEmpty) {
      params['moderatorId'] = moderatorId;
    }
    if (action != ModerationAuditActionFilter.all) {
      params['action'] = action.name;
    }
    if (from != null) {
      params['from'] = from!.toIso8601String();
    }
    if (to != null) {
      params['to'] = to!.toIso8601String();
    }

    return params;
  }
}
