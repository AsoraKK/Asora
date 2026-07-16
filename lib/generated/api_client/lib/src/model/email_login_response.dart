//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:asora_api_client/src/model/email_auth_user.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'email_login_response.g.dart';

/// EmailLoginResponse
///
/// Properties:
/// * [accessToken]
/// * [refreshToken]
/// * [tokenType]
/// * [expiresIn]
/// * [user]
@BuiltValue()
abstract class EmailLoginResponse implements Built<EmailLoginResponse, EmailLoginResponseBuilder> {
  @BuiltValueField(wireName: r'access_token')
  String get accessToken;

  @BuiltValueField(wireName: r'refresh_token')
  String get refreshToken;

  @BuiltValueField(wireName: r'token_type')
  EmailLoginResponseTokenTypeEnum get tokenType;
  // enum tokenTypeEnum {  Bearer,  };

  @BuiltValueField(wireName: r'expires_in')
  int get expiresIn;

  @BuiltValueField(wireName: r'user')
  EmailAuthUser get user;

  EmailLoginResponse._();

  factory EmailLoginResponse([void updates(EmailLoginResponseBuilder b)]) = _$EmailLoginResponse;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(EmailLoginResponseBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<EmailLoginResponse> get serializer => _$EmailLoginResponseSerializer();
}

class _$EmailLoginResponseSerializer implements PrimitiveSerializer<EmailLoginResponse> {
  @override
  final Iterable<Type> types = const [EmailLoginResponse, _$EmailLoginResponse];

  @override
  final String wireName = r'EmailLoginResponse';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    EmailLoginResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'access_token';
    yield serializers.serialize(
      object.accessToken,
      specifiedType: const FullType(String),
    );
    yield r'refresh_token';
    yield serializers.serialize(
      object.refreshToken,
      specifiedType: const FullType(String),
    );
    yield r'token_type';
    yield serializers.serialize(
      object.tokenType,
      specifiedType: const FullType(EmailLoginResponseTokenTypeEnum),
    );
    yield r'expires_in';
    yield serializers.serialize(
      object.expiresIn,
      specifiedType: const FullType(int),
    );
    yield r'user';
    yield serializers.serialize(
      object.user,
      specifiedType: const FullType(EmailAuthUser),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    EmailLoginResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required EmailLoginResponseBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'access_token':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.accessToken = valueDes;
          break;
        case r'refresh_token':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.refreshToken = valueDes;
          break;
        case r'token_type':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(EmailLoginResponseTokenTypeEnum),
          ) as EmailLoginResponseTokenTypeEnum;
          result.tokenType = valueDes;
          break;
        case r'expires_in':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.expiresIn = valueDes;
          break;
        case r'user':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(EmailAuthUser),
          ) as EmailAuthUser;
          result.user.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  EmailLoginResponse deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = EmailLoginResponseBuilder();
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

class EmailLoginResponseTokenTypeEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'Bearer')
  static const EmailLoginResponseTokenTypeEnum bearer = _$emailLoginResponseTokenTypeEnum_bearer;

  static Serializer<EmailLoginResponseTokenTypeEnum> get serializer => _$emailLoginResponseTokenTypeEnumSerializer;

  const EmailLoginResponseTokenTypeEnum._(String name): super(name);

  static BuiltSet<EmailLoginResponseTokenTypeEnum> get values => _$emailLoginResponseTokenTypeEnumValues;
  static EmailLoginResponseTokenTypeEnum valueOf(String name) => _$emailLoginResponseTokenTypeEnumValueOf(name);
}
