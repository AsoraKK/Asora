// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_appeal_queue_response.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminAppealQueueResponse extends AdminAppealQueueResponse {
  @override
  final BuiltList<AdminAppealQueueItem> items;
  @override
  final String? nextCursor;
  @override
  final int count;

  factory _$AdminAppealQueueResponse(
          [void Function(AdminAppealQueueResponseBuilder)? updates]) =>
      (AdminAppealQueueResponseBuilder()..update(updates))._build();

  _$AdminAppealQueueResponse._(
      {required this.items, this.nextCursor, required this.count})
      : super._();
  @override
  AdminAppealQueueResponse rebuild(
          void Function(AdminAppealQueueResponseBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminAppealQueueResponseBuilder toBuilder() =>
      AdminAppealQueueResponseBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminAppealQueueResponse &&
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
    return (newBuiltValueToStringHelper(r'AdminAppealQueueResponse')
          ..add('items', items)
          ..add('nextCursor', nextCursor)
          ..add('count', count))
        .toString();
  }
}

class AdminAppealQueueResponseBuilder
    implements
        Builder<AdminAppealQueueResponse, AdminAppealQueueResponseBuilder> {
  _$AdminAppealQueueResponse? _$v;

  ListBuilder<AdminAppealQueueItem>? _items;
  ListBuilder<AdminAppealQueueItem> get items =>
      _$this._items ??= ListBuilder<AdminAppealQueueItem>();
  set items(ListBuilder<AdminAppealQueueItem>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  int? _count;
  int? get count => _$this._count;
  set count(int? count) => _$this._count = count;

  AdminAppealQueueResponseBuilder() {
    AdminAppealQueueResponse._defaults(this);
  }

  AdminAppealQueueResponseBuilder get _$this {
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
  void replace(AdminAppealQueueResponse other) {
    _$v = other as _$AdminAppealQueueResponse;
  }

  @override
  void update(void Function(AdminAppealQueueResponseBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminAppealQueueResponse build() => _build();

  _$AdminAppealQueueResponse _build() {
    _$AdminAppealQueueResponse _$result;
    try {
      _$result = _$v ??
          _$AdminAppealQueueResponse._(
            items: items.build(),
            nextCursor: nextCursor,
            count: BuiltValueNullFieldError.checkNotNull(
                count, r'AdminAppealQueueResponse', 'count'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'AdminAppealQueueResponse', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
