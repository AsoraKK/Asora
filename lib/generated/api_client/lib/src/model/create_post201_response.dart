//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'create_post201_response.g.dart';

/// CreatePost201Response
///
/// Properties:
/// * [id] 
/// * [status] 
@BuiltValue()
abstract class CreatePost201Response implements Built<CreatePost201Response, CreatePost201ResponseBuilder> {
  @BuiltValueField(wireName: r'id')
  String? get id;

  @BuiltValueField(wireName: r'status')
  CreatePost201ResponseStatusEnum? get status;
  // enum statusEnum {  published,  blocked,  };

  CreatePost201Response._();

  factory CreatePost201Response([void updates(CreatePost201ResponseBuilder b)]) = _$CreatePost201Response;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CreatePost201ResponseBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CreatePost201Response> get serializer => _$CreatePost201ResponseSerializer();
}

class _$CreatePost201ResponseSerializer implements PrimitiveSerializer<CreatePost201Response> {
  @override
  final Iterable<Type> types = const [CreatePost201Response, _$CreatePost201Response];

  @override
  final String wireName = r'CreatePost201Response';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CreatePost201Response object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.id != null) {
      yield r'id';
      yield serializers.serialize(
        object.id,
        specifiedType: const FullType(String),
      );
    }
    if (object.status != null) {
      yield r'status';
      yield serializers.serialize(
        object.status,
        specifiedType: const FullType(CreatePost201ResponseStatusEnum),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    CreatePost201Response object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required CreatePost201ResponseBuilder result,
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
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(CreatePost201ResponseStatusEnum),
          ) as CreatePost201ResponseStatusEnum;
          result.status = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CreatePost201Response deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CreatePost201ResponseBuilder();
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

class CreatePost201ResponseStatusEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'published')
  static const CreatePost201ResponseStatusEnum published = _$createPost201ResponseStatusEnum_published;
  @BuiltValueEnumConst(wireName: r'blocked')
  static const CreatePost201ResponseStatusEnum blocked = _$createPost201ResponseStatusEnum_blocked;

  static Serializer<CreatePost201ResponseStatusEnum> get serializer => _$createPost201ResponseStatusEnumSerializer;

  const CreatePost201ResponseStatusEnum._(String name): super(name);

  static BuiltSet<CreatePost201ResponseStatusEnum> get values => _$createPost201ResponseStatusEnumValues;
  static CreatePost201ResponseStatusEnum valueOf(String name) => _$createPost201ResponseStatusEnumValueOf(name);
}

