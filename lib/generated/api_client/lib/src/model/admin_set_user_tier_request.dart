//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_set_user_tier_request.g.dart';

/// AdminSetUserTierRequest
///
/// Properties:
/// * [tier] 
@BuiltValue()
abstract class AdminSetUserTierRequest implements Built<AdminSetUserTierRequest, AdminSetUserTierRequestBuilder> {
  @BuiltValueField(wireName: r'tier')
  AdminSetUserTierRequestTierEnum get tier;
  // enum tierEnum {  free,  creator,  premium,  enterprise,  };

  AdminSetUserTierRequest._();

  factory AdminSetUserTierRequest([void updates(AdminSetUserTierRequestBuilder b)]) = _$AdminSetUserTierRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminSetUserTierRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminSetUserTierRequest> get serializer => _$AdminSetUserTierRequestSerializer();
}

class _$AdminSetUserTierRequestSerializer implements PrimitiveSerializer<AdminSetUserTierRequest> {
  @override
  final Iterable<Type> types = const [AdminSetUserTierRequest, _$AdminSetUserTierRequest];

  @override
  final String wireName = r'AdminSetUserTierRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminSetUserTierRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'tier';
    yield serializers.serialize(
      object.tier,
      specifiedType: const FullType(AdminSetUserTierRequestTierEnum),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminSetUserTierRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminSetUserTierRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'tier':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(AdminSetUserTierRequestTierEnum),
          ) as AdminSetUserTierRequestTierEnum;
          result.tier = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AdminSetUserTierRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminSetUserTierRequestBuilder();
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

class AdminSetUserTierRequestTierEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'free')
  static const AdminSetUserTierRequestTierEnum free = _$adminSetUserTierRequestTierEnum_free;
  @BuiltValueEnumConst(wireName: r'creator')
  static const AdminSetUserTierRequestTierEnum creator = _$adminSetUserTierRequestTierEnum_creator;
  @BuiltValueEnumConst(wireName: r'premium')
  static const AdminSetUserTierRequestTierEnum premium = _$adminSetUserTierRequestTierEnum_premium;
  @BuiltValueEnumConst(wireName: r'enterprise')
  static const AdminSetUserTierRequestTierEnum enterprise = _$adminSetUserTierRequestTierEnum_enterprise;

  static Serializer<AdminSetUserTierRequestTierEnum> get serializer => _$adminSetUserTierRequestTierEnumSerializer;

  const AdminSetUserTierRequestTierEnum._(String name): super(name);

  static BuiltSet<AdminSetUserTierRequestTierEnum> get values => _$adminSetUserTierRequestTierEnumValues;
  static AdminSetUserTierRequestTierEnum valueOf(String name) => _$adminSetUserTierRequestTierEnumValueOf(name);
}

