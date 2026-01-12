// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_flag_history_admin_action.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminFlagHistoryAdminAction extends AdminFlagHistoryAdminAction {
  @override
  final String? type;
  @override
  final DateTime? at;
  @override
  final String? action;
  @override
  final String? reasonCode;
  @override
  final String? note;

  factory _$AdminFlagHistoryAdminAction(
          [void Function(AdminFlagHistoryAdminActionBuilder)? updates]) =>
      (AdminFlagHistoryAdminActionBuilder()..update(updates))._build();

  _$AdminFlagHistoryAdminAction._(
      {this.type, this.at, this.action, this.reasonCode, this.note})
      : super._();
  @override
  AdminFlagHistoryAdminAction rebuild(
          void Function(AdminFlagHistoryAdminActionBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminFlagHistoryAdminActionBuilder toBuilder() =>
      AdminFlagHistoryAdminActionBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminFlagHistoryAdminAction &&
        type == other.type &&
        at == other.at &&
        action == other.action &&
        reasonCode == other.reasonCode &&
        note == other.note;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, type.hashCode);
    _$hash = $jc(_$hash, at.hashCode);
    _$hash = $jc(_$hash, action.hashCode);
    _$hash = $jc(_$hash, reasonCode.hashCode);
    _$hash = $jc(_$hash, note.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminFlagHistoryAdminAction')
          ..add('type', type)
          ..add('at', at)
          ..add('action', action)
          ..add('reasonCode', reasonCode)
          ..add('note', note))
        .toString();
  }
}

class AdminFlagHistoryAdminActionBuilder
    implements
        Builder<AdminFlagHistoryAdminAction,
            AdminFlagHistoryAdminActionBuilder> {
  _$AdminFlagHistoryAdminAction? _$v;

  String? _type;
  String? get type => _$this._type;
  set type(String? type) => _$this._type = type;

  DateTime? _at;
  DateTime? get at => _$this._at;
  set at(DateTime? at) => _$this._at = at;

  String? _action;
  String? get action => _$this._action;
  set action(String? action) => _$this._action = action;

  String? _reasonCode;
  String? get reasonCode => _$this._reasonCode;
  set reasonCode(String? reasonCode) => _$this._reasonCode = reasonCode;

  String? _note;
  String? get note => _$this._note;
  set note(String? note) => _$this._note = note;

  AdminFlagHistoryAdminActionBuilder() {
    AdminFlagHistoryAdminAction._defaults(this);
  }

  AdminFlagHistoryAdminActionBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _type = $v.type;
      _at = $v.at;
      _action = $v.action;
      _reasonCode = $v.reasonCode;
      _note = $v.note;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminFlagHistoryAdminAction other) {
    _$v = other as _$AdminFlagHistoryAdminAction;
  }

  @override
  void update(void Function(AdminFlagHistoryAdminActionBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminFlagHistoryAdminAction build() => _build();

  _$AdminFlagHistoryAdminAction _build() {
    final _$result = _$v ??
        _$AdminFlagHistoryAdminAction._(
          type: type,
          at: at,
          action: action,
          reasonCode: reasonCode,
          note: note,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
