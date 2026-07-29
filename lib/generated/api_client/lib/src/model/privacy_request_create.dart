//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'privacy_request_create.g.dart';

/// An asynchronous privacy request submitted by the authenticated subject.
///
/// Properties:
/// * [requestType]
@BuiltValue()
abstract class PrivacyRequestCreate implements Built<PrivacyRequestCreate, PrivacyRequestCreateBuilder> {
  @BuiltValueField(wireName: r'requestType')
  PrivacyRequestCreateRequestTypeEnum get requestType;
  // enum requestTypeEnum {  export,  delete,  rectify,  };

  PrivacyRequestCreate._();

  factory PrivacyRequestCreate([void updates(PrivacyRequestCreateBuilder b)]) = _$PrivacyRequestCreate;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PrivacyRequestCreateBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<PrivacyRequestCreate> get serializer => _$PrivacyRequestCreateSerializer();
}

class _$PrivacyRequestCreateSerializer implements PrimitiveSerializer<PrivacyRequestCreate> {
  @override
  final Iterable<Type> types = const [PrivacyRequestCreate, _$PrivacyRequestCreate];

  @override
  final String wireName = r'PrivacyRequestCreate';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PrivacyRequestCreate object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'requestType';
    yield serializers.serialize(
      object.requestType,
      specifiedType: const FullType(PrivacyRequestCreateRequestTypeEnum),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    PrivacyRequestCreate object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required PrivacyRequestCreateBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'requestType':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PrivacyRequestCreateRequestTypeEnum),
          ) as PrivacyRequestCreateRequestTypeEnum;
          result.requestType = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  PrivacyRequestCreate deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PrivacyRequestCreateBuilder();
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

class PrivacyRequestCreateRequestTypeEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'export')
  static const PrivacyRequestCreateRequestTypeEnum export_ = _$privacyRequestCreateRequestTypeEnum_export_;
  @BuiltValueEnumConst(wireName: r'delete')
  static const PrivacyRequestCreateRequestTypeEnum delete = _$privacyRequestCreateRequestTypeEnum_delete;
  @BuiltValueEnumConst(wireName: r'rectify')
  static const PrivacyRequestCreateRequestTypeEnum rectify = _$privacyRequestCreateRequestTypeEnum_rectify;

  static Serializer<PrivacyRequestCreateRequestTypeEnum> get serializer => _$privacyRequestCreateRequestTypeEnumSerializer;

  const PrivacyRequestCreateRequestTypeEnum._(String name): super(name);

  static BuiltSet<PrivacyRequestCreateRequestTypeEnum> get values => _$privacyRequestCreateRequestTypeEnumValues;
  static PrivacyRequestCreateRequestTypeEnum valueOf(String name) => _$privacyRequestCreateRequestTypeEnumValueOf(name);
}
