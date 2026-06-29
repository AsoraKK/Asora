//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_test_data_purge200_response.g.dart';

/// AdminTestDataPurge200Response
///
/// Properties:
/// * [success]
/// * [deletedCount]
/// * [expiredCount]
/// * [errors]
/// * [durationMs]
@BuiltValue()
abstract class AdminTestDataPurge200Response implements Built<AdminTestDataPurge200Response, AdminTestDataPurge200ResponseBuilder> {
  @BuiltValueField(wireName: r'success')
  bool? get success;

  @BuiltValueField(wireName: r'deletedCount')
  int? get deletedCount;

  @BuiltValueField(wireName: r'expiredCount')
  int? get expiredCount;

  @BuiltValueField(wireName: r'errors')
  BuiltList<String>? get errors;

  @BuiltValueField(wireName: r'durationMs')
  int? get durationMs;

  AdminTestDataPurge200Response._();

  factory AdminTestDataPurge200Response([void updates(AdminTestDataPurge200ResponseBuilder b)]) = _$AdminTestDataPurge200Response;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminTestDataPurge200ResponseBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminTestDataPurge200Response> get serializer => _$AdminTestDataPurge200ResponseSerializer();
}

class _$AdminTestDataPurge200ResponseSerializer implements PrimitiveSerializer<AdminTestDataPurge200Response> {
  @override
  final Iterable<Type> types = const [AdminTestDataPurge200Response, _$AdminTestDataPurge200Response];

  @override
  final String wireName = r'AdminTestDataPurge200Response';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminTestDataPurge200Response object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.success != null) {
      yield r'success';
      yield serializers.serialize(
        object.success,
        specifiedType: const FullType(bool),
      );
    }
    if (object.deletedCount != null) {
      yield r'deletedCount';
      yield serializers.serialize(
        object.deletedCount,
        specifiedType: const FullType(int),
      );
    }
    if (object.expiredCount != null) {
      yield r'expiredCount';
      yield serializers.serialize(
        object.expiredCount,
        specifiedType: const FullType(int),
      );
    }
    if (object.errors != null) {
      yield r'errors';
      yield serializers.serialize(
        object.errors,
        specifiedType: const FullType(BuiltList, [FullType(String)]),
      );
    }
    if (object.durationMs != null) {
      yield r'durationMs';
      yield serializers.serialize(
        object.durationMs,
        specifiedType: const FullType(int),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminTestDataPurge200Response object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminTestDataPurge200ResponseBuilder result,
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
        case r'deletedCount':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.deletedCount = valueDes;
          break;
        case r'expiredCount':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.expiredCount = valueDes;
          break;
        case r'errors':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(String)]),
          ) as BuiltList<String>;
          result.errors.replace(valueDes);
          break;
        case r'durationMs':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.durationMs = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AdminTestDataPurge200Response deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminTestDataPurge200ResponseBuilder();
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
