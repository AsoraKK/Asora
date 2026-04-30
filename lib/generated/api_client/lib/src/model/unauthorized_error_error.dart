//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'unauthorized_error_error.g.dart';

/// UnauthorizedErrorError
///
/// Properties:
/// * [code]
/// * [message]
/// * [correlationId]
@BuiltValue()
abstract class UnauthorizedErrorError
    implements Built<UnauthorizedErrorError, UnauthorizedErrorErrorBuilder> {
  @BuiltValueField(wireName: r'code')
  UnauthorizedErrorErrorCodeEnum get code;
  // enum codeEnum {  UNAUTHORIZED,  TOKEN_EXPIRED,  TOKEN_INVALID,  };

  @BuiltValueField(wireName: r'message')
  String get message;

  @BuiltValueField(wireName: r'correlationId')
  String? get correlationId;

  UnauthorizedErrorError._();

  factory UnauthorizedErrorError(
          [void updates(UnauthorizedErrorErrorBuilder b)]) =
      _$UnauthorizedErrorError;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(UnauthorizedErrorErrorBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<UnauthorizedErrorError> get serializer =>
      _$UnauthorizedErrorErrorSerializer();
}

class _$UnauthorizedErrorErrorSerializer
    implements PrimitiveSerializer<UnauthorizedErrorError> {
  @override
  final Iterable<Type> types = const [
    UnauthorizedErrorError,
    _$UnauthorizedErrorError
  ];

  @override
  final String wireName = r'UnauthorizedErrorError';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    UnauthorizedErrorError object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'code';
    yield serializers.serialize(
      object.code,
      specifiedType: const FullType(UnauthorizedErrorErrorCodeEnum),
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
    UnauthorizedErrorError object, {
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
    required UnauthorizedErrorErrorBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'code':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(UnauthorizedErrorErrorCodeEnum),
          ) as UnauthorizedErrorErrorCodeEnum;
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
  UnauthorizedErrorError deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = UnauthorizedErrorErrorBuilder();
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

class UnauthorizedErrorErrorCodeEnum extends EnumClass {
  @BuiltValueEnumConst(wireName: r'UNAUTHORIZED')
  static const UnauthorizedErrorErrorCodeEnum UNAUTHORIZED =
      _$unauthorizedErrorErrorCodeEnum_UNAUTHORIZED;
  @BuiltValueEnumConst(wireName: r'TOKEN_EXPIRED')
  static const UnauthorizedErrorErrorCodeEnum TOKEN_EXPIRED =
      _$unauthorizedErrorErrorCodeEnum_TOKEN_EXPIRED;
  @BuiltValueEnumConst(wireName: r'TOKEN_INVALID')
  static const UnauthorizedErrorErrorCodeEnum TOKEN_INVALID =
      _$unauthorizedErrorErrorCodeEnum_TOKEN_INVALID;

  static Serializer<UnauthorizedErrorErrorCodeEnum> get serializer =>
      _$unauthorizedErrorErrorCodeEnumSerializer;

  const UnauthorizedErrorErrorCodeEnum._(String name) : super(name);

  static BuiltSet<UnauthorizedErrorErrorCodeEnum> get values =>
      _$unauthorizedErrorErrorCodeEnumValues;
  static UnauthorizedErrorErrorCodeEnum valueOf(String name) =>
      _$unauthorizedErrorErrorCodeEnumValueOf(name);
}
