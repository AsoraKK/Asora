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
/// * [reason]
/// * [expiresAt] - Required for Premium and Black Alpha grants; no more than 90 days ahead.
/// * [reviewAt] - Required for Premium and Black Alpha grants; on or before expiresAt.
@BuiltValue()
abstract class AdminSetUserTierRequest implements Built<AdminSetUserTierRequest, AdminSetUserTierRequestBuilder> {
  @BuiltValueField(wireName: r'tier')
  AdminSetUserTierRequestTierEnum get tier;
  // enum tierEnum {  free,  premium,  black,  };

  @BuiltValueField(wireName: r'reason')
  String get reason;

  /// Required for Premium and Black Alpha grants; no more than 90 days ahead.
  @BuiltValueField(wireName: r'expiresAt')
  DateTime? get expiresAt;

  /// Required for Premium and Black Alpha grants; on or before expiresAt.
  @BuiltValueField(wireName: r'reviewAt')
  DateTime? get reviewAt;

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
    yield r'reason';
    yield serializers.serialize(
      object.reason,
      specifiedType: const FullType(String),
    );
    if (object.expiresAt != null) {
      yield r'expiresAt';
      yield serializers.serialize(
        object.expiresAt,
        specifiedType: const FullType(DateTime),
      );
    }
    if (object.reviewAt != null) {
      yield r'reviewAt';
      yield serializers.serialize(
        object.reviewAt,
        specifiedType: const FullType(DateTime),
      );
    }
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
        case r'reason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.reason = valueDes;
          break;
        case r'expiresAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.expiresAt = valueDes;
          break;
        case r'reviewAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.reviewAt = valueDes;
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
  @BuiltValueEnumConst(wireName: r'premium')
  static const AdminSetUserTierRequestTierEnum premium = _$adminSetUserTierRequestTierEnum_premium;
  @BuiltValueEnumConst(wireName: r'black')
  static const AdminSetUserTierRequestTierEnum black = _$adminSetUserTierRequestTierEnum_black;

  static Serializer<AdminSetUserTierRequestTierEnum> get serializer => _$adminSetUserTierRequestTierEnumSerializer;

  const AdminSetUserTierRequestTierEnum._(String name): super(name);

  static BuiltSet<AdminSetUserTierRequestTierEnum> get values => _$adminSetUserTierRequestTierEnumValues;
  static AdminSetUserTierRequestTierEnum valueOf(String name) => _$adminSetUserTierRequestTierEnumValueOf(name);
}
