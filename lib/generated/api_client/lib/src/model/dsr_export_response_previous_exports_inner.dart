//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'dsr_export_response_previous_exports_inner.g.dart';

/// DSRExportResponsePreviousExportsInner
///
/// Properties:
/// * [exportId]
/// * [exportedAt]
/// * [type]
@BuiltValue()
abstract class DSRExportResponsePreviousExportsInner
    implements
        Built<DSRExportResponsePreviousExportsInner,
            DSRExportResponsePreviousExportsInnerBuilder> {
  @BuiltValueField(wireName: r'exportId')
  String? get exportId;

  @BuiltValueField(wireName: r'exportedAt')
  DateTime? get exportedAt;

  @BuiltValueField(wireName: r'type')
  DSRExportResponsePreviousExportsInnerTypeEnum? get type;
  // enum typeEnum {  export,  deletion,  };

  DSRExportResponsePreviousExportsInner._();

  factory DSRExportResponsePreviousExportsInner(
          [void updates(DSRExportResponsePreviousExportsInnerBuilder b)]) =
      _$DSRExportResponsePreviousExportsInner;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(DSRExportResponsePreviousExportsInnerBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<DSRExportResponsePreviousExportsInner> get serializer =>
      _$DSRExportResponsePreviousExportsInnerSerializer();
}

class _$DSRExportResponsePreviousExportsInnerSerializer
    implements PrimitiveSerializer<DSRExportResponsePreviousExportsInner> {
  @override
  final Iterable<Type> types = const [
    DSRExportResponsePreviousExportsInner,
    _$DSRExportResponsePreviousExportsInner
  ];

  @override
  final String wireName = r'DSRExportResponsePreviousExportsInner';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    DSRExportResponsePreviousExportsInner object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.exportId != null) {
      yield r'exportId';
      yield serializers.serialize(
        object.exportId,
        specifiedType: const FullType(String),
      );
    }
    if (object.exportedAt != null) {
      yield r'exportedAt';
      yield serializers.serialize(
        object.exportedAt,
        specifiedType: const FullType(DateTime),
      );
    }
    if (object.type != null) {
      yield r'type';
      yield serializers.serialize(
        object.type,
        specifiedType:
            const FullType(DSRExportResponsePreviousExportsInnerTypeEnum),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    DSRExportResponsePreviousExportsInner object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object,
            specifiedType: specifiedType)
        .toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required DSRExportResponsePreviousExportsInnerBuilder result,
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
        case r'type':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType(DSRExportResponsePreviousExportsInnerTypeEnum),
          ) as DSRExportResponsePreviousExportsInnerTypeEnum;
          result.type = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  DSRExportResponsePreviousExportsInner deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = DSRExportResponsePreviousExportsInnerBuilder();
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

class DSRExportResponsePreviousExportsInnerTypeEnum extends EnumClass {
  @BuiltValueEnumConst(wireName: r'export')
  static const DSRExportResponsePreviousExportsInnerTypeEnum export_ =
      _$dSRExportResponsePreviousExportsInnerTypeEnum_export_;
  @BuiltValueEnumConst(wireName: r'deletion')
  static const DSRExportResponsePreviousExportsInnerTypeEnum deletion =
      _$dSRExportResponsePreviousExportsInnerTypeEnum_deletion;

  static Serializer<DSRExportResponsePreviousExportsInnerTypeEnum>
      get serializer =>
          _$dSRExportResponsePreviousExportsInnerTypeEnumSerializer;

  const DSRExportResponsePreviousExportsInnerTypeEnum._(String name)
      : super(name);

  static BuiltSet<DSRExportResponsePreviousExportsInnerTypeEnum> get values =>
      _$dSRExportResponsePreviousExportsInnerTypeEnumValues;
  static DSRExportResponsePreviousExportsInnerTypeEnum valueOf(String name) =>
      _$dSRExportResponsePreviousExportsInnerTypeEnumValueOf(name);
}
