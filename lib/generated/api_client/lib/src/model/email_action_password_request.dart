//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:asora_api_client/src/model/email_action_target.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'email_action_password_request.g.dart';

/// EmailActionPasswordRequest
///
/// Properties:
/// * [email]
/// * [password]
/// * [actionTarget]
@BuiltValue()
abstract class EmailActionPasswordRequest implements Built<EmailActionPasswordRequest, EmailActionPasswordRequestBuilder> {
  @BuiltValueField(wireName: r'email')
  String get email;

  @BuiltValueField(wireName: r'password')
  String get password;

  @BuiltValueField(wireName: r'action_target')
  EmailActionTarget get actionTarget;
  // enum actionTargetEnum {  production,  preview,  };

  EmailActionPasswordRequest._();

  factory EmailActionPasswordRequest([void updates(EmailActionPasswordRequestBuilder b)]) = _$EmailActionPasswordRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(EmailActionPasswordRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<EmailActionPasswordRequest> get serializer => _$EmailActionPasswordRequestSerializer();
}

class _$EmailActionPasswordRequestSerializer implements PrimitiveSerializer<EmailActionPasswordRequest> {
  @override
  final Iterable<Type> types = const [EmailActionPasswordRequest, _$EmailActionPasswordRequest];

  @override
  final String wireName = r'EmailActionPasswordRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    EmailActionPasswordRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'email';
    yield serializers.serialize(
      object.email,
      specifiedType: const FullType(String),
    );
    yield r'password';
    yield serializers.serialize(
      object.password,
      specifiedType: const FullType(String),
    );
    yield r'action_target';
    yield serializers.serialize(
      object.actionTarget,
      specifiedType: const FullType(EmailActionTarget),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    EmailActionPasswordRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required EmailActionPasswordRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'email':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.email = valueDes;
          break;
        case r'password':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.password = valueDes;
          break;
        case r'action_target':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(EmailActionTarget),
          ) as EmailActionTarget;
          result.actionTarget = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  EmailActionPasswordRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = EmailActionPasswordRequestBuilder();
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
