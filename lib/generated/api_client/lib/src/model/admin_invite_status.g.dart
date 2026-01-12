// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_invite_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const AdminInviteStatus _$ACTIVE = const AdminInviteStatus._('ACTIVE');
const AdminInviteStatus _$REVOKED = const AdminInviteStatus._('REVOKED');
const AdminInviteStatus _$EXHAUSTED = const AdminInviteStatus._('EXHAUSTED');

AdminInviteStatus _$valueOf(String name) {
  switch (name) {
    case 'ACTIVE':
      return _$ACTIVE;
    case 'REVOKED':
      return _$REVOKED;
    case 'EXHAUSTED':
      return _$EXHAUSTED;
    default:
      throw ArgumentError(name);
  }
}

final BuiltSet<AdminInviteStatus> _$values =
    BuiltSet<AdminInviteStatus>(const <AdminInviteStatus>[
  _$ACTIVE,
  _$REVOKED,
  _$EXHAUSTED,
]);

class _$AdminInviteStatusMeta {
  const _$AdminInviteStatusMeta();
  AdminInviteStatus get ACTIVE => _$ACTIVE;
  AdminInviteStatus get REVOKED => _$REVOKED;
  AdminInviteStatus get EXHAUSTED => _$EXHAUSTED;
  AdminInviteStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<AdminInviteStatus> get values => _$values;
}

abstract class _$AdminInviteStatusMixin {
  // ignore: non_constant_identifier_names
  _$AdminInviteStatusMeta get AdminInviteStatus =>
      const _$AdminInviteStatusMeta();
}

Serializer<AdminInviteStatus> _$adminInviteStatusSerializer =
    _$AdminInviteStatusSerializer();

class _$AdminInviteStatusSerializer
    implements PrimitiveSerializer<AdminInviteStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'ACTIVE': 'ACTIVE',
    'REVOKED': 'REVOKED',
    'EXHAUSTED': 'EXHAUSTED',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'ACTIVE': 'ACTIVE',
    'REVOKED': 'REVOKED',
    'EXHAUSTED': 'EXHAUSTED',
  };

  @override
  final Iterable<Type> types = const <Type>[AdminInviteStatus];
  @override
  final String wireName = 'AdminInviteStatus';

  @override
  Object serialize(Serializers serializers, AdminInviteStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  AdminInviteStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      AdminInviteStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
