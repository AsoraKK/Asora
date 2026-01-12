// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_flag_queue_response.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminFlagQueueResponse extends AdminFlagQueueResponse {
  @override
  final BuiltList<AdminFlagQueueItem> items;
  @override
  final String? nextCursor;
  @override
  final int count;

  factory _$AdminFlagQueueResponse(
          [void Function(AdminFlagQueueResponseBuilder)? updates]) =>
      (AdminFlagQueueResponseBuilder()..update(updates))._build();

  _$AdminFlagQueueResponse._(
      {required this.items, this.nextCursor, required this.count})
      : super._();
  @override
  AdminFlagQueueResponse rebuild(
          void Function(AdminFlagQueueResponseBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminFlagQueueResponseBuilder toBuilder() =>
      AdminFlagQueueResponseBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminFlagQueueResponse &&
        items == other.items &&
        nextCursor == other.nextCursor &&
        count == other.count;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, items.hashCode);
    _$hash = $jc(_$hash, nextCursor.hashCode);
    _$hash = $jc(_$hash, count.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminFlagQueueResponse')
          ..add('items', items)
          ..add('nextCursor', nextCursor)
          ..add('count', count))
        .toString();
  }
}

class AdminFlagQueueResponseBuilder
    implements Builder<AdminFlagQueueResponse, AdminFlagQueueResponseBuilder> {
  _$AdminFlagQueueResponse? _$v;

  ListBuilder<AdminFlagQueueItem>? _items;
  ListBuilder<AdminFlagQueueItem> get items =>
      _$this._items ??= ListBuilder<AdminFlagQueueItem>();
  set items(ListBuilder<AdminFlagQueueItem>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  int? _count;
  int? get count => _$this._count;
  set count(int? count) => _$this._count = count;

  AdminFlagQueueResponseBuilder() {
    AdminFlagQueueResponse._defaults(this);
  }

  AdminFlagQueueResponseBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _nextCursor = $v.nextCursor;
      _count = $v.count;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminFlagQueueResponse other) {
    _$v = other as _$AdminFlagQueueResponse;
  }

  @override
  void update(void Function(AdminFlagQueueResponseBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminFlagQueueResponse build() => _build();

  _$AdminFlagQueueResponse _build() {
    _$AdminFlagQueueResponse _$result;
    try {
      _$result = _$v ??
          _$AdminFlagQueueResponse._(
            items: items.build(),
            nextCursor: nextCursor,
            count: BuiltValueNullFieldError.checkNotNull(
                count, r'AdminFlagQueueResponse', 'count'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'AdminFlagQueueResponse', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
