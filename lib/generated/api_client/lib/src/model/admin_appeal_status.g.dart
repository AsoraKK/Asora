// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_appeal_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const AdminAppealStatus _$PENDING = const AdminAppealStatus._('PENDING');
const AdminAppealStatus _$APPROVED = const AdminAppealStatus._('APPROVED');
const AdminAppealStatus _$REJECTED = const AdminAppealStatus._('REJECTED');

AdminAppealStatus _$valueOf(String name) {
  switch (name) {
    case 'PENDING':
      return _$PENDING;
    case 'APPROVED':
      return _$APPROVED;
    case 'REJECTED':
      return _$REJECTED;
    default:
      throw ArgumentError(name);
  }
}

final BuiltSet<AdminAppealStatus> _$values =
    BuiltSet<AdminAppealStatus>(const <AdminAppealStatus>[
  _$PENDING,
  _$APPROVED,
  _$REJECTED,
]);

class _$AdminAppealStatusMeta {
  const _$AdminAppealStatusMeta();
  AdminAppealStatus get PENDING => _$PENDING;
  AdminAppealStatus get APPROVED => _$APPROVED;
  AdminAppealStatus get REJECTED => _$REJECTED;
  AdminAppealStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<AdminAppealStatus> get values => _$values;
}

abstract class _$AdminAppealStatusMixin {
  // ignore: non_constant_identifier_names
  _$AdminAppealStatusMeta get AdminAppealStatus =>
      const _$AdminAppealStatusMeta();
}

Serializer<AdminAppealStatus> _$adminAppealStatusSerializer =
    _$AdminAppealStatusSerializer();

class _$AdminAppealStatusSerializer
    implements PrimitiveSerializer<AdminAppealStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'PENDING': 'PENDING',
    'APPROVED': 'APPROVED',
    'REJECTED': 'REJECTED',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'PENDING': 'PENDING',
    'APPROVED': 'APPROVED',
    'REJECTED': 'REJECTED',
  };

  @override
  final Iterable<Type> types = const <Type>[AdminAppealStatus];
  @override
  final String wireName = 'AdminAppealStatus';

  @override
  Object serialize(Serializers serializers, AdminAppealStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  AdminAppealStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      AdminAppealStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
