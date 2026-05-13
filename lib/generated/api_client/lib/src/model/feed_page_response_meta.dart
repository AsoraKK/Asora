//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/json_object.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'feed_page_response_meta.g.dart';

/// FeedPageResponseMeta
///
/// Properties:
/// * [count] - Number of items returned
/// * [nextCursor] - Cursor for fetching the next page; null when no further pages exist
/// * [timingsMs] - Server-side timing breakdown (ms)
/// * [applied] - Applied ranking modifiers and personalization signals
@BuiltValue()
abstract class FeedPageResponseMeta implements Built<FeedPageResponseMeta, FeedPageResponseMetaBuilder> {
  /// Number of items returned
  @BuiltValueField(wireName: r'count')
  int get count;

  /// Cursor for fetching the next page; null when no further pages exist
  @BuiltValueField(wireName: r'nextCursor')
  String? get nextCursor;

  /// Server-side timing breakdown (ms)
  @BuiltValueField(wireName: r'timingsMs')
  BuiltMap<String, num>? get timingsMs;

  /// Applied ranking modifiers and personalization signals
  @BuiltValueField(wireName: r'applied')
  BuiltMap<String, JsonObject?>? get applied;

  FeedPageResponseMeta._();

  factory FeedPageResponseMeta([void updates(FeedPageResponseMetaBuilder b)]) = _$FeedPageResponseMeta;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(FeedPageResponseMetaBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<FeedPageResponseMeta> get serializer => _$FeedPageResponseMetaSerializer();
}

class _$FeedPageResponseMetaSerializer implements PrimitiveSerializer<FeedPageResponseMeta> {
  @override
  final Iterable<Type> types = const [FeedPageResponseMeta, _$FeedPageResponseMeta];

  @override
  final String wireName = r'FeedPageResponseMeta';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    FeedPageResponseMeta object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'count';
    yield serializers.serialize(
      object.count,
      specifiedType: const FullType(int),
    );
    if (object.nextCursor != null) {
      yield r'nextCursor';
      yield serializers.serialize(
        object.nextCursor,
        specifiedType: const FullType.nullable(String),
      );
    }
    if (object.timingsMs != null) {
      yield r'timingsMs';
      yield serializers.serialize(
        object.timingsMs,
        specifiedType: const FullType(BuiltMap, [FullType(String), FullType(num)]),
      );
    }
    if (object.applied != null) {
      yield r'applied';
      yield serializers.serialize(
        object.applied,
        specifiedType: const FullType(BuiltMap, [FullType(String), FullType.nullable(JsonObject)]),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    FeedPageResponseMeta object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required FeedPageResponseMetaBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'count':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.count = valueDes;
          break;
        case r'nextCursor':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.nextCursor = valueDes;
          break;
        case r'timingsMs':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltMap, [FullType(String), FullType(num)]),
          ) as BuiltMap<String, num>;
          result.timingsMs.replace(valueDes);
          break;
        case r'applied':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltMap, [FullType(String), FullType.nullable(JsonObject)]),
          ) as BuiltMap<String, JsonObject?>;
          result.applied.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  FeedPageResponseMeta deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = FeedPageResponseMetaBuilder();
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

