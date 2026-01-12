// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_flag_history_flag.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminFlagHistoryFlag extends AdminFlagHistoryFlag {
  @override
  final String? type;
  @override
  final DateTime? at;
  @override
  final String? reason;

  factory _$AdminFlagHistoryFlag(
          [void Function(AdminFlagHistoryFlagBuilder)? updates]) =>
      (AdminFlagHistoryFlagBuilder()..update(updates))._build();

  _$AdminFlagHistoryFlag._({this.type, this.at, this.reason}) : super._();
  @override
  AdminFlagHistoryFlag rebuild(
          void Function(AdminFlagHistoryFlagBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminFlagHistoryFlagBuilder toBuilder() =>
      AdminFlagHistoryFlagBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminFlagHistoryFlag &&
        type == other.type &&
        at == other.at &&
        reason == other.reason;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, type.hashCode);
    _$hash = $jc(_$hash, at.hashCode);
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminFlagHistoryFlag')
          ..add('type', type)
          ..add('at', at)
          ..add('reason', reason))
        .toString();
  }
}

class AdminFlagHistoryFlagBuilder
    implements Builder<AdminFlagHistoryFlag, AdminFlagHistoryFlagBuilder> {
  _$AdminFlagHistoryFlag? _$v;

  String? _type;
  String? get type => _$this._type;
  set type(String? type) => _$this._type = type;

  DateTime? _at;
  DateTime? get at => _$this._at;
  set at(DateTime? at) => _$this._at = at;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  AdminFlagHistoryFlagBuilder() {
    AdminFlagHistoryFlag._defaults(this);
  }

  AdminFlagHistoryFlagBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _type = $v.type;
      _at = $v.at;
      _reason = $v.reason;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminFlagHistoryFlag other) {
    _$v = other as _$AdminFlagHistoryFlag;
  }

  @override
  void update(void Function(AdminFlagHistoryFlagBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminFlagHistoryFlag build() => _build();

  _$AdminFlagHistoryFlag _build() {
    final _$result = _$v ??
        _$AdminFlagHistoryFlag._(
          type: type,
          at: at,
          reason: reason,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
