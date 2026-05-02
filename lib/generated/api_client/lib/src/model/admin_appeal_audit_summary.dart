//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_appeal_audit_summary.g.dart';

/// AdminAppealAuditSummary
///
/// Properties:
/// * [lastActorRole] 
/// * [lastAction] 
/// * [lastActionAt] 
@BuiltValue()
abstract class AdminAppealAuditSummary implements Built<AdminAppealAuditSummary, AdminAppealAuditSummaryBuilder> {
  @BuiltValueField(wireName: r'lastActorRole')
  AdminAppealAuditSummaryLastActorRoleEnum get lastActorRole;
  // enum lastActorRoleEnum {  system,  community,  moderator,  };

  @BuiltValueField(wireName: r'lastAction')
  String get lastAction;

  @BuiltValueField(wireName: r'lastActionAt')
  DateTime get lastActionAt;

  AdminAppealAuditSummary._();

  factory AdminAppealAuditSummary([void updates(AdminAppealAuditSummaryBuilder b)]) = _$AdminAppealAuditSummary;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminAppealAuditSummaryBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminAppealAuditSummary> get serializer => _$AdminAppealAuditSummarySerializer();
}

class _$AdminAppealAuditSummarySerializer implements PrimitiveSerializer<AdminAppealAuditSummary> {
  @override
  final Iterable<Type> types = const [AdminAppealAuditSummary, _$AdminAppealAuditSummary];

  @override
  final String wireName = r'AdminAppealAuditSummary';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminAppealAuditSummary object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'lastActorRole';
    yield serializers.serialize(
      object.lastActorRole,
      specifiedType: const FullType(AdminAppealAuditSummaryLastActorRoleEnum),
    );
    yield r'lastAction';
    yield serializers.serialize(
      object.lastAction,
      specifiedType: const FullType(String),
    );
    yield r'lastActionAt';
    yield serializers.serialize(
      object.lastActionAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminAppealAuditSummary object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminAppealAuditSummaryBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'lastActorRole':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(AdminAppealAuditSummaryLastActorRoleEnum),
          ) as AdminAppealAuditSummaryLastActorRoleEnum;
          result.lastActorRole = valueDes;
          break;
        case r'lastAction':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.lastAction = valueDes;
          break;
        case r'lastActionAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.lastActionAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AdminAppealAuditSummary deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminAppealAuditSummaryBuilder();
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

class AdminAppealAuditSummaryLastActorRoleEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'system')
  static const AdminAppealAuditSummaryLastActorRoleEnum system = _$adminAppealAuditSummaryLastActorRoleEnum_system;
  @BuiltValueEnumConst(wireName: r'community')
  static const AdminAppealAuditSummaryLastActorRoleEnum community = _$adminAppealAuditSummaryLastActorRoleEnum_community;
  @BuiltValueEnumConst(wireName: r'moderator')
  static const AdminAppealAuditSummaryLastActorRoleEnum moderator = _$adminAppealAuditSummaryLastActorRoleEnum_moderator;

  static Serializer<AdminAppealAuditSummaryLastActorRoleEnum> get serializer => _$adminAppealAuditSummaryLastActorRoleEnumSerializer;

  const AdminAppealAuditSummaryLastActorRoleEnum._(String name): super(name);

  static BuiltSet<AdminAppealAuditSummaryLastActorRoleEnum> get values => _$adminAppealAuditSummaryLastActorRoleEnumValues;
  static AdminAppealAuditSummaryLastActorRoleEnum valueOf(String name) => _$adminAppealAuditSummaryLastActorRoleEnumValueOf(name);
}

