//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'legal_hold_input.g.dart';

/// LegalHoldInput
///
/// Properties:
/// * [scope] 
/// * [scopeId] 
/// * [reason] 
@BuiltValue()
abstract class LegalHoldInput implements Built<LegalHoldInput, LegalHoldInputBuilder> {
  @BuiltValueField(wireName: r'scope')
  LegalHoldInputScopeEnum get scope;
  // enum scopeEnum {  user,  post,  case,  };

  @BuiltValueField(wireName: r'scopeId')
  String get scopeId;

  @BuiltValueField(wireName: r'reason')
  String get reason;

  LegalHoldInput._();

  factory LegalHoldInput([void updates(LegalHoldInputBuilder b)]) = _$LegalHoldInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(LegalHoldInputBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<LegalHoldInput> get serializer => _$LegalHoldInputSerializer();
}

class _$LegalHoldInputSerializer implements PrimitiveSerializer<LegalHoldInput> {
  @override
  final Iterable<Type> types = const [LegalHoldInput, _$LegalHoldInput];

  @override
  final String wireName = r'LegalHoldInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    LegalHoldInput object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'scope';
    yield serializers.serialize(
      object.scope,
      specifiedType: const FullType(LegalHoldInputScopeEnum),
    );
    yield r'scopeId';
    yield serializers.serialize(
      object.scopeId,
      specifiedType: const FullType(String),
    );
    yield r'reason';
    yield serializers.serialize(
      object.reason,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    LegalHoldInput object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required LegalHoldInputBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'scope':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(LegalHoldInputScopeEnum),
          ) as LegalHoldInputScopeEnum;
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
  LegalHoldInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = LegalHoldInputBuilder();
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

class LegalHoldInputScopeEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'user')
  static const LegalHoldInputScopeEnum user = _$legalHoldInputScopeEnum_user;
  @BuiltValueEnumConst(wireName: r'post')
  static const LegalHoldInputScopeEnum post = _$legalHoldInputScopeEnum_post;
  @BuiltValueEnumConst(wireName: r'case')
  static const LegalHoldInputScopeEnum case_ = _$legalHoldInputScopeEnum_case_;

  static Serializer<LegalHoldInputScopeEnum> get serializer => _$legalHoldInputScopeEnumSerializer;

  const LegalHoldInputScopeEnum._(String name): super(name);

  static BuiltSet<LegalHoldInputScopeEnum> get values => _$legalHoldInputScopeEnumValues;
  static LegalHoldInputScopeEnum valueOf(String name) => _$legalHoldInputScopeEnumValueOf(name);
}

