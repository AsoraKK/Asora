//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'validation_error_response_error_fields_inner.g.dart';

/// ValidationErrorResponseErrorFieldsInner
///
/// Properties:
/// * [field] 
/// * [message] 
/// * [constraint] 
@BuiltValue()
abstract class ValidationErrorResponseErrorFieldsInner implements Built<ValidationErrorResponseErrorFieldsInner, ValidationErrorResponseErrorFieldsInnerBuilder> {
  @BuiltValueField(wireName: r'field')
  String get field;

  @BuiltValueField(wireName: r'message')
  String get message;

  @BuiltValueField(wireName: r'constraint')
  String? get constraint;

  ValidationErrorResponseErrorFieldsInner._();

  factory ValidationErrorResponseErrorFieldsInner([void updates(ValidationErrorResponseErrorFieldsInnerBuilder b)]) = _$ValidationErrorResponseErrorFieldsInner;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ValidationErrorResponseErrorFieldsInnerBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ValidationErrorResponseErrorFieldsInner> get serializer => _$ValidationErrorResponseErrorFieldsInnerSerializer();
}

class _$ValidationErrorResponseErrorFieldsInnerSerializer implements PrimitiveSerializer<ValidationErrorResponseErrorFieldsInner> {
  @override
  final Iterable<Type> types = const [ValidationErrorResponseErrorFieldsInner, _$ValidationErrorResponseErrorFieldsInner];

  @override
  final String wireName = r'ValidationErrorResponseErrorFieldsInner';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ValidationErrorResponseErrorFieldsInner object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'field';
    yield serializers.serialize(
      object.field,
      specifiedType: const FullType(String),
    );
    yield r'message';
    yield serializers.serialize(
      object.message,
      specifiedType: const FullType(String),
    );
    if (object.constraint != null) {
      yield r'constraint';
      yield serializers.serialize(
        object.constraint,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    ValidationErrorResponseErrorFieldsInner object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required ValidationErrorResponseErrorFieldsInnerBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'field':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.field = valueDes;
          break;
        case r'message':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.message = valueDes;
          break;
        case r'constraint':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.constraint = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  ValidationErrorResponseErrorFieldsInner deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ValidationErrorResponseErrorFieldsInnerBuilder();
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

