//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'legacy_create_post_response_post_stats.g.dart';

/// LegacyCreatePostResponsePostStats
///
/// Properties:
/// * [likes]
/// * [comments]
/// * [replies]
@BuiltValue()
abstract class LegacyCreatePostResponsePostStats implements Built<LegacyCreatePostResponsePostStats, LegacyCreatePostResponsePostStatsBuilder> {
  @BuiltValueField(wireName: r'likes')
  int get likes;

  @BuiltValueField(wireName: r'comments')
  int get comments;

  @BuiltValueField(wireName: r'replies')
  int get replies;

  LegacyCreatePostResponsePostStats._();

  factory LegacyCreatePostResponsePostStats([void updates(LegacyCreatePostResponsePostStatsBuilder b)]) = _$LegacyCreatePostResponsePostStats;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(LegacyCreatePostResponsePostStatsBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<LegacyCreatePostResponsePostStats> get serializer => _$LegacyCreatePostResponsePostStatsSerializer();
}

class _$LegacyCreatePostResponsePostStatsSerializer implements PrimitiveSerializer<LegacyCreatePostResponsePostStats> {
  @override
  final Iterable<Type> types = const [LegacyCreatePostResponsePostStats, _$LegacyCreatePostResponsePostStats];

  @override
  final String wireName = r'LegacyCreatePostResponsePostStats';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    LegacyCreatePostResponsePostStats object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'likes';
    yield serializers.serialize(
      object.likes,
      specifiedType: const FullType(int),
    );
    yield r'comments';
    yield serializers.serialize(
      object.comments,
      specifiedType: const FullType(int),
    );
    yield r'replies';
    yield serializers.serialize(
      object.replies,
      specifiedType: const FullType(int),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    LegacyCreatePostResponsePostStats object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required LegacyCreatePostResponsePostStatsBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'likes':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.likes = valueDes;
          break;
        case r'comments':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.comments = valueDes;
          break;
        case r'replies':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.replies = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  LegacyCreatePostResponsePostStats deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = LegacyCreatePostResponsePostStatsBuilder();
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
