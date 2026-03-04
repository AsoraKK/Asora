// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_user_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const AdminUserStatus _$ACTIVE = const AdminUserStatus._('ACTIVE');
const AdminUserStatus _$DISABLED = const AdminUserStatus._('DISABLED');

AdminUserStatus _$valueOf(String name) {
  switch (name) {
    case 'ACTIVE':
      return _$ACTIVE;
    case 'DISABLED':
      return _$DISABLED;
    default:
      throw ArgumentError(name);
  }
}

final BuiltSet<AdminUserStatus> _$values =
    BuiltSet<AdminUserStatus>(const <AdminUserStatus>[
  _$ACTIVE,
  _$DISABLED,
]);

class _$AdminUserStatusMeta {
  const _$AdminUserStatusMeta();
  AdminUserStatus get ACTIVE => _$ACTIVE;
  AdminUserStatus get DISABLED => _$DISABLED;
  AdminUserStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<AdminUserStatus> get values => _$values;
}

abstract class _$AdminUserStatusMixin {
  // ignore: non_constant_identifier_names
  _$AdminUserStatusMeta get AdminUserStatus => const _$AdminUserStatusMeta();
}

Serializer<AdminUserStatus> _$adminUserStatusSerializer =
    _$AdminUserStatusSerializer();

class _$AdminUserStatusSerializer
    implements PrimitiveSerializer<AdminUserStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'ACTIVE': 'ACTIVE',
    'DISABLED': 'DISABLED',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'ACTIVE': 'ACTIVE',
    'DISABLED': 'DISABLED',
  };

  @override
  final Iterable<Type> types = const <Type>[AdminUserStatus];
  @override
  final String wireName = 'AdminUserStatus';

  @override
  Object serialize(Serializers serializers, AdminUserStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  AdminUserStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      AdminUserStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
