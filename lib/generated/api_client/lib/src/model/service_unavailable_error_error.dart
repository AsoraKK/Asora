//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'service_unavailable_error_error.g.dart';

/// ServiceUnavailableErrorError
///
/// Properties:
/// * [code] 
/// * [message] 
/// * [retryAfterSeconds] - Suggested number of seconds to wait before retrying
/// * [correlationId] 
@BuiltValue()
abstract class ServiceUnavailableErrorError implements Built<ServiceUnavailableErrorError, ServiceUnavailableErrorErrorBuilder> {
  @BuiltValueField(wireName: r'code')
  ServiceUnavailableErrorErrorCodeEnum get code;
  // enum codeEnum {  SERVICE_UNAVAILABLE,  DEPENDENCY_UNAVAILABLE,  MAINTENANCE,  };

  @BuiltValueField(wireName: r'message')
  String get message;

  /// Suggested number of seconds to wait before retrying
  @BuiltValueField(wireName: r'retryAfterSeconds')
  int? get retryAfterSeconds;

  @BuiltValueField(wireName: r'correlationId')
  String? get correlationId;

  ServiceUnavailableErrorError._();

  factory ServiceUnavailableErrorError([void updates(ServiceUnavailableErrorErrorBuilder b)]) = _$ServiceUnavailableErrorError;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ServiceUnavailableErrorErrorBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ServiceUnavailableErrorError> get serializer => _$ServiceUnavailableErrorErrorSerializer();
}

class _$ServiceUnavailableErrorErrorSerializer implements PrimitiveSerializer<ServiceUnavailableErrorError> {
  @override
  final Iterable<Type> types = const [ServiceUnavailableErrorError, _$ServiceUnavailableErrorError];

  @override
  final String wireName = r'ServiceUnavailableErrorError';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ServiceUnavailableErrorError object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'code';
    yield serializers.serialize(
      object.code,
      specifiedType: const FullType(ServiceUnavailableErrorErrorCodeEnum),
    );
    yield r'message';
    yield serializers.serialize(
      object.message,
      specifiedType: const FullType(String),
    );
    if (object.retryAfterSeconds != null) {
      yield r'retryAfterSeconds';
      yield serializers.serialize(
        object.retryAfterSeconds,
        specifiedType: const FullType(int),
      );
    }
    if (object.correlationId != null) {
      yield r'correlationId';
      yield serializers.serialize(
        object.correlationId,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    ServiceUnavailableErrorError object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required ServiceUnavailableErrorErrorBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'code':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ServiceUnavailableErrorErrorCodeEnum),
          ) as ServiceUnavailableErrorErrorCodeEnum;
          result.code = valueDes;
          break;
        case r'message':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.message = valueDes;
          break;
        case r'retryAfterSeconds':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.retryAfterSeconds = valueDes;
          break;
        case r'correlationId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.correlationId = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  ServiceUnavailableErrorError deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ServiceUnavailableErrorErrorBuilder();
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

class ServiceUnavailableErrorErrorCodeEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'SERVICE_UNAVAILABLE')
  static const ServiceUnavailableErrorErrorCodeEnum SERVICE_UNAVAILABLE = _$serviceUnavailableErrorErrorCodeEnum_SERVICE_UNAVAILABLE;
  @BuiltValueEnumConst(wireName: r'DEPENDENCY_UNAVAILABLE')
  static const ServiceUnavailableErrorErrorCodeEnum DEPENDENCY_UNAVAILABLE = _$serviceUnavailableErrorErrorCodeEnum_DEPENDENCY_UNAVAILABLE;
  @BuiltValueEnumConst(wireName: r'MAINTENANCE')
  static const ServiceUnavailableErrorErrorCodeEnum MAINTENANCE = _$serviceUnavailableErrorErrorCodeEnum_MAINTENANCE;

  static Serializer<ServiceUnavailableErrorErrorCodeEnum> get serializer => _$serviceUnavailableErrorErrorCodeEnumSerializer;

  const ServiceUnavailableErrorErrorCodeEnum._(String name): super(name);

  static BuiltSet<ServiceUnavailableErrorErrorCodeEnum> get values => _$serviceUnavailableErrorErrorCodeEnumValues;
  static ServiceUnavailableErrorErrorCodeEnum valueOf(String name) => _$serviceUnavailableErrorErrorCodeEnumValueOf(name);
}

