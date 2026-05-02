//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'flag_content_v1_request.g.dart';

/// FlagContentV1Request
///
/// Properties:
/// * [targetId] - Identifier of the content being flagged
/// * [reason] - Moderation reason
/// * [notes] - Additional details supporting the flag
@BuiltValue()
abstract class FlagContentV1Request implements Built<FlagContentV1Request, FlagContentV1RequestBuilder> {
  /// Identifier of the content being flagged
  @BuiltValueField(wireName: r'targetId')
  String get targetId;

  /// Moderation reason
  @BuiltValueField(wireName: r'reason')
  FlagContentV1RequestReasonEnum get reason;
  // enum reasonEnum {  spam,  harassment,  hate_speech,  violence,  adult_content,  misinformation,  copyright,  privacy,  other,  };

  /// Additional details supporting the flag
  @BuiltValueField(wireName: r'notes')
  String? get notes;

  FlagContentV1Request._();

  factory FlagContentV1Request([void updates(FlagContentV1RequestBuilder b)]) = _$FlagContentV1Request;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(FlagContentV1RequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<FlagContentV1Request> get serializer => _$FlagContentV1RequestSerializer();
}

class _$FlagContentV1RequestSerializer implements PrimitiveSerializer<FlagContentV1Request> {
  @override
  final Iterable<Type> types = const [FlagContentV1Request, _$FlagContentV1Request];

  @override
  final String wireName = r'FlagContentV1Request';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    FlagContentV1Request object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'targetId';
    yield serializers.serialize(
      object.targetId,
      specifiedType: const FullType(String),
    );
    yield r'reason';
    yield serializers.serialize(
      object.reason,
      specifiedType: const FullType(FlagContentV1RequestReasonEnum),
    );
    if (object.notes != null) {
      yield r'notes';
      yield serializers.serialize(
        object.notes,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    FlagContentV1Request object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required FlagContentV1RequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'targetId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.targetId = valueDes;
          break;
        case r'reason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(FlagContentV1RequestReasonEnum),
          ) as FlagContentV1RequestReasonEnum;
          result.reason = valueDes;
          break;
        case r'notes':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.notes = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  FlagContentV1Request deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = FlagContentV1RequestBuilder();
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

class FlagContentV1RequestReasonEnum extends EnumClass {

  /// Moderation reason
  @BuiltValueEnumConst(wireName: r'spam')
  static const FlagContentV1RequestReasonEnum spam = _$flagContentV1RequestReasonEnum_spam;
  /// Moderation reason
  @BuiltValueEnumConst(wireName: r'harassment')
  static const FlagContentV1RequestReasonEnum harassment = _$flagContentV1RequestReasonEnum_harassment;
  /// Moderation reason
  @BuiltValueEnumConst(wireName: r'hate_speech')
  static const FlagContentV1RequestReasonEnum hateSpeech = _$flagContentV1RequestReasonEnum_hateSpeech;
  /// Moderation reason
  @BuiltValueEnumConst(wireName: r'violence')
  static const FlagContentV1RequestReasonEnum violence = _$flagContentV1RequestReasonEnum_violence;
  /// Moderation reason
  @BuiltValueEnumConst(wireName: r'adult_content')
  static const FlagContentV1RequestReasonEnum adultContent = _$flagContentV1RequestReasonEnum_adultContent;
  /// Moderation reason
  @BuiltValueEnumConst(wireName: r'misinformation')
  static const FlagContentV1RequestReasonEnum misinformation = _$flagContentV1RequestReasonEnum_misinformation;
  /// Moderation reason
  @BuiltValueEnumConst(wireName: r'copyright')
  static const FlagContentV1RequestReasonEnum copyright = _$flagContentV1RequestReasonEnum_copyright;
  /// Moderation reason
  @BuiltValueEnumConst(wireName: r'privacy')
  static const FlagContentV1RequestReasonEnum privacy = _$flagContentV1RequestReasonEnum_privacy;
  /// Moderation reason
  @BuiltValueEnumConst(wireName: r'other')
  static const FlagContentV1RequestReasonEnum other = _$flagContentV1RequestReasonEnum_other;

  static Serializer<FlagContentV1RequestReasonEnum> get serializer => _$flagContentV1RequestReasonEnumSerializer;

  const FlagContentV1RequestReasonEnum._(String name): super(name);

  static BuiltSet<FlagContentV1RequestReasonEnum> get values => _$flagContentV1RequestReasonEnumValues;
  static FlagContentV1RequestReasonEnum valueOf(String name) => _$flagContentV1RequestReasonEnumValueOf(name);
}

