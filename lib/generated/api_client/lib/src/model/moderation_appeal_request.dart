//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'moderation_appeal_request.g.dart';

/// Request body for filing a moderation appeal.
///
/// Properties:
/// * [caseId] - Identifier of the moderation case being appealed
/// * [statement] - User's statement explaining why the decision should be reversed
/// * [evidenceUrls] - Optional supporting evidence URLs
@BuiltValue()
abstract class ModerationAppealRequest
    implements Built<ModerationAppealRequest, ModerationAppealRequestBuilder> {
  /// Identifier of the moderation case being appealed
  @BuiltValueField(wireName: r'caseId')
  String get caseId;

  /// User's statement explaining why the decision should be reversed
  @BuiltValueField(wireName: r'statement')
  String get statement;

  /// Optional supporting evidence URLs
  @BuiltValueField(wireName: r'evidenceUrls')
  BuiltList<String>? get evidenceUrls;

  ModerationAppealRequest._();

  factory ModerationAppealRequest(
          [void updates(ModerationAppealRequestBuilder b)]) =
      _$ModerationAppealRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ModerationAppealRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ModerationAppealRequest> get serializer =>
      _$ModerationAppealRequestSerializer();
}

class _$ModerationAppealRequestSerializer
    implements PrimitiveSerializer<ModerationAppealRequest> {
  @override
  final Iterable<Type> types = const [
    ModerationAppealRequest,
    _$ModerationAppealRequest
  ];

  @override
  final String wireName = r'ModerationAppealRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ModerationAppealRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'caseId';
    yield serializers.serialize(
      object.caseId,
      specifiedType: const FullType(String),
    );
    yield r'statement';
    yield serializers.serialize(
      object.statement,
      specifiedType: const FullType(String),
    );
    if (object.evidenceUrls != null) {
      yield r'evidenceUrls';
      yield serializers.serialize(
        object.evidenceUrls,
        specifiedType: const FullType(BuiltList, [FullType(String)]),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    ModerationAppealRequest object, {
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
    required ModerationAppealRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'caseId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.caseId = valueDes;
          break;
        case r'statement':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.statement = valueDes;
          break;
        case r'evidenceUrls':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(String)]),
          ) as BuiltList<String>;
          result.evidenceUrls.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  ModerationAppealRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ModerationAppealRequestBuilder();
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
