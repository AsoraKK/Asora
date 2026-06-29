//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'reputation_summary.g.dart';

/// ReputationSummary
///
/// Properties:
/// * [userId] 
/// * [reputationLevel] 
/// * [reputationStatus] 
/// * [reputationBand] 
/// * [humanContributionScore] 
/// * [contentQualityScore] 
/// * [behaviourTrustScore] 
/// * [interactionQualityScore] 
/// * [verificationStrengthScore] 
/// * [communityTrustScore] 
/// * [publicFeedEligibilityStatus] 
/// * [rewardEligibilityStatus] 
/// * [lastCalculatedAt] 
/// * [version] 
@BuiltValue()
abstract class ReputationSummary implements Built<ReputationSummary, ReputationSummaryBuilder> {
  @BuiltValueField(wireName: r'userId')
  String get userId;

  @BuiltValueField(wireName: r'reputationLevel')
  int get reputationLevel;

  @BuiltValueField(wireName: r'reputationStatus')
  ReputationSummaryReputationStatusEnum get reputationStatus;
  // enum reputationStatusEnum {  standard,  editorial,  };

  @BuiltValueField(wireName: r'reputationBand')
  ReputationSummaryReputationBandEnum get reputationBand;
  // enum reputationBandEnum {  new,  verified,  trusted,  established,  credible,  highly_credible,  };

  @BuiltValueField(wireName: r'humanContributionScore')
  num? get humanContributionScore;

  @BuiltValueField(wireName: r'contentQualityScore')
  num? get contentQualityScore;

  @BuiltValueField(wireName: r'behaviourTrustScore')
  num? get behaviourTrustScore;

  @BuiltValueField(wireName: r'interactionQualityScore')
  num? get interactionQualityScore;

  @BuiltValueField(wireName: r'verificationStrengthScore')
  num? get verificationStrengthScore;

  @BuiltValueField(wireName: r'communityTrustScore')
  num? get communityTrustScore;

  @BuiltValueField(wireName: r'publicFeedEligibilityStatus')
  ReputationSummaryPublicFeedEligibilityStatusEnum get publicFeedEligibilityStatus;
  // enum publicFeedEligibilityStatusEnum {  eligible,  restricted,  ineligible,  };

  @BuiltValueField(wireName: r'rewardEligibilityStatus')
  ReputationSummaryRewardEligibilityStatusEnum get rewardEligibilityStatus;
  // enum rewardEligibilityStatusEnum {  eligible,  ineligible,  pending_verification,  };

  @BuiltValueField(wireName: r'lastCalculatedAt')
  DateTime get lastCalculatedAt;

  @BuiltValueField(wireName: r'version')
  int get version;

  ReputationSummary._();

  factory ReputationSummary([void updates(ReputationSummaryBuilder b)]) = _$ReputationSummary;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ReputationSummaryBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ReputationSummary> get serializer => _$ReputationSummarySerializer();
}

class _$ReputationSummarySerializer implements PrimitiveSerializer<ReputationSummary> {
  @override
  final Iterable<Type> types = const [ReputationSummary, _$ReputationSummary];

