//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'flag_content202_response.g.dart';

/// FlagContent202Response
///
/// Properties:
/// * [flagId] 
/// * [status] 
@BuiltValue()
abstract class FlagContent202Response implements Built<FlagContent202Response, FlagContent202ResponseBuilder> {
  @BuiltValueField(wireName: r'flagId')
  String? get flagId;

  @BuiltValueField(wireName: r'status')
  FlagContent202ResponseStatusEnum? get status;
  // enum statusEnum {  queued,  received,  };

  FlagContent202Response._();

  factory FlagContent202Response([void updates(FlagContent202ResponseBuilder b)]) = _$FlagContent202Response;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(FlagContent202ResponseBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<FlagContent202Response> get serializer => _$FlagContent202ResponseSerializer();
}

class _$FlagContent202ResponseSerializer implements PrimitiveSerializer<FlagContent202Response> {
  @override
  final Iterable<Type> types = const [FlagContent202Response, _$FlagContent202Response];

  @override
  final String wireName = r'FlagContent202Response';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    FlagContent202Response object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.flagId != null) {
      yield r'flagId';
      yield serializers.serialize(
        object.flagId,
        specifiedType: const FullType(String),
      );
    }
    if (object.status != null) {
      yield r'status';
      yield serializers.serialize(
        object.status,
        specifiedType: const FullType(FlagContent202ResponseStatusEnum),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    FlagContent202Response object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required FlagContent202ResponseBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'flagId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.flagId = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(FlagContent202ResponseStatusEnum),
          ) as FlagContent202ResponseStatusEnum;
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
  FlagContent202Response deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = FlagContent202ResponseBuilder();
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

class FlagContent202ResponseStatusEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'queued')
  static const FlagContent202ResponseStatusEnum queued = _$flagContent202ResponseStatusEnum_queued;
  @BuiltValueEnumConst(wireName: r'received')
  static const FlagContent202ResponseStatusEnum received = _$flagContent202ResponseStatusEnum_received;

  static Serializer<FlagContent202ResponseStatusEnum> get serializer => _$flagContent202ResponseStatusEnumSerializer;

  const FlagContent202ResponseStatusEnum._(String name): super(name);

  static BuiltSet<FlagContent202ResponseStatusEnum> get values => _$flagContent202ResponseStatusEnumValues;
  static FlagContent202ResponseStatusEnum valueOf(String name) => _$flagContent202ResponseStatusEnumValueOf(name);
}

