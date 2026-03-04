// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_user_summary.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminUserSummary extends AdminUserSummary {
  @override
  final String? userId;
  @override
  final String? displayName;
  @override
  final String? handle;
  @override
  final String? email;
  @override
  final DateTime? createdAt;
  @override
  final AdminUserStatus? status;

  factory _$AdminUserSummary(
          [void Function(AdminUserSummaryBuilder)? updates]) =>
      (AdminUserSummaryBuilder()..update(updates))._build();

  _$AdminUserSummary._(
      {this.userId,
      this.displayName,
      this.handle,
      this.email,
      this.createdAt,
      this.status})
      : super._();
  @override
  AdminUserSummary rebuild(void Function(AdminUserSummaryBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminUserSummaryBuilder toBuilder() =>
      AdminUserSummaryBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminUserSummary &&
        userId == other.userId &&
        displayName == other.displayName &&
        handle == other.handle &&
        email == other.email &&
        createdAt == other.createdAt &&
        status == other.status;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, userId.hashCode);
    _$hash = $jc(_$hash, displayName.hashCode);
    _$hash = $jc(_$hash, handle.hashCode);
    _$hash = $jc(_$hash, email.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminUserSummary')
          ..add('userId', userId)
          ..add('displayName', displayName)
          ..add('handle', handle)
          ..add('email', email)
          ..add('createdAt', createdAt)
          ..add('status', status))
        .toString();
  }
}

class AdminUserSummaryBuilder
    implements Builder<AdminUserSummary, AdminUserSummaryBuilder> {
  _$AdminUserSummary? _$v;

  String? _userId;
  String? get userId => _$this._userId;
  set userId(String? userId) => _$this._userId = userId;

  String? _displayName;
  String? get displayName => _$this._displayName;
  set displayName(String? displayName) => _$this._displayName = displayName;

  String? _handle;
  String? get handle => _$this._handle;
  set handle(String? handle) => _$this._handle = handle;

  String? _email;
  String? get email => _$this._email;
  set email(String? email) => _$this._email = email;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  AdminUserStatus? _status;
  AdminUserStatus? get status => _$this._status;
  set status(AdminUserStatus? status) => _$this._status = status;

  AdminUserSummaryBuilder() {
    AdminUserSummary._defaults(this);
  }

  AdminUserSummaryBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _userId = $v.userId;
      _displayName = $v.displayName;
      _handle = $v.handle;
      _email = $v.email;
      _createdAt = $v.createdAt;
      _status = $v.status;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminUserSummary other) {
    _$v = other as _$AdminUserSummary;
  }

  @override
  void update(void Function(AdminUserSummaryBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminUserSummary build() => _build();

  _$AdminUserSummary _build() {
    final _$result = _$v ??
        _$AdminUserSummary._(
          userId: userId,
          displayName: displayName,
          handle: handle,
          email: email,
          createdAt: createdAt,
          status: status,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
