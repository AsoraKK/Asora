//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'appeal_created_response_appeal.g.dart';

/// AppealCreatedResponseAppeal
///
/// Properties:
/// * [id] - Generated appeal identifier
/// * [caseId] - Linked moderation case
/// * [status] 
/// * [createdAt] 
@BuiltValue()
abstract class AppealCreatedResponseAppeal implements Built<AppealCreatedResponseAppeal, AppealCreatedResponseAppealBuilder> {
  /// Generated appeal identifier
  @BuiltValueField(wireName: r'id')
  String get id;

  /// Linked moderation case
  @BuiltValueField(wireName: r'caseId')
  String get caseId;

  @BuiltValueField(wireName: r'status')
  AppealCreatedResponseAppealStatusEnum get status;
  // enum statusEnum {  pending,  };

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  AppealCreatedResponseAppeal._();

  factory AppealCreatedResponseAppeal([void updates(AppealCreatedResponseAppealBuilder b)]) = _$AppealCreatedResponseAppeal;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AppealCreatedResponseAppealBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AppealCreatedResponseAppeal> get serializer => _$AppealCreatedResponseAppealSerializer();
}

class _$AppealCreatedResponseAppealSerializer implements PrimitiveSerializer<AppealCreatedResponseAppeal> {
  @override
  final Iterable<Type> types = const [AppealCreatedResponseAppeal, _$AppealCreatedResponseAppeal];

  @override
  final String wireName = r'AppealCreatedResponseAppeal';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AppealCreatedResponseAppeal object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'caseId';
    yield serializers.serialize(
      object.caseId,
      specifiedType: const FullType(String),
    );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(AppealCreatedResponseAppealStatusEnum),
    );
    yield r'createdAt';
    yield serializers.serialize(
      object.createdAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    AppealCreatedResponseAppeal object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AppealCreatedResponseAppealBuilder result,
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
        case r'caseId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.caseId = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(AppealCreatedResponseAppealStatusEnum),
          ) as AppealCreatedResponseAppealStatusEnum;
          result.status = valueDes;
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.createdAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AppealCreatedResponseAppeal deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AppealCreatedResponseAppealBuilder();
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

class AppealCreatedResponseAppealStatusEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'pending')
  static const AppealCreatedResponseAppealStatusEnum pending = _$appealCreatedResponseAppealStatusEnum_pending;

  static Serializer<AppealCreatedResponseAppealStatusEnum> get serializer => _$appealCreatedResponseAppealStatusEnumSerializer;

  const AppealCreatedResponseAppealStatusEnum._(String name): super(name);

  static BuiltSet<AppealCreatedResponseAppealStatusEnum> get values => _$appealCreatedResponseAppealStatusEnumValues;
  static AppealCreatedResponseAppealStatusEnum valueOf(String name) => _$appealCreatedResponseAppealStatusEnumValueOf(name);
}

