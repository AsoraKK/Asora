// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'serializers.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

Serializers _$serializers = (Serializers().toBuilder()
      ..add(CreatePost201Response.serializer)
      ..add(CreatePost201ResponseStatusEnum.serializer)
      ..add(CreatePostRequest.serializer)
      ..add(Error.serializer)
      ..add(FlagContent202Response.serializer)
      ..add(FlagContent202ResponseStatusEnum.serializer)
      ..add(FlagContentRequest.serializer)
      ..add(FlagContentRequestReasonEnum.serializer)
      ..add(GetFeed200Response.serializer)
      ..add(GetFeed200ResponseMeta.serializer)
      ..add(GetHealth200Response.serializer)
      ..addBuilderFactory(
          const FullType(BuiltList, const [
            const FullType(BuiltMap, const [
              const FullType(String),
              const FullType.nullable(JsonObject)
            ])
          ]),
          () => ListBuilder<BuiltMap<String, JsonObject?>>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(String)]),
          () => ListBuilder<String>())
      ..addBuilderFactory(
          const FullType(
              BuiltMap, const [const FullType(String), const FullType(num)]),
          () => MapBuilder<String, num>())
      ..addBuilderFactory(
          const FullType(BuiltMap, const [
            const FullType(String),
            const FullType.nullable(JsonObject)
          ]),
          () => MapBuilder<String, JsonObject?>()))
    .build();

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
