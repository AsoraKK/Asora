//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'dsr_export_response_metadata.g.dart';

/// DSRExportResponseMetadata
///
/// Properties:
/// * [exportId]
/// * [exportedAt]
/// * [exportedBy]
/// * [dataVersion]
/// * [retentionPeriod]
@BuiltValue()
abstract class DSRExportResponseMetadata implements Built<DSRExportResponseMetadata, DSRExportResponseMetadataBuilder> {
  @BuiltValueField(wireName: r'exportId')
  String get exportId;

  @BuiltValueField(wireName: r'exportedAt')
  DateTime get exportedAt;

  @BuiltValueField(wireName: r'exportedBy')
  String get exportedBy;

  @BuiltValueField(wireName: r'dataVersion')
  String get dataVersion;

  @BuiltValueField(wireName: r'retentionPeriod')
  String? get retentionPeriod;

  DSRExportResponseMetadata._();

  factory DSRExportResponseMetadata([void updates(DSRExportResponseMetadataBuilder b)]) = _$DSRExportResponseMetadata;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(DSRExportResponseMetadataBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<DSRExportResponseMetadata> get serializer => _$DSRExportResponseMetadataSerializer();
}

class _$DSRExportResponseMetadataSerializer implements PrimitiveSerializer<DSRExportResponseMetadata> {
  @override
  final Iterable<Type> types = const [DSRExportResponseMetadata, _$DSRExportResponseMetadata];

  @override
  final String wireName = r'DSRExportResponseMetadata';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    DSRExportResponseMetadata object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'exportId';
    yield serializers.serialize(
      object.exportId,
      specifiedType: const FullType(String),
    );
    yield r'exportedAt';
    yield serializers.serialize(
      object.exportedAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'exportedBy';
    yield serializers.serialize(
      object.exportedBy,
      specifiedType: const FullType(String),
    );
    yield r'dataVersion';
    yield serializers.serialize(
      object.dataVersion,
      specifiedType: const FullType(String),
    );
    if (object.retentionPeriod != null) {
      yield r'retentionPeriod';
      yield serializers.serialize(
        object.retentionPeriod,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    DSRExportResponseMetadata object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required DSRExportResponseMetadataBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'exportId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.exportId = valueDes;
          break;
        case r'exportedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.exportedAt = valueDes;
          break;
        case r'exportedBy':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.exportedBy = valueDes;
          break;
        case r'dataVersion':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.dataVersion = valueDes;
          break;
        case r'retentionPeriod':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.retentionPeriod = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  DSRExportResponseMetadata deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = DSRExportResponseMetadataBuilder();
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
