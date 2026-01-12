// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'rate_limit_error.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const RateLimitErrorErrorEnum _$rateLimitErrorErrorEnum_rateLimited =
    const RateLimitErrorErrorEnum._('rateLimited');

RateLimitErrorErrorEnum _$rateLimitErrorErrorEnumValueOf(String name) {
  switch (name) {
    case 'rateLimited':
      return _$rateLimitErrorErrorEnum_rateLimited;
    default:
      throw ArgumentError(name);
  }
}

final BuiltSet<RateLimitErrorErrorEnum> _$rateLimitErrorErrorEnumValues =
    BuiltSet<RateLimitErrorErrorEnum>(const <RateLimitErrorErrorEnum>[
  _$rateLimitErrorErrorEnum_rateLimited,
]);

const RateLimitErrorScopeEnum _$rateLimitErrorScopeEnum_ip =
    const RateLimitErrorScopeEnum._('ip');
const RateLimitErrorScopeEnum _$rateLimitErrorScopeEnum_user =
    const RateLimitErrorScopeEnum._('user');
const RateLimitErrorScopeEnum _$rateLimitErrorScopeEnum_route =
    const RateLimitErrorScopeEnum._('route');
const RateLimitErrorScopeEnum _$rateLimitErrorScopeEnum_authBackoff =
    const RateLimitErrorScopeEnum._('authBackoff');

RateLimitErrorScopeEnum _$rateLimitErrorScopeEnumValueOf(String name) {
  switch (name) {
    case 'ip':
      return _$rateLimitErrorScopeEnum_ip;
    case 'user':
      return _$rateLimitErrorScopeEnum_user;
    case 'route':
      return _$rateLimitErrorScopeEnum_route;
    case 'authBackoff':
      return _$rateLimitErrorScopeEnum_authBackoff;
    default:
      throw ArgumentError(name);
  }
}

final BuiltSet<RateLimitErrorScopeEnum> _$rateLimitErrorScopeEnumValues =
    BuiltSet<RateLimitErrorScopeEnum>(const <RateLimitErrorScopeEnum>[
  _$rateLimitErrorScopeEnum_ip,
  _$rateLimitErrorScopeEnum_user,
  _$rateLimitErrorScopeEnum_route,
  _$rateLimitErrorScopeEnum_authBackoff,
]);

const RateLimitErrorReasonEnum _$rateLimitErrorReasonEnum_authBackoff =
    const RateLimitErrorReasonEnum._('authBackoff');

RateLimitErrorReasonEnum _$rateLimitErrorReasonEnumValueOf(String name) {
  switch (name) {
    case 'authBackoff':
      return _$rateLimitErrorReasonEnum_authBackoff;
    default:
      throw ArgumentError(name);
  }
}

final BuiltSet<RateLimitErrorReasonEnum> _$rateLimitErrorReasonEnumValues =
    BuiltSet<RateLimitErrorReasonEnum>(const <RateLimitErrorReasonEnum>[
  _$rateLimitErrorReasonEnum_authBackoff,
]);

Serializer<RateLimitErrorErrorEnum> _$rateLimitErrorErrorEnumSerializer =
    _$RateLimitErrorErrorEnumSerializer();
Serializer<RateLimitErrorScopeEnum> _$rateLimitErrorScopeEnumSerializer =
    _$RateLimitErrorScopeEnumSerializer();
Serializer<RateLimitErrorReasonEnum> _$rateLimitErrorReasonEnumSerializer =
    _$RateLimitErrorReasonEnumSerializer();

