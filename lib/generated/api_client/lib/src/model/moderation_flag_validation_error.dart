//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/json_object.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'moderation_flag_validation_error.g.dart';

/// Validation response returned by the moderation flag handler.
///
/// Properties:
/// * [error]
/// * [details]
@BuiltValue()
abstract class ModerationFlagValidationError implements Built<ModerationFlagValidationError, ModerationFlagValidationErrorBuilder> {
  @BuiltValueField(wireName: r'error')
  String get error;

  @BuiltValueField(wireName: r'details')
  BuiltList<BuiltMap<String, JsonObject?>> get details;

  ModerationFlagValidationError._();

  factory ModerationFlagValidationError([void updates(ModerationFlagValidationErrorBuilder b)]) = _$ModerationFlagValidationError;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ModerationFlagValidationErrorBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ModerationFlagValidationError> get serializer => _$ModerationFlagValidationErrorSerializer();
}

class _$ModerationFlagValidationErrorSerializer implements PrimitiveSerializer<ModerationFlagValidationError> {
  @override
  final Iterable<Type> types = const [ModerationFlagValidationError, _$ModerationFlagValidationError];

  @override
  final String wireName = r'ModerationFlagValidationError';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ModerationFlagValidationError object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'error';
    yield serializers.serialize(
      object.error,
      specifiedType: const FullType(String),
    );
    yield r'details';
    yield serializers.serialize(
      object.details,
      specifiedType: const FullType(BuiltList, [FullType(BuiltMap, [FullType(String), FullType.nullable(JsonObject)])]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    ModerationFlagValidationError object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required ModerationFlagValidationErrorBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'error':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.error = valueDes;
          break;
        case r'details':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(BuiltMap, [FullType(String), FullType.nullable(JsonObject)])]),
          ) as BuiltList<BuiltMap<String, JsonObject?>>;
          result.details.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  ModerationFlagValidationError deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ModerationFlagValidationErrorBuilder();
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
