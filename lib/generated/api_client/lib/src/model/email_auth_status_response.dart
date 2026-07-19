//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'email_auth_status_response.g.dart';

/// EmailAuthStatusResponse
///
/// Properties:
/// * [message]
/// * [status]
@BuiltValue()
abstract class EmailAuthStatusResponse implements Built<EmailAuthStatusResponse, EmailAuthStatusResponseBuilder> {
  @BuiltValueField(wireName: r'message')
  String get message;

  @BuiltValueField(wireName: r'status')
  EmailAuthStatusResponseStatusEnum? get status;
  // enum statusEnum {  verified,  already_verified,  };

  EmailAuthStatusResponse._();

  factory EmailAuthStatusResponse([void updates(EmailAuthStatusResponseBuilder b)]) = _$EmailAuthStatusResponse;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(EmailAuthStatusResponseBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<EmailAuthStatusResponse> get serializer => _$EmailAuthStatusResponseSerializer();
}

class _$EmailAuthStatusResponseSerializer implements PrimitiveSerializer<EmailAuthStatusResponse> {
  @override
  final Iterable<Type> types = const [EmailAuthStatusResponse, _$EmailAuthStatusResponse];

  @override
  final String wireName = r'EmailAuthStatusResponse';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    EmailAuthStatusResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'message';
    yield serializers.serialize(
      object.message,
      specifiedType: const FullType(String),
    );
    if (object.status != null) {
      yield r'status';
      yield serializers.serialize(
        object.status,
        specifiedType: const FullType(EmailAuthStatusResponseStatusEnum),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    EmailAuthStatusResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required EmailAuthStatusResponseBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'message':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.message = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(EmailAuthStatusResponseStatusEnum),
          ) as EmailAuthStatusResponseStatusEnum;
          result.status = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  EmailAuthStatusResponse deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = EmailAuthStatusResponseBuilder();
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

class EmailAuthStatusResponseStatusEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'verified')
  static const EmailAuthStatusResponseStatusEnum verified = _$emailAuthStatusResponseStatusEnum_verified;
  @BuiltValueEnumConst(wireName: r'already_verified')
  static const EmailAuthStatusResponseStatusEnum alreadyVerified = _$emailAuthStatusResponseStatusEnum_alreadyVerified;

  static Serializer<EmailAuthStatusResponseStatusEnum> get serializer => _$emailAuthStatusResponseStatusEnumSerializer;

  const EmailAuthStatusResponseStatusEnum._(String name): super(name);

  static BuiltSet<EmailAuthStatusResponseStatusEnum> get values => _$emailAuthStatusResponseStatusEnumValues;
  static EmailAuthStatusResponseStatusEnum valueOf(String name) => _$emailAuthStatusResponseStatusEnumValueOf(name);
}
