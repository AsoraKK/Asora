// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dsr_request_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$DsrRequestInput extends DsrRequestInput {
  @override
  final String userId;
  @override
  final String? note;

  factory _$DsrRequestInput([void Function(DsrRequestInputBuilder)? updates]) =>
      (DsrRequestInputBuilder()..update(updates))._build();

  _$DsrRequestInput._({required this.userId, this.note}) : super._();
  @override
  DsrRequestInput rebuild(void Function(DsrRequestInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  DsrRequestInputBuilder toBuilder() => DsrRequestInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is DsrRequestInput &&
        userId == other.userId &&
        note == other.note;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, userId.hashCode);
    _$hash = $jc(_$hash, note.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'DsrRequestInput')
          ..add('userId', userId)
          ..add('note', note))
        .toString();
  }
}

class DsrRequestInputBuilder
    implements Builder<DsrRequestInput, DsrRequestInputBuilder> {
  _$DsrRequestInput? _$v;

  String? _userId;
  String? get userId => _$this._userId;
  set userId(String? userId) => _$this._userId = userId;

  String? _note;
  String? get note => _$this._note;
  set note(String? note) => _$this._note = note;

  DsrRequestInputBuilder() {
    DsrRequestInput._defaults(this);
  }

  DsrRequestInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _userId = $v.userId;
      _note = $v.note;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(DsrRequestInput other) {
    _$v = other as _$DsrRequestInput;
  }

  @override
  void update(void Function(DsrRequestInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  DsrRequestInput build() => _build();

  _$DsrRequestInput _build() {
    final _$result = _$v ??
        _$DsrRequestInput._(
          userId: BuiltValueNullFieldError.checkNotNull(
              userId, r'DsrRequestInput', 'userId'),
          note: note,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
