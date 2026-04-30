//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:asora_api_client/src/model/unauthorized_error_error.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'unauthorized_error.g.dart';

/// 401 – missing or invalid bearer token.
///
/// Properties:
/// * [error]
@BuiltValue()
abstract class UnauthorizedError
    implements Built<UnauthorizedError, UnauthorizedErrorBuilder> {
  @BuiltValueField(wireName: r'error')
  UnauthorizedErrorError get error;

  UnauthorizedError._();

  factory UnauthorizedError([void updates(UnauthorizedErrorBuilder b)]) =
      _$UnauthorizedError;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(UnauthorizedErrorBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<UnauthorizedError> get serializer =>
      _$UnauthorizedErrorSerializer();
}

class _$UnauthorizedErrorSerializer
    implements PrimitiveSerializer<UnauthorizedError> {
  @override
  final Iterable<Type> types = const [UnauthorizedError, _$UnauthorizedError];

  @override
  final String wireName = r'UnauthorizedError';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    UnauthorizedError object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'error';
    yield serializers.serialize(
      object.error,
      specifiedType: const FullType(UnauthorizedErrorError),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    UnauthorizedError object, {
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
    required UnauthorizedErrorBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'error':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(UnauthorizedErrorError),
          ) as UnauthorizedErrorError;
          result.error.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  UnauthorizedError deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = UnauthorizedErrorBuilder();
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
