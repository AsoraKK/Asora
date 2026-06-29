//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'submit_reaction_request.g.dart';

/// SubmitReactionRequest
///
/// Properties:
/// * [targetContentId] 
/// * [targetUserId] 
/// * [reactionType] 
@BuiltValue()
abstract class SubmitReactionRequest implements Built<SubmitReactionRequest, SubmitReactionRequestBuilder> {
  @BuiltValueField(wireName: r'targetContentId')
  String get targetContentId;

  @BuiltValueField(wireName: r'targetUserId')
  String get targetUserId;

  @BuiltValueField(wireName: r'reactionType')
  SubmitReactionRequestReactionTypeEnum get reactionType;
  // enum reactionTypeEnum {  helpful,  well_sourced,  thoughtful,  agree,  disagree,  misleading,  low_effort,  report,  };

  SubmitReactionRequest._();

  factory SubmitReactionRequest([void updates(SubmitReactionRequestBuilder b)]) = _$SubmitReactionRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SubmitReactionRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SubmitReactionRequest> get serializer => _$SubmitReactionRequestSerializer();
}

class _$SubmitReactionRequestSerializer implements PrimitiveSerializer<SubmitReactionRequest> {
  @override
  final Iterable<Type> types = const [SubmitReactionRequest, _$SubmitReactionRequest];

  @override
  final String wireName = r'SubmitReactionRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SubmitReactionRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'targetContentId';
    yield serializers.serialize(
      object.targetContentId,
      specifiedType: const FullType(String),
    );
    yield r'targetUserId';
    yield serializers.serialize(
      object.targetUserId,
      specifiedType: const FullType(String),
    );
    yield r'reactionType';
    yield serializers.serialize(
      object.reactionType,
      specifiedType: const FullType(SubmitReactionRequestReactionTypeEnum),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    SubmitReactionRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required SubmitReactionRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'targetContentId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.targetContentId = valueDes;
          break;
        case r'targetUserId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.targetUserId = valueDes;
          break;
        case r'reactionType':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(SubmitReactionRequestReactionTypeEnum),
          ) as SubmitReactionRequestReactionTypeEnum;
          result.reactionType = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  SubmitReactionRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SubmitReactionRequestBuilder();
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

class SubmitReactionRequestReactionTypeEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'helpful')
  static const SubmitReactionRequestReactionTypeEnum helpful = _$submitReactionRequestReactionTypeEnum_helpful;
  @BuiltValueEnumConst(wireName: r'well_sourced')
  static const SubmitReactionRequestReactionTypeEnum wellSourced = _$submitReactionRequestReactionTypeEnum_wellSourced;
  @BuiltValueEnumConst(wireName: r'thoughtful')
  static const SubmitReactionRequestReactionTypeEnum thoughtful = _$submitReactionRequestReactionTypeEnum_thoughtful;
  @BuiltValueEnumConst(wireName: r'agree')
  static const SubmitReactionRequestReactionTypeEnum agree = _$submitReactionRequestReactionTypeEnum_agree;
  @BuiltValueEnumConst(wireName: r'disagree')
  static const SubmitReactionRequestReactionTypeEnum disagree = _$submitReactionRequestReactionTypeEnum_disagree;
  @BuiltValueEnumConst(wireName: r'misleading')
  static const SubmitReactionRequestReactionTypeEnum misleading = _$submitReactionRequestReactionTypeEnum_misleading;
  @BuiltValueEnumConst(wireName: r'low_effort')
  static const SubmitReactionRequestReactionTypeEnum lowEffort = _$submitReactionRequestReactionTypeEnum_lowEffort;
  @BuiltValueEnumConst(wireName: r'report')
  static const SubmitReactionRequestReactionTypeEnum report = _$submitReactionRequestReactionTypeEnum_report;

  static Serializer<SubmitReactionRequestReactionTypeEnum> get serializer => _$submitReactionRequestReactionTypeEnumSerializer;

  const SubmitReactionRequestReactionTypeEnum._(String name): super(name);

  static BuiltSet<SubmitReactionRequestReactionTypeEnum> get values => _$submitReactionRequestReactionTypeEnumValues;
  static SubmitReactionRequestReactionTypeEnum valueOf(String name) => _$submitReactionRequestReactionTypeEnumValueOf(name);
}

