//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_flag_queue_flags.g.dart';

/// AdminFlagQueueFlags
///
/// Properties:
/// * [flagId] 
/// * [flagCount] 
/// * [reasonCategories] 
/// * [lastFlaggedAt] 
@BuiltValue()
abstract class AdminFlagQueueFlags implements Built<AdminFlagQueueFlags, AdminFlagQueueFlagsBuilder> {
  @BuiltValueField(wireName: r'flagId')
  String? get flagId;

  @BuiltValueField(wireName: r'flagCount')
  int? get flagCount;

  @BuiltValueField(wireName: r'reasonCategories')
  BuiltList<String>? get reasonCategories;

  @BuiltValueField(wireName: r'lastFlaggedAt')
  DateTime? get lastFlaggedAt;

  AdminFlagQueueFlags._();

  factory AdminFlagQueueFlags([void updates(AdminFlagQueueFlagsBuilder b)]) = _$AdminFlagQueueFlags;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminFlagQueueFlagsBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminFlagQueueFlags> get serializer => _$AdminFlagQueueFlagsSerializer();
}

class _$AdminFlagQueueFlagsSerializer implements PrimitiveSerializer<AdminFlagQueueFlags> {
  @override
  final Iterable<Type> types = const [AdminFlagQueueFlags, _$AdminFlagQueueFlags];

  @override
  final String wireName = r'AdminFlagQueueFlags';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminFlagQueueFlags object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.flagId != null) {
      yield r'flagId';
      yield serializers.serialize(
        object.flagId,
        specifiedType: const FullType(String),
      );
    }
    if (object.flagCount != null) {
      yield r'flagCount';
      yield serializers.serialize(
        object.flagCount,
        specifiedType: const FullType(int),
      );
    }
    if (object.reasonCategories != null) {
      yield r'reasonCategories';
      yield serializers.serialize(
        object.reasonCategories,
        specifiedType: const FullType(BuiltList, [FullType(String)]),
      );
    }
    if (object.lastFlaggedAt != null) {
      yield r'lastFlaggedAt';
      yield serializers.serialize(
        object.lastFlaggedAt,
        specifiedType: const FullType(DateTime),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminFlagQueueFlags object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminFlagQueueFlagsBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'flagId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.flagId = valueDes;
          break;
        case r'flagCount':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.flagCount = valueDes;
          break;
        case r'reasonCategories':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(String)]),
          ) as BuiltList<String>;
          result.reasonCategories.replace(valueDes);
          break;
        case r'lastFlaggedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.lastFlaggedAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AdminFlagQueueFlags deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminFlagQueueFlagsBuilder();
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

