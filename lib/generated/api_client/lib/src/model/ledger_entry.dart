//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'ledger_entry.g.dart';

/// LedgerEntry
///
/// Properties:
/// * [id]
/// * [userId]
/// * [eventType]
/// * [eventCategory]
/// * [pillar]
/// * [publicLabel]
/// * [impactBand]
/// * [relatedContentId]
/// * [relatedModerationDecisionId]
/// * [visibility]
/// * [appealable]
/// * [appealStatus]
/// * [createdAt]
/// * [decaysAt]
/// * [status]
@BuiltValue()
abstract class LedgerEntry implements Built<LedgerEntry, LedgerEntryBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'userId')
  String get userId;

  @BuiltValueField(wireName: r'eventType')
  String get eventType;

  @BuiltValueField(wireName: r'eventCategory')
  LedgerEntryEventCategoryEnum get eventCategory;
  // enum eventCategoryEnum {  positive,  neutral,  negative,  };

  @BuiltValueField(wireName: r'pillar')
  String? get pillar;

  @BuiltValueField(wireName: r'publicLabel')
  String get publicLabel;

  @BuiltValueField(wireName: r'impactBand')
  String get impactBand;

  @BuiltValueField(wireName: r'relatedContentId')
  String? get relatedContentId;

  @BuiltValueField(wireName: r'relatedModerationDecisionId')
  String? get relatedModerationDecisionId;

  @BuiltValueField(wireName: r'visibility')
  LedgerEntryVisibilityEnum get visibility;
  // enum visibilityEnum {  user,  public,  };

  @BuiltValueField(wireName: r'appealable')
  bool get appealable;

  @BuiltValueField(wireName: r'appealStatus')
  LedgerEntryAppealStatusEnum? get appealStatus;
  // enum appealStatusEnum {  pending,  accepted,  rejected,  };

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  @BuiltValueField(wireName: r'decaysAt')
  DateTime? get decaysAt;

  @BuiltValueField(wireName: r'status')
  LedgerEntryStatusEnum get status;
  // enum statusEnum {  active,  expired,  reversed,  };

  LedgerEntry._();

  factory LedgerEntry([void updates(LedgerEntryBuilder b)]) = _$LedgerEntry;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(LedgerEntryBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<LedgerEntry> get serializer => _$LedgerEntrySerializer();
}

class _$LedgerEntrySerializer implements PrimitiveSerializer<LedgerEntry> {
  @override
  final Iterable<Type> types = const [LedgerEntry, _$LedgerEntry];

  @override
  final String wireName = r'LedgerEntry';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    LedgerEntry object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'userId';
    yield serializers.serialize(
      object.userId,
      specifiedType: const FullType(String),
    );
    yield r'eventType';
    yield serializers.serialize(
      object.eventType,
      specifiedType: const FullType(String),
    );
    yield r'eventCategory';
    yield serializers.serialize(
      object.eventCategory,
      specifiedType: const FullType(LedgerEntryEventCategoryEnum),
    );
    if (object.pillar != null) {
      yield r'pillar';
      yield serializers.serialize(
        object.pillar,
        specifiedType: const FullType(String),
      );
    }
    yield r'publicLabel';
    yield serializers.serialize(
      object.publicLabel,
      specifiedType: const FullType(String),
    );
    yield r'impactBand';
    yield serializers.serialize(
      object.impactBand,
      specifiedType: const FullType(String),
    );
    if (object.relatedContentId != null) {
      yield r'relatedContentId';
      yield serializers.serialize(
        object.relatedContentId,
        specifiedType: const FullType(String),
      );
    }
    if (object.relatedModerationDecisionId != null) {
      yield r'relatedModerationDecisionId';
      yield serializers.serialize(
        object.relatedModerationDecisionId,
        specifiedType: const FullType(String),
      );
    }
    yield r'visibility';
    yield serializers.serialize(
      object.visibility,
      specifiedType: const FullType(LedgerEntryVisibilityEnum),
    );
    yield r'appealable';
    yield serializers.serialize(
      object.appealable,
      specifiedType: const FullType(bool),
    );
    if (object.appealStatus != null) {
      yield r'appealStatus';
      yield serializers.serialize(
        object.appealStatus,
        specifiedType: const FullType(LedgerEntryAppealStatusEnum),
      );
    }
    yield r'createdAt';
    yield serializers.serialize(
      object.createdAt,
      specifiedType: const FullType(DateTime),
    );
    if (object.decaysAt != null) {
      yield r'decaysAt';
      yield serializers.serialize(
        object.decaysAt,
        specifiedType: const FullType(DateTime),
      );
    }
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(LedgerEntryStatusEnum),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    LedgerEntry object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required LedgerEntryBuilder result,
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
        case r'userId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.userId = valueDes;
          break;
        case r'eventType':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.eventType = valueDes;
          break;
        case r'eventCategory':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(LedgerEntryEventCategoryEnum),
          ) as LedgerEntryEventCategoryEnum;
          result.eventCategory = valueDes;
          break;
        case r'pillar':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.pillar = valueDes;
          break;
        case r'publicLabel':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.publicLabel = valueDes;
          break;
        case r'impactBand':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.impactBand = valueDes;
          break;
        case r'relatedContentId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.relatedContentId = valueDes;
          break;
        case r'relatedModerationDecisionId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.relatedModerationDecisionId = valueDes;
          break;
        case r'visibility':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(LedgerEntryVisibilityEnum),
          ) as LedgerEntryVisibilityEnum;
          result.visibility = valueDes;
          break;
        case r'appealable':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.appealable = valueDes;
          break;
        case r'appealStatus':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(LedgerEntryAppealStatusEnum),
          ) as LedgerEntryAppealStatusEnum;
          result.appealStatus = valueDes;
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.createdAt = valueDes;
          break;
        case r'decaysAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.decaysAt = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(LedgerEntryStatusEnum),
          ) as LedgerEntryStatusEnum;
          result.status = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  LedgerEntry deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = LedgerEntryBuilder();
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

class LedgerEntryEventCategoryEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'positive')
  static const LedgerEntryEventCategoryEnum positive = _$ledgerEntryEventCategoryEnum_positive;
  @BuiltValueEnumConst(wireName: r'neutral')
  static const LedgerEntryEventCategoryEnum neutral = _$ledgerEntryEventCategoryEnum_neutral;
  @BuiltValueEnumConst(wireName: r'negative')
  static const LedgerEntryEventCategoryEnum negative = _$ledgerEntryEventCategoryEnum_negative;

  static Serializer<LedgerEntryEventCategoryEnum> get serializer => _$ledgerEntryEventCategoryEnumSerializer;

  const LedgerEntryEventCategoryEnum._(String name): super(name);

  static BuiltSet<LedgerEntryEventCategoryEnum> get values => _$ledgerEntryEventCategoryEnumValues;
  static LedgerEntryEventCategoryEnum valueOf(String name) => _$ledgerEntryEventCategoryEnumValueOf(name);
}

class LedgerEntryVisibilityEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'user')
  static const LedgerEntryVisibilityEnum user = _$ledgerEntryVisibilityEnum_user;
  @BuiltValueEnumConst(wireName: r'public')
  static const LedgerEntryVisibilityEnum public = _$ledgerEntryVisibilityEnum_public;

  static Serializer<LedgerEntryVisibilityEnum> get serializer => _$ledgerEntryVisibilityEnumSerializer;

  const LedgerEntryVisibilityEnum._(String name): super(name);

  static BuiltSet<LedgerEntryVisibilityEnum> get values => _$ledgerEntryVisibilityEnumValues;
  static LedgerEntryVisibilityEnum valueOf(String name) => _$ledgerEntryVisibilityEnumValueOf(name);
}

class LedgerEntryAppealStatusEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'pending')
  static const LedgerEntryAppealStatusEnum pending = _$ledgerEntryAppealStatusEnum_pending;
  @BuiltValueEnumConst(wireName: r'accepted')
  static const LedgerEntryAppealStatusEnum accepted = _$ledgerEntryAppealStatusEnum_accepted;
  @BuiltValueEnumConst(wireName: r'rejected')
  static const LedgerEntryAppealStatusEnum rejected = _$ledgerEntryAppealStatusEnum_rejected;

  static Serializer<LedgerEntryAppealStatusEnum> get serializer => _$ledgerEntryAppealStatusEnumSerializer;

  const LedgerEntryAppealStatusEnum._(String name): super(name);

  static BuiltSet<LedgerEntryAppealStatusEnum> get values => _$ledgerEntryAppealStatusEnumValues;
  static LedgerEntryAppealStatusEnum valueOf(String name) => _$ledgerEntryAppealStatusEnumValueOf(name);
}

class LedgerEntryStatusEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'active')
  static const LedgerEntryStatusEnum active = _$ledgerEntryStatusEnum_active;
  @BuiltValueEnumConst(wireName: r'expired')
  static const LedgerEntryStatusEnum expired = _$ledgerEntryStatusEnum_expired;
  @BuiltValueEnumConst(wireName: r'reversed')
  static const LedgerEntryStatusEnum reversed = _$ledgerEntryStatusEnum_reversed;

  static Serializer<LedgerEntryStatusEnum> get serializer => _$ledgerEntryStatusEnumSerializer;

  const LedgerEntryStatusEnum._(String name): super(name);

  static BuiltSet<LedgerEntryStatusEnum> get values => _$ledgerEntryStatusEnumValues;
  static LedgerEntryStatusEnum valueOf(String name) => _$ledgerEntryStatusEnumValueOf(name);
}

