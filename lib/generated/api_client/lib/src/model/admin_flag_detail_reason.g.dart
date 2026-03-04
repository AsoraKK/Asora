// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_flag_detail_reason.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminFlagDetailReason extends AdminFlagDetailReason {
  @override
  final String? reason;
  @override
  final DateTime? createdAt;
  @override
  final String? status;

  factory _$AdminFlagDetailReason(
          [void Function(AdminFlagDetailReasonBuilder)? updates]) =>
      (AdminFlagDetailReasonBuilder()..update(updates))._build();

  _$AdminFlagDetailReason._({this.reason, this.createdAt, this.status})
      : super._();
  @override
  AdminFlagDetailReason rebuild(
          void Function(AdminFlagDetailReasonBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminFlagDetailReasonBuilder toBuilder() =>
      AdminFlagDetailReasonBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminFlagDetailReason &&
        reason == other.reason &&
        createdAt == other.createdAt &&
        status == other.status;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminFlagDetailReason')
          ..add('reason', reason)
          ..add('createdAt', createdAt)
          ..add('status', status))
        .toString();
  }
}

class AdminFlagDetailReasonBuilder
    implements Builder<AdminFlagDetailReason, AdminFlagDetailReasonBuilder> {
  _$AdminFlagDetailReason? _$v;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  String? _status;
  String? get status => _$this._status;
  set status(String? status) => _$this._status = status;

  AdminFlagDetailReasonBuilder() {
    AdminFlagDetailReason._defaults(this);
  }

  AdminFlagDetailReasonBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _reason = $v.reason;
      _createdAt = $v.createdAt;
      _status = $v.status;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminFlagDetailReason other) {
    _$v = other as _$AdminFlagDetailReason;
  }

  @override
  void update(void Function(AdminFlagDetailReasonBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminFlagDetailReason build() => _build();

  _$AdminFlagDetailReason _build() {
    final _$result = _$v ??
        _$AdminFlagDetailReason._(
          reason: reason,
          createdAt: createdAt,
          status: status,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
