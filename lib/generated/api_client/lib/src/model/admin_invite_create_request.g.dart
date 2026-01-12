// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_invite_create_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminInviteCreateRequest extends AdminInviteCreateRequest {
  @override
  final String? email;
  @override
  final int? expiresInDays;
  @override
  final int? maxUses;
  @override
  final String? label;

  factory _$AdminInviteCreateRequest(
          [void Function(AdminInviteCreateRequestBuilder)? updates]) =>
      (AdminInviteCreateRequestBuilder()..update(updates))._build();

  _$AdminInviteCreateRequest._(
      {this.email, this.expiresInDays, this.maxUses, this.label})
      : super._();
  @override
  AdminInviteCreateRequest rebuild(
          void Function(AdminInviteCreateRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminInviteCreateRequestBuilder toBuilder() =>
      AdminInviteCreateRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminInviteCreateRequest &&
        email == other.email &&
        expiresInDays == other.expiresInDays &&
        maxUses == other.maxUses &&
        label == other.label;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, email.hashCode);
    _$hash = $jc(_$hash, expiresInDays.hashCode);
    _$hash = $jc(_$hash, maxUses.hashCode);
    _$hash = $jc(_$hash, label.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminInviteCreateRequest')
          ..add('email', email)
          ..add('expiresInDays', expiresInDays)
          ..add('maxUses', maxUses)
          ..add('label', label))
        .toString();
  }
}

class AdminInviteCreateRequestBuilder
    implements
        Builder<AdminInviteCreateRequest, AdminInviteCreateRequestBuilder> {
  _$AdminInviteCreateRequest? _$v;

  String? _email;
  String? get email => _$this._email;
  set email(String? email) => _$this._email = email;

  int? _expiresInDays;
  int? get expiresInDays => _$this._expiresInDays;
  set expiresInDays(int? expiresInDays) =>
      _$this._expiresInDays = expiresInDays;

  int? _maxUses;
  int? get maxUses => _$this._maxUses;
  set maxUses(int? maxUses) => _$this._maxUses = maxUses;

  String? _label;
  String? get label => _$this._label;
  set label(String? label) => _$this._label = label;

  AdminInviteCreateRequestBuilder() {
    AdminInviteCreateRequest._defaults(this);
  }

  AdminInviteCreateRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _email = $v.email;
      _expiresInDays = $v.expiresInDays;
      _maxUses = $v.maxUses;
      _label = $v.label;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminInviteCreateRequest other) {
    _$v = other as _$AdminInviteCreateRequest;
  }

  @override
  void update(void Function(AdminInviteCreateRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminInviteCreateRequest build() => _build();

  _$AdminInviteCreateRequest _build() {
    final _$result = _$v ??
        _$AdminInviteCreateRequest._(
          email: email,
          expiresInDays: expiresInDays,
          maxUses: maxUses,
          label: label,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
