//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'subscription_status_entitlements.g.dart';

/// SubscriptionStatusEntitlements
///
/// Properties:
/// * [dailyPosts]
/// * [dailyComments]
/// * [dailyReactions]
/// * [dailyAppeals]
/// * [exportCooldownDays]
/// * [maxMediaSizeMB]
/// * [maxMediaPerPost]
/// * [maxCustomFeeds] - Maximum custom feeds available to this tier.
/// * [newsBoardAccessLevel] - Free receives preview; Premium and Black receive full access.
/// * [newsBoardPreview] - Whether the tier can read the safe News Board preview.
/// * [postingRestricted] - Whether normal posting is product-limited beyond abuse controls.
/// * [rewardLevelCap] - Highest reputation reward level available to this tier.
/// * [rewardOptionsPerLevel] - Reward options per reputation level; null means all eligible rewards.
/// * [rewardChoiceBreadth]
@BuiltValue()
abstract class SubscriptionStatusEntitlements implements Built<SubscriptionStatusEntitlements, SubscriptionStatusEntitlementsBuilder> {
  @BuiltValueField(wireName: r'dailyPosts')
  int get dailyPosts;

  @BuiltValueField(wireName: r'dailyComments')
  int get dailyComments;

  @BuiltValueField(wireName: r'dailyReactions')
  int get dailyReactions;

  @BuiltValueField(wireName: r'dailyAppeals')
  int get dailyAppeals;

  @BuiltValueField(wireName: r'exportCooldownDays')
  int get exportCooldownDays;

  @BuiltValueField(wireName: r'maxMediaSizeMB')
  int get maxMediaSizeMB;

  @BuiltValueField(wireName: r'maxMediaPerPost')
  int get maxMediaPerPost;

  /// Maximum custom feeds available to this tier.
  @BuiltValueField(wireName: r'maxCustomFeeds')
  int get maxCustomFeeds;

  /// Free receives preview; Premium and Black receive full access.
  @BuiltValueField(wireName: r'newsBoardAccessLevel')
  SubscriptionStatusEntitlementsNewsBoardAccessLevelEnum get newsBoardAccessLevel;
  // enum newsBoardAccessLevelEnum {  preview,  full,  };

  /// Whether the tier can read the safe News Board preview.
  @BuiltValueField(wireName: r'newsBoardPreview')
  bool get newsBoardPreview;

  /// Whether normal posting is product-limited beyond abuse controls.
  @BuiltValueField(wireName: r'postingRestricted')
  bool get postingRestricted;

  /// Highest reputation reward level available to this tier.
  @BuiltValueField(wireName: r'rewardLevelCap')
  int get rewardLevelCap;

  /// Reward options per reputation level; null means all eligible rewards.
  @BuiltValueField(wireName: r'rewardOptionsPerLevel')
  int? get rewardOptionsPerLevel;

  @BuiltValueField(wireName: r'rewardChoiceBreadth')
  SubscriptionStatusEntitlementsRewardChoiceBreadthEnum get rewardChoiceBreadth;
  // enum rewardChoiceBreadthEnum {  limited,  increased,  full,  };

  SubscriptionStatusEntitlements._();

  factory SubscriptionStatusEntitlements([void updates(SubscriptionStatusEntitlementsBuilder b)]) = _$SubscriptionStatusEntitlements;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SubscriptionStatusEntitlementsBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SubscriptionStatusEntitlements> get serializer => _$SubscriptionStatusEntitlementsSerializer();
}

class _$SubscriptionStatusEntitlementsSerializer implements PrimitiveSerializer<SubscriptionStatusEntitlements> {
  @override
  final Iterable<Type> types = const [SubscriptionStatusEntitlements, _$SubscriptionStatusEntitlements];

