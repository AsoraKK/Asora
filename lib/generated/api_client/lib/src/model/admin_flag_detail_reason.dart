//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_flag_detail_reason.g.dart';

/// AdminFlagDetailReason
///
/// Properties:
/// * [reason] 
/// * [createdAt] 
/// * [status] 
@BuiltValue()
abstract class AdminFlagDetailReason implements Built<AdminFlagDetailReason, AdminFlagDetailReasonBuilder> {
  @BuiltValueField(wireName: r'reason')
  String? get reason;

  @BuiltValueField(wireName: r'createdAt')
  DateTime? get createdAt;

  @BuiltValueField(wireName: r'status')
  String? get status;

  AdminFlagDetailReason._();

  factory AdminFlagDetailReason([void updates(AdminFlagDetailReasonBuilder b)]) = _$AdminFlagDetailReason;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminFlagDetailReasonBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminFlagDetailReason> get serializer => _$AdminFlagDetailReasonSerializer();
}

class _$AdminFlagDetailReasonSerializer implements PrimitiveSerializer<AdminFlagDetailReason> {
  @override
  final Iterable<Type> types = const [AdminFlagDetailReason, _$AdminFlagDetailReason];

  @override
  final String wireName = r'AdminFlagDetailReason';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminFlagDetailReason object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.reason != null) {
      yield r'reason';
      yield serializers.serialize(
        object.reason,
        specifiedType: const FullType(String),
      );
    }
    if (object.createdAt != null) {
      yield r'createdAt';
      yield serializers.serialize(
        object.createdAt,
        specifiedType: const FullType(DateTime),
      );
    }
    if (object.status != null) {
      yield r'status';
      yield serializers.serialize(
        object.status,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminFlagDetailReason object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminFlagDetailReasonBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'reason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.reason = valueDes;
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.createdAt = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
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
  AdminFlagDetailReason deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminFlagDetailReasonBuilder();
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

