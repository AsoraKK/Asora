//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'post_proof_signals.g.dart';

/// PostProofSignals
///
/// Properties:
/// * [captureMetadataHash]
/// * [editHistoryHash]
/// * [sourceAttestationUrl]
@BuiltValue()
abstract class PostProofSignals implements Built<PostProofSignals, PostProofSignalsBuilder> {
  @BuiltValueField(wireName: r'captureMetadataHash')
  String? get captureMetadataHash;

  @BuiltValueField(wireName: r'editHistoryHash')
  String? get editHistoryHash;

  @BuiltValueField(wireName: r'sourceAttestationUrl')
  String? get sourceAttestationUrl;

  PostProofSignals._();

  factory PostProofSignals([void updates(PostProofSignalsBuilder b)]) = _$PostProofSignals;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PostProofSignalsBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<PostProofSignals> get serializer => _$PostProofSignalsSerializer();
}

class _$PostProofSignalsSerializer implements PrimitiveSerializer<PostProofSignals> {
  @override
  final Iterable<Type> types = const [PostProofSignals, _$PostProofSignals];

  @override
  final String wireName = r'PostProofSignals';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PostProofSignals object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.captureMetadataHash != null) {
      yield r'captureMetadataHash';
      yield serializers.serialize(
        object.captureMetadataHash,
        specifiedType: const FullType(String),
      );
    }
    if (object.editHistoryHash != null) {
      yield r'editHistoryHash';
      yield serializers.serialize(
        object.editHistoryHash,
        specifiedType: const FullType(String),
      );
    }
    if (object.sourceAttestationUrl != null) {
      yield r'sourceAttestationUrl';
      yield serializers.serialize(
        object.sourceAttestationUrl,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    PostProofSignals object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required PostProofSignalsBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'captureMetadataHash':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.captureMetadataHash = valueDes;
          break;
        case r'editHistoryHash':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.editHistoryHash = valueDes;
          break;
        case r'sourceAttestationUrl':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.sourceAttestationUrl = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  PostProofSignals deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PostProofSignalsBuilder();
    final serializedList = (serialized as Iterable<Object?>).toList();
    final unhandled = <Object?>[];
    _deserializeProperties(
      serializers,
      serialized,
      specifiedType: specifiedType,
      serializedList: serializedList,
      unhandled: unhandled,
      result: result,
    );
    return result.build();
  }
}

