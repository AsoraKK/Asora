//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'email_only_request.g.dart';

/// EmailOnlyRequest
///
/// Properties:
/// * [email]
@BuiltValue(instantiable: false)
abstract class EmailOnlyRequest  {
  @BuiltValueField(wireName: r'email')
  String get email;

  @BuiltValueSerializer(custom: true)
  static Serializer<EmailOnlyRequest> get serializer => _$EmailOnlyRequestSerializer();
}

class _$EmailOnlyRequestSerializer implements PrimitiveSerializer<EmailOnlyRequest> {
  @override
  final Iterable<Type> types = const [EmailOnlyRequest];

  @override
  final String wireName = r'EmailOnlyRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    EmailOnlyRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'email';
    yield serializers.serialize(
      object.email,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    EmailOnlyRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  @override
  EmailOnlyRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return serializers.deserialize(serialized, specifiedType: FullType($EmailOnlyRequest)) as $EmailOnlyRequest;
  }
}

/// a concrete implementation of [EmailOnlyRequest], since [EmailOnlyRequest] is not instantiable
@BuiltValue(instantiable: true)
abstract class $EmailOnlyRequest implements EmailOnlyRequest, Built<$EmailOnlyRequest, $EmailOnlyRequestBuilder> {
  $EmailOnlyRequest._();

  factory $EmailOnlyRequest([void Function($EmailOnlyRequestBuilder)? updates]) = _$$EmailOnlyRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults($EmailOnlyRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<$EmailOnlyRequest> get serializer => _$$EmailOnlyRequestSerializer();
}

class _$$EmailOnlyRequestSerializer implements PrimitiveSerializer<$EmailOnlyRequest> {
  @override
  final Iterable<Type> types = const [$EmailOnlyRequest, _$$EmailOnlyRequest];

  @override
  final String wireName = r'$EmailOnlyRequest';

  @override
  Object serialize(
    Serializers serializers,
    $EmailOnlyRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return serializers.serialize(object, specifiedType: FullType(EmailOnlyRequest))!;
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required EmailOnlyRequestBuilder result,
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
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  $EmailOnlyRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = $EmailOnlyRequestBuilder();
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
