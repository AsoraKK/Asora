// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_moderation_summary.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminModerationSummary extends AdminModerationSummary {
  @override
  final DateTime? lastDecisionAt;
  @override
  final int? configVersionUsed;
  @override
  final BuiltList<String>? reasonCodes;

  factory _$AdminModerationSummary(
          [void Function(AdminModerationSummaryBuilder)? updates]) =>
      (AdminModerationSummaryBuilder()..update(updates))._build();

  _$AdminModerationSummary._(
      {this.lastDecisionAt, this.configVersionUsed, this.reasonCodes})
      : super._();
  @override
  AdminModerationSummary rebuild(
          void Function(AdminModerationSummaryBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminModerationSummaryBuilder toBuilder() =>
      AdminModerationSummaryBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminModerationSummary &&
        lastDecisionAt == other.lastDecisionAt &&
        configVersionUsed == other.configVersionUsed &&
        reasonCodes == other.reasonCodes;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, lastDecisionAt.hashCode);
    _$hash = $jc(_$hash, configVersionUsed.hashCode);
    _$hash = $jc(_$hash, reasonCodes.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminModerationSummary')
          ..add('lastDecisionAt', lastDecisionAt)
          ..add('configVersionUsed', configVersionUsed)
          ..add('reasonCodes', reasonCodes))
        .toString();
  }
}

class AdminModerationSummaryBuilder
    implements Builder<AdminModerationSummary, AdminModerationSummaryBuilder> {
  _$AdminModerationSummary? _$v;

  DateTime? _lastDecisionAt;
  DateTime? get lastDecisionAt => _$this._lastDecisionAt;
  set lastDecisionAt(DateTime? lastDecisionAt) =>
      _$this._lastDecisionAt = lastDecisionAt;

  int? _configVersionUsed;
  int? get configVersionUsed => _$this._configVersionUsed;
  set configVersionUsed(int? configVersionUsed) =>
      _$this._configVersionUsed = configVersionUsed;

  ListBuilder<String>? _reasonCodes;
  ListBuilder<String> get reasonCodes =>
      _$this._reasonCodes ??= ListBuilder<String>();
  set reasonCodes(ListBuilder<String>? reasonCodes) =>
      _$this._reasonCodes = reasonCodes;

  AdminModerationSummaryBuilder() {
    AdminModerationSummary._defaults(this);
  }

  AdminModerationSummaryBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _lastDecisionAt = $v.lastDecisionAt;
      _configVersionUsed = $v.configVersionUsed;
      _reasonCodes = $v.reasonCodes?.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminModerationSummary other) {
    _$v = other as _$AdminModerationSummary;
  }

  @override
  void update(void Function(AdminModerationSummaryBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminModerationSummary build() => _build();

  _$AdminModerationSummary _build() {
    _$AdminModerationSummary _$result;
    try {
      _$result = _$v ??
          _$AdminModerationSummary._(
            lastDecisionAt: lastDecisionAt,
            configVersionUsed: configVersionUsed,
            reasonCodes: _reasonCodes?.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'reasonCodes';
        _reasonCodes?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'AdminModerationSummary', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
