//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'flag_content_request.g.dart';

/// FlagContentRequest
///
/// Properties:
/// * [contentId] - Identifier of the content being flagged
/// * [contentType]
/// * [reason] - Moderation reason
/// * [additionalDetails] - Additional details supporting the flag
/// * [urgency]
@BuiltValue()
abstract class FlagContentRequest implements Built<FlagContentRequest, FlagContentRequestBuilder> {
  /// Identifier of the content being flagged
  @BuiltValueField(wireName: r'contentId')
  String get contentId;

  @BuiltValueField(wireName: r'contentType')
  FlagContentRequestContentTypeEnum get contentType;
  // enum contentTypeEnum {  post,  comment,  user,  message,  };

  /// Moderation reason
  @BuiltValueField(wireName: r'reason')
  FlagContentRequestReasonEnum get reason;
  // enum reasonEnum {  spam,  harassment,  hate_speech,  violence,  adult_content,  misinformation,  copyright,  privacy,  other,  };

  /// Additional details supporting the flag
  @BuiltValueField(wireName: r'additionalDetails')
  String? get additionalDetails;

  @BuiltValueField(wireName: r'urgency')
  FlagContentRequestUrgencyEnum? get urgency;
  // enum urgencyEnum {  low,  medium,  high,  };

  FlagContentRequest._();

  factory FlagContentRequest([void updates(FlagContentRequestBuilder b)]) = _$FlagContentRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(FlagContentRequestBuilder b) => b
      ..urgency = const FlagContentRequestUrgencyEnum._('medium');

  @BuiltValueSerializer(custom: true)
  static Serializer<FlagContentRequest> get serializer => _$FlagContentRequestSerializer();
}

class _$FlagContentRequestSerializer implements PrimitiveSerializer<FlagContentRequest> {
  @override
  final Iterable<Type> types = const [FlagContentRequest, _$FlagContentRequest];

  @override
  final String wireName = r'FlagContentRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    FlagContentRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'contentId';
    yield serializers.serialize(
      object.contentId,
      specifiedType: const FullType(String),
    );
    yield r'contentType';
    yield serializers.serialize(
      object.contentType,
      specifiedType: const FullType(FlagContentRequestContentTypeEnum),
    );
    yield r'reason';
    yield serializers.serialize(
      object.reason,
      specifiedType: const FullType(FlagContentRequestReasonEnum),
    );
    if (object.additionalDetails != null) {
      yield r'additionalDetails';
      yield serializers.serialize(
        object.additionalDetails,
        specifiedType: const FullType(String),
      );
    }
    if (object.urgency != null) {
      yield r'urgency';
      yield serializers.serialize(
        object.urgency,
        specifiedType: const FullType(FlagContentRequestUrgencyEnum),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    FlagContentRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required FlagContentRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'contentId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.contentId = valueDes;
          break;
        case r'contentType':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(FlagContentRequestContentTypeEnum),
          ) as FlagContentRequestContentTypeEnum;
          result.contentType = valueDes;
          break;
        case r'reason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(FlagContentRequestReasonEnum),
          ) as FlagContentRequestReasonEnum;
          result.reason = valueDes;
          break;
        case r'additionalDetails':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.additionalDetails = valueDes;
          break;
        case r'urgency':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(FlagContentRequestUrgencyEnum),
          ) as FlagContentRequestUrgencyEnum;
          result.urgency = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  FlagContentRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = FlagContentRequestBuilder();
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

class FlagContentRequestContentTypeEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'post')
  static const FlagContentRequestContentTypeEnum post = _$flagContentRequestContentTypeEnum_post;
  @BuiltValueEnumConst(wireName: r'comment')
  static const FlagContentRequestContentTypeEnum comment = _$flagContentRequestContentTypeEnum_comment;
  @BuiltValueEnumConst(wireName: r'user')
  static const FlagContentRequestContentTypeEnum user = _$flagContentRequestContentTypeEnum_user;
  @BuiltValueEnumConst(wireName: r'message')
  static const FlagContentRequestContentTypeEnum message = _$flagContentRequestContentTypeEnum_message;

  static Serializer<FlagContentRequestContentTypeEnum> get serializer => _$flagContentRequestContentTypeEnumSerializer;

  const FlagContentRequestContentTypeEnum._(String name): super(name);

  static BuiltSet<FlagContentRequestContentTypeEnum> get values => _$flagContentRequestContentTypeEnumValues;
  static FlagContentRequestContentTypeEnum valueOf(String name) => _$flagContentRequestContentTypeEnumValueOf(name);
}

class FlagContentRequestReasonEnum extends EnumClass {

  /// Moderation reason
  @BuiltValueEnumConst(wireName: r'spam')
  static const FlagContentRequestReasonEnum spam = _$flagContentRequestReasonEnum_spam;
  /// Moderation reason
  @BuiltValueEnumConst(wireName: r'harassment')
  static const FlagContentRequestReasonEnum harassment = _$flagContentRequestReasonEnum_harassment;
  /// Moderation reason
  @BuiltValueEnumConst(wireName: r'hate_speech')
  static const FlagContentRequestReasonEnum hateSpeech = _$flagContentRequestReasonEnum_hateSpeech;
  /// Moderation reason
  @BuiltValueEnumConst(wireName: r'violence')
  static const FlagContentRequestReasonEnum violence = _$flagContentRequestReasonEnum_violence;
  /// Moderation reason
  @BuiltValueEnumConst(wireName: r'adult_content')
  static const FlagContentRequestReasonEnum adultContent = _$flagContentRequestReasonEnum_adultContent;
  /// Moderation reason
  @BuiltValueEnumConst(wireName: r'misinformation')
  static const FlagContentRequestReasonEnum misinformation = _$flagContentRequestReasonEnum_misinformation;
  /// Moderation reason
  @BuiltValueEnumConst(wireName: r'copyright')
  static const FlagContentRequestReasonEnum copyright = _$flagContentRequestReasonEnum_copyright;
  /// Moderation reason
  @BuiltValueEnumConst(wireName: r'privacy')
  static const FlagContentRequestReasonEnum privacy = _$flagContentRequestReasonEnum_privacy;
  /// Moderation reason
  @BuiltValueEnumConst(wireName: r'other')
  static const FlagContentRequestReasonEnum other = _$flagContentRequestReasonEnum_other;

  static Serializer<FlagContentRequestReasonEnum> get serializer => _$flagContentRequestReasonEnumSerializer;

  const FlagContentRequestReasonEnum._(String name): super(name);

  static BuiltSet<FlagContentRequestReasonEnum> get values => _$flagContentRequestReasonEnumValues;
  static FlagContentRequestReasonEnum valueOf(String name) => _$flagContentRequestReasonEnumValueOf(name);
}

class FlagContentRequestUrgencyEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'low')
  static const FlagContentRequestUrgencyEnum low = _$flagContentRequestUrgencyEnum_low;
  @BuiltValueEnumConst(wireName: r'medium')
  static const FlagContentRequestUrgencyEnum medium = _$flagContentRequestUrgencyEnum_medium;
  @BuiltValueEnumConst(wireName: r'high')
  static const FlagContentRequestUrgencyEnum high = _$flagContentRequestUrgencyEnum_high;

  static Serializer<FlagContentRequestUrgencyEnum> get serializer => _$flagContentRequestUrgencyEnumSerializer;

  const FlagContentRequestUrgencyEnum._(String name): super(name);

  static BuiltSet<FlagContentRequestUrgencyEnum> get values => _$flagContentRequestUrgencyEnumValues;
  static FlagContentRequestUrgencyEnum valueOf(String name) => _$flagContentRequestUrgencyEnumValueOf(name);
}
