//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'create_custom_feed_request.g.dart';

/// CreateCustomFeedRequest
///
/// Properties:
/// * [name] 
/// * [contentType] 
/// * [sorting] 
/// * [includeKeywords] 
/// * [excludeKeywords] 
/// * [includeAccounts] 
/// * [excludeAccounts] 
/// * [isHome] 
@BuiltValue()
abstract class CreateCustomFeedRequest implements Built<CreateCustomFeedRequest, CreateCustomFeedRequestBuilder> {
  @BuiltValueField(wireName: r'name')
  String get name;

  @BuiltValueField(wireName: r'contentType')
  CreateCustomFeedRequestContentTypeEnum get contentType;
  // enum contentTypeEnum {  text,  image,  video,  mixed,  };

  @BuiltValueField(wireName: r'sorting')
  CreateCustomFeedRequestSortingEnum get sorting;
  // enum sortingEnum {  hot,  new,  relevant,  following,  local,  };

  @BuiltValueField(wireName: r'includeKeywords')
  BuiltList<String>? get includeKeywords;

  @BuiltValueField(wireName: r'excludeKeywords')
  BuiltList<String>? get excludeKeywords;

  @BuiltValueField(wireName: r'includeAccounts')
  BuiltList<String>? get includeAccounts;

  @BuiltValueField(wireName: r'excludeAccounts')
  BuiltList<String>? get excludeAccounts;

  @BuiltValueField(wireName: r'isHome')
  bool? get isHome;

  CreateCustomFeedRequest._();

  factory CreateCustomFeedRequest([void updates(CreateCustomFeedRequestBuilder b)]) = _$CreateCustomFeedRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CreateCustomFeedRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CreateCustomFeedRequest> get serializer => _$CreateCustomFeedRequestSerializer();
}

class _$CreateCustomFeedRequestSerializer implements PrimitiveSerializer<CreateCustomFeedRequest> {
  @override
  final Iterable<Type> types = const [CreateCustomFeedRequest, _$CreateCustomFeedRequest];

  @override
  final String wireName = r'CreateCustomFeedRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CreateCustomFeedRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'name';
    yield serializers.serialize(
      object.name,
      specifiedType: const FullType(String),
    );
    yield r'contentType';
    yield serializers.serialize(
      object.contentType,
      specifiedType: const FullType(CreateCustomFeedRequestContentTypeEnum),
    );
    yield r'sorting';
    yield serializers.serialize(
      object.sorting,
      specifiedType: const FullType(CreateCustomFeedRequestSortingEnum),
    );
    if (object.includeKeywords != null) {
      yield r'includeKeywords';
      yield serializers.serialize(
        object.includeKeywords,
        specifiedType: const FullType(BuiltList, [FullType(String)]),
      );
    }
    if (object.excludeKeywords != null) {
      yield r'excludeKeywords';
      yield serializers.serialize(
        object.excludeKeywords,
        specifiedType: const FullType(BuiltList, [FullType(String)]),
      );
    }
    if (object.includeAccounts != null) {
      yield r'includeAccounts';
      yield serializers.serialize(
        object.includeAccounts,
        specifiedType: const FullType(BuiltList, [FullType(String)]),
      );
    }
    if (object.excludeAccounts != null) {
      yield r'excludeAccounts';
      yield serializers.serialize(
        object.excludeAccounts,
        specifiedType: const FullType(BuiltList, [FullType(String)]),
      );
    }
    if (object.isHome != null) {
      yield r'isHome';
      yield serializers.serialize(
        object.isHome,
        specifiedType: const FullType(bool),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    CreateCustomFeedRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required CreateCustomFeedRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'name':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.name = valueDes;
          break;
        case r'contentType':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(CreateCustomFeedRequestContentTypeEnum),
          ) as CreateCustomFeedRequestContentTypeEnum;
          result.contentType = valueDes;
          break;
        case r'sorting':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(CreateCustomFeedRequestSortingEnum),
          ) as CreateCustomFeedRequestSortingEnum;
          result.sorting = valueDes;
          break;
        case r'includeKeywords':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(String)]),
          ) as BuiltList<String>;
          result.includeKeywords.replace(valueDes);
          break;
        case r'excludeKeywords':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(String)]),
          ) as BuiltList<String>;
          result.excludeKeywords.replace(valueDes);
          break;
        case r'includeAccounts':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(String)]),
          ) as BuiltList<String>;
          result.includeAccounts.replace(valueDes);
          break;
        case r'excludeAccounts':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(String)]),
          ) as BuiltList<String>;
          result.excludeAccounts.replace(valueDes);
          break;
        case r'isHome':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.isHome = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CreateCustomFeedRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CreateCustomFeedRequestBuilder();
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

class CreateCustomFeedRequestContentTypeEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'text')
  static const CreateCustomFeedRequestContentTypeEnum text = _$createCustomFeedRequestContentTypeEnum_text;
  @BuiltValueEnumConst(wireName: r'image')
  static const CreateCustomFeedRequestContentTypeEnum image = _$createCustomFeedRequestContentTypeEnum_image;
  @BuiltValueEnumConst(wireName: r'video')
  static const CreateCustomFeedRequestContentTypeEnum video = _$createCustomFeedRequestContentTypeEnum_video;
  @BuiltValueEnumConst(wireName: r'mixed')
  static const CreateCustomFeedRequestContentTypeEnum mixed = _$createCustomFeedRequestContentTypeEnum_mixed;

  static Serializer<CreateCustomFeedRequestContentTypeEnum> get serializer => _$createCustomFeedRequestContentTypeEnumSerializer;

  const CreateCustomFeedRequestContentTypeEnum._(String name): super(name);

  static BuiltSet<CreateCustomFeedRequestContentTypeEnum> get values => _$createCustomFeedRequestContentTypeEnumValues;
  static CreateCustomFeedRequestContentTypeEnum valueOf(String name) => _$createCustomFeedRequestContentTypeEnumValueOf(name);
}

class CreateCustomFeedRequestSortingEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'hot')
  static const CreateCustomFeedRequestSortingEnum hot = _$createCustomFeedRequestSortingEnum_hot;
  @BuiltValueEnumConst(wireName: r'new')
  static const CreateCustomFeedRequestSortingEnum new_ = _$createCustomFeedRequestSortingEnum_new_;
  @BuiltValueEnumConst(wireName: r'relevant')
  static const CreateCustomFeedRequestSortingEnum relevant = _$createCustomFeedRequestSortingEnum_relevant;
  @BuiltValueEnumConst(wireName: r'following')
  static const CreateCustomFeedRequestSortingEnum following = _$createCustomFeedRequestSortingEnum_following;
  @BuiltValueEnumConst(wireName: r'local')
  static const CreateCustomFeedRequestSortingEnum local = _$createCustomFeedRequestSortingEnum_local;

  static Serializer<CreateCustomFeedRequestSortingEnum> get serializer => _$createCustomFeedRequestSortingEnumSerializer;

  const CreateCustomFeedRequestSortingEnum._(String name): super(name);

  static BuiltSet<CreateCustomFeedRequestSortingEnum> get values => _$createCustomFeedRequestSortingEnumValues;
  static CreateCustomFeedRequestSortingEnum valueOf(String name) => _$createCustomFeedRequestSortingEnumValueOf(name);
}

