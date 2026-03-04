// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'get_feed200_response_meta.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$GetFeed200ResponseMeta extends GetFeed200ResponseMeta {
  @override
  final int count;
  @override
  final String? nextCursor;
  @override
  final BuiltMap<String, num>? timingsMs;
  @override
  final BuiltMap<String, JsonObject?>? applied;

  factory _$GetFeed200ResponseMeta(
          [void Function(GetFeed200ResponseMetaBuilder)? updates]) =>
      (GetFeed200ResponseMetaBuilder()..update(updates))._build();

  _$GetFeed200ResponseMeta._(
      {required this.count, this.nextCursor, this.timingsMs, this.applied})
      : super._();
  @override
  GetFeed200ResponseMeta rebuild(
          void Function(GetFeed200ResponseMetaBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  GetFeed200ResponseMetaBuilder toBuilder() =>
      GetFeed200ResponseMetaBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is GetFeed200ResponseMeta &&
        count == other.count &&
        nextCursor == other.nextCursor &&
        timingsMs == other.timingsMs &&
        applied == other.applied;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, count.hashCode);
    _$hash = $jc(_$hash, nextCursor.hashCode);
    _$hash = $jc(_$hash, timingsMs.hashCode);
    _$hash = $jc(_$hash, applied.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'GetFeed200ResponseMeta')
          ..add('count', count)
          ..add('nextCursor', nextCursor)
          ..add('timingsMs', timingsMs)
          ..add('applied', applied))
        .toString();
  }
}

class GetFeed200ResponseMetaBuilder
    implements Builder<GetFeed200ResponseMeta, GetFeed200ResponseMetaBuilder> {
  _$GetFeed200ResponseMeta? _$v;

  int? _count;
  int? get count => _$this._count;
  set count(int? count) => _$this._count = count;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  MapBuilder<String, num>? _timingsMs;
  MapBuilder<String, num> get timingsMs =>
      _$this._timingsMs ??= MapBuilder<String, num>();
  set timingsMs(MapBuilder<String, num>? timingsMs) =>
      _$this._timingsMs = timingsMs;

  MapBuilder<String, JsonObject?>? _applied;
  MapBuilder<String, JsonObject?> get applied =>
      _$this._applied ??= MapBuilder<String, JsonObject?>();
  set applied(MapBuilder<String, JsonObject?>? applied) =>
      _$this._applied = applied;

  GetFeed200ResponseMetaBuilder() {
    GetFeed200ResponseMeta._defaults(this);
  }

  GetFeed200ResponseMetaBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _count = $v.count;
      _nextCursor = $v.nextCursor;
      _timingsMs = $v.timingsMs?.toBuilder();
      _applied = $v.applied?.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(GetFeed200ResponseMeta other) {
    _$v = other as _$GetFeed200ResponseMeta;
  }

  @override
  void update(void Function(GetFeed200ResponseMetaBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  GetFeed200ResponseMeta build() => _build();

  _$GetFeed200ResponseMeta _build() {
    _$GetFeed200ResponseMeta _$result;
    try {
      _$result = _$v ??
          _$GetFeed200ResponseMeta._(
            count: BuiltValueNullFieldError.checkNotNull(
                count, r'GetFeed200ResponseMeta', 'count'),
            nextCursor: nextCursor,
            timingsMs: _timingsMs?.build(),
            applied: _applied?.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'timingsMs';
        _timingsMs?.build();
        _$failedField = 'applied';
        _applied?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'GetFeed200ResponseMeta', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
