//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_appeal_final_decision.g.dart';

class AdminAppealFinalDecision extends EnumClass {

  @BuiltValueEnumConst(wireName: r'allow')
  static const AdminAppealFinalDecision allow = _$allow;
  @BuiltValueEnumConst(wireName: r'block')
  static const AdminAppealFinalDecision block = _$block;

  static Serializer<AdminAppealFinalDecision> get serializer => _$adminAppealFinalDecisionSerializer;

  const AdminAppealFinalDecision._(String name): super(name);

  static BuiltSet<AdminAppealFinalDecision> get values => _$values;
  static AdminAppealFinalDecision valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class AdminAppealFinalDecisionMixin = Object with _$AdminAppealFinalDecisionMixin;

