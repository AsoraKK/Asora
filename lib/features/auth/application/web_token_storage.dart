// ignore_for_file: public_member_api_docs

// Conditional export: web implementations use dart:html sessionStorage,
// non-web platforms get no-op stubs.
export 'web_token_storage_stub.dart'
    if (dart.library.js_interop) 'web_token_storage_real.dart';
