// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_flag_detail_appeal.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminFlagDetailAppeal extends AdminFlagDetailAppeal {
  @override
  final String? appealId;
  @override
  final AdminAppealStatus? status;
  @override
  final DateTime? submittedAt;
  @override
  final DateTime? updatedAt;

  factory _$AdminFlagDetailAppeal(
          [void Function(AdminFlagDetailAppealBuilder)? updates]) =>
      (AdminFlagDetailAppealBuilder()..update(updates))._build();

  _$AdminFlagDetailAppeal._(
      {this.appealId, this.status, this.submittedAt, this.updatedAt})
      : super._();
  @override
  AdminFlagDetailAppeal rebuild(
          void Function(AdminFlagDetailAppealBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminFlagDetailAppealBuilder toBuilder() =>
      AdminFlagDetailAppealBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminFlagDetailAppeal &&
        appealId == other.appealId &&
        status == other.status &&
        submittedAt == other.submittedAt &&
        updatedAt == other.updatedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, appealId.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, submittedAt.hashCode);
    _$hash = $jc(_$hash, updatedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminFlagDetailAppeal')
          ..add('appealId', appealId)
          ..add('status', status)
          ..add('submittedAt', submittedAt)
          ..add('updatedAt', updatedAt))
        .toString();
  }
}

class AdminFlagDetailAppealBuilder
    implements Builder<AdminFlagDetailAppeal, AdminFlagDetailAppealBuilder> {
  _$AdminFlagDetailAppeal? _$v;

  String? _appealId;
  String? get appealId => _$this._appealId;
  set appealId(String? appealId) => _$this._appealId = appealId;

  AdminAppealStatus? _status;
  AdminAppealStatus? get status => _$this._status;
  set status(AdminAppealStatus? status) => _$this._status = status;

  DateTime? _submittedAt;
  DateTime? get submittedAt => _$this._submittedAt;
  set submittedAt(DateTime? submittedAt) => _$this._submittedAt = submittedAt;

  DateTime? _updatedAt;
  DateTime? get updatedAt => _$this._updatedAt;
  set updatedAt(DateTime? updatedAt) => _$this._updatedAt = updatedAt;

  AdminFlagDetailAppealBuilder() {
    AdminFlagDetailAppeal._defaults(this);
  }

  AdminFlagDetailAppealBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _appealId = $v.appealId;
      _status = $v.status;
      _submittedAt = $v.submittedAt;
      _updatedAt = $v.updatedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminFlagDetailAppeal other) {
    _$v = other as _$AdminFlagDetailAppeal;
  }

  @override
  void update(void Function(AdminFlagDetailAppealBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminFlagDetailAppeal build() => _build();

  _$AdminFlagDetailAppeal _build() {
    final _$result = _$v ??
        _$AdminFlagDetailAppeal._(
          appealId: appealId,
          status: status,
          submittedAt: submittedAt,
          updatedAt: updatedAt,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
