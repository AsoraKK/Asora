//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/json_object.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'error_response_error.g.dart';

/// ErrorResponseError
///
/// Properties:
/// * [code] - Machine-readable error code
/// * [message] - Human-readable description
/// * [correlationId] - Correlation ID for distributed tracing
/// * [details] - Optional structured details (e.g. field-level validation errors)
@BuiltValue()
abstract class ErrorResponseError
    implements Built<ErrorResponseError, ErrorResponseErrorBuilder> {
  /// Machine-readable error code
  @BuiltValueField(wireName: r'code')
  String get code;

  /// Human-readable description
  @BuiltValueField(wireName: r'message')
  String get message;

  /// Correlation ID for distributed tracing
  @BuiltValueField(wireName: r'correlationId')
  String? get correlationId;

  /// Optional structured details (e.g. field-level validation errors)
  @BuiltValueField(wireName: r'details')
  BuiltMap<String, JsonObject?>? get details;

  ErrorResponseError._();

  factory ErrorResponseError([void updates(ErrorResponseErrorBuilder b)]) =
      _$ErrorResponseError;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ErrorResponseErrorBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ErrorResponseError> get serializer =>
      _$ErrorResponseErrorSerializer();
}

class _$ErrorResponseErrorSerializer
    implements PrimitiveSerializer<ErrorResponseError> {
  @override
  final Iterable<Type> types = const [ErrorResponseError, _$ErrorResponseError];

  @override
  final String wireName = r'ErrorResponseError';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ErrorResponseError object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'code';
    yield serializers.serialize(
      object.code,
      specifiedType: const FullType(String),
    );
    yield r'message';
    yield serializers.serialize(
      object.message,
      specifiedType: const FullType(String),
    );
    if (object.correlationId != null) {
      yield r'correlationId';
      yield serializers.serialize(
        object.correlationId,
        specifiedType: const FullType(String),
      );
    }
    if (object.details != null) {
      yield r'details';
      yield serializers.serialize(
        object.details,
        specifiedType: const FullType(
            BuiltMap, [FullType(String), FullType.nullable(JsonObject)]),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    ErrorResponseError object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object,
            specifiedType: specifiedType)
        .toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required ErrorResponseErrorBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'code':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.code = valueDes;
          break;
        case r'message':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.message = valueDes;
          break;
        case r'correlationId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.correlationId = valueDes;
          break;
        case r'details':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(
                BuiltMap, [FullType(String), FullType.nullable(JsonObject)]),
          ) as BuiltMap<String, JsonObject?>;
          result.details.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  ErrorResponseError deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ErrorResponseErrorBuilder();
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
