//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_queue_status.g.dart';

class AdminQueueStatus extends EnumClass {

  @BuiltValueEnumConst(wireName: r'OPEN')
  static const AdminQueueStatus OPEN = _$OPEN;
  @BuiltValueEnumConst(wireName: r'RESOLVED')
  static const AdminQueueStatus RESOLVED = _$RESOLVED;

  static Serializer<AdminQueueStatus> get serializer => _$adminQueueStatusSerializer;

  const AdminQueueStatus._(String name): super(name);

  static BuiltSet<AdminQueueStatus> get values => _$values;
  static AdminQueueStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class AdminQueueStatusMixin = Object with _$AdminQueueStatusMixin;

