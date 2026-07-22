//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'email_provider_login_request.g.dart';

/// Verified provider-managed email login request.
///
/// Properties:
/// * [email]
/// * [password]
/// * [clientId] - Optional registered audience; defaults to the server's first configured JWT audience.
@BuiltValue()
abstract class EmailProviderLoginRequest implements Built<EmailProviderLoginRequest, EmailProviderLoginRequestBuilder> {
  @BuiltValueField(wireName: r'email')
  String get email;

  @BuiltValueField(wireName: r'password')
  String get password;

  /// Optional registered audience; defaults to the server's first configured JWT audience.
  @BuiltValueField(wireName: r'client_id')
  String? get clientId;

  EmailProviderLoginRequest._();

  factory EmailProviderLoginRequest([void updates(EmailProviderLoginRequestBuilder b)]) = _$EmailProviderLoginRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(EmailProviderLoginRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<EmailProviderLoginRequest> get serializer => _$EmailProviderLoginRequestSerializer();
}

class _$EmailProviderLoginRequestSerializer implements PrimitiveSerializer<EmailProviderLoginRequest> {
  @override
  final Iterable<Type> types = const [EmailProviderLoginRequest, _$EmailProviderLoginRequest];

  @override
  final String wireName = r'EmailProviderLoginRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    EmailProviderLoginRequest object, {
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
    if (object.clientId != null) {
      yield r'client_id';
      yield serializers.serialize(
        object.clientId,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    EmailProviderLoginRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required EmailProviderLoginRequestBuilder result,
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
        case r'client_id':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.clientId = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  EmailProviderLoginRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = EmailProviderLoginRequestBuilder();
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
