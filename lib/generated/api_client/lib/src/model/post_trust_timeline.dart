//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'post_trust_timeline.g.dart';

/// PostTrustTimeline
///
/// Properties:
/// * [created]
/// * [mediaChecked]
/// * [moderation]
/// * [appeal]
@BuiltValue()
abstract class PostTrustTimeline implements Built<PostTrustTimeline, PostTrustTimelineBuilder> {
  @BuiltValueField(wireName: r'created')
  PostTrustTimelineCreatedEnum get created;
  // enum createdEnum {  complete,  };

  @BuiltValueField(wireName: r'mediaChecked')
  PostTrustTimelineMediaCheckedEnum get mediaChecked;
  // enum mediaCheckedEnum {  complete,  none,  };

  @BuiltValueField(wireName: r'moderation')
  PostTrustTimelineModerationEnum get moderation;
  // enum moderationEnum {  complete,  warn,  actioned,  none,  };

  @BuiltValueField(wireName: r'appeal')
  PostTrustTimelineAppealEnum? get appeal;
  // enum appealEnum {  open,  resolved,  };

  PostTrustTimeline._();

  factory PostTrustTimeline([void updates(PostTrustTimelineBuilder b)]) = _$PostTrustTimeline;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PostTrustTimelineBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<PostTrustTimeline> get serializer => _$PostTrustTimelineSerializer();
}

class _$PostTrustTimelineSerializer implements PrimitiveSerializer<PostTrustTimeline> {
  @override
  final Iterable<Type> types = const [PostTrustTimeline, _$PostTrustTimeline];

  @override
  final String wireName = r'PostTrustTimeline';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PostTrustTimeline object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'created';
    yield serializers.serialize(
      object.created,
      specifiedType: const FullType(PostTrustTimelineCreatedEnum),
    );
    yield r'mediaChecked';
    yield serializers.serialize(
      object.mediaChecked,
      specifiedType: const FullType(PostTrustTimelineMediaCheckedEnum),
    );
    yield r'moderation';
    yield serializers.serialize(
      object.moderation,
      specifiedType: const FullType(PostTrustTimelineModerationEnum),
    );
    if (object.appeal != null) {
      yield r'appeal';
      yield serializers.serialize(
        object.appeal,
        specifiedType: const FullType(PostTrustTimelineAppealEnum),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    PostTrustTimeline object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required PostTrustTimelineBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'created':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PostTrustTimelineCreatedEnum),
          ) as PostTrustTimelineCreatedEnum;
          result.created = valueDes;
          break;
        case r'mediaChecked':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PostTrustTimelineMediaCheckedEnum),
          ) as PostTrustTimelineMediaCheckedEnum;
          result.mediaChecked = valueDes;
          break;
        case r'moderation':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PostTrustTimelineModerationEnum),
          ) as PostTrustTimelineModerationEnum;
          result.moderation = valueDes;
          break;
        case r'appeal':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PostTrustTimelineAppealEnum),
          ) as PostTrustTimelineAppealEnum;
          result.appeal = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  PostTrustTimeline deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PostTrustTimelineBuilder();
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

class PostTrustTimelineCreatedEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'complete')
  static const PostTrustTimelineCreatedEnum complete = _$postTrustTimelineCreatedEnum_complete;

  static Serializer<PostTrustTimelineCreatedEnum> get serializer => _$postTrustTimelineCreatedEnumSerializer;

  const PostTrustTimelineCreatedEnum._(String name): super(name);

  static BuiltSet<PostTrustTimelineCreatedEnum> get values => _$postTrustTimelineCreatedEnumValues;
  static PostTrustTimelineCreatedEnum valueOf(String name) => _$postTrustTimelineCreatedEnumValueOf(name);
}

class PostTrustTimelineMediaCheckedEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'complete')
  static const PostTrustTimelineMediaCheckedEnum complete = _$postTrustTimelineMediaCheckedEnum_complete;
  @BuiltValueEnumConst(wireName: r'none')
  static const PostTrustTimelineMediaCheckedEnum none = _$postTrustTimelineMediaCheckedEnum_none;

  static Serializer<PostTrustTimelineMediaCheckedEnum> get serializer => _$postTrustTimelineMediaCheckedEnumSerializer;

  const PostTrustTimelineMediaCheckedEnum._(String name): super(name);

  static BuiltSet<PostTrustTimelineMediaCheckedEnum> get values => _$postTrustTimelineMediaCheckedEnumValues;
  static PostTrustTimelineMediaCheckedEnum valueOf(String name) => _$postTrustTimelineMediaCheckedEnumValueOf(name);
}

class PostTrustTimelineModerationEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'complete')
  static const PostTrustTimelineModerationEnum complete = _$postTrustTimelineModerationEnum_complete;
  @BuiltValueEnumConst(wireName: r'warn')
  static const PostTrustTimelineModerationEnum warn = _$postTrustTimelineModerationEnum_warn;
  @BuiltValueEnumConst(wireName: r'actioned')
  static const PostTrustTimelineModerationEnum actioned = _$postTrustTimelineModerationEnum_actioned;
  @BuiltValueEnumConst(wireName: r'none')
  static const PostTrustTimelineModerationEnum none = _$postTrustTimelineModerationEnum_none;

  static Serializer<PostTrustTimelineModerationEnum> get serializer => _$postTrustTimelineModerationEnumSerializer;

  const PostTrustTimelineModerationEnum._(String name): super(name);

  static BuiltSet<PostTrustTimelineModerationEnum> get values => _$postTrustTimelineModerationEnumValues;
  static PostTrustTimelineModerationEnum valueOf(String name) => _$postTrustTimelineModerationEnumValueOf(name);
}

class PostTrustTimelineAppealEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'open')
  static const PostTrustTimelineAppealEnum open = _$postTrustTimelineAppealEnum_open;
  @BuiltValueEnumConst(wireName: r'resolved')
  static const PostTrustTimelineAppealEnum resolved = _$postTrustTimelineAppealEnum_resolved;

  static Serializer<PostTrustTimelineAppealEnum> get serializer => _$postTrustTimelineAppealEnumSerializer;

  const PostTrustTimelineAppealEnum._(String name): super(name);

  static BuiltSet<PostTrustTimelineAppealEnum> get values => _$postTrustTimelineAppealEnumValues;
  static PostTrustTimelineAppealEnum valueOf(String name) => _$postTrustTimelineAppealEnumValueOf(name);
}
