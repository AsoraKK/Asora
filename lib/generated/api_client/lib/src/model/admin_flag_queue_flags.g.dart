// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_flag_queue_flags.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminFlagQueueFlags extends AdminFlagQueueFlags {
  @override
  final String? flagId;
  @override
  final int? flagCount;
  @override
  final BuiltList<String>? reasonCategories;
  @override
  final DateTime? lastFlaggedAt;

  factory _$AdminFlagQueueFlags(
          [void Function(AdminFlagQueueFlagsBuilder)? updates]) =>
      (AdminFlagQueueFlagsBuilder()..update(updates))._build();

  _$AdminFlagQueueFlags._(
      {this.flagId, this.flagCount, this.reasonCategories, this.lastFlaggedAt})
      : super._();
  @override
  AdminFlagQueueFlags rebuild(
          void Function(AdminFlagQueueFlagsBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminFlagQueueFlagsBuilder toBuilder() =>
      AdminFlagQueueFlagsBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminFlagQueueFlags &&
        flagId == other.flagId &&
        flagCount == other.flagCount &&
        reasonCategories == other.reasonCategories &&
        lastFlaggedAt == other.lastFlaggedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, flagId.hashCode);
    _$hash = $jc(_$hash, flagCount.hashCode);
    _$hash = $jc(_$hash, reasonCategories.hashCode);
    _$hash = $jc(_$hash, lastFlaggedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminFlagQueueFlags')
          ..add('flagId', flagId)
          ..add('flagCount', flagCount)
          ..add('reasonCategories', reasonCategories)
          ..add('lastFlaggedAt', lastFlaggedAt))
        .toString();
  }
}

class AdminFlagQueueFlagsBuilder
    implements Builder<AdminFlagQueueFlags, AdminFlagQueueFlagsBuilder> {
  _$AdminFlagQueueFlags? _$v;

  String? _flagId;
  String? get flagId => _$this._flagId;
  set flagId(String? flagId) => _$this._flagId = flagId;

  int? _flagCount;
  int? get flagCount => _$this._flagCount;
  set flagCount(int? flagCount) => _$this._flagCount = flagCount;

  ListBuilder<String>? _reasonCategories;
  ListBuilder<String> get reasonCategories =>
      _$this._reasonCategories ??= ListBuilder<String>();
  set reasonCategories(ListBuilder<String>? reasonCategories) =>
      _$this._reasonCategories = reasonCategories;

  DateTime? _lastFlaggedAt;
  DateTime? get lastFlaggedAt => _$this._lastFlaggedAt;
  set lastFlaggedAt(DateTime? lastFlaggedAt) =>
      _$this._lastFlaggedAt = lastFlaggedAt;

  AdminFlagQueueFlagsBuilder() {
    AdminFlagQueueFlags._defaults(this);
  }

  AdminFlagQueueFlagsBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _flagId = $v.flagId;
      _flagCount = $v.flagCount;
      _reasonCategories = $v.reasonCategories?.toBuilder();
      _lastFlaggedAt = $v.lastFlaggedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminFlagQueueFlags other) {
    _$v = other as _$AdminFlagQueueFlags;
  }

  @override
  void update(void Function(AdminFlagQueueFlagsBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminFlagQueueFlags build() => _build();

  _$AdminFlagQueueFlags _build() {
    _$AdminFlagQueueFlags _$result;
    try {
      _$result = _$v ??
          _$AdminFlagQueueFlags._(
            flagId: flagId,
            flagCount: flagCount,
            reasonCategories: _reasonCategories?.build(),
            lastFlaggedAt: lastFlaggedAt,
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'reasonCategories';
        _reasonCategories?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'AdminFlagQueueFlags', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
