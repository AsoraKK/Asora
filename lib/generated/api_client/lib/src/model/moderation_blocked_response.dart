//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'moderation_blocked_response.g.dart';

/// Returned when content is rejected by the moderation pipeline.
///
/// Properties:
/// * [id] - Client-supplied post identifier
/// * [status] - Content was rejected by automated moderation
/// * [moderationCategory] - Primary moderation class that triggered the block
@BuiltValue()
abstract class ModerationBlockedResponse
    implements
        Built<ModerationBlockedResponse, ModerationBlockedResponseBuilder> {
  /// Client-supplied post identifier
  @BuiltValueField(wireName: r'id')
  String get id;

  /// Content was rejected by automated moderation
  @BuiltValueField(wireName: r'status')
  ModerationBlockedResponseStatusEnum get status;
  // enum statusEnum {  blocked,  };

  /// Primary moderation class that triggered the block
  @BuiltValueField(wireName: r'moderationCategory')
  String? get moderationCategory;

  ModerationBlockedResponse._();

  factory ModerationBlockedResponse(
          [void updates(ModerationBlockedResponseBuilder b)]) =
      _$ModerationBlockedResponse;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ModerationBlockedResponseBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ModerationBlockedResponse> get serializer =>
      _$ModerationBlockedResponseSerializer();
}

class _$ModerationBlockedResponseSerializer
    implements PrimitiveSerializer<ModerationBlockedResponse> {
  @override
  final Iterable<Type> types = const [
    ModerationBlockedResponse,
    _$ModerationBlockedResponse
  ];

  @override
  final String wireName = r'ModerationBlockedResponse';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ModerationBlockedResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(ModerationBlockedResponseStatusEnum),
    );
    if (object.moderationCategory != null) {
      yield r'moderationCategory';
      yield serializers.serialize(
        object.moderationCategory,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    ModerationBlockedResponse object, {
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
    required ModerationBlockedResponseBuilder result,
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
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ModerationBlockedResponseStatusEnum),
          ) as ModerationBlockedResponseStatusEnum;
          result.status = valueDes;
          break;
        case r'moderationCategory':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.moderationCategory = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  ModerationBlockedResponse deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ModerationBlockedResponseBuilder();
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

class ModerationBlockedResponseStatusEnum extends EnumClass {
  /// Content was rejected by automated moderation
  @BuiltValueEnumConst(wireName: r'blocked')
  static const ModerationBlockedResponseStatusEnum blocked =
      _$moderationBlockedResponseStatusEnum_blocked;

  static Serializer<ModerationBlockedResponseStatusEnum> get serializer =>
      _$moderationBlockedResponseStatusEnumSerializer;

  const ModerationBlockedResponseStatusEnum._(String name) : super(name);

  static BuiltSet<ModerationBlockedResponseStatusEnum> get values =>
      _$moderationBlockedResponseStatusEnumValues;
  static ModerationBlockedResponseStatusEnum valueOf(String name) =>
      _$moderationBlockedResponseStatusEnumValueOf(name);
}
