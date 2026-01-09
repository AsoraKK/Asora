//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:asora_api_client/src/model/admin_appeal_original_decision.dart';
import 'package:asora_api_client/src/model/admin_appeal_detail.dart';
import 'package:asora_api_client/src/model/admin_appeal_content.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_appeal_detail_response.g.dart';

/// AdminAppealDetailResponse
///
/// Properties:
/// * [appeal] 
/// * [content] 
/// * [originalDecision] 
@BuiltValue()
abstract class AdminAppealDetailResponse implements Built<AdminAppealDetailResponse, AdminAppealDetailResponseBuilder> {
  @BuiltValueField(wireName: r'appeal')
  AdminAppealDetail? get appeal;

  @BuiltValueField(wireName: r'content')
  AdminAppealContent? get content;

  @BuiltValueField(wireName: r'originalDecision')
  AdminAppealOriginalDecision? get originalDecision;

  AdminAppealDetailResponse._();

  factory AdminAppealDetailResponse([void updates(AdminAppealDetailResponseBuilder b)]) = _$AdminAppealDetailResponse;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminAppealDetailResponseBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminAppealDetailResponse> get serializer => _$AdminAppealDetailResponseSerializer();
}

class _$AdminAppealDetailResponseSerializer implements PrimitiveSerializer<AdminAppealDetailResponse> {
  @override
  final Iterable<Type> types = const [AdminAppealDetailResponse, _$AdminAppealDetailResponse];

  @override
  final String wireName = r'AdminAppealDetailResponse';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminAppealDetailResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.appeal != null) {
      yield r'appeal';
      yield serializers.serialize(
        object.appeal,
        specifiedType: const FullType(AdminAppealDetail),
      );
    }
    if (object.content != null) {
      yield r'content';
      yield serializers.serialize(
        object.content,
        specifiedType: const FullType(AdminAppealContent),
      );
    }
    if (object.originalDecision != null) {
      yield r'originalDecision';
      yield serializers.serialize(
        object.originalDecision,
        specifiedType: const FullType(AdminAppealOriginalDecision),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminAppealDetailResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminAppealDetailResponseBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'appeal':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(AdminAppealDetail),
          ) as AdminAppealDetail;
          result.appeal.replace(valueDes);
          break;
        case r'content':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(AdminAppealContent),
          ) as AdminAppealContent;
          result.content.replace(valueDes);
          break;
        case r'originalDecision':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(AdminAppealOriginalDecision),
          ) as AdminAppealOriginalDecision;
          result.originalDecision.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AdminAppealDetailResponse deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminAppealDetailResponseBuilder();
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

