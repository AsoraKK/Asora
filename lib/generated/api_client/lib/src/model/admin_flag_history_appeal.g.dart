// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_flag_history_appeal.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminFlagHistoryAppeal extends AdminFlagHistoryAppeal {
  @override
  final String? type;
  @override
  final DateTime? at;
  @override
  final AdminAppealStatus? status;

  factory _$AdminFlagHistoryAppeal(
          [void Function(AdminFlagHistoryAppealBuilder)? updates]) =>
      (AdminFlagHistoryAppealBuilder()..update(updates))._build();

  _$AdminFlagHistoryAppeal._({this.type, this.at, this.status}) : super._();
  @override
  AdminFlagHistoryAppeal rebuild(
          void Function(AdminFlagHistoryAppealBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminFlagHistoryAppealBuilder toBuilder() =>
      AdminFlagHistoryAppealBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminFlagHistoryAppeal &&
        type == other.type &&
        at == other.at &&
        status == other.status;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, type.hashCode);
    _$hash = $jc(_$hash, at.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminFlagHistoryAppeal')
          ..add('type', type)
          ..add('at', at)
          ..add('status', status))
        .toString();
  }
}

class AdminFlagHistoryAppealBuilder
    implements Builder<AdminFlagHistoryAppeal, AdminFlagHistoryAppealBuilder> {
  _$AdminFlagHistoryAppeal? _$v;

  String? _type;
  String? get type => _$this._type;
  set type(String? type) => _$this._type = type;

  DateTime? _at;
  DateTime? get at => _$this._at;
  set at(DateTime? at) => _$this._at = at;

  AdminAppealStatus? _status;
  AdminAppealStatus? get status => _$this._status;
  set status(AdminAppealStatus? status) => _$this._status = status;

  AdminFlagHistoryAppealBuilder() {
    AdminFlagHistoryAppeal._defaults(this);
  }

  AdminFlagHistoryAppealBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _type = $v.type;
      _at = $v.at;
      _status = $v.status;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminFlagHistoryAppeal other) {
    _$v = other as _$AdminFlagHistoryAppeal;
  }

  @override
  void update(void Function(AdminFlagHistoryAppealBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminFlagHistoryAppeal build() => _build();

  _$AdminFlagHistoryAppeal _build() {
    final _$result = _$v ??
        _$AdminFlagHistoryAppeal._(
          type: type,
          at: at,
          status: status,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
