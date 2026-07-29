//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'privacy_request.g.dart';

/// Current state of an asynchronous privacy request.
///
/// Properties:
/// * [requestId]
/// * [requestType]
/// * [state]
/// * [acceptedAt]
/// * [completedAt]
@BuiltValue(instantiable: false)
abstract class PrivacyRequest  {
  @BuiltValueField(wireName: r'requestId')
  String get requestId;

  @BuiltValueField(wireName: r'requestType')
  PrivacyRequestRequestTypeEnum get requestType;
  // enum requestTypeEnum {  export,  delete,  rectify,  };

  @BuiltValueField(wireName: r'state')
  PrivacyRequestStateEnum get state;
  // enum stateEnum {  received,  processing,  blocked,  completed,  failed,  };

  @BuiltValueField(wireName: r'acceptedAt')
  DateTime get acceptedAt;

  @BuiltValueField(wireName: r'completedAt')
  DateTime? get completedAt;

  @BuiltValueSerializer(custom: true)
  static Serializer<PrivacyRequest> get serializer => _$PrivacyRequestSerializer();
}

class _$PrivacyRequestSerializer implements PrimitiveSerializer<PrivacyRequest> {
  @override
  final Iterable<Type> types = const [PrivacyRequest];

  @override
  final String wireName = r'PrivacyRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PrivacyRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'requestId';
    yield serializers.serialize(
      object.requestId,
      specifiedType: const FullType(String),
    );
    yield r'requestType';
    yield serializers.serialize(
      object.requestType,
      specifiedType: const FullType(PrivacyRequestRequestTypeEnum),
    );
    yield r'state';
    yield serializers.serialize(
      object.state,
      specifiedType: const FullType(PrivacyRequestStateEnum),
    );
    yield r'acceptedAt';
    yield serializers.serialize(
      object.acceptedAt,
      specifiedType: const FullType(DateTime),
    );
    if (object.completedAt != null) {
      yield r'completedAt';
      yield serializers.serialize(
        object.completedAt,
        specifiedType: const FullType.nullable(DateTime),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    PrivacyRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  @override
  PrivacyRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return serializers.deserialize(serialized, specifiedType: FullType($PrivacyRequest)) as $PrivacyRequest;
  }
}

/// a concrete implementation of [PrivacyRequest], since [PrivacyRequest] is not instantiable
@BuiltValue(instantiable: true)
abstract class $PrivacyRequest implements PrivacyRequest, Built<$PrivacyRequest, $PrivacyRequestBuilder> {
  $PrivacyRequest._();

  factory $PrivacyRequest([void Function($PrivacyRequestBuilder)? updates]) = _$$PrivacyRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults($PrivacyRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<$PrivacyRequest> get serializer => _$$PrivacyRequestSerializer();
}

class _$$PrivacyRequestSerializer implements PrimitiveSerializer<$PrivacyRequest> {
  @override
  final Iterable<Type> types = const [$PrivacyRequest, _$$PrivacyRequest];

  @override
  final String wireName = r'$PrivacyRequest';

  @override
  Object serialize(
    Serializers serializers,
    $PrivacyRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return serializers.serialize(object, specifiedType: FullType(PrivacyRequest))!;
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required PrivacyRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'requestId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.requestId = valueDes;
          break;
        case r'requestType':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PrivacyRequestRequestTypeEnum),
          ) as PrivacyRequestRequestTypeEnum;
          result.requestType = valueDes;
          break;
        case r'state':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PrivacyRequestStateEnum),
          ) as PrivacyRequestStateEnum;
          result.state = valueDes;
          break;
        case r'acceptedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.acceptedAt = valueDes;
          break;
        case r'completedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.completedAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  $PrivacyRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = $PrivacyRequestBuilder();
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

class PrivacyRequestRequestTypeEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'export')
  static const PrivacyRequestRequestTypeEnum export_ = _$privacyRequestRequestTypeEnum_export_;
  @BuiltValueEnumConst(wireName: r'delete')
  static const PrivacyRequestRequestTypeEnum delete = _$privacyRequestRequestTypeEnum_delete;
  @BuiltValueEnumConst(wireName: r'rectify')
  static const PrivacyRequestRequestTypeEnum rectify = _$privacyRequestRequestTypeEnum_rectify;

  static Serializer<PrivacyRequestRequestTypeEnum> get serializer => _$privacyRequestRequestTypeEnumSerializer;

  const PrivacyRequestRequestTypeEnum._(String name): super(name);

  static BuiltSet<PrivacyRequestRequestTypeEnum> get values => _$privacyRequestRequestTypeEnumValues;
  static PrivacyRequestRequestTypeEnum valueOf(String name) => _$privacyRequestRequestTypeEnumValueOf(name);
}

class PrivacyRequestStateEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'received')
  static const PrivacyRequestStateEnum received = _$privacyRequestStateEnum_received;
  @BuiltValueEnumConst(wireName: r'processing')
  static const PrivacyRequestStateEnum processing = _$privacyRequestStateEnum_processing;
  @BuiltValueEnumConst(wireName: r'blocked')
  static const PrivacyRequestStateEnum blocked = _$privacyRequestStateEnum_blocked;
  @BuiltValueEnumConst(wireName: r'completed')
  static const PrivacyRequestStateEnum completed = _$privacyRequestStateEnum_completed;
  @BuiltValueEnumConst(wireName: r'failed')
  static const PrivacyRequestStateEnum failed = _$privacyRequestStateEnum_failed;

  static Serializer<PrivacyRequestStateEnum> get serializer => _$privacyRequestStateEnumSerializer;

  const PrivacyRequestStateEnum._(String name): super(name);

  static BuiltSet<PrivacyRequestStateEnum> get values => _$privacyRequestStateEnumValues;
  static PrivacyRequestStateEnum valueOf(String name) => _$privacyRequestStateEnumValueOf(name);
}
