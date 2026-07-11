//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'simple_error.g.dart';

/// SimpleError
///
/// Properties:
/// * [error] - Machine-readable or plain-language error identifier.
@BuiltValue()
abstract class SimpleError implements Built<SimpleError, SimpleErrorBuilder> {
  /// Machine-readable or plain-language error identifier.
  @BuiltValueField(wireName: r'error')
  String get error;

  SimpleError._();

  factory SimpleError([void updates(SimpleErrorBuilder b)]) = _$SimpleError;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SimpleErrorBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SimpleError> get serializer => _$SimpleErrorSerializer();
}

class _$SimpleErrorSerializer implements PrimitiveSerializer<SimpleError> {
  @override
  final Iterable<Type> types = const [SimpleError, _$SimpleError];

  @override
  final String wireName = r'SimpleError';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SimpleError object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'error';
    yield serializers.serialize(
      object.error,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    SimpleError object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required SimpleErrorBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'error':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.error = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  SimpleError deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SimpleErrorBuilder();
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