  @override
  final String wireName = r'ReputationSummary';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ReputationSummary object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'userId';
    yield serializers.serialize(
      object.userId,
      specifiedType: const FullType(String),
    );
    yield r'reputationLevel';
    yield serializers.serialize(
      object.reputationLevel,
      specifiedType: const FullType(int),
    );
    yield r'reputationStatus';
    yield serializers.serialize(
      object.reputationStatus,
      specifiedType: const FullType(ReputationSummaryReputationStatusEnum),
    );
    yield r'reputationBand';
    yield serializers.serialize(
      object.reputationBand,
      specifiedType: const FullType(ReputationSummaryReputationBandEnum),
    );
    if (object.humanContributionScore != null) {
      yield r'humanContributionScore';
      yield serializers.serialize(
        object.humanContributionScore,
        specifiedType: const FullType(num),
      );
    }
    if (object.contentQualityScore != null) {
      yield r'contentQualityScore';
      yield serializers.serialize(
        object.contentQualityScore,
        specifiedType: const FullType(num),
      );
    }
    if (object.behaviourTrustScore != null) {
      yield r'behaviourTrustScore';
      yield serializers.serialize(
        object.behaviourTrustScore,
        specifiedType: const FullType(num),
      );
    }
    if (object.interactionQualityScore != null) {
      yield r'interactionQualityScore';
      yield serializers.serialize(
        object.interactionQualityScore,
        specifiedType: const FullType(num),
      );
    }
    if (object.verificationStrengthScore != null) {
      yield r'verificationStrengthScore';
      yield serializers.serialize(
        object.verificationStrengthScore,
        specifiedType: const FullType(num),
      );
    }
    if (object.communityTrustScore != null) {
      yield r'communityTrustScore';
      yield serializers.serialize(
        object.communityTrustScore,
        specifiedType: const FullType(num),
      );
    }
    yield r'publicFeedEligibilityStatus';
    yield serializers.serialize(
      object.publicFeedEligibilityStatus,
      specifiedType: const FullType(ReputationSummaryPublicFeedEligibilityStatusEnum),
    );
    yield r'rewardEligibilityStatus';
    yield serializers.serialize(
      object.rewardEligibilityStatus,
      specifiedType: const FullType(ReputationSummaryRewardEligibilityStatusEnum),
    );
    yield r'lastCalculatedAt';
    yield serializers.serialize(
      object.lastCalculatedAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'version';
    yield serializers.serialize(
      object.version,
      specifiedType: const FullType(int),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    ReputationSummary object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required ReputationSummaryBuilder result,
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
        case r'reputationLevel':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.reputationLevel = valueDes;
          break;
        case r'reputationStatus':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ReputationSummaryReputationStatusEnum),
          ) as ReputationSummaryReputationStatusEnum;
          result.reputationStatus = valueDes;
          break;
        case r'reputationBand':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ReputationSummaryReputationBandEnum),
          ) as ReputationSummaryReputationBandEnum;
          result.reputationBand = valueDes;
          break;
        case r'humanContributionScore':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(num),
          ) as num;
          result.humanContributionScore = valueDes;
          break;
        case r'contentQualityScore':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(num),
          ) as num;
          result.contentQualityScore = valueDes;
          break;
        case r'behaviourTrustScore':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(num),
          ) as num;
          result.behaviourTrustScore = valueDes;
          break;
        case r'interactionQualityScore':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(num),
          ) as num;
          result.interactionQualityScore = valueDes;
          break;
        case r'verificationStrengthScore':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(num),
          ) as num;
          result.verificationStrengthScore = valueDes;
          break;
        case r'communityTrustScore':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(num),
          ) as num;
          result.communityTrustScore = valueDes;
          break;
        case r'publicFeedEligibilityStatus':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ReputationSummaryPublicFeedEligibilityStatusEnum),
          ) as ReputationSummaryPublicFeedEligibilityStatusEnum;
          result.publicFeedEligibilityStatus = valueDes;
          break;
        case r'rewardEligibilityStatus':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ReputationSummaryRewardEligibilityStatusEnum),
          ) as ReputationSummaryRewardEligibilityStatusEnum;
          result.rewardEligibilityStatus = valueDes;
          break;
        case r'lastCalculatedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.lastCalculatedAt = valueDes;
          break;
        case r'version':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.version = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  ReputationSummary deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ReputationSummaryBuilder();
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

class ReputationSummaryReputationStatusEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'standard')
  static const ReputationSummaryReputationStatusEnum standard = _$reputationSummaryReputationStatusEnum_standard;
  @BuiltValueEnumConst(wireName: r'editorial')
  static const ReputationSummaryReputationStatusEnum editorial = _$reputationSummaryReputationStatusEnum_editorial;

  static Serializer<ReputationSummaryReputationStatusEnum> get serializer => _$reputationSummaryReputationStatusEnumSerializer;

  const ReputationSummaryReputationStatusEnum._(String name): super(name);

  static BuiltSet<ReputationSummaryReputationStatusEnum> get values => _$reputationSummaryReputationStatusEnumValues;
  static ReputationSummaryReputationStatusEnum valueOf(String name) => _$reputationSummaryReputationStatusEnumValueOf(name);
}

class ReputationSummaryReputationBandEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'new')
  static const ReputationSummaryReputationBandEnum new_ = _$reputationSummaryReputationBandEnum_new_;
  @BuiltValueEnumConst(wireName: r'verified')
  static const ReputationSummaryReputationBandEnum verified = _$reputationSummaryReputationBandEnum_verified;
  @BuiltValueEnumConst(wireName: r'trusted')
  static const ReputationSummaryReputationBandEnum trusted = _$reputationSummaryReputationBandEnum_trusted;
  @BuiltValueEnumConst(wireName: r'established')
  static const ReputationSummaryReputationBandEnum established = _$reputationSummaryReputationBandEnum_established;
  @BuiltValueEnumConst(wireName: r'credible')
  static const ReputationSummaryReputationBandEnum credible = _$reputationSummaryReputationBandEnum_credible;
  @BuiltValueEnumConst(wireName: r'highly_credible')
  static const ReputationSummaryReputationBandEnum highlyCredible = _$reputationSummaryReputationBandEnum_highlyCredible;

  static Serializer<ReputationSummaryReputationBandEnum> get serializer => _$reputationSummaryReputationBandEnumSerializer;

  const ReputationSummaryReputationBandEnum._(String name): super(name);

  static BuiltSet<ReputationSummaryReputationBandEnum> get values => _$reputationSummaryReputationBandEnumValues;
  static ReputationSummaryReputationBandEnum valueOf(String name) => _$reputationSummaryReputationBandEnumValueOf(name);
}

class ReputationSummaryPublicFeedEligibilityStatusEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'eligible')
  static const ReputationSummaryPublicFeedEligibilityStatusEnum eligible = _$reputationSummaryPublicFeedEligibilityStatusEnum_eligible;
  @BuiltValueEnumConst(wireName: r'restricted')
  static const ReputationSummaryPublicFeedEligibilityStatusEnum restricted = _$reputationSummaryPublicFeedEligibilityStatusEnum_restricted;
  @BuiltValueEnumConst(wireName: r'ineligible')
  static const ReputationSummaryPublicFeedEligibilityStatusEnum ineligible = _$reputationSummaryPublicFeedEligibilityStatusEnum_ineligible;

  static Serializer<ReputationSummaryPublicFeedEligibilityStatusEnum> get serializer => _$reputationSummaryPublicFeedEligibilityStatusEnumSerializer;

  const ReputationSummaryPublicFeedEligibilityStatusEnum._(String name): super(name);

  static BuiltSet<ReputationSummaryPublicFeedEligibilityStatusEnum> get values => _$reputationSummaryPublicFeedEligibilityStatusEnumValues;
  static ReputationSummaryPublicFeedEligibilityStatusEnum valueOf(String name) => _$reputationSummaryPublicFeedEligibilityStatusEnumValueOf(name);
}

class ReputationSummaryRewardEligibilityStatusEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'eligible')
  static const ReputationSummaryRewardEligibilityStatusEnum eligible = _$reputationSummaryRewardEligibilityStatusEnum_eligible;
  @BuiltValueEnumConst(wireName: r'ineligible')
  static const ReputationSummaryRewardEligibilityStatusEnum ineligible = _$reputationSummaryRewardEligibilityStatusEnum_ineligible;
  @BuiltValueEnumConst(wireName: r'pending_verification')
  static const ReputationSummaryRewardEligibilityStatusEnum pendingVerification = _$reputationSummaryRewardEligibilityStatusEnum_pendingVerification;

  static Serializer<ReputationSummaryRewardEligibilityStatusEnum> get serializer => _$reputationSummaryRewardEligibilityStatusEnumSerializer;

  const ReputationSummaryRewardEligibilityStatusEnum._(String name): super(name);

  static BuiltSet<ReputationSummaryRewardEligibilityStatusEnum> get values => _$reputationSummaryRewardEligibilityStatusEnumValues;
  static ReputationSummaryRewardEligibilityStatusEnum valueOf(String name) => _$reputationSummaryRewardEligibilityStatusEnumValueOf(name);
}

