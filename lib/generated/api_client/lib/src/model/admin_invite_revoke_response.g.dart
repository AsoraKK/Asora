// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_invite_revoke_response.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminInviteRevokeResponse extends AdminInviteRevokeResponse {
  @override
  final bool? revoked;

  factory _$AdminInviteRevokeResponse(
          [void Function(AdminInviteRevokeResponseBuilder)? updates]) =>
      (AdminInviteRevokeResponseBuilder()..update(updates))._build();

  _$AdminInviteRevokeResponse._({this.revoked}) : super._();
  @override
  AdminInviteRevokeResponse rebuild(
          void Function(AdminInviteRevokeResponseBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminInviteRevokeResponseBuilder toBuilder() =>
      AdminInviteRevokeResponseBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminInviteRevokeResponse && revoked == other.revoked;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, revoked.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminInviteRevokeResponse')
          ..add('revoked', revoked))
        .toString();
  }
}

class AdminInviteRevokeResponseBuilder
    implements
        Builder<AdminInviteRevokeResponse, AdminInviteRevokeResponseBuilder> {
  _$AdminInviteRevokeResponse? _$v;

  bool? _revoked;
  bool? get revoked => _$this._revoked;
  set revoked(bool? revoked) => _$this._revoked = revoked;

  AdminInviteRevokeResponseBuilder() {
    AdminInviteRevokeResponse._defaults(this);
  }

  AdminInviteRevokeResponseBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _revoked = $v.revoked;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminInviteRevokeResponse other) {
    _$v = other as _$AdminInviteRevokeResponse;
  }

  @override
  void update(void Function(AdminInviteRevokeResponseBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminInviteRevokeResponse build() => _build();

  _$AdminInviteRevokeResponse _build() {
    final _$result = _$v ??
        _$AdminInviteRevokeResponse._(
          revoked: revoked,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
