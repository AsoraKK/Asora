// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_appeal_queue_item.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminAppealQueueItem extends AdminAppealQueueItem {
  @override
  final String? appealId;
  @override
  final String? contentId;
  @override
  final String? authorId;
  @override
  final DateTime? submittedAt;
  @override
  final AdminAppealStatus? status;
  @override
  final String? originalReasonCategory;
  @override
  final int? configVersionUsed;

  factory _$AdminAppealQueueItem(
          [void Function(AdminAppealQueueItemBuilder)? updates]) =>
      (AdminAppealQueueItemBuilder()..update(updates))._build();

  _$AdminAppealQueueItem._(
      {this.appealId,
      this.contentId,
      this.authorId,
      this.submittedAt,
      this.status,
      this.originalReasonCategory,
      this.configVersionUsed})
      : super._();
  @override
  AdminAppealQueueItem rebuild(
          void Function(AdminAppealQueueItemBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminAppealQueueItemBuilder toBuilder() =>
      AdminAppealQueueItemBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminAppealQueueItem &&
        appealId == other.appealId &&
        contentId == other.contentId &&
        authorId == other.authorId &&
        submittedAt == other.submittedAt &&
        status == other.status &&
        originalReasonCategory == other.originalReasonCategory &&
        configVersionUsed == other.configVersionUsed;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, appealId.hashCode);
    _$hash = $jc(_$hash, contentId.hashCode);
    _$hash = $jc(_$hash, authorId.hashCode);
    _$hash = $jc(_$hash, submittedAt.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, originalReasonCategory.hashCode);
    _$hash = $jc(_$hash, configVersionUsed.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminAppealQueueItem')
          ..add('appealId', appealId)
          ..add('contentId', contentId)
          ..add('authorId', authorId)
          ..add('submittedAt', submittedAt)
          ..add('status', status)
          ..add('originalReasonCategory', originalReasonCategory)
          ..add('configVersionUsed', configVersionUsed))
        .toString();
  }
}

class AdminAppealQueueItemBuilder
    implements Builder<AdminAppealQueueItem, AdminAppealQueueItemBuilder> {
  _$AdminAppealQueueItem? _$v;

  String? _appealId;
  String? get appealId => _$this._appealId;
  set appealId(String? appealId) => _$this._appealId = appealId;

  String? _contentId;
  String? get contentId => _$this._contentId;
  set contentId(String? contentId) => _$this._contentId = contentId;

  String? _authorId;
  String? get authorId => _$this._authorId;
  set authorId(String? authorId) => _$this._authorId = authorId;

  DateTime? _submittedAt;
  DateTime? get submittedAt => _$this._submittedAt;
  set submittedAt(DateTime? submittedAt) => _$this._submittedAt = submittedAt;

  AdminAppealStatus? _status;
  AdminAppealStatus? get status => _$this._status;
  set status(AdminAppealStatus? status) => _$this._status = status;

  String? _originalReasonCategory;
  String? get originalReasonCategory => _$this._originalReasonCategory;
  set originalReasonCategory(String? originalReasonCategory) =>
      _$this._originalReasonCategory = originalReasonCategory;

  int? _configVersionUsed;
  int? get configVersionUsed => _$this._configVersionUsed;
  set configVersionUsed(int? configVersionUsed) =>
      _$this._configVersionUsed = configVersionUsed;

  AdminAppealQueueItemBuilder() {
    AdminAppealQueueItem._defaults(this);
  }

  AdminAppealQueueItemBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _appealId = $v.appealId;
      _contentId = $v.contentId;
      _authorId = $v.authorId;
      _submittedAt = $v.submittedAt;
      _status = $v.status;
      _originalReasonCategory = $v.originalReasonCategory;
      _configVersionUsed = $v.configVersionUsed;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminAppealQueueItem other) {
    _$v = other as _$AdminAppealQueueItem;
  }

  @override
  void update(void Function(AdminAppealQueueItemBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminAppealQueueItem build() => _build();

  _$AdminAppealQueueItem _build() {
    final _$result = _$v ??
        _$AdminAppealQueueItem._(
          appealId: appealId,
          contentId: contentId,
          authorId: authorId,
          submittedAt: submittedAt,
          status: status,
          originalReasonCategory: originalReasonCategory,
          configVersionUsed: configVersionUsed,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
