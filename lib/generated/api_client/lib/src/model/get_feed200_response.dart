//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:asora_api_client/src/model/get_feed200_response_meta.dart';
import 'package:built_value/json_object.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'get_feed200_response.g.dart';

/// GetFeed200Response
///
/// Properties:
/// * [items]
/// * [meta]
@BuiltValue()
abstract class GetFeed200Response
    implements Built<GetFeed200Response, GetFeed200ResponseBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<BuiltMap<String, JsonObject?>> get items;

  @BuiltValueField(wireName: r'meta')
  GetFeed200ResponseMeta get meta;

  GetFeed200Response._();

  factory GetFeed200Response([void updates(GetFeed200ResponseBuilder b)]) =
      _$GetFeed200Response;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(GetFeed200ResponseBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<GetFeed200Response> get serializer =>
      _$GetFeed200ResponseSerializer();
}

class _$GetFeed200ResponseSerializer
    implements PrimitiveSerializer<GetFeed200Response> {
  @override
  final Iterable<Type> types = const [GetFeed200Response, _$GetFeed200Response];

  @override
  final String wireName = r'GetFeed200Response';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    GetFeed200Response object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [
        FullType(BuiltMap, [FullType(String), FullType.nullable(JsonObject)])
      ]),
    );
    yield r'meta';
    yield serializers.serialize(
      object.meta,
      specifiedType: const FullType(GetFeed200ResponseMeta),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    GetFeed200Response object, {
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
    required GetFeed200ResponseBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [
              FullType(
                  BuiltMap, [FullType(String), FullType.nullable(JsonObject)])
            ]),
          ) as BuiltList<BuiltMap<String, JsonObject?>>;
          result.items.replace(valueDes);
          break;
        case r'meta':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(GetFeed200ResponseMeta),
          ) as GetFeed200ResponseMeta;
          result.meta.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  GetFeed200Response deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = GetFeed200ResponseBuilder();
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
