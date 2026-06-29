//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'reward_offer.g.dart';

/// RewardOffer
///
/// Properties:
/// * [id]
/// * [rewardLevel]
/// * [title]
/// * [description]
/// * [partnerName]
/// * [locked]
/// * [lockReason]
/// * [redeemed]
@BuiltValue()
abstract class RewardOffer implements Built<RewardOffer, RewardOfferBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'rewardLevel')
  int get rewardLevel;

  @BuiltValueField(wireName: r'title')
  String get title;

  @BuiltValueField(wireName: r'description')
  String get description;

  @BuiltValueField(wireName: r'partnerName')
  String get partnerName;

  @BuiltValueField(wireName: r'locked')
  bool get locked;

  @BuiltValueField(wireName: r'lockReason')
  String? get lockReason;

  @BuiltValueField(wireName: r'redeemed')
  bool get redeemed;

  RewardOffer._();

  factory RewardOffer([void updates(RewardOfferBuilder b)]) = _$RewardOffer;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(RewardOfferBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<RewardOffer> get serializer => _$RewardOfferSerializer();
}

class _$RewardOfferSerializer implements PrimitiveSerializer<RewardOffer> {
  @override
  final Iterable<Type> types = const [RewardOffer, _$RewardOffer];

  @override
  final String wireName = r'RewardOffer';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    RewardOffer object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'rewardLevel';
    yield serializers.serialize(
      object.rewardLevel,
      specifiedType: const FullType(int),
    );
    yield r'title';
    yield serializers.serialize(
      object.title,
      specifiedType: const FullType(String),
    );
    yield r'description';
    yield serializers.serialize(
      object.description,
      specifiedType: const FullType(String),
    );
    yield r'partnerName';
    yield serializers.serialize(
      object.partnerName,
      specifiedType: const FullType(String),
    );
    yield r'locked';
    yield serializers.serialize(
      object.locked,
      specifiedType: const FullType(bool),
    );
    if (object.lockReason != null) {
      yield r'lockReason';
      yield serializers.serialize(
        object.lockReason,
        specifiedType: const FullType(String),
      );
    }
    yield r'redeemed';
    yield serializers.serialize(
      object.redeemed,
      specifiedType: const FullType(bool),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    RewardOffer object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required RewardOfferBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'id':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.id = valueDes;
          break;
        case r'rewardLevel':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.rewardLevel = valueDes;
          break;
        case r'title':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.title = valueDes;
          break;
        case r'description':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.description = valueDes;
          break;
        case r'partnerName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.partnerName = valueDes;
          break;
        case r'locked':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.locked = valueDes;
          break;
        case r'lockReason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.lockReason = valueDes;
          break;
        case r'redeemed':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.redeemed = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  RewardOffer deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = RewardOfferBuilder();
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

