//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'bad_gateway_error_error.g.dart';

/// BadGatewayErrorError
///
/// Properties:
/// * [code]
/// * [message]
/// * [correlationId]
@BuiltValue()
abstract class BadGatewayErrorError
    implements Built<BadGatewayErrorError, BadGatewayErrorErrorBuilder> {
  @BuiltValueField(wireName: r'code')
  BadGatewayErrorErrorCodeEnum get code;
  // enum codeEnum {  BAD_GATEWAY,  UPSTREAM_ERROR,  };

  @BuiltValueField(wireName: r'message')
  String get message;

  @BuiltValueField(wireName: r'correlationId')
  String? get correlationId;

  BadGatewayErrorError._();

  factory BadGatewayErrorError([void updates(BadGatewayErrorErrorBuilder b)]) =
      _$BadGatewayErrorError;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(BadGatewayErrorErrorBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<BadGatewayErrorError> get serializer =>
      _$BadGatewayErrorErrorSerializer();
}

class _$BadGatewayErrorErrorSerializer
    implements PrimitiveSerializer<BadGatewayErrorError> {
  @override
  final Iterable<Type> types = const [
    BadGatewayErrorError,
    _$BadGatewayErrorError
  ];

  @override
  final String wireName = r'BadGatewayErrorError';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    BadGatewayErrorError object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'code';
    yield serializers.serialize(
      object.code,
      specifiedType: const FullType(BadGatewayErrorErrorCodeEnum),
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
  }

  @override
  Object serialize(
    Serializers serializers,
    BadGatewayErrorError object, {
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
    required BadGatewayErrorErrorBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'code':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BadGatewayErrorErrorCodeEnum),
          ) as BadGatewayErrorErrorCodeEnum;
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
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  BadGatewayErrorError deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = BadGatewayErrorErrorBuilder();
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

class BadGatewayErrorErrorCodeEnum extends EnumClass {
  @BuiltValueEnumConst(wireName: r'BAD_GATEWAY')
  static const BadGatewayErrorErrorCodeEnum BAD_GATEWAY =
      _$badGatewayErrorErrorCodeEnum_BAD_GATEWAY;
  @BuiltValueEnumConst(wireName: r'UPSTREAM_ERROR')
  static const BadGatewayErrorErrorCodeEnum UPSTREAM_ERROR =
      _$badGatewayErrorErrorCodeEnum_UPSTREAM_ERROR;

  static Serializer<BadGatewayErrorErrorCodeEnum> get serializer =>
      _$badGatewayErrorErrorCodeEnumSerializer;

  const BadGatewayErrorErrorCodeEnum._(String name) : super(name);

  static BuiltSet<BadGatewayErrorErrorCodeEnum> get values =>
      _$badGatewayErrorErrorCodeEnumValues;
  static BadGatewayErrorErrorCodeEnum valueOf(String name) =>
      _$badGatewayErrorErrorCodeEnumValueOf(name);
}
