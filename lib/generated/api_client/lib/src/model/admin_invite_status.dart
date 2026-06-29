//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_invite_status.g.dart';

class AdminInviteStatus extends EnumClass {

  @BuiltValueEnumConst(wireName: r'ACTIVE')
  static const AdminInviteStatus ACTIVE = _$ACTIVE;
  @BuiltValueEnumConst(wireName: r'REVOKED')
  static const AdminInviteStatus REVOKED = _$REVOKED;
  @BuiltValueEnumConst(wireName: r'EXHAUSTED')
  static const AdminInviteStatus EXHAUSTED = _$EXHAUSTED;

  static Serializer<AdminInviteStatus> get serializer => _$adminInviteStatusSerializer;

  const AdminInviteStatus._(String name): super(name);

  static BuiltSet<AdminInviteStatus> get values => _$values;
  static AdminInviteStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class AdminInviteStatusMixin = Object with _$AdminInviteStatusMixin;

