// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'flag_content_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const FlagContentRequestReasonEnum _$flagContentRequestReasonEnum_spam =
    const FlagContentRequestReasonEnum._('spam');
const FlagContentRequestReasonEnum _$flagContentRequestReasonEnum_harassment =
    const FlagContentRequestReasonEnum._('harassment');
const FlagContentRequestReasonEnum _$flagContentRequestReasonEnum_hateSpeech =
    const FlagContentRequestReasonEnum._('hateSpeech');
const FlagContentRequestReasonEnum _$flagContentRequestReasonEnum_violence =
    const FlagContentRequestReasonEnum._('violence');
const FlagContentRequestReasonEnum _$flagContentRequestReasonEnum_adultContent =
    const FlagContentRequestReasonEnum._('adultContent');
const FlagContentRequestReasonEnum
    _$flagContentRequestReasonEnum_misinformation =
    const FlagContentRequestReasonEnum._('misinformation');
const FlagContentRequestReasonEnum _$flagContentRequestReasonEnum_copyright =
    const FlagContentRequestReasonEnum._('copyright');
const FlagContentRequestReasonEnum _$flagContentRequestReasonEnum_privacy =
    const FlagContentRequestReasonEnum._('privacy');
const FlagContentRequestReasonEnum _$flagContentRequestReasonEnum_other =
    const FlagContentRequestReasonEnum._('other');

FlagContentRequestReasonEnum _$flagContentRequestReasonEnumValueOf(
    String name) {
  switch (name) {
    case 'spam':
      return _$flagContentRequestReasonEnum_spam;
    case 'harassment':
      return _$flagContentRequestReasonEnum_harassment;
    case 'hateSpeech':
      return _$flagContentRequestReasonEnum_hateSpeech;
    case 'violence':
      return _$flagContentRequestReasonEnum_violence;
    case 'adultContent':
      return _$flagContentRequestReasonEnum_adultContent;
    case 'misinformation':
      return _$flagContentRequestReasonEnum_misinformation;
    case 'copyright':
      return _$flagContentRequestReasonEnum_copyright;
    case 'privacy':
      return _$flagContentRequestReasonEnum_privacy;
    case 'other':
      return _$flagContentRequestReasonEnum_other;
    default:
      throw ArgumentError(name);
  }
}

final BuiltSet<FlagContentRequestReasonEnum>
    _$flagContentRequestReasonEnumValues =
    BuiltSet<FlagContentRequestReasonEnum>(const <FlagContentRequestReasonEnum>[
  _$flagContentRequestReasonEnum_spam,
  _$flagContentRequestReasonEnum_harassment,
  _$flagContentRequestReasonEnum_hateSpeech,
  _$flagContentRequestReasonEnum_violence,
  _$flagContentRequestReasonEnum_adultContent,
  _$flagContentRequestReasonEnum_misinformation,
  _$flagContentRequestReasonEnum_copyright,
  _$flagContentRequestReasonEnum_privacy,
  _$flagContentRequestReasonEnum_other,
]);

Serializer<FlagContentRequestReasonEnum>
    _$flagContentRequestReasonEnumSerializer =
    _$FlagContentRequestReasonEnumSerializer();

class _$FlagContentRequestReasonEnumSerializer
    implements PrimitiveSerializer<FlagContentRequestReasonEnum> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'spam': 'spam',
    'harassment': 'harassment',
    'hateSpeech': 'hate_speech',
    'violence': 'violence',
    'adultContent': 'adult_content',
    'misinformation': 'misinformation',
    'copyright': 'copyright',
    'privacy': 'privacy',
    'other': 'other',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'spam': 'spam',
    'harassment': 'harassment',
    'hate_speech': 'hateSpeech',
    'violence': 'violence',
    'adult_content': 'adultContent',
    'misinformation': 'misinformation',
    'copyright': 'copyright',
    'privacy': 'privacy',
    'other': 'other',
  };

  @override
  final Iterable<Type> types = const <Type>[FlagContentRequestReasonEnum];
  @override
  final String wireName = 'FlagContentRequestReasonEnum';

  @override
  Object serialize(Serializers serializers, FlagContentRequestReasonEnum object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  FlagContentRequestReasonEnum deserialize(
          Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      FlagContentRequestReasonEnum.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

class _$FlagContentRequest extends FlagContentRequest {
  @override
  final String targetId;
  @override
  final FlagContentRequestReasonEnum reason;
  @override
  final String? notes;

  factory _$FlagContentRequest(
          [void Function(FlagContentRequestBuilder)? updates]) =>
      (FlagContentRequestBuilder()..update(updates))._build();

  _$FlagContentRequest._(
      {required this.targetId, required this.reason, this.notes})
      : super._();
  @override
  FlagContentRequest rebuild(
          void Function(FlagContentRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  FlagContentRequestBuilder toBuilder() =>
      FlagContentRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is FlagContentRequest &&
        targetId == other.targetId &&
        reason == other.reason &&
        notes == other.notes;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, targetId.hashCode);
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jc(_$hash, notes.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'FlagContentRequest')
          ..add('targetId', targetId)
          ..add('reason', reason)
          ..add('notes', notes))
        .toString();
  }
}

class FlagContentRequestBuilder
    implements Builder<FlagContentRequest, FlagContentRequestBuilder> {
  _$FlagContentRequest? _$v;

  String? _targetId;
  String? get targetId => _$this._targetId;
  set targetId(String? targetId) => _$this._targetId = targetId;

  FlagContentRequestReasonEnum? _reason;
  FlagContentRequestReasonEnum? get reason => _$this._reason;
  set reason(FlagContentRequestReasonEnum? reason) => _$this._reason = reason;

  String? _notes;
  String? get notes => _$this._notes;
  set notes(String? notes) => _$this._notes = notes;

  FlagContentRequestBuilder() {
    FlagContentRequest._defaults(this);
  }

  FlagContentRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _targetId = $v.targetId;
      _reason = $v.reason;
      _notes = $v.notes;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(FlagContentRequest other) {
    _$v = other as _$FlagContentRequest;
  }

  @override
  void update(void Function(FlagContentRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  FlagContentRequest build() => _build();

  _$FlagContentRequest _build() {
    final _$result = _$v ??
        _$FlagContentRequest._(
          targetId: BuiltValueNullFieldError.checkNotNull(
              targetId, r'FlagContentRequest', 'targetId'),
          reason: BuiltValueNullFieldError.checkNotNull(
              reason, r'FlagContentRequest', 'reason'),
          notes: notes,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
