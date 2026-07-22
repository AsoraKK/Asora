//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'email_token_request.g.dart';

/// EmailTokenRequest
///
/// Properties:
/// * [token]
@BuiltValue()
abstract class EmailTokenRequest implements Built<EmailTokenRequest, EmailTokenRequestBuilder> {
  @BuiltValueField(wireName: r'token')
  String get token;

  EmailTokenRequest._();

  factory EmailTokenRequest([void updates(EmailTokenRequestBuilder b)]) = _$EmailTokenRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(EmailTokenRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<EmailTokenRequest> get serializer => _$EmailTokenRequestSerializer();
}

class _$EmailTokenRequestSerializer implements PrimitiveSerializer<EmailTokenRequest> {
  @override
  final Iterable<Type> types = const [EmailTokenRequest, _$EmailTokenRequest];

  @override
  final String wireName = r'EmailTokenRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    EmailTokenRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'token';
    yield serializers.serialize(
      object.token,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    EmailTokenRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required EmailTokenRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
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
  EmailTokenRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = EmailTokenRequestBuilder();
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
