//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'subscription_status_entitlements.g.dart';

/// SubscriptionStatusEntitlements
///
/// Properties:
/// * [dailyPosts]
/// * [maxMediaSizeMB]
/// * [maxMediaPerPost]
/// * [maxCustomFeeds] - Maximum custom feeds available to this tier.
/// * [newsBoardAccess] - Whether this tier can read the News Board.
/// * [postingRestricted] - Whether normal posting is product-limited beyond abuse controls.
/// * [rewardLevelCap] - Highest reputation reward level available to this tier.
/// * [rewardOptionsPerLevel] - Reward options per reputation level; null means all eligible rewards.
@BuiltValue()
abstract class SubscriptionStatusEntitlements implements Built<SubscriptionStatusEntitlements, SubscriptionStatusEntitlementsBuilder> {
  @BuiltValueField(wireName: r'dailyPosts')
  int get dailyPosts;

  @BuiltValueField(wireName: r'maxMediaSizeMB')
  int get maxMediaSizeMB;

  @BuiltValueField(wireName: r'maxMediaPerPost')
  int get maxMediaPerPost;

  /// Maximum custom feeds available to this tier.
  @BuiltValueField(wireName: r'maxCustomFeeds')
  int get maxCustomFeeds;

  /// Whether this tier can read the News Board.
  @BuiltValueField(wireName: r'newsBoardAccess')
  bool get newsBoardAccess;

  /// Whether normal posting is product-limited beyond abuse controls.
  @BuiltValueField(wireName: r'postingRestricted')
  bool get postingRestricted;

  /// Highest reputation reward level available to this tier.
  @BuiltValueField(wireName: r'rewardLevelCap')
  int get rewardLevelCap;

  /// Reward options per reputation level; null means all eligible rewards.
  @BuiltValueField(wireName: r'rewardOptionsPerLevel')
  int? get rewardOptionsPerLevel;

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
    yield r'newsBoardAccess';
    yield serializers.serialize(
      object.newsBoardAccess,
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
        case r'newsBoardAccess':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.newsBoardAccess = valueDes;
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

