//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'review_appealed_content_request.g.dart';

/// ReviewAppealedContentRequest
///
/// Properties:
/// * [decision]
/// * [rationale]
@BuiltValue()
abstract class ReviewAppealedContentRequest implements Built<ReviewAppealedContentRequest, ReviewAppealedContentRequestBuilder> {
  @BuiltValueField(wireName: r'decision')
  ReviewAppealedContentRequestDecisionEnum get decision;
  // enum decisionEnum {  uphold,  overturn,  };

  @BuiltValueField(wireName: r'rationale')
  String? get rationale;

  ReviewAppealedContentRequest._();

  factory ReviewAppealedContentRequest([void updates(ReviewAppealedContentRequestBuilder b)]) = _$ReviewAppealedContentRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ReviewAppealedContentRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ReviewAppealedContentRequest> get serializer => _$ReviewAppealedContentRequestSerializer();
}

class _$ReviewAppealedContentRequestSerializer implements PrimitiveSerializer<ReviewAppealedContentRequest> {
  @override
  final Iterable<Type> types = const [ReviewAppealedContentRequest, _$ReviewAppealedContentRequest];

  @override
  final String wireName = r'ReviewAppealedContentRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ReviewAppealedContentRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'decision';
    yield serializers.serialize(
      object.decision,
      specifiedType: const FullType(ReviewAppealedContentRequestDecisionEnum),
    );
    if (object.rationale != null) {
      yield r'rationale';
      yield serializers.serialize(
        object.rationale,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    ReviewAppealedContentRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required ReviewAppealedContentRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'decision':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ReviewAppealedContentRequestDecisionEnum),
          ) as ReviewAppealedContentRequestDecisionEnum;
          result.decision = valueDes;
          break;
        case r'rationale':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.rationale = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  ReviewAppealedContentRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ReviewAppealedContentRequestBuilder();
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

class ReviewAppealedContentRequestDecisionEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'uphold')
  static const ReviewAppealedContentRequestDecisionEnum uphold = _$reviewAppealedContentRequestDecisionEnum_uphold;
  @BuiltValueEnumConst(wireName: r'overturn')
  static const ReviewAppealedContentRequestDecisionEnum overturn = _$reviewAppealedContentRequestDecisionEnum_overturn;

  static Serializer<ReviewAppealedContentRequestDecisionEnum> get serializer => _$reviewAppealedContentRequestDecisionEnumSerializer;

  const ReviewAppealedContentRequestDecisionEnum._(String name): super(name);

  static BuiltSet<ReviewAppealedContentRequestDecisionEnum> get values => _$reviewAppealedContentRequestDecisionEnumValues;
  static ReviewAppealedContentRequestDecisionEnum valueOf(String name) => _$reviewAppealedContentRequestDecisionEnumValueOf(name);
}

