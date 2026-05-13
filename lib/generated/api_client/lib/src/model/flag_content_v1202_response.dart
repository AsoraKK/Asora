//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'flag_content_v1202_response.g.dart';

/// FlagContentV1202Response
///
/// Properties:
/// * [flagId] 
/// * [status] 
@BuiltValue()
abstract class FlagContentV1202Response implements Built<FlagContentV1202Response, FlagContentV1202ResponseBuilder> {
  @BuiltValueField(wireName: r'flagId')
  String? get flagId;

  @BuiltValueField(wireName: r'status')
  FlagContentV1202ResponseStatusEnum? get status;
  // enum statusEnum {  queued,  received,  };

  FlagContentV1202Response._();

  factory FlagContentV1202Response([void updates(FlagContentV1202ResponseBuilder b)]) = _$FlagContentV1202Response;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(FlagContentV1202ResponseBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<FlagContentV1202Response> get serializer => _$FlagContentV1202ResponseSerializer();
}

class _$FlagContentV1202ResponseSerializer implements PrimitiveSerializer<FlagContentV1202Response> {
  @override
  final Iterable<Type> types = const [FlagContentV1202Response, _$FlagContentV1202Response];

  @override
  final String wireName = r'FlagContentV1202Response';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    FlagContentV1202Response object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.flagId != null) {
      yield r'flagId';
      yield serializers.serialize(
        object.flagId,
        specifiedType: const FullType(String),
      );
    }
    if (object.status != null) {
      yield r'status';
      yield serializers.serialize(
        object.status,
        specifiedType: const FullType(FlagContentV1202ResponseStatusEnum),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    FlagContentV1202Response object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required FlagContentV1202ResponseBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'flagId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.flagId = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(FlagContentV1202ResponseStatusEnum),
          ) as FlagContentV1202ResponseStatusEnum;
          result.status = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  FlagContentV1202Response deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = FlagContentV1202ResponseBuilder();
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

class FlagContentV1202ResponseStatusEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'queued')
  static const FlagContentV1202ResponseStatusEnum queued = _$flagContentV1202ResponseStatusEnum_queued;
  @BuiltValueEnumConst(wireName: r'received')
  static const FlagContentV1202ResponseStatusEnum received = _$flagContentV1202ResponseStatusEnum_received;

  static Serializer<FlagContentV1202ResponseStatusEnum> get serializer => _$flagContentV1202ResponseStatusEnumSerializer;

  const FlagContentV1202ResponseStatusEnum._(String name): super(name);

  static BuiltSet<FlagContentV1202ResponseStatusEnum> get values => _$flagContentV1202ResponseStatusEnumValues;
  static FlagContentV1202ResponseStatusEnum valueOf(String name) => _$flagContentV1202ResponseStatusEnumValueOf(name);
}

