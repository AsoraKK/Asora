//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'o_auth_token_response_data.g.dart';

/// OAuthTokenResponseData
///
/// Properties:
/// * [accessToken] - Short-lived JWT bearer token (15 min)
/// * [refreshToken] - Long-lived opaque refresh token (7 days)
/// * [tokenType]
/// * [expiresIn] - Access token lifetime in seconds
@BuiltValue()
abstract class OAuthTokenResponseData
    implements Built<OAuthTokenResponseData, OAuthTokenResponseDataBuilder> {
  /// Short-lived JWT bearer token (15 min)
  @BuiltValueField(wireName: r'access_token')
  String get accessToken;

  /// Long-lived opaque refresh token (7 days)
  @BuiltValueField(wireName: r'refresh_token')
  String get refreshToken;

  @BuiltValueField(wireName: r'token_type')
  OAuthTokenResponseDataTokenTypeEnum get tokenType;
  // enum tokenTypeEnum {  Bearer,  };

  /// Access token lifetime in seconds
  @BuiltValueField(wireName: r'expires_in')
  int get expiresIn;

  OAuthTokenResponseData._();

  factory OAuthTokenResponseData(
          [void updates(OAuthTokenResponseDataBuilder b)]) =
      _$OAuthTokenResponseData;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(OAuthTokenResponseDataBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<OAuthTokenResponseData> get serializer =>
      _$OAuthTokenResponseDataSerializer();
}

class _$OAuthTokenResponseDataSerializer
    implements PrimitiveSerializer<OAuthTokenResponseData> {
  @override
  final Iterable<Type> types = const [
    OAuthTokenResponseData,
    _$OAuthTokenResponseData
  ];

  @override
  final String wireName = r'OAuthTokenResponseData';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    OAuthTokenResponseData object, {
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
      specifiedType: const FullType(OAuthTokenResponseDataTokenTypeEnum),
    );
    yield r'expires_in';
    yield serializers.serialize(
      object.expiresIn,
      specifiedType: const FullType(int),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    OAuthTokenResponseData object, {
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
    required OAuthTokenResponseDataBuilder result,
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
            specifiedType: const FullType(OAuthTokenResponseDataTokenTypeEnum),
          ) as OAuthTokenResponseDataTokenTypeEnum;
          result.tokenType = valueDes;
          break;
        case r'expires_in':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.expiresIn = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  OAuthTokenResponseData deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = OAuthTokenResponseDataBuilder();
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

class OAuthTokenResponseDataTokenTypeEnum extends EnumClass {
  @BuiltValueEnumConst(wireName: r'Bearer')
  static const OAuthTokenResponseDataTokenTypeEnum bearer =
      _$oAuthTokenResponseDataTokenTypeEnum_bearer;

  static Serializer<OAuthTokenResponseDataTokenTypeEnum> get serializer =>
      _$oAuthTokenResponseDataTokenTypeEnumSerializer;

  const OAuthTokenResponseDataTokenTypeEnum._(String name) : super(name);

  static BuiltSet<OAuthTokenResponseDataTokenTypeEnum> get values =>
      _$oAuthTokenResponseDataTokenTypeEnumValues;
  static OAuthTokenResponseDataTokenTypeEnum valueOf(String name) =>
      _$oAuthTokenResponseDataTokenTypeEnumValueOf(name);
}
