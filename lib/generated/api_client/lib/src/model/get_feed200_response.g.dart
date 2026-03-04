// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'get_feed200_response.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$GetFeed200Response extends GetFeed200Response {
  @override
  final BuiltList<BuiltMap<String, JsonObject?>> items;
  @override
  final GetFeed200ResponseMeta meta;

  factory _$GetFeed200Response(
          [void Function(GetFeed200ResponseBuilder)? updates]) =>
      (GetFeed200ResponseBuilder()..update(updates))._build();

  _$GetFeed200Response._({required this.items, required this.meta}) : super._();
  @override
  GetFeed200Response rebuild(
          void Function(GetFeed200ResponseBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  GetFeed200ResponseBuilder toBuilder() =>
      GetFeed200ResponseBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is GetFeed200Response &&
        items == other.items &&
        meta == other.meta;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, items.hashCode);
    _$hash = $jc(_$hash, meta.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'GetFeed200Response')
          ..add('items', items)
          ..add('meta', meta))
        .toString();
  }
}

class GetFeed200ResponseBuilder
    implements Builder<GetFeed200Response, GetFeed200ResponseBuilder> {
  _$GetFeed200Response? _$v;

  ListBuilder<BuiltMap<String, JsonObject?>>? _items;
  ListBuilder<BuiltMap<String, JsonObject?>> get items =>
      _$this._items ??= ListBuilder<BuiltMap<String, JsonObject?>>();
  set items(ListBuilder<BuiltMap<String, JsonObject?>>? items) =>
      _$this._items = items;

  GetFeed200ResponseMetaBuilder? _meta;
  GetFeed200ResponseMetaBuilder get meta =>
      _$this._meta ??= GetFeed200ResponseMetaBuilder();
  set meta(GetFeed200ResponseMetaBuilder? meta) => _$this._meta = meta;

  GetFeed200ResponseBuilder() {
    GetFeed200Response._defaults(this);
  }

  GetFeed200ResponseBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _meta = $v.meta.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(GetFeed200Response other) {
    _$v = other as _$GetFeed200Response;
  }

  @override
  void update(void Function(GetFeed200ResponseBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  GetFeed200Response build() => _build();

  _$GetFeed200Response _build() {
    _$GetFeed200Response _$result;
    try {
      _$result = _$v ??
          _$GetFeed200Response._(
            items: items.build(),
            meta: meta.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
        _$failedField = 'meta';
        meta.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'GetFeed200Response', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
