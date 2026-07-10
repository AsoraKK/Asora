//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'create_post_request.g.dart';

/// CreatePostRequest
///
/// Properties:
/// * [text] - Post body text
/// * [mediaUrl]
/// * [aiLabel] - Required authorship disclosure.
@BuiltValue()
abstract class CreatePostRequest implements Built<CreatePostRequest, CreatePostRequestBuilder> {
  /// Post body text
  @BuiltValueField(wireName: r'text')
  String get text;

  @BuiltValueField(wireName: r'mediaUrl')
  String? get mediaUrl;

  /// Required authorship disclosure.
  @BuiltValueField(wireName: r'aiLabel')
  CreatePostRequestAiLabelEnum get aiLabel;
  // enum aiLabelEnum {  human,  assisted,  generated,  };

  CreatePostRequest._();

  factory CreatePostRequest([void updates(CreatePostRequestBuilder b)]) = _$CreatePostRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CreatePostRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CreatePostRequest> get serializer => _$CreatePostRequestSerializer();
}

class _$CreatePostRequestSerializer implements PrimitiveSerializer<CreatePostRequest> {
  @override
  final Iterable<Type> types = const [CreatePostRequest, _$CreatePostRequest];

  @override
  final String wireName = r'CreatePostRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CreatePostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'text';
    yield serializers.serialize(
      object.text,
      specifiedType: const FullType(String),
    );
    if (object.mediaUrl != null) {
      yield r'mediaUrl';
      yield serializers.serialize(
        object.mediaUrl,
        specifiedType: const FullType.nullable(String),
      );
    }
    yield r'aiLabel';
    yield serializers.serialize(
      object.aiLabel,
      specifiedType: const FullType(CreatePostRequestAiLabelEnum),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    CreatePostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required CreatePostRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'text':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.text = valueDes;
          break;
        case r'mediaUrl':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.mediaUrl = valueDes;
          break;
        case r'aiLabel':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(CreatePostRequestAiLabelEnum),
          ) as CreatePostRequestAiLabelEnum;
          result.aiLabel = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CreatePostRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CreatePostRequestBuilder();
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

class CreatePostRequestAiLabelEnum extends EnumClass {

  /// Required authorship disclosure.
  @BuiltValueEnumConst(wireName: r'human')
  static const CreatePostRequestAiLabelEnum human = _$createPostRequestAiLabelEnum_human;
  /// Required authorship disclosure.
  @BuiltValueEnumConst(wireName: r'assisted')
  static const CreatePostRequestAiLabelEnum assisted = _$createPostRequestAiLabelEnum_assisted;
  /// Required authorship disclosure.
  @BuiltValueEnumConst(wireName: r'generated')
  static const CreatePostRequestAiLabelEnum generated = _$createPostRequestAiLabelEnum_generated;

  static Serializer<CreatePostRequestAiLabelEnum> get serializer => _$createPostRequestAiLabelEnumSerializer;

  const CreatePostRequestAiLabelEnum._(String name): super(name);

  static BuiltSet<CreatePostRequestAiLabelEnum> get values => _$createPostRequestAiLabelEnumValues;
  static CreatePostRequestAiLabelEnum valueOf(String name) => _$createPostRequestAiLabelEnumValueOf(name);
}
