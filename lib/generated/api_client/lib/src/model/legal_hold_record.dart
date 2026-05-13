//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'legal_hold_record.g.dart';

/// LegalHoldRecord
///
/// Properties:
/// * [id] 
/// * [scope] 
/// * [scopeId] 
/// * [reason] 
@BuiltValue()
abstract class LegalHoldRecord implements Built<LegalHoldRecord, LegalHoldRecordBuilder> {
  @BuiltValueField(wireName: r'id')
  String? get id;

  @BuiltValueField(wireName: r'scope')
  String? get scope;

  @BuiltValueField(wireName: r'scopeId')
  String? get scopeId;

  @BuiltValueField(wireName: r'reason')
  String? get reason;

  LegalHoldRecord._();

  factory LegalHoldRecord([void updates(LegalHoldRecordBuilder b)]) = _$LegalHoldRecord;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(LegalHoldRecordBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<LegalHoldRecord> get serializer => _$LegalHoldRecordSerializer();
}

class _$LegalHoldRecordSerializer implements PrimitiveSerializer<LegalHoldRecord> {
  @override
  final Iterable<Type> types = const [LegalHoldRecord, _$LegalHoldRecord];

  @override
  final String wireName = r'LegalHoldRecord';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    LegalHoldRecord object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.id != null) {
      yield r'id';
      yield serializers.serialize(
        object.id,
        specifiedType: const FullType(String),
      );
    }
    if (object.scope != null) {
      yield r'scope';
      yield serializers.serialize(
        object.scope,
        specifiedType: const FullType(String),
      );
    }
    if (object.scopeId != null) {
      yield r'scopeId';
      yield serializers.serialize(
        object.scopeId,
        specifiedType: const FullType(String),
      );
    }
    if (object.reason != null) {
      yield r'reason';
      yield serializers.serialize(
        object.reason,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    LegalHoldRecord object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required LegalHoldRecordBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'id':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.id = valueDes;
          break;
        case r'scope':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.scope = valueDes;
          break;
        case r'scopeId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.scopeId = valueDes;
          break;
        case r'reason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.reason = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  LegalHoldRecord deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = LegalHoldRecordBuilder();
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

