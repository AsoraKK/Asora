//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'appeal_vote_response_vote.g.dart';

/// AppealVoteResponseVote
///
/// Properties:
/// * [id]
/// * [appealId]
/// * [vote]
/// * [recordedAt]
@BuiltValue()
abstract class AppealVoteResponseVote
    implements Built<AppealVoteResponseVote, AppealVoteResponseVoteBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'appealId')
  String get appealId;

  @BuiltValueField(wireName: r'vote')
  AppealVoteResponseVoteVoteEnum get vote;
  // enum voteEnum {  uphold,  deny,  };

  @BuiltValueField(wireName: r'recordedAt')
  DateTime get recordedAt;

  AppealVoteResponseVote._();

  factory AppealVoteResponseVote(
          [void updates(AppealVoteResponseVoteBuilder b)]) =
      _$AppealVoteResponseVote;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AppealVoteResponseVoteBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AppealVoteResponseVote> get serializer =>
      _$AppealVoteResponseVoteSerializer();
}

class _$AppealVoteResponseVoteSerializer
    implements PrimitiveSerializer<AppealVoteResponseVote> {
  @override
  final Iterable<Type> types = const [
    AppealVoteResponseVote,
    _$AppealVoteResponseVote
  ];

  @override
  final String wireName = r'AppealVoteResponseVote';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AppealVoteResponseVote object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'appealId';
    yield serializers.serialize(
      object.appealId,
      specifiedType: const FullType(String),
    );
    yield r'vote';
    yield serializers.serialize(
      object.vote,
      specifiedType: const FullType(AppealVoteResponseVoteVoteEnum),
    );
    yield r'recordedAt';
    yield serializers.serialize(
      object.recordedAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    AppealVoteResponseVote object, {
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
    required AppealVoteResponseVoteBuilder result,
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
            specifiedType: const FullType(AppealVoteResponseVoteVoteEnum),
          ) as AppealVoteResponseVoteVoteEnum;
          result.vote = valueDes;
          break;
        case r'recordedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.recordedAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AppealVoteResponseVote deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AppealVoteResponseVoteBuilder();
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

class AppealVoteResponseVoteVoteEnum extends EnumClass {
  @BuiltValueEnumConst(wireName: r'uphold')
  static const AppealVoteResponseVoteVoteEnum uphold =
      _$appealVoteResponseVoteVoteEnum_uphold;
  @BuiltValueEnumConst(wireName: r'deny')
  static const AppealVoteResponseVoteVoteEnum deny =
      _$appealVoteResponseVoteVoteEnum_deny;

  static Serializer<AppealVoteResponseVoteVoteEnum> get serializer =>
      _$appealVoteResponseVoteVoteEnumSerializer;

  const AppealVoteResponseVoteVoteEnum._(String name) : super(name);

  static BuiltSet<AppealVoteResponseVoteVoteEnum> get values =>
      _$appealVoteResponseVoteVoteEnumValues;
  static AppealVoteResponseVoteVoteEnum valueOf(String name) =>
      _$appealVoteResponseVoteVoteEnumValueOf(name);
}
