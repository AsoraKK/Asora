// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_content_action_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminContentActionRequest extends AdminContentActionRequest {
  @override
  final AdminContentType contentType;
  @override
  final String reasonCode;
  @override
  final String? note;

  factory _$AdminContentActionRequest(
          [void Function(AdminContentActionRequestBuilder)? updates]) =>
      (AdminContentActionRequestBuilder()..update(updates))._build();

  _$AdminContentActionRequest._(
      {required this.contentType, required this.reasonCode, this.note})
      : super._();
  @override
  AdminContentActionRequest rebuild(
          void Function(AdminContentActionRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminContentActionRequestBuilder toBuilder() =>
      AdminContentActionRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminContentActionRequest &&
        contentType == other.contentType &&
        reasonCode == other.reasonCode &&
        note == other.note;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, contentType.hashCode);
    _$hash = $jc(_$hash, reasonCode.hashCode);
    _$hash = $jc(_$hash, note.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminContentActionRequest')
          ..add('contentType', contentType)
          ..add('reasonCode', reasonCode)
          ..add('note', note))
        .toString();
  }
}

class AdminContentActionRequestBuilder
    implements
        Builder<AdminContentActionRequest, AdminContentActionRequestBuilder> {
  _$AdminContentActionRequest? _$v;

  AdminContentType? _contentType;
  AdminContentType? get contentType => _$this._contentType;
  set contentType(AdminContentType? contentType) =>
      _$this._contentType = contentType;

  String? _reasonCode;
  String? get reasonCode => _$this._reasonCode;
  set reasonCode(String? reasonCode) => _$this._reasonCode = reasonCode;

  String? _note;
  String? get note => _$this._note;
  set note(String? note) => _$this._note = note;

  AdminContentActionRequestBuilder() {
    AdminContentActionRequest._defaults(this);
  }

  AdminContentActionRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _contentType = $v.contentType;
      _reasonCode = $v.reasonCode;
      _note = $v.note;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminContentActionRequest other) {
    _$v = other as _$AdminContentActionRequest;
  }

  @override
  void update(void Function(AdminContentActionRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminContentActionRequest build() => _build();

  _$AdminContentActionRequest _build() {
    final _$result = _$v ??
        _$AdminContentActionRequest._(
          contentType: BuiltValueNullFieldError.checkNotNull(
              contentType, r'AdminContentActionRequest', 'contentType'),
          reasonCode: BuiltValueNullFieldError.checkNotNull(
              reasonCode, r'AdminContentActionRequest', 'reasonCode'),
          note: note,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
