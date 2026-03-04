// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_invite.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

abstract class AdminInviteBuilder {
  void replace(AdminInvite other);
  void update(void Function(AdminInviteBuilder) updates);
  String? get inviteCode;
  set inviteCode(String? inviteCode);

  String? get email;
  set email(String? email);

  String? get createdBy;
  set createdBy(String? createdBy);

  DateTime? get createdAt;
  set createdAt(DateTime? createdAt);

  DateTime? get expiresAt;
  set expiresAt(DateTime? expiresAt);

  int? get maxUses;
  set maxUses(int? maxUses);

  int? get usageCount;
  set usageCount(int? usageCount);

  DateTime? get lastUsedAt;
  set lastUsedAt(DateTime? lastUsedAt);

  AdminInviteStatus? get status;
  set status(AdminInviteStatus? status);

  String? get label;
  set label(String? label);

  String? get usedByUserId;
  set usedByUserId(String? usedByUserId);
}

class _$$AdminInvite extends $AdminInvite {
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

  factory _$$AdminInvite([void Function($AdminInviteBuilder)? updates]) =>
      ($AdminInviteBuilder()..update(updates))._build();

  _$$AdminInvite._(
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
  $AdminInvite rebuild(void Function($AdminInviteBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  $AdminInviteBuilder toBuilder() => $AdminInviteBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is $AdminInvite &&
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
    return (newBuiltValueToStringHelper(r'$AdminInvite')
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

class $AdminInviteBuilder
    implements Builder<$AdminInvite, $AdminInviteBuilder>, AdminInviteBuilder {
  _$$AdminInvite? _$v;

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

  $AdminInviteBuilder() {
    $AdminInvite._defaults(this);
  }

  $AdminInviteBuilder get _$this {
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
  void replace(covariant $AdminInvite other) {
    _$v = other as _$$AdminInvite;
  }

  @override
  void update(void Function($AdminInviteBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  $AdminInvite build() => _build();

  _$$AdminInvite _build() {
    final _$result = _$v ??
        _$$AdminInvite._(
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
