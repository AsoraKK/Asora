//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'auth_token_request.g.dart';

/// OAuth 2.0 token request body.
///
/// Properties:
/// * [grantType] - Grant type
/// * [clientId] - Registered client identifier
/// * [code] - Authorization code (required for authorization_code grant)
/// * [redirectUri] - Must match the redirect URI used during authorization
/// * [codeVerifier] - PKCE code verifier (required when code_challenge was provided)
/// * [refreshToken] - Refresh token (required for refresh_token grant)
@BuiltValue()
abstract class AuthTokenRequest implements Built<AuthTokenRequest, AuthTokenRequestBuilder> {
  /// Grant type
  @BuiltValueField(wireName: r'grant_type')
  AuthTokenRequestGrantTypeEnum get grantType;
  // enum grantTypeEnum {  authorization_code,  refresh_token,  };

  /// Registered client identifier
  @BuiltValueField(wireName: r'client_id')
  String get clientId;

  /// Authorization code (required for authorization_code grant)
  @BuiltValueField(wireName: r'code')
  String? get code;

  /// Must match the redirect URI used during authorization
  @BuiltValueField(wireName: r'redirect_uri')
  String? get redirectUri;

  /// PKCE code verifier (required when code_challenge was provided)
  @BuiltValueField(wireName: r'code_verifier')
  String? get codeVerifier;

  /// Refresh token (required for refresh_token grant)
  @BuiltValueField(wireName: r'refresh_token')
  String? get refreshToken;

  AuthTokenRequest._();

  factory AuthTokenRequest([void updates(AuthTokenRequestBuilder b)]) = _$AuthTokenRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AuthTokenRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AuthTokenRequest> get serializer => _$AuthTokenRequestSerializer();
}

class _$AuthTokenRequestSerializer implements PrimitiveSerializer<AuthTokenRequest> {
  @override
  final Iterable<Type> types = const [AuthTokenRequest, _$AuthTokenRequest];

  @override
  final String wireName = r'AuthTokenRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AuthTokenRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'grant_type';
    yield serializers.serialize(
      object.grantType,
      specifiedType: const FullType(AuthTokenRequestGrantTypeEnum),
    );
    yield r'client_id';
    yield serializers.serialize(
      object.clientId,
      specifiedType: const FullType(String),
    );
    if (object.code != null) {
      yield r'code';
      yield serializers.serialize(
        object.code,
        specifiedType: const FullType(String),
      );
    }
    if (object.redirectUri != null) {
      yield r'redirect_uri';
      yield serializers.serialize(
        object.redirectUri,
        specifiedType: const FullType(String),
      );
    }
    if (object.codeVerifier != null) {
      yield r'code_verifier';
      yield serializers.serialize(
        object.codeVerifier,
        specifiedType: const FullType(String),
      );
    }
    if (object.refreshToken != null) {
      yield r'refresh_token';
      yield serializers.serialize(
        object.refreshToken,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    AuthTokenRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AuthTokenRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'grant_type':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(AuthTokenRequestGrantTypeEnum),
          ) as AuthTokenRequestGrantTypeEnum;
          result.grantType = valueDes;
          break;
        case r'client_id':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.clientId = valueDes;
          break;
        case r'code':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.code = valueDes;
          break;
        case r'redirect_uri':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.redirectUri = valueDes;
          break;
        case r'code_verifier':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.codeVerifier = valueDes;
          break;
        case r'refresh_token':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.refreshToken = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AuthTokenRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AuthTokenRequestBuilder();
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

class AuthTokenRequestGrantTypeEnum extends EnumClass {

  /// Grant type
  @BuiltValueEnumConst(wireName: r'authorization_code')
  static const AuthTokenRequestGrantTypeEnum authorizationCode = _$authTokenRequestGrantTypeEnum_authorizationCode;
  /// Grant type
  @BuiltValueEnumConst(wireName: r'refresh_token')
  static const AuthTokenRequestGrantTypeEnum refreshToken = _$authTokenRequestGrantTypeEnum_refreshToken;

  static Serializer<AuthTokenRequestGrantTypeEnum> get serializer => _$authTokenRequestGrantTypeEnumSerializer;

  const AuthTokenRequestGrantTypeEnum._(String name): super(name);

  static BuiltSet<AuthTokenRequestGrantTypeEnum> get values => _$authTokenRequestGrantTypeEnumValues;
  static AuthTokenRequestGrantTypeEnum valueOf(String name) => _$authTokenRequestGrantTypeEnumValueOf(name);
}

