//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'rate_limit_error.g.dart';

/// RateLimitError
///
/// Properties:
/// * [error] - Constant identifier for rate limit breaches
/// * [scope] - Scope of the limit that triggered the breach
/// * [limit] - Maximum requests permitted within the window
/// * [windowSeconds] - Window size for the limit in seconds
/// * [retryAfterSeconds] - Seconds until the limit resets
/// * [traceId] - Correlation identifier for tracing
/// * [reason] - Additional context for specialized scopes (e.g. auth backoff)
@BuiltValue()
abstract class RateLimitError implements Built<RateLimitError, RateLimitErrorBuilder> {
  /// Constant identifier for rate limit breaches
  @BuiltValueField(wireName: r'error')
  RateLimitErrorErrorEnum get error;
  // enum errorEnum {  rate_limited,  };

  /// Scope of the limit that triggered the breach
  @BuiltValueField(wireName: r'scope')
  RateLimitErrorScopeEnum get scope;
  // enum scopeEnum {  ip,  user,  route,  auth_backoff,  };

  /// Maximum requests permitted within the window
  @BuiltValueField(wireName: r'limit')
  int get limit;

  /// Window size for the limit in seconds
  @BuiltValueField(wireName: r'window_seconds')
  int get windowSeconds;

  /// Seconds until the limit resets
  @BuiltValueField(wireName: r'retry_after_seconds')
  int get retryAfterSeconds;

  /// Correlation identifier for tracing
  @BuiltValueField(wireName: r'trace_id')
  String get traceId;

  /// Additional context for specialized scopes (e.g. auth backoff)
  @BuiltValueField(wireName: r'reason')
  RateLimitErrorReasonEnum? get reason;
  // enum reasonEnum {  auth_backoff,  };

  RateLimitError._();

  factory RateLimitError([void updates(RateLimitErrorBuilder b)]) = _$RateLimitError;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(RateLimitErrorBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<RateLimitError> get serializer => _$RateLimitErrorSerializer();
}

class _$RateLimitErrorSerializer implements PrimitiveSerializer<RateLimitError> {
  @override
  final Iterable<Type> types = const [RateLimitError, _$RateLimitError];

  @override
  final String wireName = r'RateLimitError';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    RateLimitError object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'error';
    yield serializers.serialize(
      object.error,
      specifiedType: const FullType(RateLimitErrorErrorEnum),
    );
    yield r'scope';
    yield serializers.serialize(
      object.scope,
      specifiedType: const FullType(RateLimitErrorScopeEnum),
    );
    yield r'limit';
    yield serializers.serialize(
      object.limit,
      specifiedType: const FullType(int),
    );
    yield r'window_seconds';
    yield serializers.serialize(
      object.windowSeconds,
      specifiedType: const FullType(int),
    );
    yield r'retry_after_seconds';
    yield serializers.serialize(
      object.retryAfterSeconds,
      specifiedType: const FullType(int),
    );
    yield r'trace_id';
    yield serializers.serialize(
      object.traceId,
      specifiedType: const FullType(String),
    );
    if (object.reason != null) {
      yield r'reason';
      yield serializers.serialize(
        object.reason,
        specifiedType: const FullType(RateLimitErrorReasonEnum),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    RateLimitError object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required RateLimitErrorBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'error':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(RateLimitErrorErrorEnum),
          ) as RateLimitErrorErrorEnum;
          result.error = valueDes;
          break;
        case r'scope':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(RateLimitErrorScopeEnum),
          ) as RateLimitErrorScopeEnum;
          result.scope = valueDes;
          break;
        case r'limit':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.limit = valueDes;
          break;
        case r'window_seconds':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.windowSeconds = valueDes;
          break;
        case r'retry_after_seconds':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.retryAfterSeconds = valueDes;
          break;
        case r'trace_id':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.traceId = valueDes;
          break;
        case r'reason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(RateLimitErrorReasonEnum),
          ) as RateLimitErrorReasonEnum;
          result.reason = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  RateLimitError deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = RateLimitErrorBuilder();
    final serializedList = (serialized as Iterable<Object?>).toList();
    final unhandled = <Object?>[];
    _deserializeProperties(
      serializers,
      serialized,
      specifiedType: specifiedType,
      serializedList: serializedList,
      unhandled: unhandled,
      result: result,
    );
    return result.build();
  }
}

class RateLimitErrorErrorEnum extends EnumClass {

  /// Constant identifier for rate limit breaches
  @BuiltValueEnumConst(wireName: r'rate_limited')
  static const RateLimitErrorErrorEnum rateLimited = _$rateLimitErrorErrorEnum_rateLimited;

  static Serializer<RateLimitErrorErrorEnum> get serializer => _$rateLimitErrorErrorEnumSerializer;

  const RateLimitErrorErrorEnum._(String name): super(name);

  static BuiltSet<RateLimitErrorErrorEnum> get values => _$rateLimitErrorErrorEnumValues;
  static RateLimitErrorErrorEnum valueOf(String name) => _$rateLimitErrorErrorEnumValueOf(name);
}

class RateLimitErrorScopeEnum extends EnumClass {

  /// Scope of the limit that triggered the breach
  @BuiltValueEnumConst(wireName: r'ip')
  static const RateLimitErrorScopeEnum ip = _$rateLimitErrorScopeEnum_ip;
  /// Scope of the limit that triggered the breach
  @BuiltValueEnumConst(wireName: r'user')
  static const RateLimitErrorScopeEnum user = _$rateLimitErrorScopeEnum_user;
  /// Scope of the limit that triggered the breach
  @BuiltValueEnumConst(wireName: r'route')
  static const RateLimitErrorScopeEnum route = _$rateLimitErrorScopeEnum_route;
  /// Scope of the limit that triggered the breach
  @BuiltValueEnumConst(wireName: r'auth_backoff')
  static const RateLimitErrorScopeEnum authBackoff = _$rateLimitErrorScopeEnum_authBackoff;

  static Serializer<RateLimitErrorScopeEnum> get serializer => _$rateLimitErrorScopeEnumSerializer;

  const RateLimitErrorScopeEnum._(String name): super(name);

  static BuiltSet<RateLimitErrorScopeEnum> get values => _$rateLimitErrorScopeEnumValues;
  static RateLimitErrorScopeEnum valueOf(String name) => _$rateLimitErrorScopeEnumValueOf(name);
}

class RateLimitErrorReasonEnum extends EnumClass {

  /// Additional context for specialized scopes (e.g. auth backoff)
  @BuiltValueEnumConst(wireName: r'auth_backoff')
  static const RateLimitErrorReasonEnum authBackoff = _$rateLimitErrorReasonEnum_authBackoff;

  static Serializer<RateLimitErrorReasonEnum> get serializer => _$rateLimitErrorReasonEnumSerializer;

  const RateLimitErrorReasonEnum._(String name): super(name);

  static BuiltSet<RateLimitErrorReasonEnum> get values => _$rateLimitErrorReasonEnumValues;
  static RateLimitErrorReasonEnum valueOf(String name) => _$rateLimitErrorReasonEnumValueOf(name);
}