class _$RateLimitErrorErrorEnumSerializer
    implements PrimitiveSerializer<RateLimitErrorErrorEnum> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'rateLimited': 'rate_limited',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'rate_limited': 'rateLimited',
  };

  @override
  final Iterable<Type> types = const <Type>[RateLimitErrorErrorEnum];
  @override
  final String wireName = 'RateLimitErrorErrorEnum';

  @override
  Object serialize(Serializers serializers, RateLimitErrorErrorEnum object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  RateLimitErrorErrorEnum deserialize(
          Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      RateLimitErrorErrorEnum.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

class _$RateLimitErrorScopeEnumSerializer
    implements PrimitiveSerializer<RateLimitErrorScopeEnum> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'ip': 'ip',
    'user': 'user',
    'route': 'route',
    'authBackoff': 'auth_backoff',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'ip': 'ip',
    'user': 'user',
    'route': 'route',
    'auth_backoff': 'authBackoff',
  };

  @override
  final Iterable<Type> types = const <Type>[RateLimitErrorScopeEnum];
  @override
  final String wireName = 'RateLimitErrorScopeEnum';

  @override
  Object serialize(Serializers serializers, RateLimitErrorScopeEnum object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  RateLimitErrorScopeEnum deserialize(
          Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      RateLimitErrorScopeEnum.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

class _$RateLimitErrorReasonEnumSerializer
    implements PrimitiveSerializer<RateLimitErrorReasonEnum> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'authBackoff': 'auth_backoff',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'auth_backoff': 'authBackoff',
  };

  @override
  final Iterable<Type> types = const <Type>[RateLimitErrorReasonEnum];
  @override
  final String wireName = 'RateLimitErrorReasonEnum';

  @override
  Object serialize(Serializers serializers, RateLimitErrorReasonEnum object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  RateLimitErrorReasonEnum deserialize(
          Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      RateLimitErrorReasonEnum.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

class _$RateLimitError extends RateLimitError {
  @override
  final RateLimitErrorErrorEnum error;
  @override
  final RateLimitErrorScopeEnum scope;
  @override
  final int limit;
  @override
  final int windowSeconds;
  @override
  final int retryAfterSeconds;
  @override
  final String traceId;
  @override
  final RateLimitErrorReasonEnum? reason;

  factory _$RateLimitError([void Function(RateLimitErrorBuilder)? updates]) =>
      (RateLimitErrorBuilder()..update(updates))._build();

  _$RateLimitError._(
      {required this.error,
      required this.scope,
      required this.limit,
      required this.windowSeconds,
      required this.retryAfterSeconds,
      required this.traceId,
      this.reason})
      : super._();
  @override
  RateLimitError rebuild(void Function(RateLimitErrorBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  RateLimitErrorBuilder toBuilder() => RateLimitErrorBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is RateLimitError &&
        error == other.error &&
        scope == other.scope &&
        limit == other.limit &&
        windowSeconds == other.windowSeconds &&
        retryAfterSeconds == other.retryAfterSeconds &&
        traceId == other.traceId &&
        reason == other.reason;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, error.hashCode);
    _$hash = $jc(_$hash, scope.hashCode);
    _$hash = $jc(_$hash, limit.hashCode);
    _$hash = $jc(_$hash, windowSeconds.hashCode);
    _$hash = $jc(_$hash, retryAfterSeconds.hashCode);
    _$hash = $jc(_$hash, traceId.hashCode);
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'RateLimitError')
          ..add('error', error)
          ..add('scope', scope)
          ..add('limit', limit)
          ..add('windowSeconds', windowSeconds)
          ..add('retryAfterSeconds', retryAfterSeconds)
          ..add('traceId', traceId)
          ..add('reason', reason))
        .toString();
  }
}

class RateLimitErrorBuilder
    implements Builder<RateLimitError, RateLimitErrorBuilder> {
  _$RateLimitError? _$v;

  RateLimitErrorErrorEnum? _error;
  RateLimitErrorErrorEnum? get error => _$this._error;
  set error(RateLimitErrorErrorEnum? error) => _$this._error = error;

  RateLimitErrorScopeEnum? _scope;
  RateLimitErrorScopeEnum? get scope => _$this._scope;
  set scope(RateLimitErrorScopeEnum? scope) => _$this._scope = scope;

  int? _limit;
  int? get limit => _$this._limit;
  set limit(int? limit) => _$this._limit = limit;

  int? _windowSeconds;
  int? get windowSeconds => _$this._windowSeconds;
  set windowSeconds(int? windowSeconds) =>
      _$this._windowSeconds = windowSeconds;

  int? _retryAfterSeconds;
  int? get retryAfterSeconds => _$this._retryAfterSeconds;
  set retryAfterSeconds(int? retryAfterSeconds) =>
      _$this._retryAfterSeconds = retryAfterSeconds;

  String? _traceId;
  String? get traceId => _$this._traceId;
  set traceId(String? traceId) => _$this._traceId = traceId;

  RateLimitErrorReasonEnum? _reason;
  RateLimitErrorReasonEnum? get reason => _$this._reason;
  set reason(RateLimitErrorReasonEnum? reason) => _$this._reason = reason;

  RateLimitErrorBuilder() {
    RateLimitError._defaults(this);
  }

  RateLimitErrorBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _error = $v.error;
      _scope = $v.scope;
      _limit = $v.limit;
      _windowSeconds = $v.windowSeconds;
      _retryAfterSeconds = $v.retryAfterSeconds;
      _traceId = $v.traceId;
      _reason = $v.reason;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(RateLimitError other) {
    _$v = other as _$RateLimitError;
  }

  @override
  void update(void Function(RateLimitErrorBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  RateLimitError build() => _build();

  _$RateLimitError _build() {
    final _$result = _$v ??
        _$RateLimitError._(
          error: BuiltValueNullFieldError.checkNotNull(
              error, r'RateLimitError', 'error'),
          scope: BuiltValueNullFieldError.checkNotNull(
              scope, r'RateLimitError', 'scope'),
          limit: BuiltValueNullFieldError.checkNotNull(
              limit, r'RateLimitError', 'limit'),
          windowSeconds: BuiltValueNullFieldError.checkNotNull(
              windowSeconds, r'RateLimitError', 'windowSeconds'),
          retryAfterSeconds: BuiltValueNullFieldError.checkNotNull(
              retryAfterSeconds, r'RateLimitError', 'retryAfterSeconds'),
          traceId: BuiltValueNullFieldError.checkNotNull(
              traceId, r'RateLimitError', 'traceId'),
          reason: reason,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
