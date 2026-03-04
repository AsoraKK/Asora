//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_flag_resolve_request.g.dart';

/// AdminFlagResolveRequest
///
/// Properties:
/// * [reasonCode] 
/// * [note] 
@BuiltValue()
abstract class AdminFlagResolveRequest implements Built<AdminFlagResolveRequest, AdminFlagResolveRequestBuilder> {
  @BuiltValueField(wireName: r'reasonCode')
  String get reasonCode;

  @BuiltValueField(wireName: r'note')
  String? get note;

  AdminFlagResolveRequest._();

  factory AdminFlagResolveRequest([void updates(AdminFlagResolveRequestBuilder b)]) = _$AdminFlagResolveRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminFlagResolveRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminFlagResolveRequest> get serializer => _$AdminFlagResolveRequestSerializer();
}

class _$AdminFlagResolveRequestSerializer implements PrimitiveSerializer<AdminFlagResolveRequest> {
  @override
  final Iterable<Type> types = const [AdminFlagResolveRequest, _$AdminFlagResolveRequest];

  @override
  final String wireName = r'AdminFlagResolveRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminFlagResolveRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'reasonCode';
    yield serializers.serialize(
      object.reasonCode,
      specifiedType: const FullType(String),
    );
    if (object.note != null) {
      yield r'note';
      yield serializers.serialize(
        object.note,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminFlagResolveRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminFlagResolveRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'reasonCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.reasonCode = valueDes;
          break;
        case r'note':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.note = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AdminFlagResolveRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminFlagResolveRequestBuilder();
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

