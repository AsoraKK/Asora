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
/// * [id] - Client generated UUID v7 for the new post
/// * [text] - Post body text
/// * [attachments] - Optional media attachments
@BuiltValue()
abstract class CreatePostRequest
    implements Built<CreatePostRequest, CreatePostRequestBuilder> {
  /// Client generated UUID v7 for the new post
  @BuiltValueField(wireName: r'id')
  String get id;

  /// Post body text
  @BuiltValueField(wireName: r'text')
  String get text;

  /// Optional media attachments
  @BuiltValueField(wireName: r'attachments')
  BuiltList<String>? get attachments;

  CreatePostRequest._();

  factory CreatePostRequest([void updates(CreatePostRequestBuilder b)]) =
      _$CreatePostRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CreatePostRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CreatePostRequest> get serializer =>
      _$CreatePostRequestSerializer();
}

class _$CreatePostRequestSerializer
    implements PrimitiveSerializer<CreatePostRequest> {
  @override
  final Iterable<Type> types = const [CreatePostRequest, _$CreatePostRequest];

  @override
  final String wireName = r'CreatePostRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CreatePostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'text';
    yield serializers.serialize(
      object.text,
      specifiedType: const FullType(String),
    );
    if (object.attachments != null) {
      yield r'attachments';
      yield serializers.serialize(
        object.attachments,
        specifiedType: const FullType(BuiltList, [FullType(String)]),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    CreatePostRequest object, {
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
    required CreatePostRequestBuilder result,
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
        case r'text':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.text = valueDes;
          break;
        case r'attachments':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(String)]),
          ) as BuiltList<String>;
          result.attachments.replace(valueDes);
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
