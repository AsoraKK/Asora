//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'user_info_response_data.g.dart';

/// UserInfoResponseData
///
/// Properties:
/// * [sub] - Subject identifier (user ID)
/// * [email]
/// * [displayName]
/// * [handle]
/// * [tier]
/// * [roles]
/// * [avatarUrl]
@BuiltValue()
abstract class UserInfoResponseData
    implements Built<UserInfoResponseData, UserInfoResponseDataBuilder> {
  /// Subject identifier (user ID)
  @BuiltValueField(wireName: r'sub')
  String get sub;

  @BuiltValueField(wireName: r'email')
  String? get email;

  @BuiltValueField(wireName: r'displayName')
  String? get displayName;

  @BuiltValueField(wireName: r'handle')
  String? get handle;

  @BuiltValueField(wireName: r'tier')
  UserInfoResponseDataTierEnum? get tier;
  // enum tierEnum {  free,  creator,  premium,  enterprise,  };

  @BuiltValueField(wireName: r'roles')
  BuiltList<String>? get roles;

  @BuiltValueField(wireName: r'avatarUrl')
  String? get avatarUrl;

  UserInfoResponseData._();

  factory UserInfoResponseData([void updates(UserInfoResponseDataBuilder b)]) =
      _$UserInfoResponseData;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(UserInfoResponseDataBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<UserInfoResponseData> get serializer =>
      _$UserInfoResponseDataSerializer();
}

class _$UserInfoResponseDataSerializer
    implements PrimitiveSerializer<UserInfoResponseData> {
  @override
  final Iterable<Type> types = const [
    UserInfoResponseData,
    _$UserInfoResponseData
  ];

  @override
  final String wireName = r'UserInfoResponseData';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    UserInfoResponseData object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'sub';
    yield serializers.serialize(
      object.sub,
      specifiedType: const FullType(String),
    );
    if (object.email != null) {
      yield r'email';
      yield serializers.serialize(
        object.email,
        specifiedType: const FullType(String),
      );
    }
    if (object.displayName != null) {
      yield r'displayName';
      yield serializers.serialize(
        object.displayName,
        specifiedType: const FullType(String),
      );
    }
    if (object.handle != null) {
      yield r'handle';
      yield serializers.serialize(
        object.handle,
        specifiedType: const FullType(String),
      );
    }
    if (object.tier != null) {
      yield r'tier';
      yield serializers.serialize(
        object.tier,
        specifiedType: const FullType(UserInfoResponseDataTierEnum),
      );
    }
    if (object.roles != null) {
      yield r'roles';
      yield serializers.serialize(
        object.roles,
        specifiedType: const FullType(BuiltList, [FullType(String)]),
      );
    }
    if (object.avatarUrl != null) {
      yield r'avatarUrl';
      yield serializers.serialize(
        object.avatarUrl,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    UserInfoResponseData object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object,
            specifiedType: specifiedType)
        .toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required UserInfoResponseDataBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'sub':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.sub = valueDes;
          break;
        case r'email':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.email = valueDes;
          break;
        case r'displayName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.displayName = valueDes;
          break;
        case r'handle':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.handle = valueDes;
          break;
        case r'tier':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(UserInfoResponseDataTierEnum),
          ) as UserInfoResponseDataTierEnum;
          result.tier = valueDes;
          break;
        case r'roles':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(String)]),
          ) as BuiltList<String>;
          result.roles.replace(valueDes);
          break;
        case r'avatarUrl':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.avatarUrl = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  UserInfoResponseData deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = UserInfoResponseDataBuilder();
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

class UserInfoResponseDataTierEnum extends EnumClass {
  @BuiltValueEnumConst(wireName: r'free')
  static const UserInfoResponseDataTierEnum free =
      _$userInfoResponseDataTierEnum_free;
  @BuiltValueEnumConst(wireName: r'creator')
  static const UserInfoResponseDataTierEnum creator =
      _$userInfoResponseDataTierEnum_creator;
  @BuiltValueEnumConst(wireName: r'premium')
  static const UserInfoResponseDataTierEnum premium =
      _$userInfoResponseDataTierEnum_premium;
  @BuiltValueEnumConst(wireName: r'enterprise')
  static const UserInfoResponseDataTierEnum enterprise =
      _$userInfoResponseDataTierEnum_enterprise;

  static Serializer<UserInfoResponseDataTierEnum> get serializer =>
      _$userInfoResponseDataTierEnumSerializer;

  const UserInfoResponseDataTierEnum._(String name) : super(name);

  static BuiltSet<UserInfoResponseDataTierEnum> get values =>
      _$userInfoResponseDataTierEnumValues;
  static UserInfoResponseDataTierEnum valueOf(String name) =>
      _$userInfoResponseDataTierEnumValueOf(name);
}
