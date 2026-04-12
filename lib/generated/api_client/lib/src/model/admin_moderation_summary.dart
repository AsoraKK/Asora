//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_moderation_summary.g.dart';

/// AdminModerationSummary
///
/// Properties:
/// * [lastDecisionAt] 
/// * [configVersionUsed] 
/// * [reasonCodes] 
@BuiltValue()
abstract class AdminModerationSummary implements Built<AdminModerationSummary, AdminModerationSummaryBuilder> {
  @BuiltValueField(wireName: r'lastDecisionAt')
  DateTime? get lastDecisionAt;

  @BuiltValueField(wireName: r'configVersionUsed')
  int? get configVersionUsed;

  @BuiltValueField(wireName: r'reasonCodes')
  BuiltList<String>? get reasonCodes;

  AdminModerationSummary._();

  factory AdminModerationSummary([void updates(AdminModerationSummaryBuilder b)]) = _$AdminModerationSummary;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminModerationSummaryBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminModerationSummary> get serializer => _$AdminModerationSummarySerializer();
}

class _$AdminModerationSummarySerializer implements PrimitiveSerializer<AdminModerationSummary> {
  @override
  final Iterable<Type> types = const [AdminModerationSummary, _$AdminModerationSummary];

  @override
  final String wireName = r'AdminModerationSummary';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminModerationSummary object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.lastDecisionAt != null) {
      yield r'lastDecisionAt';
      yield serializers.serialize(
        object.lastDecisionAt,
        specifiedType: const FullType(DateTime),
      );
    }
    if (object.configVersionUsed != null) {
      yield r'configVersionUsed';
      yield serializers.serialize(
        object.configVersionUsed,
        specifiedType: const FullType(int),
      );
    }
    if (object.reasonCodes != null) {
      yield r'reasonCodes';
      yield serializers.serialize(
        object.reasonCodes,
        specifiedType: const FullType(BuiltList, [FullType(String)]),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminModerationSummary object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminModerationSummaryBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'lastDecisionAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.lastDecisionAt = valueDes;
          break;
        case r'configVersionUsed':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.configVersionUsed = valueDes;
          break;
        case r'reasonCodes':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(String)]),
          ) as BuiltList<String>;
          result.reasonCodes.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AdminModerationSummary deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminModerationSummaryBuilder();
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

