//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_user_disable_request.g.dart';

/// AdminUserDisableRequest
///
/// Properties:
/// * [reasonCode] 
/// * [note] 
@BuiltValue()
abstract class AdminUserDisableRequest implements Built<AdminUserDisableRequest, AdminUserDisableRequestBuilder> {
  @BuiltValueField(wireName: r'reasonCode')
  String get reasonCode;

  @BuiltValueField(wireName: r'note')
  String get note;

  AdminUserDisableRequest._();

  factory AdminUserDisableRequest([void updates(AdminUserDisableRequestBuilder b)]) = _$AdminUserDisableRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminUserDisableRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminUserDisableRequest> get serializer => _$AdminUserDisableRequestSerializer();
}

class _$AdminUserDisableRequestSerializer implements PrimitiveSerializer<AdminUserDisableRequest> {
  @override
  final Iterable<Type> types = const [AdminUserDisableRequest, _$AdminUserDisableRequest];

  @override
  final String wireName = r'AdminUserDisableRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminUserDisableRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'reasonCode';
    yield serializers.serialize(
      object.reasonCode,
      specifiedType: const FullType(String),
    );
    yield r'note';
    yield serializers.serialize(
      object.note,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminUserDisableRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminUserDisableRequestBuilder result,
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
  AdminUserDisableRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminUserDisableRequestBuilder();
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

