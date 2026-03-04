// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_invite_response.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminInviteResponse extends AdminInviteResponse {
  @override
  final String? inviteCode;
  @override
  final String? email;
  @override
  final String? createdBy;
  @override
  final DateTime? createdAt;
  @override
  final DateTime? expiresAt;
  @override
  final int? maxUses;
  @override
  final int? usageCount;
  @override
  final DateTime? lastUsedAt;
  @override
  final AdminInviteStatus? status;
  @override
  final String? label;
  @override
  final String? usedByUserId;

  factory _$AdminInviteResponse(
          [void Function(AdminInviteResponseBuilder)? updates]) =>
      (AdminInviteResponseBuilder()..update(updates))._build();

  _$AdminInviteResponse._(
      {this.inviteCode,
      this.email,
      this.createdBy,
      this.createdAt,
      this.expiresAt,
      this.maxUses,
      this.usageCount,
      this.lastUsedAt,
      this.status,
      this.label,
      this.usedByUserId})
      : super._();
  @override
  AdminInviteResponse rebuild(
          void Function(AdminInviteResponseBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminInviteResponseBuilder toBuilder() =>
      AdminInviteResponseBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminInviteResponse &&
        inviteCode == other.inviteCode &&
        email == other.email &&
        createdBy == other.createdBy &&
        createdAt == other.createdAt &&
        expiresAt == other.expiresAt &&
        maxUses == other.maxUses &&
        usageCount == other.usageCount &&
        lastUsedAt == other.lastUsedAt &&
        status == other.status &&
        label == other.label &&
        usedByUserId == other.usedByUserId;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, inviteCode.hashCode);
    _$hash = $jc(_$hash, email.hashCode);
    _$hash = $jc(_$hash, createdBy.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, expiresAt.hashCode);
    _$hash = $jc(_$hash, maxUses.hashCode);
    _$hash = $jc(_$hash, usageCount.hashCode);
    _$hash = $jc(_$hash, lastUsedAt.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, label.hashCode);
    _$hash = $jc(_$hash, usedByUserId.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminInviteResponse')
          ..add('inviteCode', inviteCode)
          ..add('email', email)
          ..add('createdBy', createdBy)
          ..add('createdAt', createdAt)
          ..add('expiresAt', expiresAt)
          ..add('maxUses', maxUses)
          ..add('usageCount', usageCount)
          ..add('lastUsedAt', lastUsedAt)
          ..add('status', status)
          ..add('label', label)
          ..add('usedByUserId', usedByUserId))
        .toString();
  }
}

class AdminInviteResponseBuilder
    implements
        Builder<AdminInviteResponse, AdminInviteResponseBuilder>,
        AdminInviteBuilder {
  _$AdminInviteResponse? _$v;

  String? _inviteCode;
  String? get inviteCode => _$this._inviteCode;
  set inviteCode(covariant String? inviteCode) =>
      _$this._inviteCode = inviteCode;

  String? _email;
  String? get email => _$this._email;
  set email(covariant String? email) => _$this._email = email;

  String? _createdBy;
  String? get createdBy => _$this._createdBy;
  set createdBy(covariant String? createdBy) => _$this._createdBy = createdBy;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(covariant DateTime? createdAt) => _$this._createdAt = createdAt;

  DateTime? _expiresAt;
  DateTime? get expiresAt => _$this._expiresAt;
  set expiresAt(covariant DateTime? expiresAt) => _$this._expiresAt = expiresAt;

  int? _maxUses;
  int? get maxUses => _$this._maxUses;
  set maxUses(covariant int? maxUses) => _$this._maxUses = maxUses;

  int? _usageCount;
  int? get usageCount => _$this._usageCount;
  set usageCount(covariant int? usageCount) => _$this._usageCount = usageCount;

  DateTime? _lastUsedAt;
  DateTime? get lastUsedAt => _$this._lastUsedAt;
  set lastUsedAt(covariant DateTime? lastUsedAt) =>
      _$this._lastUsedAt = lastUsedAt;

  AdminInviteStatus? _status;
  AdminInviteStatus? get status => _$this._status;
  set status(covariant AdminInviteStatus? status) => _$this._status = status;

  String? _label;
  String? get label => _$this._label;
  set label(covariant String? label) => _$this._label = label;

  String? _usedByUserId;
  String? get usedByUserId => _$this._usedByUserId;
  set usedByUserId(covariant String? usedByUserId) =>
      _$this._usedByUserId = usedByUserId;

  AdminInviteResponseBuilder() {
    AdminInviteResponse._defaults(this);
  }

  AdminInviteResponseBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _inviteCode = $v.inviteCode;
      _email = $v.email;
      _createdBy = $v.createdBy;
      _createdAt = $v.createdAt;
      _expiresAt = $v.expiresAt;
      _maxUses = $v.maxUses;
      _usageCount = $v.usageCount;
      _lastUsedAt = $v.lastUsedAt;
      _status = $v.status;
      _label = $v.label;
      _usedByUserId = $v.usedByUserId;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(covariant AdminInviteResponse other) {
    _$v = other as _$AdminInviteResponse;
  }

  @override
  void update(void Function(AdminInviteResponseBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminInviteResponse build() => _build();

  _$AdminInviteResponse _build() {
    final _$result = _$v ??
        _$AdminInviteResponse._(
          inviteCode: inviteCode,
          email: email,
          createdBy: createdBy,
          createdAt: createdAt,
          expiresAt: expiresAt,
          maxUses: maxUses,
          usageCount: usageCount,
          lastUsedAt: lastUsedAt,
          status: status,
          label: label,
          usedByUserId: usedByUserId,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
