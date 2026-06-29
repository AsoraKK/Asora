//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_appeal_target_type.g.dart';

class AdminAppealTargetType extends EnumClass {

  @BuiltValueEnumConst(wireName: r'post')
  static const AdminAppealTargetType post = _$post;
  @BuiltValueEnumConst(wireName: r'comment')
  static const AdminAppealTargetType comment = _$comment;
  @BuiltValueEnumConst(wireName: r'profile')
  static const AdminAppealTargetType profile = _$profile;

  static Serializer<AdminAppealTargetType> get serializer => _$adminAppealTargetTypeSerializer;

  const AdminAppealTargetType._(String name): super(name);

  static BuiltSet<AdminAppealTargetType> get values => _$values;
  static AdminAppealTargetType valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class AdminAppealTargetTypeMixin = Object with _$AdminAppealTargetTypeMixin;

