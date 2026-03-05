//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'dsr_request_input.g.dart';

/// DsrRequestInput
///
/// Properties:
/// * [userId] 
/// * [note] 
@BuiltValue()
abstract class DsrRequestInput implements Built<DsrRequestInput, DsrRequestInputBuilder> {
  @BuiltValueField(wireName: r'userId')
  String get userId;

  @BuiltValueField(wireName: r'note')
  String? get note;

  DsrRequestInput._();

  factory DsrRequestInput([void updates(DsrRequestInputBuilder b)]) = _$DsrRequestInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(DsrRequestInputBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<DsrRequestInput> get serializer => _$DsrRequestInputSerializer();
}

class _$DsrRequestInputSerializer implements PrimitiveSerializer<DsrRequestInput> {
  @override
  final Iterable<Type> types = const [DsrRequestInput, _$DsrRequestInput];

  @override
  final String wireName = r'DsrRequestInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    DsrRequestInput object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'userId';
    yield serializers.serialize(
      object.userId,
      specifiedType: const FullType(String),
    );
    if (object.note != null) {
      yield r'note';
      yield serializers.serialize(
        object.note,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    DsrRequestInput object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required DsrRequestInputBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'userId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.userId = valueDes;
          break;
        case r'note':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.note = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  DsrRequestInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = DsrRequestInputBuilder();
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

