//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_invite_batch_request.g.dart';

/// AdminInviteBatchRequest
///
/// Properties:
/// * [count] 
/// * [expiresInDays] 
/// * [maxUses] 
/// * [label] 
@BuiltValue()
abstract class AdminInviteBatchRequest implements Built<AdminInviteBatchRequest, AdminInviteBatchRequestBuilder> {
  @BuiltValueField(wireName: r'count')
  int get count;

  @BuiltValueField(wireName: r'expiresInDays')
  int? get expiresInDays;

  @BuiltValueField(wireName: r'maxUses')
  int? get maxUses;

  @BuiltValueField(wireName: r'label')
  String? get label;

  AdminInviteBatchRequest._();

  factory AdminInviteBatchRequest([void updates(AdminInviteBatchRequestBuilder b)]) = _$AdminInviteBatchRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminInviteBatchRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminInviteBatchRequest> get serializer => _$AdminInviteBatchRequestSerializer();
}

class _$AdminInviteBatchRequestSerializer implements PrimitiveSerializer<AdminInviteBatchRequest> {
  @override
  final Iterable<Type> types = const [AdminInviteBatchRequest, _$AdminInviteBatchRequest];

  @override
  final String wireName = r'AdminInviteBatchRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminInviteBatchRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'count';
    yield serializers.serialize(
      object.count,
      specifiedType: const FullType(int),
    );
    if (object.expiresInDays != null) {
      yield r'expiresInDays';
      yield serializers.serialize(
        object.expiresInDays,
        specifiedType: const FullType(int),
      );
    }
    if (object.maxUses != null) {
      yield r'maxUses';
      yield serializers.serialize(
        object.maxUses,
        specifiedType: const FullType(int),
      );
    }
    if (object.label != null) {
      yield r'label';
      yield serializers.serialize(
        object.label,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminInviteBatchRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminInviteBatchRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'count':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.count = valueDes;
          break;
        case r'expiresInDays':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.expiresInDays = valueDes;
          break;
        case r'maxUses':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.maxUses = valueDes;
          break;
        case r'label':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.label = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AdminInviteBatchRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminInviteBatchRequestBuilder();
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

