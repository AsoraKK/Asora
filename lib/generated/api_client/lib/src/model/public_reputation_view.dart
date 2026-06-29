//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'public_reputation_view.g.dart';

/// PublicReputationView
///
/// Properties:
/// * [userId] 
/// * [reputationLevel] 
/// * [reputationStatus] 
/// * [reputationBand] 
/// * [levelName] 
@BuiltValue()
abstract class PublicReputationView implements Built<PublicReputationView, PublicReputationViewBuilder> {
  @BuiltValueField(wireName: r'userId')
  String get userId;

  @BuiltValueField(wireName: r'reputationLevel')
  int get reputationLevel;

  @BuiltValueField(wireName: r'reputationStatus')
  PublicReputationViewReputationStatusEnum get reputationStatus;
  // enum reputationStatusEnum {  standard,  editorial,  };

  @BuiltValueField(wireName: r'reputationBand')
  String get reputationBand;

  @BuiltValueField(wireName: r'levelName')
  String get levelName;

  PublicReputationView._();

  factory PublicReputationView([void updates(PublicReputationViewBuilder b)]) = _$PublicReputationView;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PublicReputationViewBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<PublicReputationView> get serializer => _$PublicReputationViewSerializer();
}

class _$PublicReputationViewSerializer implements PrimitiveSerializer<PublicReputationView> {
  @override
  final Iterable<Type> types = const [PublicReputationView, _$PublicReputationView];

  @override
  final String wireName = r'PublicReputationView';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PublicReputationView object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'userId';
    yield serializers.serialize(
      object.userId,
      specifiedType: const FullType(String),
    );
    yield r'reputationLevel';
    yield serializers.serialize(
      object.reputationLevel,
      specifiedType: const FullType(int),
    );
    yield r'reputationStatus';
    yield serializers.serialize(
      object.reputationStatus,
      specifiedType: const FullType(PublicReputationViewReputationStatusEnum),
    );
    yield r'reputationBand';
    yield serializers.serialize(
      object.reputationBand,
      specifiedType: const FullType(String),
    );
    yield r'levelName';
    yield serializers.serialize(
      object.levelName,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    PublicReputationView object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required PublicReputationViewBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'userId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.userId = valueDes;
          break;
        case r'reputationLevel':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.reputationLevel = valueDes;
          break;
        case r'reputationStatus':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PublicReputationViewReputationStatusEnum),
          ) as PublicReputationViewReputationStatusEnum;
          result.reputationStatus = valueDes;
          break;
        case r'reputationBand':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.reputationBand = valueDes;
          break;
        case r'levelName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.levelName = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  PublicReputationView deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PublicReputationViewBuilder();
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

class PublicReputationViewReputationStatusEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'standard')
  static const PublicReputationViewReputationStatusEnum standard = _$publicReputationViewReputationStatusEnum_standard;
  @BuiltValueEnumConst(wireName: r'editorial')
  static const PublicReputationViewReputationStatusEnum editorial = _$publicReputationViewReputationStatusEnum_editorial;

  static Serializer<PublicReputationViewReputationStatusEnum> get serializer => _$publicReputationViewReputationStatusEnumSerializer;

  const PublicReputationViewReputationStatusEnum._(String name): super(name);

  static BuiltSet<PublicReputationViewReputationStatusEnum> get values => _$publicReputationViewReputationStatusEnumValues;
  static PublicReputationViewReputationStatusEnum valueOf(String name) => _$publicReputationViewReputationStatusEnumValueOf(name);
}

