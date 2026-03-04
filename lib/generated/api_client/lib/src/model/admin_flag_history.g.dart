// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_flag_history.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminFlagHistory extends AdminFlagHistory {
  @override
  final BuiltList<AdminFlagHistoryFlag>? flags;
  @override
  final BuiltList<AdminFlagHistoryAdminAction>? adminActions;
  @override
  final AdminFlagHistoryAppeal? appeal;

  factory _$AdminFlagHistory(
          [void Function(AdminFlagHistoryBuilder)? updates]) =>
      (AdminFlagHistoryBuilder()..update(updates))._build();

  _$AdminFlagHistory._({this.flags, this.adminActions, this.appeal})
      : super._();
  @override
  AdminFlagHistory rebuild(void Function(AdminFlagHistoryBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminFlagHistoryBuilder toBuilder() =>
      AdminFlagHistoryBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminFlagHistory &&
        flags == other.flags &&
        adminActions == other.adminActions &&
        appeal == other.appeal;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, flags.hashCode);
    _$hash = $jc(_$hash, adminActions.hashCode);
    _$hash = $jc(_$hash, appeal.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminFlagHistory')
          ..add('flags', flags)
          ..add('adminActions', adminActions)
          ..add('appeal', appeal))
        .toString();
  }
}

class AdminFlagHistoryBuilder
    implements Builder<AdminFlagHistory, AdminFlagHistoryBuilder> {
  _$AdminFlagHistory? _$v;

  ListBuilder<AdminFlagHistoryFlag>? _flags;
  ListBuilder<AdminFlagHistoryFlag> get flags =>
      _$this._flags ??= ListBuilder<AdminFlagHistoryFlag>();
  set flags(ListBuilder<AdminFlagHistoryFlag>? flags) => _$this._flags = flags;

  ListBuilder<AdminFlagHistoryAdminAction>? _adminActions;
  ListBuilder<AdminFlagHistoryAdminAction> get adminActions =>
      _$this._adminActions ??= ListBuilder<AdminFlagHistoryAdminAction>();
  set adminActions(ListBuilder<AdminFlagHistoryAdminAction>? adminActions) =>
      _$this._adminActions = adminActions;

  AdminFlagHistoryAppealBuilder? _appeal;
  AdminFlagHistoryAppealBuilder get appeal =>
      _$this._appeal ??= AdminFlagHistoryAppealBuilder();
  set appeal(AdminFlagHistoryAppealBuilder? appeal) => _$this._appeal = appeal;

  AdminFlagHistoryBuilder() {
    AdminFlagHistory._defaults(this);
  }

  AdminFlagHistoryBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _flags = $v.flags?.toBuilder();
      _adminActions = $v.adminActions?.toBuilder();
      _appeal = $v.appeal?.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminFlagHistory other) {
    _$v = other as _$AdminFlagHistory;
  }

  @override
  void update(void Function(AdminFlagHistoryBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminFlagHistory build() => _build();

  _$AdminFlagHistory _build() {
    _$AdminFlagHistory _$result;
    try {
      _$result = _$v ??
          _$AdminFlagHistory._(
            flags: _flags?.build(),
            adminActions: _adminActions?.build(),
            appeal: _appeal?.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'flags';
        _flags?.build();
        _$failedField = 'adminActions';
        _adminActions?.build();
        _$failedField = 'appeal';
        _appeal?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'AdminFlagHistory', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
