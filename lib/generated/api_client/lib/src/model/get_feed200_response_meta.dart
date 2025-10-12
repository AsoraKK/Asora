//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/json_object.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'get_feed200_response_meta.g.dart';

/// GetFeed200ResponseMeta
///
/// Properties:
/// * [count]
/// * [nextCursor]
/// * [timingsMs]
/// * [applied]
@BuiltValue()
abstract class GetFeed200ResponseMeta
    implements Built<GetFeed200ResponseMeta, GetFeed200ResponseMetaBuilder> {
  @BuiltValueField(wireName: r'count')
  int get count;

  @BuiltValueField(wireName: r'nextCursor')
  String? get nextCursor;

  @BuiltValueField(wireName: r'timingsMs')
  BuiltMap<String, num>? get timingsMs;

  @BuiltValueField(wireName: r'applied')
  BuiltMap<String, JsonObject?>? get applied;

  GetFeed200ResponseMeta._();

  factory GetFeed200ResponseMeta(
          [void updates(GetFeed200ResponseMetaBuilder b)]) =
      _$GetFeed200ResponseMeta;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(GetFeed200ResponseMetaBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<GetFeed200ResponseMeta> get serializer =>
      _$GetFeed200ResponseMetaSerializer();
}

class _$GetFeed200ResponseMetaSerializer
    implements PrimitiveSerializer<GetFeed200ResponseMeta> {
  @override
  final Iterable<Type> types = const [
    GetFeed200ResponseMeta,
    _$GetFeed200ResponseMeta
  ];

  @override
  final String wireName = r'GetFeed200ResponseMeta';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    GetFeed200ResponseMeta object, {
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
        specifiedType:
            const FullType(BuiltMap, [FullType(String), FullType(num)]),
      );
    }
    if (object.applied != null) {
      yield r'applied';
      yield serializers.serialize(
        object.applied,
        specifiedType: const FullType(
            BuiltMap, [FullType(String), FullType.nullable(JsonObject)]),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    GetFeed200ResponseMeta object, {
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
    required GetFeed200ResponseMetaBuilder result,
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
            specifiedType:
                const FullType(BuiltMap, [FullType(String), FullType(num)]),
          ) as BuiltMap<String, num>;
          result.timingsMs.replace(valueDes);
          break;
        case r'applied':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(
                BuiltMap, [FullType(String), FullType.nullable(JsonObject)]),
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
  GetFeed200ResponseMeta deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = GetFeed200ResponseMetaBuilder();
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
