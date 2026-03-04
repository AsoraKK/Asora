// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_appeal_content.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminAppealContent extends AdminAppealContent {
  @override
  final String? contentId;
  @override
  final AdminContentType? type;
  @override
  final DateTime? createdAt;
  @override
  final String? preview;

  factory _$AdminAppealContent(
          [void Function(AdminAppealContentBuilder)? updates]) =>
      (AdminAppealContentBuilder()..update(updates))._build();

  _$AdminAppealContent._(
      {this.contentId, this.type, this.createdAt, this.preview})
      : super._();
  @override
  AdminAppealContent rebuild(
          void Function(AdminAppealContentBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminAppealContentBuilder toBuilder() =>
      AdminAppealContentBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminAppealContent &&
        contentId == other.contentId &&
        type == other.type &&
        createdAt == other.createdAt &&
        preview == other.preview;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, contentId.hashCode);
    _$hash = $jc(_$hash, type.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, preview.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminAppealContent')
          ..add('contentId', contentId)
          ..add('type', type)
          ..add('createdAt', createdAt)
          ..add('preview', preview))
        .toString();
  }
}

class AdminAppealContentBuilder
    implements Builder<AdminAppealContent, AdminAppealContentBuilder> {
  _$AdminAppealContent? _$v;

  String? _contentId;
  String? get contentId => _$this._contentId;
  set contentId(String? contentId) => _$this._contentId = contentId;

  AdminContentType? _type;
  AdminContentType? get type => _$this._type;
  set type(AdminContentType? type) => _$this._type = type;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  String? _preview;
  String? get preview => _$this._preview;
  set preview(String? preview) => _$this._preview = preview;

  AdminAppealContentBuilder() {
    AdminAppealContent._defaults(this);
  }

  AdminAppealContentBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _contentId = $v.contentId;
      _type = $v.type;
      _createdAt = $v.createdAt;
      _preview = $v.preview;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminAppealContent other) {
    _$v = other as _$AdminAppealContent;
  }

  @override
  void update(void Function(AdminAppealContentBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminAppealContent build() => _build();

  _$AdminAppealContent _build() {
    final _$result = _$v ??
        _$AdminAppealContent._(
          contentId: contentId,
          type: type,
          createdAt: createdAt,
          preview: preview,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
