//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_content_type.g.dart';

class AdminContentType extends EnumClass {

  @BuiltValueEnumConst(wireName: r'post')
  static const AdminContentType post = _$post;
  @BuiltValueEnumConst(wireName: r'comment')
  static const AdminContentType comment = _$comment;
  @BuiltValueEnumConst(wireName: r'user')
  static const AdminContentType user = _$user;

  static Serializer<AdminContentType> get serializer => _$adminContentTypeSerializer;

  const AdminContentType._(String name): super(name);

  static BuiltSet<AdminContentType> get values => _$values;
  static AdminContentType valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class AdminContentTypeMixin = Object with _$AdminContentTypeMixin;

