// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_resolve_response.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminResolveResponse extends AdminResolveResponse {
  @override
  final bool? resolved;

  factory _$AdminResolveResponse(
          [void Function(AdminResolveResponseBuilder)? updates]) =>
      (AdminResolveResponseBuilder()..update(updates))._build();

  _$AdminResolveResponse._({this.resolved}) : super._();
  @override
  AdminResolveResponse rebuild(
          void Function(AdminResolveResponseBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminResolveResponseBuilder toBuilder() =>
      AdminResolveResponseBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminResolveResponse && resolved == other.resolved;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, resolved.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminResolveResponse')
          ..add('resolved', resolved))
        .toString();
  }
}

class AdminResolveResponseBuilder
    implements Builder<AdminResolveResponse, AdminResolveResponseBuilder> {
  _$AdminResolveResponse? _$v;

  bool? _resolved;
  bool? get resolved => _$this._resolved;
  set resolved(bool? resolved) => _$this._resolved = resolved;

  AdminResolveResponseBuilder() {
    AdminResolveResponse._defaults(this);
  }

  AdminResolveResponseBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _resolved = $v.resolved;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminResolveResponse other) {
    _$v = other as _$AdminResolveResponse;
  }

  @override
  void update(void Function(AdminResolveResponseBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminResolveResponse build() => _build();

  _$AdminResolveResponse _build() {
    final _$result = _$v ??
        _$AdminResolveResponse._(
          resolved: resolved,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
