//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_appeal_status.g.dart';

class AdminAppealStatus extends EnumClass {

  @BuiltValueEnumConst(wireName: r'PENDING')
  static const AdminAppealStatus PENDING = _$PENDING;
  @BuiltValueEnumConst(wireName: r'APPROVED')
  static const AdminAppealStatus APPROVED = _$APPROVED;
  @BuiltValueEnumConst(wireName: r'REJECTED')
  static const AdminAppealStatus REJECTED = _$REJECTED;

  static Serializer<AdminAppealStatus> get serializer => _$adminAppealStatusSerializer;

  const AdminAppealStatus._(String name): super(name);

  static BuiltSet<AdminAppealStatus> get values => _$values;
  static AdminAppealStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class AdminAppealStatusMixin = Object with _$AdminAppealStatusMixin;

