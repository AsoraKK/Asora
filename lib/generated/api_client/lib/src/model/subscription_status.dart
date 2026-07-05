//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:asora_api_client/src/model/subscription_status_entitlements.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'subscription_status.g.dart';

/// SubscriptionStatus
///
/// Properties:
/// * [userId] 
/// * [tier] 
/// * [status] 
/// * [provider] 
/// * [currentPeriodEnd] 
/// * [cancelAtPeriodEnd] 
/// * [entitlements] 
@BuiltValue()
abstract class SubscriptionStatus implements Built<SubscriptionStatus, SubscriptionStatusBuilder> {
  @BuiltValueField(wireName: r'userId')
  String get userId;

  @BuiltValueField(wireName: r'tier')
  SubscriptionStatusTierEnum get tier;
  // enum tierEnum {  free,  premium,  black,  admin,  };

  @BuiltValueField(wireName: r'status')
  SubscriptionStatusStatusEnum get status;
  // enum statusEnum {  active,  cancelled,  past_due,  expired,  trialing,  };

  @BuiltValueField(wireName: r'provider')
  SubscriptionStatusProviderEnum? get provider;
  // enum providerEnum {  apple,  google,  stripe,  manual,  };

  @BuiltValueField(wireName: r'currentPeriodEnd')
  DateTime? get currentPeriodEnd;

  @BuiltValueField(wireName: r'cancelAtPeriodEnd')
  bool get cancelAtPeriodEnd;

  @BuiltValueField(wireName: r'entitlements')
  SubscriptionStatusEntitlements get entitlements;

  SubscriptionStatus._();

  factory SubscriptionStatus([void updates(SubscriptionStatusBuilder b)]) = _$SubscriptionStatus;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SubscriptionStatusBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SubscriptionStatus> get serializer => _$SubscriptionStatusSerializer();
}

class _$SubscriptionStatusSerializer implements PrimitiveSerializer<SubscriptionStatus> {
  @override
  final Iterable<Type> types = const [SubscriptionStatus, _$SubscriptionStatus];

  @override
  final String wireName = r'SubscriptionStatus';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SubscriptionStatus object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'userId';
    yield serializers.serialize(
      object.userId,
      specifiedType: const FullType(String),
    );
    yield r'tier';
    yield serializers.serialize(
      object.tier,
      specifiedType: const FullType(SubscriptionStatusTierEnum),
    );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(SubscriptionStatusStatusEnum),
    );
    yield r'provider';
    yield object.provider == null ? null : serializers.serialize(
      object.provider,
      specifiedType: const FullType.nullable(SubscriptionStatusProviderEnum),
    );
    yield r'currentPeriodEnd';
    yield object.currentPeriodEnd == null ? null : serializers.serialize(
      object.currentPeriodEnd,
      specifiedType: const FullType.nullable(DateTime),
    );
    yield r'cancelAtPeriodEnd';
    yield serializers.serialize(
      object.cancelAtPeriodEnd,
      specifiedType: const FullType(bool),
    );
    yield r'entitlements';
    yield serializers.serialize(
      object.entitlements,
      specifiedType: const FullType(SubscriptionStatusEntitlements),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    SubscriptionStatus object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required SubscriptionStatusBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'userId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.userId = valueDes;
          break;
        case r'tier':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(SubscriptionStatusTierEnum),
          ) as SubscriptionStatusTierEnum;
          result.tier = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(SubscriptionStatusStatusEnum),
          ) as SubscriptionStatusStatusEnum;
          result.status = valueDes;
          break;
        case r'provider':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(SubscriptionStatusProviderEnum),
          ) as SubscriptionStatusProviderEnum?;
          if (valueDes == null) continue;
          result.provider = valueDes;
          break;
        case r'currentPeriodEnd':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.currentPeriodEnd = valueDes;
          break;
        case r'cancelAtPeriodEnd':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.cancelAtPeriodEnd = valueDes;
          break;
        case r'entitlements':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(SubscriptionStatusEntitlements),
          ) as SubscriptionStatusEntitlements;
          result.entitlements.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  SubscriptionStatus deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SubscriptionStatusBuilder();
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

class SubscriptionStatusTierEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'free')
  static const SubscriptionStatusTierEnum free = _$subscriptionStatusTierEnum_free;
  @BuiltValueEnumConst(wireName: r'premium')
  static const SubscriptionStatusTierEnum premium = _$subscriptionStatusTierEnum_premium;
  @BuiltValueEnumConst(wireName: r'black')
  static const SubscriptionStatusTierEnum black = _$subscriptionStatusTierEnum_black;
  @BuiltValueEnumConst(wireName: r'admin')
  static const SubscriptionStatusTierEnum admin = _$subscriptionStatusTierEnum_admin;

  static Serializer<SubscriptionStatusTierEnum> get serializer => _$subscriptionStatusTierEnumSerializer;

  const SubscriptionStatusTierEnum._(String name): super(name);

  static BuiltSet<SubscriptionStatusTierEnum> get values => _$subscriptionStatusTierEnumValues;
  static SubscriptionStatusTierEnum valueOf(String name) => _$subscriptionStatusTierEnumValueOf(name);
}

class SubscriptionStatusStatusEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'active')
  static const SubscriptionStatusStatusEnum active = _$subscriptionStatusStatusEnum_active;
  @BuiltValueEnumConst(wireName: r'cancelled')
  static const SubscriptionStatusStatusEnum cancelled = _$subscriptionStatusStatusEnum_cancelled;
  @BuiltValueEnumConst(wireName: r'past_due')
  static const SubscriptionStatusStatusEnum pastDue = _$subscriptionStatusStatusEnum_pastDue;
  @BuiltValueEnumConst(wireName: r'expired')
  static const SubscriptionStatusStatusEnum expired = _$subscriptionStatusStatusEnum_expired;
  @BuiltValueEnumConst(wireName: r'trialing')
  static const SubscriptionStatusStatusEnum trialing = _$subscriptionStatusStatusEnum_trialing;

  static Serializer<SubscriptionStatusStatusEnum> get serializer => _$subscriptionStatusStatusEnumSerializer;

  const SubscriptionStatusStatusEnum._(String name): super(name);

  static BuiltSet<SubscriptionStatusStatusEnum> get values => _$subscriptionStatusStatusEnumValues;
  static SubscriptionStatusStatusEnum valueOf(String name) => _$subscriptionStatusStatusEnumValueOf(name);
}

class SubscriptionStatusProviderEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'apple')
  static const SubscriptionStatusProviderEnum apple = _$subscriptionStatusProviderEnum_apple;
  @BuiltValueEnumConst(wireName: r'google')
  static const SubscriptionStatusProviderEnum google = _$subscriptionStatusProviderEnum_google;
  @BuiltValueEnumConst(wireName: r'stripe')
  static const SubscriptionStatusProviderEnum stripe = _$subscriptionStatusProviderEnum_stripe;
  @BuiltValueEnumConst(wireName: r'manual')
  static const SubscriptionStatusProviderEnum manual = _$subscriptionStatusProviderEnum_manual;

  static Serializer<SubscriptionStatusProviderEnum> get serializer => _$subscriptionStatusProviderEnumSerializer;

  const SubscriptionStatusProviderEnum._(String name): super(name);

  static BuiltSet<SubscriptionStatusProviderEnum> get values => _$subscriptionStatusProviderEnumValues;
  static SubscriptionStatusProviderEnum valueOf(String name) => _$subscriptionStatusProviderEnumValueOf(name);
}

