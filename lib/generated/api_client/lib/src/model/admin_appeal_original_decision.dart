//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_appeal_original_decision.g.dart';

/// AdminAppealOriginalDecision
///
/// Properties:
/// * [decision] 
/// * [decidedAt] 
@BuiltValue()
abstract class AdminAppealOriginalDecision implements Built<AdminAppealOriginalDecision, AdminAppealOriginalDecisionBuilder> {
  @BuiltValueField(wireName: r'decision')
  AdminAppealOriginalDecisionDecisionEnum? get decision;
  // enum decisionEnum {  BLOCKED,  };

  @BuiltValueField(wireName: r'decidedAt')
  DateTime? get decidedAt;

  AdminAppealOriginalDecision._();

  factory AdminAppealOriginalDecision([void updates(AdminAppealOriginalDecisionBuilder b)]) = _$AdminAppealOriginalDecision;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminAppealOriginalDecisionBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminAppealOriginalDecision> get serializer => _$AdminAppealOriginalDecisionSerializer();
}

class _$AdminAppealOriginalDecisionSerializer implements PrimitiveSerializer<AdminAppealOriginalDecision> {
  @override
  final Iterable<Type> types = const [AdminAppealOriginalDecision, _$AdminAppealOriginalDecision];

  @override
  final String wireName = r'AdminAppealOriginalDecision';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminAppealOriginalDecision object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.decision != null) {
      yield r'decision';
      yield serializers.serialize(
        object.decision,
        specifiedType: const FullType(AdminAppealOriginalDecisionDecisionEnum),
      );
    }
    if (object.decidedAt != null) {
      yield r'decidedAt';
      yield serializers.serialize(
        object.decidedAt,
        specifiedType: const FullType(DateTime),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminAppealOriginalDecision object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminAppealOriginalDecisionBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'decision':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(AdminAppealOriginalDecisionDecisionEnum),
          ) as AdminAppealOriginalDecisionDecisionEnum;
          result.decision = valueDes;
          break;
        case r'decidedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.decidedAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AdminAppealOriginalDecision deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminAppealOriginalDecisionBuilder();
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

class AdminAppealOriginalDecisionDecisionEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'BLOCKED')
  static const AdminAppealOriginalDecisionDecisionEnum BLOCKED = _$adminAppealOriginalDecisionDecisionEnum_BLOCKED;

  static Serializer<AdminAppealOriginalDecisionDecisionEnum> get serializer => _$adminAppealOriginalDecisionDecisionEnumSerializer;

  const AdminAppealOriginalDecisionDecisionEnum._(String name): super(name);

  static BuiltSet<AdminAppealOriginalDecisionDecisionEnum> get values => _$adminAppealOriginalDecisionDecisionEnumValues;
  static AdminAppealOriginalDecisionDecisionEnum valueOf(String name) => _$adminAppealOriginalDecisionDecisionEnumValueOf(name);
}

