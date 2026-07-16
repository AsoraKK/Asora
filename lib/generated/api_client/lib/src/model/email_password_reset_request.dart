//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:asora_api_client/src/model/email_token_request.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'email_password_reset_request.g.dart';

/// EmailPasswordResetRequest
///
/// Properties:
/// * [token]
/// * [newPassword]
@BuiltValue()
abstract class EmailPasswordResetRequest implements EmailTokenRequest, Built<EmailPasswordResetRequest, EmailPasswordResetRequestBuilder> {
  @BuiltValueField(wireName: r'new_password')
  String get newPassword;

  EmailPasswordResetRequest._();

  factory EmailPasswordResetRequest([void updates(EmailPasswordResetRequestBuilder b)]) = _$EmailPasswordResetRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(EmailPasswordResetRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<EmailPasswordResetRequest> get serializer => _$EmailPasswordResetRequestSerializer();
}

class _$EmailPasswordResetRequestSerializer implements PrimitiveSerializer<EmailPasswordResetRequest> {
  @override
  final Iterable<Type> types = const [EmailPasswordResetRequest, _$EmailPasswordResetRequest];

  @override
  final String wireName = r'EmailPasswordResetRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    EmailPasswordResetRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'new_password';
    yield serializers.serialize(
      object.newPassword,
      specifiedType: const FullType(String),
    );
    yield r'token';
    yield serializers.serialize(
      object.token,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    EmailPasswordResetRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required EmailPasswordResetRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'new_password':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.newPassword = valueDes;
          break;
        case r'token':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.token = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  EmailPasswordResetRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = EmailPasswordResetRequestBuilder();
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
