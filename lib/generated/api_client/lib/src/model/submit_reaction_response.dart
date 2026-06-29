//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'submit_reaction_response.g.dart';

/// SubmitReactionResponse
///
/// Properties:
/// * [id]
/// * [reactionType]
/// * [includedInReputation]
/// * [antiGamingStatus]
/// * [createdAt]
@BuiltValue()
abstract class SubmitReactionResponse implements Built<SubmitReactionResponse, SubmitReactionResponseBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'reactionType')
  String get reactionType;

  @BuiltValueField(wireName: r'includedInReputation')
  bool get includedInReputation;

  @BuiltValueField(wireName: r'antiGamingStatus')
  SubmitReactionResponseAntiGamingStatusEnum get antiGamingStatus;
  // enum antiGamingStatusEnum {  clear,  capped,  suspicious,  excluded,  };

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  SubmitReactionResponse._();

  factory SubmitReactionResponse([void updates(SubmitReactionResponseBuilder b)]) = _$SubmitReactionResponse;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SubmitReactionResponseBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SubmitReactionResponse> get serializer => _$SubmitReactionResponseSerializer();
}

class _$SubmitReactionResponseSerializer implements PrimitiveSerializer<SubmitReactionResponse> {
  @override
  final Iterable<Type> types = const [SubmitReactionResponse, _$SubmitReactionResponse];

  @override
  final String wireName = r'SubmitReactionResponse';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SubmitReactionResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'reactionType';
    yield serializers.serialize(
      object.reactionType,
      specifiedType: const FullType(String),
    );
    yield r'includedInReputation';
    yield serializers.serialize(
      object.includedInReputation,
      specifiedType: const FullType(bool),
    );
    yield r'antiGamingStatus';
    yield serializers.serialize(
      object.antiGamingStatus,
      specifiedType: const FullType(SubmitReactionResponseAntiGamingStatusEnum),
    );
    yield r'createdAt';
    yield serializers.serialize(
      object.createdAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    SubmitReactionResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required SubmitReactionResponseBuilder result,
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
        case r'reactionType':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.reactionType = valueDes;
          break;
        case r'includedInReputation':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.includedInReputation = valueDes;
          break;
        case r'antiGamingStatus':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(SubmitReactionResponseAntiGamingStatusEnum),
          ) as SubmitReactionResponseAntiGamingStatusEnum;
          result.antiGamingStatus = valueDes;
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.createdAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  SubmitReactionResponse deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SubmitReactionResponseBuilder();
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

class SubmitReactionResponseAntiGamingStatusEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'clear')
  static const SubmitReactionResponseAntiGamingStatusEnum clear = _$submitReactionResponseAntiGamingStatusEnum_clear;
  @BuiltValueEnumConst(wireName: r'capped')
  static const SubmitReactionResponseAntiGamingStatusEnum capped = _$submitReactionResponseAntiGamingStatusEnum_capped;
  @BuiltValueEnumConst(wireName: r'suspicious')
  static const SubmitReactionResponseAntiGamingStatusEnum suspicious = _$submitReactionResponseAntiGamingStatusEnum_suspicious;
  @BuiltValueEnumConst(wireName: r'excluded')
  static const SubmitReactionResponseAntiGamingStatusEnum excluded = _$submitReactionResponseAntiGamingStatusEnum_excluded;

  static Serializer<SubmitReactionResponseAntiGamingStatusEnum> get serializer => _$submitReactionResponseAntiGamingStatusEnumSerializer;

  const SubmitReactionResponseAntiGamingStatusEnum._(String name): super(name);

  static BuiltSet<SubmitReactionResponseAntiGamingStatusEnum> get values => _$submitReactionResponseAntiGamingStatusEnumValues;
  static SubmitReactionResponseAntiGamingStatusEnum valueOf(String name) => _$submitReactionResponseAntiGamingStatusEnumValueOf(name);
}

