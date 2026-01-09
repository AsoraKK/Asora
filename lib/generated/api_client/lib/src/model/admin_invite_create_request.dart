//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_invite_create_request.g.dart';

/// AdminInviteCreateRequest
///
/// Properties:
/// * [email] 
/// * [expiresInDays] 
/// * [maxUses] 
/// * [label] 
@BuiltValue()
abstract class AdminInviteCreateRequest implements Built<AdminInviteCreateRequest, AdminInviteCreateRequestBuilder> {
  @BuiltValueField(wireName: r'email')
  String? get email;

  @BuiltValueField(wireName: r'expiresInDays')
  int? get expiresInDays;

  @BuiltValueField(wireName: r'maxUses')
  int? get maxUses;

  @BuiltValueField(wireName: r'label')
  String? get label;

  AdminInviteCreateRequest._();

  factory AdminInviteCreateRequest([void updates(AdminInviteCreateRequestBuilder b)]) = _$AdminInviteCreateRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminInviteCreateRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminInviteCreateRequest> get serializer => _$AdminInviteCreateRequestSerializer();
}

class _$AdminInviteCreateRequestSerializer implements PrimitiveSerializer<AdminInviteCreateRequest> {
  @override
  final Iterable<Type> types = const [AdminInviteCreateRequest, _$AdminInviteCreateRequest];

  @override
  final String wireName = r'AdminInviteCreateRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminInviteCreateRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.email != null) {
      yield r'email';
      yield serializers.serialize(
        object.email,
        specifiedType: const FullType(String),
      );
    }
    if (object.expiresInDays != null) {
      yield r'expiresInDays';
      yield serializers.serialize(
        object.expiresInDays,
        specifiedType: const FullType(int),
      );
    }
    if (object.maxUses != null) {
      yield r'maxUses';
      yield serializers.serialize(
        object.maxUses,
        specifiedType: const FullType(int),
      );
    }
    if (object.label != null) {
      yield r'label';
      yield serializers.serialize(
        object.label,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminInviteCreateRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminInviteCreateRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'email':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.email = valueDes;
          break;
        case r'expiresInDays':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.expiresInDays = valueDes;
          break;
        case r'maxUses':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.maxUses = valueDes;
          break;
        case r'label':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.label = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AdminInviteCreateRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminInviteCreateRequestBuilder();
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

