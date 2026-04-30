//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'forbidden_error_error.g.dart';

/// ForbiddenErrorError
///
/// Properties:
/// * [code]
/// * [message]
/// * [correlationId]
@BuiltValue()
abstract class ForbiddenErrorError
    implements Built<ForbiddenErrorError, ForbiddenErrorErrorBuilder> {
  @BuiltValueField(wireName: r'code')
  ForbiddenErrorErrorCodeEnum get code;
  // enum codeEnum {  FORBIDDEN,  INSUFFICIENT_ROLE,  ACCOUNT_DISABLED,  };

  @BuiltValueField(wireName: r'message')
  String get message;

  @BuiltValueField(wireName: r'correlationId')
  String? get correlationId;

  ForbiddenErrorError._();

  factory ForbiddenErrorError([void updates(ForbiddenErrorErrorBuilder b)]) =
      _$ForbiddenErrorError;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ForbiddenErrorErrorBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ForbiddenErrorError> get serializer =>
      _$ForbiddenErrorErrorSerializer();
}

class _$ForbiddenErrorErrorSerializer
    implements PrimitiveSerializer<ForbiddenErrorError> {
  @override
  final Iterable<Type> types = const [
    ForbiddenErrorError,
    _$ForbiddenErrorError
  ];

  @override
  final String wireName = r'ForbiddenErrorError';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ForbiddenErrorError object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'code';
    yield serializers.serialize(
      object.code,
      specifiedType: const FullType(ForbiddenErrorErrorCodeEnum),
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
    ForbiddenErrorError object, {
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
    required ForbiddenErrorErrorBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'code':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ForbiddenErrorErrorCodeEnum),
          ) as ForbiddenErrorErrorCodeEnum;
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
  ForbiddenErrorError deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ForbiddenErrorErrorBuilder();
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

class ForbiddenErrorErrorCodeEnum extends EnumClass {
  @BuiltValueEnumConst(wireName: r'FORBIDDEN')
  static const ForbiddenErrorErrorCodeEnum FORBIDDEN =
      _$forbiddenErrorErrorCodeEnum_FORBIDDEN;
  @BuiltValueEnumConst(wireName: r'INSUFFICIENT_ROLE')
  static const ForbiddenErrorErrorCodeEnum INSUFFICIENT_ROLE =
      _$forbiddenErrorErrorCodeEnum_INSUFFICIENT_ROLE;
  @BuiltValueEnumConst(wireName: r'ACCOUNT_DISABLED')
  static const ForbiddenErrorErrorCodeEnum ACCOUNT_DISABLED =
      _$forbiddenErrorErrorCodeEnum_ACCOUNT_DISABLED;

  static Serializer<ForbiddenErrorErrorCodeEnum> get serializer =>
      _$forbiddenErrorErrorCodeEnumSerializer;

  const ForbiddenErrorErrorCodeEnum._(String name) : super(name);

  static BuiltSet<ForbiddenErrorErrorCodeEnum> get values =>
      _$forbiddenErrorErrorCodeEnumValues;
  static ForbiddenErrorErrorCodeEnum valueOf(String name) =>
      _$forbiddenErrorErrorCodeEnumValueOf(name);
}
