//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'update_custom_feed_request.g.dart';

/// UpdateCustomFeedRequest
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
abstract class UpdateCustomFeedRequest implements Built<UpdateCustomFeedRequest, UpdateCustomFeedRequestBuilder> {
  @BuiltValueField(wireName: r'name')
  String? get name;

  @BuiltValueField(wireName: r'contentType')
  UpdateCustomFeedRequestContentTypeEnum? get contentType;
  // enum contentTypeEnum {  text,  image,  video,  mixed,  };

  @BuiltValueField(wireName: r'sorting')
  UpdateCustomFeedRequestSortingEnum? get sorting;
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

  UpdateCustomFeedRequest._();

  factory UpdateCustomFeedRequest([void updates(UpdateCustomFeedRequestBuilder b)]) = _$UpdateCustomFeedRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(UpdateCustomFeedRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<UpdateCustomFeedRequest> get serializer => _$UpdateCustomFeedRequestSerializer();
}

class _$UpdateCustomFeedRequestSerializer implements PrimitiveSerializer<UpdateCustomFeedRequest> {
  @override
  final Iterable<Type> types = const [UpdateCustomFeedRequest, _$UpdateCustomFeedRequest];

  @override
  final String wireName = r'UpdateCustomFeedRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    UpdateCustomFeedRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.name != null) {
      yield r'name';
      yield serializers.serialize(
        object.name,
        specifiedType: const FullType(String),
      );
    }
    if (object.contentType != null) {
      yield r'contentType';
      yield serializers.serialize(
        object.contentType,
        specifiedType: const FullType(UpdateCustomFeedRequestContentTypeEnum),
      );
    }
    if (object.sorting != null) {
      yield r'sorting';
      yield serializers.serialize(
        object.sorting,
        specifiedType: const FullType(UpdateCustomFeedRequestSortingEnum),
      );
    }
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
    UpdateCustomFeedRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required UpdateCustomFeedRequestBuilder result,
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
            specifiedType: const FullType(UpdateCustomFeedRequestContentTypeEnum),
          ) as UpdateCustomFeedRequestContentTypeEnum;
          result.contentType = valueDes;
          break;
        case r'sorting':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(UpdateCustomFeedRequestSortingEnum),
          ) as UpdateCustomFeedRequestSortingEnum;
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
  UpdateCustomFeedRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = UpdateCustomFeedRequestBuilder();
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

class UpdateCustomFeedRequestContentTypeEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'text')
  static const UpdateCustomFeedRequestContentTypeEnum text = _$updateCustomFeedRequestContentTypeEnum_text;
  @BuiltValueEnumConst(wireName: r'image')
  static const UpdateCustomFeedRequestContentTypeEnum image = _$updateCustomFeedRequestContentTypeEnum_image;
  @BuiltValueEnumConst(wireName: r'video')
  static const UpdateCustomFeedRequestContentTypeEnum video = _$updateCustomFeedRequestContentTypeEnum_video;
  @BuiltValueEnumConst(wireName: r'mixed')
  static const UpdateCustomFeedRequestContentTypeEnum mixed = _$updateCustomFeedRequestContentTypeEnum_mixed;

  static Serializer<UpdateCustomFeedRequestContentTypeEnum> get serializer => _$updateCustomFeedRequestContentTypeEnumSerializer;

  const UpdateCustomFeedRequestContentTypeEnum._(String name): super(name);

  static BuiltSet<UpdateCustomFeedRequestContentTypeEnum> get values => _$updateCustomFeedRequestContentTypeEnumValues;
  static UpdateCustomFeedRequestContentTypeEnum valueOf(String name) => _$updateCustomFeedRequestContentTypeEnumValueOf(name);
}

class UpdateCustomFeedRequestSortingEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'hot')
  static const UpdateCustomFeedRequestSortingEnum hot = _$updateCustomFeedRequestSortingEnum_hot;
  @BuiltValueEnumConst(wireName: r'new')
  static const UpdateCustomFeedRequestSortingEnum new_ = _$updateCustomFeedRequestSortingEnum_new_;
  @BuiltValueEnumConst(wireName: r'relevant')
  static const UpdateCustomFeedRequestSortingEnum relevant = _$updateCustomFeedRequestSortingEnum_relevant;
  @BuiltValueEnumConst(wireName: r'following')
  static const UpdateCustomFeedRequestSortingEnum following = _$updateCustomFeedRequestSortingEnum_following;
  @BuiltValueEnumConst(wireName: r'local')
  static const UpdateCustomFeedRequestSortingEnum local = _$updateCustomFeedRequestSortingEnum_local;

  static Serializer<UpdateCustomFeedRequestSortingEnum> get serializer => _$updateCustomFeedRequestSortingEnumSerializer;

  const UpdateCustomFeedRequestSortingEnum._(String name): super(name);

  static BuiltSet<UpdateCustomFeedRequestSortingEnum> get values => _$updateCustomFeedRequestSortingEnumValues;
  static UpdateCustomFeedRequestSortingEnum valueOf(String name) => _$updateCustomFeedRequestSortingEnumValueOf(name);
}

