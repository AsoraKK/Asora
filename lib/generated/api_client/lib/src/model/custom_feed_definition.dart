//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'custom_feed_definition.g.dart';

/// CustomFeedDefinition
///
/// Properties:
/// * [id] 
/// * [ownerId] 
/// * [name] 
/// * [contentType] 
/// * [sorting] 
/// * [includeKeywords] 
/// * [excludeKeywords] 
/// * [includeAccounts] 
/// * [excludeAccounts] 
/// * [isHome] 
/// * [createdAt] 
/// * [updatedAt] 
@BuiltValue()
abstract class CustomFeedDefinition implements Built<CustomFeedDefinition, CustomFeedDefinitionBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'ownerId')
  String get ownerId;

  @BuiltValueField(wireName: r'name')
  String get name;

  @BuiltValueField(wireName: r'contentType')
  CustomFeedDefinitionContentTypeEnum get contentType;
  // enum contentTypeEnum {  text,  image,  video,  mixed,  };

  @BuiltValueField(wireName: r'sorting')
  CustomFeedDefinitionSortingEnum get sorting;
  // enum sortingEnum {  hot,  new,  relevant,  following,  local,  };

  @BuiltValueField(wireName: r'includeKeywords')
  BuiltList<String> get includeKeywords;

  @BuiltValueField(wireName: r'excludeKeywords')
  BuiltList<String> get excludeKeywords;

  @BuiltValueField(wireName: r'includeAccounts')
  BuiltList<String> get includeAccounts;

  @BuiltValueField(wireName: r'excludeAccounts')
  BuiltList<String> get excludeAccounts;

  @BuiltValueField(wireName: r'isHome')
  bool get isHome;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  @BuiltValueField(wireName: r'updatedAt')
  DateTime get updatedAt;

  CustomFeedDefinition._();

  factory CustomFeedDefinition([void updates(CustomFeedDefinitionBuilder b)]) = _$CustomFeedDefinition;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CustomFeedDefinitionBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CustomFeedDefinition> get serializer => _$CustomFeedDefinitionSerializer();
}

class _$CustomFeedDefinitionSerializer implements PrimitiveSerializer<CustomFeedDefinition> {
  @override
  final Iterable<Type> types = const [CustomFeedDefinition, _$CustomFeedDefinition];

  @override
  final String wireName = r'CustomFeedDefinition';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CustomFeedDefinition object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'ownerId';
    yield serializers.serialize(
      object.ownerId,
      specifiedType: const FullType(String),
    );
    yield r'name';
    yield serializers.serialize(
      object.name,
      specifiedType: const FullType(String),
    );
    yield r'contentType';
    yield serializers.serialize(
      object.contentType,
      specifiedType: const FullType(CustomFeedDefinitionContentTypeEnum),
    );
    yield r'sorting';
    yield serializers.serialize(
      object.sorting,
      specifiedType: const FullType(CustomFeedDefinitionSortingEnum),
    );
    yield r'includeKeywords';
    yield serializers.serialize(
      object.includeKeywords,
      specifiedType: const FullType(BuiltList, [FullType(String)]),
    );
    yield r'excludeKeywords';
    yield serializers.serialize(
      object.excludeKeywords,
      specifiedType: const FullType(BuiltList, [FullType(String)]),
    );
    yield r'includeAccounts';
    yield serializers.serialize(
      object.includeAccounts,
      specifiedType: const FullType(BuiltList, [FullType(String)]),
    );
    yield r'excludeAccounts';
    yield serializers.serialize(
      object.excludeAccounts,
      specifiedType: const FullType(BuiltList, [FullType(String)]),
    );
    yield r'isHome';
    yield serializers.serialize(
      object.isHome,
      specifiedType: const FullType(bool),
    );
    yield r'createdAt';
    yield serializers.serialize(
      object.createdAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'updatedAt';
    yield serializers.serialize(
      object.updatedAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    CustomFeedDefinition object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required CustomFeedDefinitionBuilder result,
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
        case r'ownerId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.ownerId = valueDes;
          break;
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
            specifiedType: const FullType(CustomFeedDefinitionContentTypeEnum),
          ) as CustomFeedDefinitionContentTypeEnum;
          result.contentType = valueDes;
          break;
        case r'sorting':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(CustomFeedDefinitionSortingEnum),
          ) as CustomFeedDefinitionSortingEnum;
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
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.createdAt = valueDes;
          break;
        case r'updatedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.updatedAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CustomFeedDefinition deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CustomFeedDefinitionBuilder();
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

class CustomFeedDefinitionContentTypeEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'text')
  static const CustomFeedDefinitionContentTypeEnum text = _$customFeedDefinitionContentTypeEnum_text;
  @BuiltValueEnumConst(wireName: r'image')
  static const CustomFeedDefinitionContentTypeEnum image = _$customFeedDefinitionContentTypeEnum_image;
  @BuiltValueEnumConst(wireName: r'video')
  static const CustomFeedDefinitionContentTypeEnum video = _$customFeedDefinitionContentTypeEnum_video;
  @BuiltValueEnumConst(wireName: r'mixed')
  static const CustomFeedDefinitionContentTypeEnum mixed = _$customFeedDefinitionContentTypeEnum_mixed;

  static Serializer<CustomFeedDefinitionContentTypeEnum> get serializer => _$customFeedDefinitionContentTypeEnumSerializer;

  const CustomFeedDefinitionContentTypeEnum._(String name): super(name);

  static BuiltSet<CustomFeedDefinitionContentTypeEnum> get values => _$customFeedDefinitionContentTypeEnumValues;
  static CustomFeedDefinitionContentTypeEnum valueOf(String name) => _$customFeedDefinitionContentTypeEnumValueOf(name);
}

class CustomFeedDefinitionSortingEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'hot')
  static const CustomFeedDefinitionSortingEnum hot = _$customFeedDefinitionSortingEnum_hot;
  @BuiltValueEnumConst(wireName: r'new')
  static const CustomFeedDefinitionSortingEnum new_ = _$customFeedDefinitionSortingEnum_new_;
  @BuiltValueEnumConst(wireName: r'relevant')
  static const CustomFeedDefinitionSortingEnum relevant = _$customFeedDefinitionSortingEnum_relevant;
  @BuiltValueEnumConst(wireName: r'following')
  static const CustomFeedDefinitionSortingEnum following = _$customFeedDefinitionSortingEnum_following;
  @BuiltValueEnumConst(wireName: r'local')
  static const CustomFeedDefinitionSortingEnum local = _$customFeedDefinitionSortingEnum_local;

  static Serializer<CustomFeedDefinitionSortingEnum> get serializer => _$customFeedDefinitionSortingEnumSerializer;

  const CustomFeedDefinitionSortingEnum._(String name): super(name);

  static BuiltSet<CustomFeedDefinitionSortingEnum> get values => _$customFeedDefinitionSortingEnumValues;
  static CustomFeedDefinitionSortingEnum valueOf(String name) => _$customFeedDefinitionSortingEnumValueOf(name);
}

