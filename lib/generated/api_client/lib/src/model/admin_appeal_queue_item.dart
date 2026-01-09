//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:asora_api_client/src/model/admin_appeal_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_appeal_queue_item.g.dart';

/// AdminAppealQueueItem
///
/// Properties:
/// * [appealId] 
/// * [contentId] 
/// * [authorId] 
/// * [submittedAt] 
/// * [status] 
/// * [originalReasonCategory] 
/// * [configVersionUsed] 
@BuiltValue()
abstract class AdminAppealQueueItem implements Built<AdminAppealQueueItem, AdminAppealQueueItemBuilder> {
  @BuiltValueField(wireName: r'appealId')
  String? get appealId;

  @BuiltValueField(wireName: r'contentId')
  String? get contentId;

  @BuiltValueField(wireName: r'authorId')
  String? get authorId;

  @BuiltValueField(wireName: r'submittedAt')
  DateTime? get submittedAt;

  @BuiltValueField(wireName: r'status')
  AdminAppealStatus? get status;
  // enum statusEnum {  PENDING,  APPROVED,  REJECTED,  };

  @BuiltValueField(wireName: r'originalReasonCategory')
  String? get originalReasonCategory;

  @BuiltValueField(wireName: r'configVersionUsed')
  int? get configVersionUsed;

  AdminAppealQueueItem._();

  factory AdminAppealQueueItem([void updates(AdminAppealQueueItemBuilder b)]) = _$AdminAppealQueueItem;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminAppealQueueItemBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminAppealQueueItem> get serializer => _$AdminAppealQueueItemSerializer();
}

class _$AdminAppealQueueItemSerializer implements PrimitiveSerializer<AdminAppealQueueItem> {
  @override
  final Iterable<Type> types = const [AdminAppealQueueItem, _$AdminAppealQueueItem];

  @override
  final String wireName = r'AdminAppealQueueItem';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminAppealQueueItem object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.appealId != null) {
      yield r'appealId';
      yield serializers.serialize(
        object.appealId,
        specifiedType: const FullType(String),
      );
    }
    if (object.contentId != null) {
      yield r'contentId';
      yield serializers.serialize(
        object.contentId,
        specifiedType: const FullType(String),
      );
    }
    if (object.authorId != null) {
      yield r'authorId';
      yield serializers.serialize(
        object.authorId,
        specifiedType: const FullType(String),
      );
    }
    if (object.submittedAt != null) {
      yield r'submittedAt';
      yield serializers.serialize(
        object.submittedAt,
        specifiedType: const FullType(DateTime),
      );
    }
    if (object.status != null) {
      yield r'status';
      yield serializers.serialize(
        object.status,
        specifiedType: const FullType(AdminAppealStatus),
      );
    }
    if (object.originalReasonCategory != null) {
      yield r'originalReasonCategory';
      yield serializers.serialize(
        object.originalReasonCategory,
        specifiedType: const FullType(String),
      );
    }
    if (object.configVersionUsed != null) {
      yield r'configVersionUsed';
      yield serializers.serialize(
        object.configVersionUsed,
        specifiedType: const FullType(int),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminAppealQueueItem object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminAppealQueueItemBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'appealId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.appealId = valueDes;
          break;
        case r'contentId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.contentId = valueDes;
          break;
        case r'authorId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.authorId = valueDes;
          break;
        case r'submittedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.submittedAt = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(AdminAppealStatus),
          ) as AdminAppealStatus;
          result.status = valueDes;
          break;
        case r'originalReasonCategory':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.originalReasonCategory = valueDes;
          break;
        case r'configVersionUsed':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.configVersionUsed = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AdminAppealQueueItem deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminAppealQueueItemBuilder();
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

