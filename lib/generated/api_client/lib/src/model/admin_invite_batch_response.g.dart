// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_invite_batch_response.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminInviteBatchResponse extends AdminInviteBatchResponse {
  @override
  final int count;
  @override
  final BuiltList<AdminInvite> invites;

  factory _$AdminInviteBatchResponse(
          [void Function(AdminInviteBatchResponseBuilder)? updates]) =>
      (AdminInviteBatchResponseBuilder()..update(updates))._build();

  _$AdminInviteBatchResponse._({required this.count, required this.invites})
      : super._();
  @override
  AdminInviteBatchResponse rebuild(
          void Function(AdminInviteBatchResponseBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminInviteBatchResponseBuilder toBuilder() =>
      AdminInviteBatchResponseBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminInviteBatchResponse &&
        count == other.count &&
        invites == other.invites;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, count.hashCode);
    _$hash = $jc(_$hash, invites.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminInviteBatchResponse')
          ..add('count', count)
          ..add('invites', invites))
        .toString();
  }
}

class AdminInviteBatchResponseBuilder
    implements
        Builder<AdminInviteBatchResponse, AdminInviteBatchResponseBuilder> {
  _$AdminInviteBatchResponse? _$v;

  int? _count;
  int? get count => _$this._count;
  set count(int? count) => _$this._count = count;

  ListBuilder<AdminInvite>? _invites;
  ListBuilder<AdminInvite> get invites =>
      _$this._invites ??= ListBuilder<AdminInvite>();
  set invites(ListBuilder<AdminInvite>? invites) => _$this._invites = invites;

  AdminInviteBatchResponseBuilder() {
    AdminInviteBatchResponse._defaults(this);
  }

  AdminInviteBatchResponseBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _count = $v.count;
      _invites = $v.invites.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminInviteBatchResponse other) {
    _$v = other as _$AdminInviteBatchResponse;
  }

  @override
  void update(void Function(AdminInviteBatchResponseBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminInviteBatchResponse build() => _build();

  _$AdminInviteBatchResponse _build() {
    _$AdminInviteBatchResponse _$result;
    try {
      _$result = _$v ??
          _$AdminInviteBatchResponse._(
            count: BuiltValueNullFieldError.checkNotNull(
                count, r'AdminInviteBatchResponse', 'count'),
            invites: invites.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'invites';
        invites.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'AdminInviteBatchResponse', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
