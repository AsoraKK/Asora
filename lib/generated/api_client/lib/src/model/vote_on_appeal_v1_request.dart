//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'vote_on_appeal_v1_request.g.dart';

/// VoteOnAppealV1Request
///
/// Properties:
/// * [appealId] - Appeal identifier
/// * [vote] 
@BuiltValue()
abstract class VoteOnAppealV1Request implements Built<VoteOnAppealV1Request, VoteOnAppealV1RequestBuilder> {
  /// Appeal identifier
  @BuiltValueField(wireName: r'appealId')
  String get appealId;

  @BuiltValueField(wireName: r'vote')
  VoteOnAppealV1RequestVoteEnum get vote;
  // enum voteEnum {  uphold,  deny,  };

  VoteOnAppealV1Request._();

  factory VoteOnAppealV1Request([void updates(VoteOnAppealV1RequestBuilder b)]) = _$VoteOnAppealV1Request;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(VoteOnAppealV1RequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<VoteOnAppealV1Request> get serializer => _$VoteOnAppealV1RequestSerializer();
}

class _$VoteOnAppealV1RequestSerializer implements PrimitiveSerializer<VoteOnAppealV1Request> {
  @override
  final Iterable<Type> types = const [VoteOnAppealV1Request, _$VoteOnAppealV1Request];

  @override
  final String wireName = r'VoteOnAppealV1Request';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    VoteOnAppealV1Request object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'appealId';
    yield serializers.serialize(
      object.appealId,
      specifiedType: const FullType(String),
    );
    yield r'vote';
    yield serializers.serialize(
      object.vote,
      specifiedType: const FullType(VoteOnAppealV1RequestVoteEnum),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    VoteOnAppealV1Request object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required VoteOnAppealV1RequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'appealId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.appealId = valueDes;
          break;
        case r'vote':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(VoteOnAppealV1RequestVoteEnum),
          ) as VoteOnAppealV1RequestVoteEnum;
          result.vote = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  VoteOnAppealV1Request deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = VoteOnAppealV1RequestBuilder();
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

class VoteOnAppealV1RequestVoteEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'uphold')
  static const VoteOnAppealV1RequestVoteEnum uphold = _$voteOnAppealV1RequestVoteEnum_uphold;
  @BuiltValueEnumConst(wireName: r'deny')
  static const VoteOnAppealV1RequestVoteEnum deny = _$voteOnAppealV1RequestVoteEnum_deny;

  static Serializer<VoteOnAppealV1RequestVoteEnum> get serializer => _$voteOnAppealV1RequestVoteEnumSerializer;

  const VoteOnAppealV1RequestVoteEnum._(String name): super(name);

  static BuiltSet<VoteOnAppealV1RequestVoteEnum> get values => _$voteOnAppealV1RequestVoteEnumValues;
  static VoteOnAppealV1RequestVoteEnum valueOf(String name) => _$voteOnAppealV1RequestVoteEnumValueOf(name);
}

