//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_test_data_purge_request.g.dart';

/// AdminTestDataPurgeRequest
///
/// Properties:
/// * [sessionId] 
/// * [purgeExpired] 
@BuiltValue()
abstract class AdminTestDataPurgeRequest implements Built<AdminTestDataPurgeRequest, AdminTestDataPurgeRequestBuilder> {
  @BuiltValueField(wireName: r'sessionId')
  String? get sessionId;

  @BuiltValueField(wireName: r'purgeExpired')
  bool? get purgeExpired;

  AdminTestDataPurgeRequest._();

  factory AdminTestDataPurgeRequest([void updates(AdminTestDataPurgeRequestBuilder b)]) = _$AdminTestDataPurgeRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminTestDataPurgeRequestBuilder b) => b
      ..purgeExpired = false;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminTestDataPurgeRequest> get serializer => _$AdminTestDataPurgeRequestSerializer();
}

class _$AdminTestDataPurgeRequestSerializer implements PrimitiveSerializer<AdminTestDataPurgeRequest> {
  @override
  final Iterable<Type> types = const [AdminTestDataPurgeRequest, _$AdminTestDataPurgeRequest];

  @override
  final String wireName = r'AdminTestDataPurgeRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminTestDataPurgeRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.sessionId != null) {
      yield r'sessionId';
      yield serializers.serialize(
        object.sessionId,
        specifiedType: const FullType(String),
      );
    }
    if (object.purgeExpired != null) {
      yield r'purgeExpired';
      yield serializers.serialize(
        object.purgeExpired,
        specifiedType: const FullType(bool),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminTestDataPurgeRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminTestDataPurgeRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'sessionId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.sessionId = valueDes;
          break;
        case r'purgeExpired':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.purgeExpired = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AdminTestDataPurgeRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminTestDataPurgeRequestBuilder();
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

