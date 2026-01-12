// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_invite_revoke_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminInviteRevokeRequest extends AdminInviteRevokeRequest {
  @override
  final String? reasonCode;
  @override
  final String? note;

  factory _$AdminInviteRevokeRequest(
          [void Function(AdminInviteRevokeRequestBuilder)? updates]) =>
      (AdminInviteRevokeRequestBuilder()..update(updates))._build();

  _$AdminInviteRevokeRequest._({this.reasonCode, this.note}) : super._();
  @override
  AdminInviteRevokeRequest rebuild(
          void Function(AdminInviteRevokeRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminInviteRevokeRequestBuilder toBuilder() =>
      AdminInviteRevokeRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminInviteRevokeRequest &&
        reasonCode == other.reasonCode &&
        note == other.note;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, reasonCode.hashCode);
    _$hash = $jc(_$hash, note.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminInviteRevokeRequest')
          ..add('reasonCode', reasonCode)
          ..add('note', note))
        .toString();
  }
}

class AdminInviteRevokeRequestBuilder
    implements
        Builder<AdminInviteRevokeRequest, AdminInviteRevokeRequestBuilder> {
  _$AdminInviteRevokeRequest? _$v;

  String? _reasonCode;
  String? get reasonCode => _$this._reasonCode;
  set reasonCode(String? reasonCode) => _$this._reasonCode = reasonCode;

  String? _note;
  String? get note => _$this._note;
  set note(String? note) => _$this._note = note;

  AdminInviteRevokeRequestBuilder() {
    AdminInviteRevokeRequest._defaults(this);
  }

  AdminInviteRevokeRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _reasonCode = $v.reasonCode;
      _note = $v.note;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminInviteRevokeRequest other) {
    _$v = other as _$AdminInviteRevokeRequest;
  }

  @override
  void update(void Function(AdminInviteRevokeRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminInviteRevokeRequest build() => _build();

  _$AdminInviteRevokeRequest _build() {
    final _$result = _$v ??
        _$AdminInviteRevokeRequest._(
          reasonCode: reasonCode,
          note: note,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
