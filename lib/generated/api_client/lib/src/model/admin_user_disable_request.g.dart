// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_user_disable_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminUserDisableRequest extends AdminUserDisableRequest {
  @override
  final String reasonCode;
  @override
  final String note;

  factory _$AdminUserDisableRequest(
          [void Function(AdminUserDisableRequestBuilder)? updates]) =>
      (AdminUserDisableRequestBuilder()..update(updates))._build();

  _$AdminUserDisableRequest._({required this.reasonCode, required this.note})
      : super._();
  @override
  AdminUserDisableRequest rebuild(
          void Function(AdminUserDisableRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminUserDisableRequestBuilder toBuilder() =>
      AdminUserDisableRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminUserDisableRequest &&
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
    return (newBuiltValueToStringHelper(r'AdminUserDisableRequest')
          ..add('reasonCode', reasonCode)
          ..add('note', note))
        .toString();
  }
}

class AdminUserDisableRequestBuilder
    implements
        Builder<AdminUserDisableRequest, AdminUserDisableRequestBuilder> {
  _$AdminUserDisableRequest? _$v;

  String? _reasonCode;
  String? get reasonCode => _$this._reasonCode;
  set reasonCode(String? reasonCode) => _$this._reasonCode = reasonCode;

  String? _note;
  String? get note => _$this._note;
  set note(String? note) => _$this._note = note;

  AdminUserDisableRequestBuilder() {
    AdminUserDisableRequest._defaults(this);
  }

  AdminUserDisableRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _reasonCode = $v.reasonCode;
      _note = $v.note;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminUserDisableRequest other) {
    _$v = other as _$AdminUserDisableRequest;
  }

  @override
  void update(void Function(AdminUserDisableRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminUserDisableRequest build() => _build();

  _$AdminUserDisableRequest _build() {
    final _$result = _$v ??
        _$AdminUserDisableRequest._(
          reasonCode: BuiltValueNullFieldError.checkNotNull(
              reasonCode, r'AdminUserDisableRequest', 'reasonCode'),
          note: BuiltValueNullFieldError.checkNotNull(
              note, r'AdminUserDisableRequest', 'note'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
