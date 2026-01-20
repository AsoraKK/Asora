//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_appeal_quorum_summary.g.dart';

/// AdminAppealQuorumSummary
///
/// Properties:
/// * [required_] 
/// * [reached] 
@BuiltValue()
abstract class AdminAppealQuorumSummary implements Built<AdminAppealQuorumSummary, AdminAppealQuorumSummaryBuilder> {
  @BuiltValueField(wireName: r'required')
  int get required_;

  @BuiltValueField(wireName: r'reached')
  bool get reached;

  AdminAppealQuorumSummary._();

  factory AdminAppealQuorumSummary([void updates(AdminAppealQuorumSummaryBuilder b)]) = _$AdminAppealQuorumSummary;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminAppealQuorumSummaryBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminAppealQuorumSummary> get serializer => _$AdminAppealQuorumSummarySerializer();
}

class _$AdminAppealQuorumSummarySerializer implements PrimitiveSerializer<AdminAppealQuorumSummary> {
  @override
  final Iterable<Type> types = const [AdminAppealQuorumSummary, _$AdminAppealQuorumSummary];

  @override
  final String wireName = r'AdminAppealQuorumSummary';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminAppealQuorumSummary object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'required';
    yield serializers.serialize(
      object.required_,
      specifiedType: const FullType(int),
    );
    yield r'reached';
    yield serializers.serialize(
      object.reached,
      specifiedType: const FullType(bool),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminAppealQuorumSummary object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminAppealQuorumSummaryBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'required':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.required_ = valueDes;
          break;
        case r'reached':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.reached = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AdminAppealQuorumSummary deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminAppealQuorumSummaryBuilder();
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

