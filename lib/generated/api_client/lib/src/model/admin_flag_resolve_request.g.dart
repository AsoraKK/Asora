// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_flag_resolve_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminFlagResolveRequest extends AdminFlagResolveRequest {
  @override
  final String reasonCode;
  @override
  final String? note;

  factory _$AdminFlagResolveRequest(
          [void Function(AdminFlagResolveRequestBuilder)? updates]) =>
      (AdminFlagResolveRequestBuilder()..update(updates))._build();

  _$AdminFlagResolveRequest._({required this.reasonCode, this.note})
      : super._();
  @override
  AdminFlagResolveRequest rebuild(
          void Function(AdminFlagResolveRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminFlagResolveRequestBuilder toBuilder() =>
      AdminFlagResolveRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminFlagResolveRequest &&
        reasonCode == other.reasonCode &&
        note == other.note;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, reasonCode.hashCode);
    _$hash = $jc(_$hash, note.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminFlagResolveRequest')
          ..add('reasonCode', reasonCode)
          ..add('note', note))
        .toString();
  }
}

class AdminFlagResolveRequestBuilder
    implements
        Builder<AdminFlagResolveRequest, AdminFlagResolveRequestBuilder> {
  _$AdminFlagResolveRequest? _$v;

  String? _reasonCode;
  String? get reasonCode => _$this._reasonCode;
  set reasonCode(String? reasonCode) => _$this._reasonCode = reasonCode;

  String? _note;
  String? get note => _$this._note;
  set note(String? note) => _$this._note = note;

  AdminFlagResolveRequestBuilder() {
    AdminFlagResolveRequest._defaults(this);
  }

  AdminFlagResolveRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _reasonCode = $v.reasonCode;
      _note = $v.note;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminFlagResolveRequest other) {
    _$v = other as _$AdminFlagResolveRequest;
  }

  @override
  void update(void Function(AdminFlagResolveRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminFlagResolveRequest build() => _build();

  _$AdminFlagResolveRequest _build() {
    final _$result = _$v ??
        _$AdminFlagResolveRequest._(
          reasonCode: BuiltValueNullFieldError.checkNotNull(
              reasonCode, r'AdminFlagResolveRequest', 'reasonCode'),
          note: note,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
