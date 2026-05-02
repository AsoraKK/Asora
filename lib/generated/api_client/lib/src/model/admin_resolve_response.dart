//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_resolve_response.g.dart';

/// AdminResolveResponse
///
/// Properties:
/// * [resolved] 
@BuiltValue()
abstract class AdminResolveResponse implements Built<AdminResolveResponse, AdminResolveResponseBuilder> {
  @BuiltValueField(wireName: r'resolved')
  bool? get resolved;

  AdminResolveResponse._();

  factory AdminResolveResponse([void updates(AdminResolveResponseBuilder b)]) = _$AdminResolveResponse;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminResolveResponseBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminResolveResponse> get serializer => _$AdminResolveResponseSerializer();
}

class _$AdminResolveResponseSerializer implements PrimitiveSerializer<AdminResolveResponse> {
  @override
  final Iterable<Type> types = const [AdminResolveResponse, _$AdminResolveResponse];

  @override
  final String wireName = r'AdminResolveResponse';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminResolveResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.resolved != null) {
      yield r'resolved';
      yield serializers.serialize(
        object.resolved,
        specifiedType: const FullType(bool),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminResolveResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminResolveResponseBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'resolved':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.resolved = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AdminResolveResponse deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminResolveResponseBuilder();
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

