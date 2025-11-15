//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'dsr_request_summary.g.dart';

/// DsrRequestSummary
///
/// Properties:
/// * [id] 
/// * [status] 
/// * [type] 
/// * [exportBlobPath] 
/// * [attemptedAt] 
@BuiltValue()
abstract class DsrRequestSummary implements Built<DsrRequestSummary, DsrRequestSummaryBuilder> {
  @BuiltValueField(wireName: r'id')
  String? get id;

  @BuiltValueField(wireName: r'status')
  DsrRequestSummaryStatusEnum? get status;
  // enum statusEnum {  queued,  running,  awaiting_review,  ready_to_release,  released,  succeeded,  failed,  canceled,  };

  @BuiltValueField(wireName: r'type')
  DsrRequestSummaryTypeEnum? get type;
  // enum typeEnum {  export,  delete,  };

  @BuiltValueField(wireName: r'exportBlobPath')
  String? get exportBlobPath;

  @BuiltValueField(wireName: r'attemptedAt')
  DateTime? get attemptedAt;

  DsrRequestSummary._();

  factory DsrRequestSummary([void updates(DsrRequestSummaryBuilder b)]) = _$DsrRequestSummary;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(DsrRequestSummaryBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<DsrRequestSummary> get serializer => _$DsrRequestSummarySerializer();
}

class _$DsrRequestSummarySerializer implements PrimitiveSerializer<DsrRequestSummary> {
  @override
  final Iterable<Type> types = const [DsrRequestSummary, _$DsrRequestSummary];

  @override
  final String wireName = r'DsrRequestSummary';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    DsrRequestSummary object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.id != null) {
      yield r'id';
      yield serializers.serialize(
        object.id,
        specifiedType: const FullType(String),
      );
    }
    if (object.status != null) {
      yield r'status';
      yield serializers.serialize(
        object.status,
        specifiedType: const FullType(DsrRequestSummaryStatusEnum),
      );
    }
    if (object.type != null) {
      yield r'type';
      yield serializers.serialize(
        object.type,
        specifiedType: const FullType(DsrRequestSummaryTypeEnum),
      );
    }
    if (object.exportBlobPath != null) {
      yield r'exportBlobPath';
      yield serializers.serialize(
        object.exportBlobPath,
        specifiedType: const FullType(String),
      );
    }
    if (object.attemptedAt != null) {
      yield r'attemptedAt';
      yield serializers.serialize(
        object.attemptedAt,
        specifiedType: const FullType(DateTime),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    DsrRequestSummary object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required DsrRequestSummaryBuilder result,
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
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DsrRequestSummaryStatusEnum),
          ) as DsrRequestSummaryStatusEnum;
          result.status = valueDes;
          break;
        case r'type':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DsrRequestSummaryTypeEnum),
          ) as DsrRequestSummaryTypeEnum;
          result.type = valueDes;
          break;
        case r'exportBlobPath':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.exportBlobPath = valueDes;
          break;
        case r'attemptedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.attemptedAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  DsrRequestSummary deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = DsrRequestSummaryBuilder();
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

class DsrRequestSummaryStatusEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'queued')
  static const DsrRequestSummaryStatusEnum queued = _$dsrRequestSummaryStatusEnum_queued;
  @BuiltValueEnumConst(wireName: r'running')
  static const DsrRequestSummaryStatusEnum running = _$dsrRequestSummaryStatusEnum_running;
  @BuiltValueEnumConst(wireName: r'awaiting_review')
  static const DsrRequestSummaryStatusEnum awaitingReview = _$dsrRequestSummaryStatusEnum_awaitingReview;
  @BuiltValueEnumConst(wireName: r'ready_to_release')
  static const DsrRequestSummaryStatusEnum readyToRelease = _$dsrRequestSummaryStatusEnum_readyToRelease;
  @BuiltValueEnumConst(wireName: r'released')
  static const DsrRequestSummaryStatusEnum released = _$dsrRequestSummaryStatusEnum_released;
  @BuiltValueEnumConst(wireName: r'succeeded')
  static const DsrRequestSummaryStatusEnum succeeded = _$dsrRequestSummaryStatusEnum_succeeded;
  @BuiltValueEnumConst(wireName: r'failed')
  static const DsrRequestSummaryStatusEnum failed = _$dsrRequestSummaryStatusEnum_failed;
  @BuiltValueEnumConst(wireName: r'canceled')
  static const DsrRequestSummaryStatusEnum canceled = _$dsrRequestSummaryStatusEnum_canceled;

  static Serializer<DsrRequestSummaryStatusEnum> get serializer => _$dsrRequestSummaryStatusEnumSerializer;

  const DsrRequestSummaryStatusEnum._(String name): super(name);

  static BuiltSet<DsrRequestSummaryStatusEnum> get values => _$dsrRequestSummaryStatusEnumValues;
  static DsrRequestSummaryStatusEnum valueOf(String name) => _$dsrRequestSummaryStatusEnumValueOf(name);
}

class DsrRequestSummaryTypeEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'export')
  static const DsrRequestSummaryTypeEnum export_ = _$dsrRequestSummaryTypeEnum_export_;
  @BuiltValueEnumConst(wireName: r'delete')
  static const DsrRequestSummaryTypeEnum delete = _$dsrRequestSummaryTypeEnum_delete;

  static Serializer<DsrRequestSummaryTypeEnum> get serializer => _$dsrRequestSummaryTypeEnumSerializer;

  const DsrRequestSummaryTypeEnum._(String name): super(name);

  static BuiltSet<DsrRequestSummaryTypeEnum> get values => _$dsrRequestSummaryTypeEnumValues;
  static DsrRequestSummaryTypeEnum valueOf(String name) => _$dsrRequestSummaryTypeEnumValueOf(name);
}

