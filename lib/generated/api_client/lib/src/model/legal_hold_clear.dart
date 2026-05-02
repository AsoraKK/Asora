//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'legal_hold_clear.g.dart';

/// LegalHoldClear
///
/// Properties:
/// * [id] 
@BuiltValue()
abstract class LegalHoldClear implements Built<LegalHoldClear, LegalHoldClearBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  LegalHoldClear._();

  factory LegalHoldClear([void updates(LegalHoldClearBuilder b)]) = _$LegalHoldClear;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(LegalHoldClearBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<LegalHoldClear> get serializer => _$LegalHoldClearSerializer();
}

class _$LegalHoldClearSerializer implements PrimitiveSerializer<LegalHoldClear> {
  @override
  final Iterable<Type> types = const [LegalHoldClear, _$LegalHoldClear];

  @override
  final String wireName = r'LegalHoldClear';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    LegalHoldClear object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    LegalHoldClear object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required LegalHoldClearBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'id':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.id = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  LegalHoldClear deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = LegalHoldClearBuilder();
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

