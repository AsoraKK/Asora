//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:asora_api_client/src/model/email_action_target.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'email_action_email_request.g.dart';

/// EmailActionEmailRequest
///
/// Properties:
/// * [email]
/// * [actionTarget]
@BuiltValue()
abstract class EmailActionEmailRequest implements Built<EmailActionEmailRequest, EmailActionEmailRequestBuilder> {
  @BuiltValueField(wireName: r'email')
  String get email;

  @BuiltValueField(wireName: r'action_target')
  EmailActionTarget get actionTarget;
  // enum actionTargetEnum {  production,  preview,  };

  EmailActionEmailRequest._();

  factory EmailActionEmailRequest([void updates(EmailActionEmailRequestBuilder b)]) = _$EmailActionEmailRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(EmailActionEmailRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<EmailActionEmailRequest> get serializer => _$EmailActionEmailRequestSerializer();
}

class _$EmailActionEmailRequestSerializer implements PrimitiveSerializer<EmailActionEmailRequest> {
  @override
  final Iterable<Type> types = const [EmailActionEmailRequest, _$EmailActionEmailRequest];

  @override
  final String wireName = r'EmailActionEmailRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    EmailActionEmailRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'email';
    yield serializers.serialize(
      object.email,
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
    EmailActionEmailRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required EmailActionEmailRequestBuilder result,
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
  EmailActionEmailRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = EmailActionEmailRequestBuilder();
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
