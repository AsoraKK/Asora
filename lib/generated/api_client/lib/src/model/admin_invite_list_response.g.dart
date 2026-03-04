// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_invite_list_response.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminInviteListResponse extends AdminInviteListResponse {
  @override
  final BuiltList<AdminInvite> invites;
  @override
  final int count;
  @override
  final String? nextCursor;

  factory _$AdminInviteListResponse(
          [void Function(AdminInviteListResponseBuilder)? updates]) =>
      (AdminInviteListResponseBuilder()..update(updates))._build();

  _$AdminInviteListResponse._(
      {required this.invites, required this.count, this.nextCursor})
      : super._();
  @override
  AdminInviteListResponse rebuild(
          void Function(AdminInviteListResponseBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminInviteListResponseBuilder toBuilder() =>
      AdminInviteListResponseBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminInviteListResponse &&
        invites == other.invites &&
        count == other.count &&
        nextCursor == other.nextCursor;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, invites.hashCode);
    _$hash = $jc(_$hash, count.hashCode);
    _$hash = $jc(_$hash, nextCursor.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminInviteListResponse')
          ..add('invites', invites)
          ..add('count', count)
          ..add('nextCursor', nextCursor))
        .toString();
  }
}

class AdminInviteListResponseBuilder
    implements
        Builder<AdminInviteListResponse, AdminInviteListResponseBuilder> {
  _$AdminInviteListResponse? _$v;

  ListBuilder<AdminInvite>? _invites;
  ListBuilder<AdminInvite> get invites =>
      _$this._invites ??= ListBuilder<AdminInvite>();
  set invites(ListBuilder<AdminInvite>? invites) => _$this._invites = invites;

  int? _count;
  int? get count => _$this._count;
  set count(int? count) => _$this._count = count;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  AdminInviteListResponseBuilder() {
    AdminInviteListResponse._defaults(this);
  }

  AdminInviteListResponseBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _invites = $v.invites.toBuilder();
      _count = $v.count;
      _nextCursor = $v.nextCursor;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminInviteListResponse other) {
    _$v = other as _$AdminInviteListResponse;
  }

  @override
  void update(void Function(AdminInviteListResponseBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminInviteListResponse build() => _build();

  _$AdminInviteListResponse _build() {
    _$AdminInviteListResponse _$result;
    try {
      _$result = _$v ??
          _$AdminInviteListResponse._(
            invites: invites.build(),
            count: BuiltValueNullFieldError.checkNotNull(
                count, r'AdminInviteListResponse', 'count'),
            nextCursor: nextCursor,
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'invites';
        invites.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'AdminInviteListResponse', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
