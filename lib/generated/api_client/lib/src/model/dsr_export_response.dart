//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:asora_api_client/src/model/dsr_export_response_metadata.dart';
import 'package:built_value/json_object.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'dsr_export_response.g.dart';

/// GDPR Article 20 data portability export payload.
///
/// Properties:
/// * [metadata]
/// * [userProfile]
/// * [content]
/// * [interactions]
/// * [moderation]
/// * [reputation]
/// * [privacy]
@BuiltValue()
abstract class DSRExportResponse implements Built<DSRExportResponse, DSRExportResponseBuilder> {
  @BuiltValueField(wireName: r'metadata')
  DSRExportResponseMetadata get metadata;

  @BuiltValueField(wireName: r'userProfile')
  BuiltMap<String, JsonObject?> get userProfile;

  @BuiltValueField(wireName: r'content')
  BuiltMap<String, JsonObject?> get content;

  @BuiltValueField(wireName: r'interactions')
  BuiltMap<String, JsonObject?> get interactions;

  @BuiltValueField(wireName: r'moderation')
  BuiltMap<String, JsonObject?> get moderation;

  @BuiltValueField(wireName: r'reputation')
  BuiltMap<String, JsonObject?> get reputation;

  @BuiltValueField(wireName: r'privacy')
  BuiltMap<String, JsonObject?> get privacy;

  DSRExportResponse._();

  factory DSRExportResponse([void updates(DSRExportResponseBuilder b)]) = _$DSRExportResponse;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(DSRExportResponseBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<DSRExportResponse> get serializer => _$DSRExportResponseSerializer();
}

class _$DSRExportResponseSerializer implements PrimitiveSerializer<DSRExportResponse> {
  @override
  final Iterable<Type> types = const [DSRExportResponse, _$DSRExportResponse];

  @override
  final String wireName = r'DSRExportResponse';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    DSRExportResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'metadata';
    yield serializers.serialize(
      object.metadata,
      specifiedType: const FullType(DSRExportResponseMetadata),
    );
    yield r'userProfile';
    yield serializers.serialize(
      object.userProfile,
      specifiedType: const FullType(BuiltMap, [FullType(String), FullType.nullable(JsonObject)]),
    );
    yield r'content';
    yield serializers.serialize(
      object.content,
      specifiedType: const FullType(BuiltMap, [FullType(String), FullType.nullable(JsonObject)]),
    );
    yield r'interactions';
    yield serializers.serialize(
      object.interactions,
      specifiedType: const FullType(BuiltMap, [FullType(String), FullType.nullable(JsonObject)]),
    );
    yield r'moderation';
    yield serializers.serialize(
      object.moderation,
      specifiedType: const FullType(BuiltMap, [FullType(String), FullType.nullable(JsonObject)]),
    );
    yield r'reputation';
    yield serializers.serialize(
      object.reputation,
      specifiedType: const FullType(BuiltMap, [FullType(String), FullType.nullable(JsonObject)]),
    );
    yield r'privacy';
    yield serializers.serialize(
      object.privacy,
      specifiedType: const FullType(BuiltMap, [FullType(String), FullType.nullable(JsonObject)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    DSRExportResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required DSRExportResponseBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'metadata':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DSRExportResponseMetadata),
          ) as DSRExportResponseMetadata;
          result.metadata.replace(valueDes);
          break;
        case r'userProfile':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltMap, [FullType(String), FullType.nullable(JsonObject)]),
          ) as BuiltMap<String, JsonObject?>;
          result.userProfile.replace(valueDes);
          break;
        case r'content':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltMap, [FullType(String), FullType.nullable(JsonObject)]),
          ) as BuiltMap<String, JsonObject?>;
          result.content.replace(valueDes);
          break;
        case r'interactions':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltMap, [FullType(String), FullType.nullable(JsonObject)]),
          ) as BuiltMap<String, JsonObject?>;
          result.interactions.replace(valueDes);
          break;
        case r'moderation':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltMap, [FullType(String), FullType.nullable(JsonObject)]),
          ) as BuiltMap<String, JsonObject?>;
          result.moderation.replace(valueDes);
          break;
        case r'reputation':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltMap, [FullType(String), FullType.nullable(JsonObject)]),
          ) as BuiltMap<String, JsonObject?>;
          result.reputation.replace(valueDes);
          break;
        case r'privacy':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltMap, [FullType(String), FullType.nullable(JsonObject)]),
          ) as BuiltMap<String, JsonObject?>;
          result.privacy.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  DSRExportResponse deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = DSRExportResponseBuilder();
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
