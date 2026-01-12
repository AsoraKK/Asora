//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_flag_queue_author.g.dart';

/// AdminFlagQueueAuthor
///
/// Properties:
/// * [authorId] 
/// * [displayName] 
/// * [handle] 
@BuiltValue()
abstract class AdminFlagQueueAuthor implements Built<AdminFlagQueueAuthor, AdminFlagQueueAuthorBuilder> {
  @BuiltValueField(wireName: r'authorId')
  String? get authorId;

  @BuiltValueField(wireName: r'displayName')
  String? get displayName;

  @BuiltValueField(wireName: r'handle')
  String? get handle;

  AdminFlagQueueAuthor._();

  factory AdminFlagQueueAuthor([void updates(AdminFlagQueueAuthorBuilder b)]) = _$AdminFlagQueueAuthor;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminFlagQueueAuthorBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminFlagQueueAuthor> get serializer => _$AdminFlagQueueAuthorSerializer();
}

class _$AdminFlagQueueAuthorSerializer implements PrimitiveSerializer<AdminFlagQueueAuthor> {
  @override
  final Iterable<Type> types = const [AdminFlagQueueAuthor, _$AdminFlagQueueAuthor];

  @override
  final String wireName = r'AdminFlagQueueAuthor';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminFlagQueueAuthor object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.authorId != null) {
      yield r'authorId';
      yield serializers.serialize(
        object.authorId,
        specifiedType: const FullType(String),
      );
    }
    if (object.displayName != null) {
      yield r'displayName';
      yield serializers.serialize(
        object.displayName,
        specifiedType: const FullType(String),
      );
    }
    if (object.handle != null) {
      yield r'handle';
      yield serializers.serialize(
        object.handle,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminFlagQueueAuthor object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminFlagQueueAuthorBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'authorId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.authorId = valueDes;
          break;
        case r'displayName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.displayName = valueDes;
          break;
        case r'handle':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.handle = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AdminFlagQueueAuthor deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminFlagQueueAuthorBuilder();
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

