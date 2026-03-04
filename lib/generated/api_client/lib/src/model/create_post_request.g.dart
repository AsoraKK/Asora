// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'create_post_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CreatePostRequest extends CreatePostRequest {
  @override
  final String id;
  @override
  final String text;
  @override
  final BuiltList<String>? attachments;

  factory _$CreatePostRequest(
          [void Function(CreatePostRequestBuilder)? updates]) =>
      (CreatePostRequestBuilder()..update(updates))._build();

  _$CreatePostRequest._(
      {required this.id, required this.text, this.attachments})
      : super._();
  @override
  CreatePostRequest rebuild(void Function(CreatePostRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CreatePostRequestBuilder toBuilder() =>
      CreatePostRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CreatePostRequest &&
        id == other.id &&
        text == other.text &&
        attachments == other.attachments;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, text.hashCode);
    _$hash = $jc(_$hash, attachments.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CreatePostRequest')
          ..add('id', id)
          ..add('text', text)
          ..add('attachments', attachments))
        .toString();
  }
}

class CreatePostRequestBuilder
    implements Builder<CreatePostRequest, CreatePostRequestBuilder> {
  _$CreatePostRequest? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _text;
  String? get text => _$this._text;
  set text(String? text) => _$this._text = text;

  ListBuilder<String>? _attachments;
  ListBuilder<String> get attachments =>
      _$this._attachments ??= ListBuilder<String>();
  set attachments(ListBuilder<String>? attachments) =>
      _$this._attachments = attachments;

  CreatePostRequestBuilder() {
    CreatePostRequest._defaults(this);
  }

  CreatePostRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _text = $v.text;
      _attachments = $v.attachments?.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CreatePostRequest other) {
    _$v = other as _$CreatePostRequest;
  }

  @override
  void update(void Function(CreatePostRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CreatePostRequest build() => _build();

  _$CreatePostRequest _build() {
    _$CreatePostRequest _$result;
    try {
      _$result = _$v ??
          _$CreatePostRequest._(
            id: BuiltValueNullFieldError.checkNotNull(
                id, r'CreatePostRequest', 'id'),
            text: BuiltValueNullFieldError.checkNotNull(
                text, r'CreatePostRequest', 'text'),
            attachments: _attachments?.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'attachments';
        _attachments?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'CreatePostRequest', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
