//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_flag_history_flag.g.dart';

/// AdminFlagHistoryFlag
///
/// Properties:
/// * [type] 
/// * [at] 
/// * [reason] 
@BuiltValue()
abstract class AdminFlagHistoryFlag implements Built<AdminFlagHistoryFlag, AdminFlagHistoryFlagBuilder> {
  @BuiltValueField(wireName: r'type')
  String? get type;

  @BuiltValueField(wireName: r'at')
  DateTime? get at;

  @BuiltValueField(wireName: r'reason')
  String? get reason;

  AdminFlagHistoryFlag._();

  factory AdminFlagHistoryFlag([void updates(AdminFlagHistoryFlagBuilder b)]) = _$AdminFlagHistoryFlag;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminFlagHistoryFlagBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminFlagHistoryFlag> get serializer => _$AdminFlagHistoryFlagSerializer();
}

class _$AdminFlagHistoryFlagSerializer implements PrimitiveSerializer<AdminFlagHistoryFlag> {
  @override
  final Iterable<Type> types = const [AdminFlagHistoryFlag, _$AdminFlagHistoryFlag];

  @override
  final String wireName = r'AdminFlagHistoryFlag';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminFlagHistoryFlag object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.type != null) {
      yield r'type';
      yield serializers.serialize(
        object.type,
        specifiedType: const FullType(String),
      );
    }
    if (object.at != null) {
      yield r'at';
      yield serializers.serialize(
        object.at,
        specifiedType: const FullType(DateTime),
      );
    }
    if (object.reason != null) {
      yield r'reason';
      yield serializers.serialize(
        object.reason,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminFlagHistoryFlag object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminFlagHistoryFlagBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'type':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.type = valueDes;
          break;
        case r'at':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.at = valueDes;
          break;
        case r'reason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.reason = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AdminFlagHistoryFlag deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminFlagHistoryFlagBuilder();
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