  @override
  final String wireName = r'SubscriptionStatusEntitlements';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SubscriptionStatusEntitlements object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'dailyPosts';
    yield serializers.serialize(
      object.dailyPosts,
      specifiedType: const FullType(int),
    );
    yield r'dailyComments';
    yield serializers.serialize(
      object.dailyComments,
      specifiedType: const FullType(int),
    );
    yield r'dailyReactions';
    yield serializers.serialize(
      object.dailyReactions,
      specifiedType: const FullType(int),
    );
    yield r'dailyAppeals';
    yield serializers.serialize(
      object.dailyAppeals,
      specifiedType: const FullType(int),
    );
    yield r'exportCooldownDays';
    yield serializers.serialize(
      object.exportCooldownDays,
      specifiedType: const FullType(int),
    );
    yield r'maxMediaSizeMB';
    yield serializers.serialize(
      object.maxMediaSizeMB,
      specifiedType: const FullType(int),
    );
    yield r'maxMediaPerPost';
    yield serializers.serialize(
      object.maxMediaPerPost,
      specifiedType: const FullType(int),
    );
    yield r'maxCustomFeeds';
    yield serializers.serialize(
      object.maxCustomFeeds,
      specifiedType: const FullType(int),
    );
    yield r'newsBoardAccessLevel';
    yield serializers.serialize(
      object.newsBoardAccessLevel,
      specifiedType: const FullType(SubscriptionStatusEntitlementsNewsBoardAccessLevelEnum),
    );
    yield r'newsBoardPreview';
    yield serializers.serialize(
      object.newsBoardPreview,
      specifiedType: const FullType(bool),
    );
    yield r'postingRestricted';
    yield serializers.serialize(
      object.postingRestricted,
      specifiedType: const FullType(bool),
    );
    yield r'rewardLevelCap';
    yield serializers.serialize(
      object.rewardLevelCap,
      specifiedType: const FullType(int),
    );
    yield r'rewardOptionsPerLevel';
    yield object.rewardOptionsPerLevel == null ? null : serializers.serialize(
      object.rewardOptionsPerLevel,
      specifiedType: const FullType.nullable(int),
    );
    yield r'rewardChoiceBreadth';
    yield serializers.serialize(
      object.rewardChoiceBreadth,
      specifiedType: const FullType(SubscriptionStatusEntitlementsRewardChoiceBreadthEnum),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    SubscriptionStatusEntitlements object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required SubscriptionStatusEntitlementsBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'dailyPosts':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.dailyPosts = valueDes;
          break;
        case r'dailyComments':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.dailyComments = valueDes;
          break;
        case r'dailyReactions':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.dailyReactions = valueDes;
          break;
        case r'dailyAppeals':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.dailyAppeals = valueDes;
          break;
        case r'exportCooldownDays':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.exportCooldownDays = valueDes;
          break;
        case r'maxMediaSizeMB':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.maxMediaSizeMB = valueDes;
          break;
        case r'maxMediaPerPost':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.maxMediaPerPost = valueDes;
          break;
        case r'maxCustomFeeds':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.maxCustomFeeds = valueDes;
          break;
        case r'newsBoardAccessLevel':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(SubscriptionStatusEntitlementsNewsBoardAccessLevelEnum),
          ) as SubscriptionStatusEntitlementsNewsBoardAccessLevelEnum;
          result.newsBoardAccessLevel = valueDes;
          break;
        case r'newsBoardPreview':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.newsBoardPreview = valueDes;
          break;
        case r'postingRestricted':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.postingRestricted = valueDes;
          break;
        case r'rewardLevelCap':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.rewardLevelCap = valueDes;
          break;
        case r'rewardOptionsPerLevel':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.rewardOptionsPerLevel = valueDes;
          break;
        case r'rewardChoiceBreadth':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(SubscriptionStatusEntitlementsRewardChoiceBreadthEnum),
          ) as SubscriptionStatusEntitlementsRewardChoiceBreadthEnum;
          result.rewardChoiceBreadth = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  SubscriptionStatusEntitlements deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SubscriptionStatusEntitlementsBuilder();
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

class SubscriptionStatusEntitlementsNewsBoardAccessLevelEnum extends EnumClass {

  /// Free receives preview; Premium and Black receive full access.
  @BuiltValueEnumConst(wireName: r'preview')
  static const SubscriptionStatusEntitlementsNewsBoardAccessLevelEnum preview = _$subscriptionStatusEntitlementsNewsBoardAccessLevelEnum_preview;
  /// Free receives preview; Premium and Black receive full access.
  @BuiltValueEnumConst(wireName: r'full')
  static const SubscriptionStatusEntitlementsNewsBoardAccessLevelEnum full = _$subscriptionStatusEntitlementsNewsBoardAccessLevelEnum_full;

  static Serializer<SubscriptionStatusEntitlementsNewsBoardAccessLevelEnum> get serializer => _$subscriptionStatusEntitlementsNewsBoardAccessLevelEnumSerializer;

  const SubscriptionStatusEntitlementsNewsBoardAccessLevelEnum._(String name): super(name);

  static BuiltSet<SubscriptionStatusEntitlementsNewsBoardAccessLevelEnum> get values => _$subscriptionStatusEntitlementsNewsBoardAccessLevelEnumValues;
  static SubscriptionStatusEntitlementsNewsBoardAccessLevelEnum valueOf(String name) => _$subscriptionStatusEntitlementsNewsBoardAccessLevelEnumValueOf(name);
}

class SubscriptionStatusEntitlementsRewardChoiceBreadthEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'limited')
  static const SubscriptionStatusEntitlementsRewardChoiceBreadthEnum limited = _$subscriptionStatusEntitlementsRewardChoiceBreadthEnum_limited;
  @BuiltValueEnumConst(wireName: r'increased')
  static const SubscriptionStatusEntitlementsRewardChoiceBreadthEnum increased = _$subscriptionStatusEntitlementsRewardChoiceBreadthEnum_increased;
  @BuiltValueEnumConst(wireName: r'full')
  static const SubscriptionStatusEntitlementsRewardChoiceBreadthEnum full = _$subscriptionStatusEntitlementsRewardChoiceBreadthEnum_full;

  static Serializer<SubscriptionStatusEntitlementsRewardChoiceBreadthEnum> get serializer => _$subscriptionStatusEntitlementsRewardChoiceBreadthEnumSerializer;

  const SubscriptionStatusEntitlementsRewardChoiceBreadthEnum._(String name): super(name);

  static BuiltSet<SubscriptionStatusEntitlementsRewardChoiceBreadthEnum> get values => _$subscriptionStatusEntitlementsRewardChoiceBreadthEnumValues;
  static SubscriptionStatusEntitlementsRewardChoiceBreadthEnum valueOf(String name) => _$subscriptionStatusEntitlementsRewardChoiceBreadthEnumValueOf(name);
}
