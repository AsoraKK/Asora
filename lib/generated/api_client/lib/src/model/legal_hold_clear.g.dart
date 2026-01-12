// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'legal_hold_clear.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$LegalHoldClear extends LegalHoldClear {
  @override
  final String id;

  factory _$LegalHoldClear([void Function(LegalHoldClearBuilder)? updates]) =>
      (LegalHoldClearBuilder()..update(updates))._build();

  _$LegalHoldClear._({required this.id}) : super._();
  @override
  LegalHoldClear rebuild(void Function(LegalHoldClearBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  LegalHoldClearBuilder toBuilder() => LegalHoldClearBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is LegalHoldClear && id == other.id;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'LegalHoldClear')..add('id', id))
        .toString();
  }
}

class LegalHoldClearBuilder
    implements Builder<LegalHoldClear, LegalHoldClearBuilder> {
  _$LegalHoldClear? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  LegalHoldClearBuilder() {
    LegalHoldClear._defaults(this);
  }

  LegalHoldClearBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(LegalHoldClear other) {
    _$v = other as _$LegalHoldClear;
  }

  @override
  void update(void Function(LegalHoldClearBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  LegalHoldClear build() => _build();

  _$LegalHoldClear _build() {
    final _$result = _$v ??
        _$LegalHoldClear._(
          id: BuiltValueNullFieldError.checkNotNull(
              id, r'LegalHoldClear', 'id'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
