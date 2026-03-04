// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_user_search_response.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminUserSearchResponse extends AdminUserSearchResponse {
  @override
  final BuiltList<AdminUserSummary> items;
  @override
  final int count;

  factory _$AdminUserSearchResponse(
          [void Function(AdminUserSearchResponseBuilder)? updates]) =>
      (AdminUserSearchResponseBuilder()..update(updates))._build();

  _$AdminUserSearchResponse._({required this.items, required this.count})
      : super._();
  @override
  AdminUserSearchResponse rebuild(
          void Function(AdminUserSearchResponseBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminUserSearchResponseBuilder toBuilder() =>
      AdminUserSearchResponseBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminUserSearchResponse &&
        items == other.items &&
        count == other.count;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, items.hashCode);
    _$hash = $jc(_$hash, count.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminUserSearchResponse')
          ..add('items', items)
          ..add('count', count))
        .toString();
  }
}

class AdminUserSearchResponseBuilder
    implements
        Builder<AdminUserSearchResponse, AdminUserSearchResponseBuilder> {
  _$AdminUserSearchResponse? _$v;

  ListBuilder<AdminUserSummary>? _items;
  ListBuilder<AdminUserSummary> get items =>
      _$this._items ??= ListBuilder<AdminUserSummary>();
  set items(ListBuilder<AdminUserSummary>? items) => _$this._items = items;

  int? _count;
  int? get count => _$this._count;
  set count(int? count) => _$this._count = count;

  AdminUserSearchResponseBuilder() {
    AdminUserSearchResponse._defaults(this);
  }

  AdminUserSearchResponseBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _count = $v.count;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminUserSearchResponse other) {
    _$v = other as _$AdminUserSearchResponse;
  }

  @override
  void update(void Function(AdminUserSearchResponseBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminUserSearchResponse build() => _build();

  _$AdminUserSearchResponse _build() {
    _$AdminUserSearchResponse _$result;
    try {
      _$result = _$v ??
          _$AdminUserSearchResponse._(
            items: items.build(),
            count: BuiltValueNullFieldError.checkNotNull(
                count, r'AdminUserSearchResponse', 'count'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'AdminUserSearchResponse', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
