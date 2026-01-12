// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_invite_batch_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminInviteBatchRequest extends AdminInviteBatchRequest {
  @override
  final int count;
  @override
  final int? expiresInDays;
  @override
  final int? maxUses;
  @override
  final String? label;

  factory _$AdminInviteBatchRequest(
          [void Function(AdminInviteBatchRequestBuilder)? updates]) =>
      (AdminInviteBatchRequestBuilder()..update(updates))._build();

  _$AdminInviteBatchRequest._(
      {required this.count, this.expiresInDays, this.maxUses, this.label})
      : super._();
  @override
  AdminInviteBatchRequest rebuild(
          void Function(AdminInviteBatchRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminInviteBatchRequestBuilder toBuilder() =>
      AdminInviteBatchRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminInviteBatchRequest &&
        count == other.count &&
        expiresInDays == other.expiresInDays &&
        maxUses == other.maxUses &&
        label == other.label;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, count.hashCode);
    _$hash = $jc(_$hash, expiresInDays.hashCode);
    _$hash = $jc(_$hash, maxUses.hashCode);
    _$hash = $jc(_$hash, label.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminInviteBatchRequest')
          ..add('count', count)
          ..add('expiresInDays', expiresInDays)
          ..add('maxUses', maxUses)
          ..add('label', label))
        .toString();
  }
}

class AdminInviteBatchRequestBuilder
    implements
        Builder<AdminInviteBatchRequest, AdminInviteBatchRequestBuilder> {
  _$AdminInviteBatchRequest? _$v;

  int? _count;
  int? get count => _$this._count;
  set count(int? count) => _$this._count = count;

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

  AdminInviteBatchRequestBuilder() {
    AdminInviteBatchRequest._defaults(this);
  }

  AdminInviteBatchRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _count = $v.count;
      _expiresInDays = $v.expiresInDays;
      _maxUses = $v.maxUses;
      _label = $v.label;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminInviteBatchRequest other) {
    _$v = other as _$AdminInviteBatchRequest;
  }

  @override
  void update(void Function(AdminInviteBatchRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminInviteBatchRequest build() => _build();

  _$AdminInviteBatchRequest _build() {
    final _$result = _$v ??
        _$AdminInviteBatchRequest._(
          count: BuiltValueNullFieldError.checkNotNull(
              count, r'AdminInviteBatchRequest', 'count'),
          expiresInDays: expiresInDays,
          maxUses: maxUses,
          label: label,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
