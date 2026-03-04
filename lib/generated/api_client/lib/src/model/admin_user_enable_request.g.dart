// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_user_enable_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminUserEnableRequest extends AdminUserEnableRequest {
  @override
  final String? reasonCode;
  @override
  final String? note;

  factory _$AdminUserEnableRequest(
          [void Function(AdminUserEnableRequestBuilder)? updates]) =>
      (AdminUserEnableRequestBuilder()..update(updates))._build();

  _$AdminUserEnableRequest._({this.reasonCode, this.note}) : super._();
  @override
  AdminUserEnableRequest rebuild(
          void Function(AdminUserEnableRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminUserEnableRequestBuilder toBuilder() =>
      AdminUserEnableRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminUserEnableRequest &&
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
    return (newBuiltValueToStringHelper(r'AdminUserEnableRequest')
          ..add('reasonCode', reasonCode)
          ..add('note', note))
        .toString();
  }
}

class AdminUserEnableRequestBuilder
    implements Builder<AdminUserEnableRequest, AdminUserEnableRequestBuilder> {
  _$AdminUserEnableRequest? _$v;

  String? _reasonCode;
  String? get reasonCode => _$this._reasonCode;
  set reasonCode(String? reasonCode) => _$this._reasonCode = reasonCode;

  String? _note;
  String? get note => _$this._note;
  set note(String? note) => _$this._note = note;

  AdminUserEnableRequestBuilder() {
    AdminUserEnableRequest._defaults(this);
  }

  AdminUserEnableRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _reasonCode = $v.reasonCode;
      _note = $v.note;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminUserEnableRequest other) {
    _$v = other as _$AdminUserEnableRequest;
  }

  @override
  void update(void Function(AdminUserEnableRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminUserEnableRequest build() => _build();

  _$AdminUserEnableRequest _build() {
    final _$result = _$v ??
        _$AdminUserEnableRequest._(
          reasonCode: reasonCode,
          note: note,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
