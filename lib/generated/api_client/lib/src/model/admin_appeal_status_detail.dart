//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_appeal_status_detail.g.dart';

class AdminAppealStatusDetail extends EnumClass {

  @BuiltValueEnumConst(wireName: r'pending')
  static const AdminAppealStatusDetail pending = _$pending;
  @BuiltValueEnumConst(wireName: r'approved')
  static const AdminAppealStatusDetail approved = _$approved;
  @BuiltValueEnumConst(wireName: r'rejected')
  static const AdminAppealStatusDetail rejected = _$rejected;
  @BuiltValueEnumConst(wireName: r'overridden')
  static const AdminAppealStatusDetail overridden = _$overridden;

  static Serializer<AdminAppealStatusDetail> get serializer => _$adminAppealStatusDetailSerializer;

  const AdminAppealStatusDetail._(String name): super(name);

  static BuiltSet<AdminAppealStatusDetail> get values => _$values;
  static AdminAppealStatusDetail valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class AdminAppealStatusDetailMixin = Object with _$AdminAppealStatusDetailMixin;

