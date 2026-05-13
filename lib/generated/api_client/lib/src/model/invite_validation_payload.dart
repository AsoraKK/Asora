//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'invite_validation_payload.g.dart';

/// InviteValidationPayload
///
/// Properties:
/// * [valid] - True when the invite code is active and redeemable.
@BuiltValue()
abstract class InviteValidationPayload implements Built<InviteValidationPayload, InviteValidationPayloadBuilder> {
  /// True when the invite code is active and redeemable.
  @BuiltValueField(wireName: r'valid')
  bool get valid;

  InviteValidationPayload._();

  factory InviteValidationPayload([void updates(InviteValidationPayloadBuilder b)]) = _$InviteValidationPayload;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(InviteValidationPayloadBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<InviteValidationPayload> get serializer => _$InviteValidationPayloadSerializer();
}

class _$InviteValidationPayloadSerializer implements PrimitiveSerializer<InviteValidationPayload> {
  @override
  final Iterable<Type> types = const [InviteValidationPayload, _$InviteValidationPayload];

  @override
  final String wireName = r'InviteValidationPayload';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    InviteValidationPayload object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'valid';
    yield serializers.serialize(
      object.valid,
      specifiedType: const FullType(bool),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    InviteValidationPayload object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required InviteValidationPayloadBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'valid':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.valid = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  InviteValidationPayload deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = InviteValidationPayloadBuilder();
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

