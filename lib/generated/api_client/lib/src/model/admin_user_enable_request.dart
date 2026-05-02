//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_user_enable_request.g.dart';

/// AdminUserEnableRequest
///
/// Properties:
/// * [reasonCode] 
/// * [note] 
@BuiltValue()
abstract class AdminUserEnableRequest implements Built<AdminUserEnableRequest, AdminUserEnableRequestBuilder> {
  @BuiltValueField(wireName: r'reasonCode')
  String? get reasonCode;

  @BuiltValueField(wireName: r'note')
  String? get note;

  AdminUserEnableRequest._();

  factory AdminUserEnableRequest([void updates(AdminUserEnableRequestBuilder b)]) = _$AdminUserEnableRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminUserEnableRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminUserEnableRequest> get serializer => _$AdminUserEnableRequestSerializer();
}

class _$AdminUserEnableRequestSerializer implements PrimitiveSerializer<AdminUserEnableRequest> {
  @override
  final Iterable<Type> types = const [AdminUserEnableRequest, _$AdminUserEnableRequest];

  @override
  final String wireName = r'AdminUserEnableRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminUserEnableRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.reasonCode != null) {
      yield r'reasonCode';
      yield serializers.serialize(
        object.reasonCode,
        specifiedType: const FullType(String),
      );
    }
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
    AdminUserEnableRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminUserEnableRequestBuilder result,
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
  AdminUserEnableRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminUserEnableRequestBuilder();
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

