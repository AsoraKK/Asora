//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'post_view_all_of_recent_comments.g.dart';

/// PostViewAllOfRecentComments
///
/// Properties:
/// * [commentId]
/// * [authorId]
/// * [text]
/// * [createdAt]
@BuiltValue()
abstract class PostViewAllOfRecentComments implements Built<PostViewAllOfRecentComments, PostViewAllOfRecentCommentsBuilder> {
  @BuiltValueField(wireName: r'commentId')
  String? get commentId;

  @BuiltValueField(wireName: r'authorId')
  String? get authorId;

  @BuiltValueField(wireName: r'text')
  String? get text;

  @BuiltValueField(wireName: r'createdAt')
  DateTime? get createdAt;

  PostViewAllOfRecentComments._();

  factory PostViewAllOfRecentComments([void updates(PostViewAllOfRecentCommentsBuilder b)]) = _$PostViewAllOfRecentComments;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PostViewAllOfRecentCommentsBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<PostViewAllOfRecentComments> get serializer => _$PostViewAllOfRecentCommentsSerializer();
}

class _$PostViewAllOfRecentCommentsSerializer implements PrimitiveSerializer<PostViewAllOfRecentComments> {
  @override
  final Iterable<Type> types = const [PostViewAllOfRecentComments, _$PostViewAllOfRecentComments];

  @override
  final String wireName = r'PostViewAllOfRecentComments';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PostViewAllOfRecentComments object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.commentId != null) {
      yield r'commentId';
      yield serializers.serialize(
        object.commentId,
        specifiedType: const FullType(String),
      );
    }
    if (object.authorId != null) {
      yield r'authorId';
      yield serializers.serialize(
        object.authorId,
        specifiedType: const FullType(String),
      );
    }
    if (object.text != null) {
      yield r'text';
      yield serializers.serialize(
        object.text,
        specifiedType: const FullType(String),
      );
    }
    if (object.createdAt != null) {
      yield r'createdAt';
      yield serializers.serialize(
        object.createdAt,
        specifiedType: const FullType(DateTime),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    PostViewAllOfRecentComments object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required PostViewAllOfRecentCommentsBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'commentId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.commentId = valueDes;
          break;
        case r'authorId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.authorId = valueDes;
          break;
        case r'text':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.text = valueDes;
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
  PostViewAllOfRecentComments deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PostViewAllOfRecentCommentsBuilder();
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
