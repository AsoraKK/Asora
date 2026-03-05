//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_appeal_vote_summary.g.dart';

/// AdminAppealVoteSummary
///
/// Properties:
/// * [for_] 
/// * [against] 
/// * [total] 
@BuiltValue()
abstract class AdminAppealVoteSummary implements Built<AdminAppealVoteSummary, AdminAppealVoteSummaryBuilder> {
  @BuiltValueField(wireName: r'for')
  int get for_;

  @BuiltValueField(wireName: r'against')
  int get against;

  @BuiltValueField(wireName: r'total')
  int get total;

  AdminAppealVoteSummary._();

  factory AdminAppealVoteSummary([void updates(AdminAppealVoteSummaryBuilder b)]) = _$AdminAppealVoteSummary;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminAppealVoteSummaryBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminAppealVoteSummary> get serializer => _$AdminAppealVoteSummarySerializer();
}

class _$AdminAppealVoteSummarySerializer implements PrimitiveSerializer<AdminAppealVoteSummary> {
  @override
  final Iterable<Type> types = const [AdminAppealVoteSummary, _$AdminAppealVoteSummary];

  @override
  final String wireName = r'AdminAppealVoteSummary';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminAppealVoteSummary object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'for';
    yield serializers.serialize(
      object.for_,
      specifiedType: const FullType(int),
    );
    yield r'against';
    yield serializers.serialize(
      object.against,
      specifiedType: const FullType(int),
    );
    yield r'total';
    yield serializers.serialize(
      object.total,
      specifiedType: const FullType(int),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminAppealVoteSummary object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminAppealVoteSummaryBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'for':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.for_ = valueDes;
          break;
        case r'against':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.against = valueDes;
          break;
        case r'total':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.total = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AdminAppealVoteSummary deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminAppealVoteSummaryBuilder();
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

