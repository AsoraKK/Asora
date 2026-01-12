// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_flag_detail_flags.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminFlagDetailFlags extends AdminFlagDetailFlags {
  @override
  final String? flagId;
  @override
  final String? status;
  @override
  final int? flagCount;
  @override
  final int? reporterCount;
  @override
  final BuiltList<AdminFlagDetailReason>? reasons;

  factory _$AdminFlagDetailFlags(
          [void Function(AdminFlagDetailFlagsBuilder)? updates]) =>
      (AdminFlagDetailFlagsBuilder()..update(updates))._build();

  _$AdminFlagDetailFlags._(
      {this.flagId,
      this.status,
      this.flagCount,
      this.reporterCount,
      this.reasons})
      : super._();
  @override
  AdminFlagDetailFlags rebuild(
          void Function(AdminFlagDetailFlagsBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminFlagDetailFlagsBuilder toBuilder() =>
      AdminFlagDetailFlagsBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminFlagDetailFlags &&
        flagId == other.flagId &&
        status == other.status &&
        flagCount == other.flagCount &&
        reporterCount == other.reporterCount &&
        reasons == other.reasons;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, flagId.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, flagCount.hashCode);
    _$hash = $jc(_$hash, reporterCount.hashCode);
    _$hash = $jc(_$hash, reasons.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminFlagDetailFlags')
          ..add('flagId', flagId)
          ..add('status', status)
          ..add('flagCount', flagCount)
          ..add('reporterCount', reporterCount)
          ..add('reasons', reasons))
        .toString();
  }
}

class AdminFlagDetailFlagsBuilder
    implements Builder<AdminFlagDetailFlags, AdminFlagDetailFlagsBuilder> {
  _$AdminFlagDetailFlags? _$v;

  String? _flagId;
  String? get flagId => _$this._flagId;
  set flagId(String? flagId) => _$this._flagId = flagId;

  String? _status;
  String? get status => _$this._status;
  set status(String? status) => _$this._status = status;

  int? _flagCount;
  int? get flagCount => _$this._flagCount;
  set flagCount(int? flagCount) => _$this._flagCount = flagCount;

  int? _reporterCount;
  int? get reporterCount => _$this._reporterCount;
  set reporterCount(int? reporterCount) =>
      _$this._reporterCount = reporterCount;

  ListBuilder<AdminFlagDetailReason>? _reasons;
  ListBuilder<AdminFlagDetailReason> get reasons =>
      _$this._reasons ??= ListBuilder<AdminFlagDetailReason>();
  set reasons(ListBuilder<AdminFlagDetailReason>? reasons) =>
      _$this._reasons = reasons;

  AdminFlagDetailFlagsBuilder() {
    AdminFlagDetailFlags._defaults(this);
  }

  AdminFlagDetailFlagsBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _flagId = $v.flagId;
      _status = $v.status;
      _flagCount = $v.flagCount;
      _reporterCount = $v.reporterCount;
      _reasons = $v.reasons?.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminFlagDetailFlags other) {
    _$v = other as _$AdminFlagDetailFlags;
  }

  @override
  void update(void Function(AdminFlagDetailFlagsBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminFlagDetailFlags build() => _build();

  _$AdminFlagDetailFlags _build() {
    _$AdminFlagDetailFlags _$result;
    try {
      _$result = _$v ??
          _$AdminFlagDetailFlags._(
            flagId: flagId,
            status: status,
            flagCount: flagCount,
            reporterCount: reporterCount,
            reasons: _reasons?.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'reasons';
        _reasons?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'AdminFlagDetailFlags', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
