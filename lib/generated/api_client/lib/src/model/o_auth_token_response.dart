//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:asora_api_client/src/model/o_auth_token_response_data.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'o_auth_token_response.g.dart';

/// OAuth 2.0 token response envelope (success wrapped).
///
/// Properties:
/// * [success] 
/// * [data] 
/// * [timestamp] 
@BuiltValue()
abstract class OAuthTokenResponse implements Built<OAuthTokenResponse, OAuthTokenResponseBuilder> {
  @BuiltValueField(wireName: r'success')
  bool get success;

  @BuiltValueField(wireName: r'data')
  OAuthTokenResponseData get data;

  @BuiltValueField(wireName: r'timestamp')
  DateTime get timestamp;

  OAuthTokenResponse._();

  factory OAuthTokenResponse([void updates(OAuthTokenResponseBuilder b)]) = _$OAuthTokenResponse;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(OAuthTokenResponseBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<OAuthTokenResponse> get serializer => _$OAuthTokenResponseSerializer();
}

class _$OAuthTokenResponseSerializer implements PrimitiveSerializer<OAuthTokenResponse> {
  @override
  final Iterable<Type> types = const [OAuthTokenResponse, _$OAuthTokenResponse];

  @override
  final String wireName = r'OAuthTokenResponse';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    OAuthTokenResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'success';
    yield serializers.serialize(
      object.success,
      specifiedType: const FullType(bool),
    );
    yield r'data';
    yield serializers.serialize(
      object.data,
      specifiedType: const FullType(OAuthTokenResponseData),
    );
    yield r'timestamp';
    yield serializers.serialize(
      object.timestamp,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    OAuthTokenResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required OAuthTokenResponseBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'success':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.success = valueDes;
          break;
        case r'data':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(OAuthTokenResponseData),
          ) as OAuthTokenResponseData;
          result.data.replace(valueDes);
          break;
        case r'timestamp':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.timestamp = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  OAuthTokenResponse deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = OAuthTokenResponseBuilder();
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

