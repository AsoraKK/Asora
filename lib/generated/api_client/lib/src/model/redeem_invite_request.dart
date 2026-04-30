//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'redeem_invite_request.g.dart';

/// Request body for redeeming an invite code.
///
/// Properties:
/// * [inviteCode] - Invite code in XXXX-XXXX format
@BuiltValue()
abstract class RedeemInviteRequest
    implements Built<RedeemInviteRequest, RedeemInviteRequestBuilder> {
  /// Invite code in XXXX-XXXX format
  @BuiltValueField(wireName: r'inviteCode')
  String get inviteCode;

  RedeemInviteRequest._();

  factory RedeemInviteRequest([void updates(RedeemInviteRequestBuilder b)]) =
      _$RedeemInviteRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(RedeemInviteRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<RedeemInviteRequest> get serializer =>
      _$RedeemInviteRequestSerializer();
}

class _$RedeemInviteRequestSerializer
    implements PrimitiveSerializer<RedeemInviteRequest> {
  @override
  final Iterable<Type> types = const [
    RedeemInviteRequest,
    _$RedeemInviteRequest
  ];

  @override
  final String wireName = r'RedeemInviteRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    RedeemInviteRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'inviteCode';
    yield serializers.serialize(
      object.inviteCode,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    RedeemInviteRequest object, {
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
    required RedeemInviteRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'inviteCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.inviteCode = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  RedeemInviteRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = RedeemInviteRequestBuilder();
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
