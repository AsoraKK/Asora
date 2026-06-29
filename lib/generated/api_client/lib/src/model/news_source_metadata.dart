//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'news_source_metadata.g.dart';

/// NewsSourceMetadata
///
/// Properties:
/// * [type]
/// * [name]
/// * [url]
/// * [feedUrl]
/// * [externalId]
/// * [publishedAt]
/// * [ingestedAt]
/// * [ingestedBy]
/// * [ingestMethod]
@BuiltValue()
abstract class NewsSourceMetadata implements Built<NewsSourceMetadata, NewsSourceMetadataBuilder> {
  @BuiltValueField(wireName: r'type')
  NewsSourceMetadataTypeEnum get type;
  // enum typeEnum {  journalist,  curated,  partner,  wire,  };

  @BuiltValueField(wireName: r'name')
  String get name;

  @BuiltValueField(wireName: r'url')
  String? get url;

  @BuiltValueField(wireName: r'feedUrl')
  String? get feedUrl;

  @BuiltValueField(wireName: r'externalId')
  String? get externalId;

  @BuiltValueField(wireName: r'publishedAt')
  DateTime get publishedAt;

  @BuiltValueField(wireName: r'ingestedAt')
  DateTime get ingestedAt;

  @BuiltValueField(wireName: r'ingestedBy')
  String get ingestedBy;

  @BuiltValueField(wireName: r'ingestMethod')
  NewsSourceMetadataIngestMethodEnum get ingestMethod;
  // enum ingestMethodEnum {  admin_api,  timer,  };

  NewsSourceMetadata._();

  factory NewsSourceMetadata([void updates(NewsSourceMetadataBuilder b)]) = _$NewsSourceMetadata;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(NewsSourceMetadataBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<NewsSourceMetadata> get serializer => _$NewsSourceMetadataSerializer();
}

class _$NewsSourceMetadataSerializer implements PrimitiveSerializer<NewsSourceMetadata> {
  @override
  final Iterable<Type> types = const [NewsSourceMetadata, _$NewsSourceMetadata];

  @override
  final String wireName = r'NewsSourceMetadata';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    NewsSourceMetadata object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'type';
    yield serializers.serialize(
      object.type,
      specifiedType: const FullType(NewsSourceMetadataTypeEnum),
    );
    yield r'name';
    yield serializers.serialize(
      object.name,
      specifiedType: const FullType(String),
    );
    if (object.url != null) {
      yield r'url';
      yield serializers.serialize(
        object.url,
        specifiedType: const FullType(String),
      );
    }
    if (object.feedUrl != null) {
      yield r'feedUrl';
      yield serializers.serialize(
        object.feedUrl,
        specifiedType: const FullType(String),
      );
    }
    if (object.externalId != null) {
      yield r'externalId';
      yield serializers.serialize(
        object.externalId,
        specifiedType: const FullType(String),
      );
    }
    yield r'publishedAt';
    yield serializers.serialize(
      object.publishedAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'ingestedAt';
    yield serializers.serialize(
      object.ingestedAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'ingestedBy';
    yield serializers.serialize(
      object.ingestedBy,
      specifiedType: const FullType(String),
    );
    yield r'ingestMethod';
    yield serializers.serialize(
      object.ingestMethod,
      specifiedType: const FullType(NewsSourceMetadataIngestMethodEnum),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    NewsSourceMetadata object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required NewsSourceMetadataBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'type':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(NewsSourceMetadataTypeEnum),
          ) as NewsSourceMetadataTypeEnum;
          result.type = valueDes;
          break;
        case r'name':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.name = valueDes;
          break;
        case r'url':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.url = valueDes;
          break;
        case r'feedUrl':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.feedUrl = valueDes;
          break;
        case r'externalId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.externalId = valueDes;
          break;
        case r'publishedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.publishedAt = valueDes;
          break;
        case r'ingestedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.ingestedAt = valueDes;
          break;
        case r'ingestedBy':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.ingestedBy = valueDes;
          break;
        case r'ingestMethod':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(NewsSourceMetadataIngestMethodEnum),
          ) as NewsSourceMetadataIngestMethodEnum;
          result.ingestMethod = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  NewsSourceMetadata deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = NewsSourceMetadataBuilder();
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

class NewsSourceMetadataTypeEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'journalist')
  static const NewsSourceMetadataTypeEnum journalist = _$newsSourceMetadataTypeEnum_journalist;
  @BuiltValueEnumConst(wireName: r'curated')
  static const NewsSourceMetadataTypeEnum curated = _$newsSourceMetadataTypeEnum_curated;
  @BuiltValueEnumConst(wireName: r'partner')
  static const NewsSourceMetadataTypeEnum partner = _$newsSourceMetadataTypeEnum_partner;
  @BuiltValueEnumConst(wireName: r'wire')
  static const NewsSourceMetadataTypeEnum wire = _$newsSourceMetadataTypeEnum_wire;

  static Serializer<NewsSourceMetadataTypeEnum> get serializer => _$newsSourceMetadataTypeEnumSerializer;

  const NewsSourceMetadataTypeEnum._(String name): super(name);

  static BuiltSet<NewsSourceMetadataTypeEnum> get values => _$newsSourceMetadataTypeEnumValues;
  static NewsSourceMetadataTypeEnum valueOf(String name) => _$newsSourceMetadataTypeEnumValueOf(name);
}

class NewsSourceMetadataIngestMethodEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'admin_api')
  static const NewsSourceMetadataIngestMethodEnum adminApi = _$newsSourceMetadataIngestMethodEnum_adminApi;
  @BuiltValueEnumConst(wireName: r'timer')
  static const NewsSourceMetadataIngestMethodEnum timer = _$newsSourceMetadataIngestMethodEnum_timer;

  static Serializer<NewsSourceMetadataIngestMethodEnum> get serializer => _$newsSourceMetadataIngestMethodEnumSerializer;

  const NewsSourceMetadataIngestMethodEnum._(String name): super(name);

  static BuiltSet<NewsSourceMetadataIngestMethodEnum> get values => _$newsSourceMetadataIngestMethodEnumValues;
  static NewsSourceMetadataIngestMethodEnum valueOf(String name) => _$newsSourceMetadataIngestMethodEnumValueOf(name);
}
