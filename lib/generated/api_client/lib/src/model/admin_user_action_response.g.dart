// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_user_action_response.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminUserActionResponse extends AdminUserActionResponse {
  @override
  final String? userId;
  @override
  final AdminUserStatus? status;

  factory _$AdminUserActionResponse(
          [void Function(AdminUserActionResponseBuilder)? updates]) =>
      (AdminUserActionResponseBuilder()..update(updates))._build();

  _$AdminUserActionResponse._({this.userId, this.status}) : super._();
  @override
  AdminUserActionResponse rebuild(
          void Function(AdminUserActionResponseBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminUserActionResponseBuilder toBuilder() =>
      AdminUserActionResponseBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminUserActionResponse &&
        userId == other.userId &&
        status == other.status;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, userId.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminUserActionResponse')
          ..add('userId', userId)
          ..add('status', status))
        .toString();
  }
}

class AdminUserActionResponseBuilder
    implements
        Builder<AdminUserActionResponse, AdminUserActionResponseBuilder> {
  _$AdminUserActionResponse? _$v;

  String? _userId;
  String? get userId => _$this._userId;
  set userId(String? userId) => _$this._userId = userId;

  AdminUserStatus? _status;
  AdminUserStatus? get status => _$this._status;
  set status(AdminUserStatus? status) => _$this._status = status;

  AdminUserActionResponseBuilder() {
    AdminUserActionResponse._defaults(this);
  }

  AdminUserActionResponseBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _userId = $v.userId;
      _status = $v.status;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminUserActionResponse other) {
    _$v = other as _$AdminUserActionResponse;
  }

  @override
  void update(void Function(AdminUserActionResponseBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminUserActionResponse build() => _build();

  _$AdminUserActionResponse _build() {
    final _$result = _$v ??
        _$AdminUserActionResponse._(
          userId: userId,
          status: status,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
