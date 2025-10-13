// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'create_post201_response.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const CreatePost201ResponseStatusEnum
    _$createPost201ResponseStatusEnum_published =
    const CreatePost201ResponseStatusEnum._('published');
const CreatePost201ResponseStatusEnum
    _$createPost201ResponseStatusEnum_underReview =
    const CreatePost201ResponseStatusEnum._('underReview');
const CreatePost201ResponseStatusEnum
    _$createPost201ResponseStatusEnum_rejected =
    const CreatePost201ResponseStatusEnum._('rejected');

CreatePost201ResponseStatusEnum _$createPost201ResponseStatusEnumValueOf(
    String name) {
  switch (name) {
    case 'published':
      return _$createPost201ResponseStatusEnum_published;
    case 'underReview':
      return _$createPost201ResponseStatusEnum_underReview;
    case 'rejected':
      return _$createPost201ResponseStatusEnum_rejected;
    default:
      throw ArgumentError(name);
  }
}

final BuiltSet<CreatePost201ResponseStatusEnum>
    _$createPost201ResponseStatusEnumValues = BuiltSet<
        CreatePost201ResponseStatusEnum>(const <CreatePost201ResponseStatusEnum>[
  _$createPost201ResponseStatusEnum_published,
  _$createPost201ResponseStatusEnum_underReview,
  _$createPost201ResponseStatusEnum_rejected,
]);

Serializer<CreatePost201ResponseStatusEnum>
    _$createPost201ResponseStatusEnumSerializer =
    _$CreatePost201ResponseStatusEnumSerializer();

class _$CreatePost201ResponseStatusEnumSerializer
    implements PrimitiveSerializer<CreatePost201ResponseStatusEnum> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'published': 'published',
    'underReview': 'under_review',
    'rejected': 'rejected',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'published': 'published',
    'under_review': 'underReview',
    'rejected': 'rejected',
  };

  @override
  final Iterable<Type> types = const <Type>[CreatePost201ResponseStatusEnum];
  @override
  final String wireName = 'CreatePost201ResponseStatusEnum';

  @override
  Object serialize(
          Serializers serializers, CreatePost201ResponseStatusEnum object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  CreatePost201ResponseStatusEnum deserialize(
          Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      CreatePost201ResponseStatusEnum.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

class _$CreatePost201Response extends CreatePost201Response {
  @override
  final String? id;
  @override
  final CreatePost201ResponseStatusEnum? status;

  factory _$CreatePost201Response(
          [void Function(CreatePost201ResponseBuilder)? updates]) =>
      (CreatePost201ResponseBuilder()..update(updates))._build();

  _$CreatePost201Response._({this.id, this.status}) : super._();
  @override
  CreatePost201Response rebuild(
          void Function(CreatePost201ResponseBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CreatePost201ResponseBuilder toBuilder() =>
      CreatePost201ResponseBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CreatePost201Response &&
        id == other.id &&
        status == other.status;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CreatePost201Response')
          ..add('id', id)
          ..add('status', status))
        .toString();
  }
}

class CreatePost201ResponseBuilder
    implements Builder<CreatePost201Response, CreatePost201ResponseBuilder> {
  _$CreatePost201Response? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  CreatePost201ResponseStatusEnum? _status;
  CreatePost201ResponseStatusEnum? get status => _$this._status;
  set status(CreatePost201ResponseStatusEnum? status) =>
      _$this._status = status;

  CreatePost201ResponseBuilder() {
    CreatePost201Response._defaults(this);
  }

  CreatePost201ResponseBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _status = $v.status;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CreatePost201Response other) {
    _$v = other as _$CreatePost201Response;
  }

  @override
  void update(void Function(CreatePost201ResponseBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CreatePost201Response build() => _build();

  _$CreatePost201Response _build() {
    final _$result = _$v ??
        _$CreatePost201Response._(
          id: id,
          status: status,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
