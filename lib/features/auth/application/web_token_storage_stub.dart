// ignore_for_file: public_member_api_docs

/// Stub implementation for non-web platforms. All operations are no-ops.
class WebTokenStorage {
  String? read(String key) => null;
  void write(String key, String value) {}
  void delete(String key) {}
  void clearAll() {}
}

void webRedirectTo(String url) {}

String getWebLocationHref() => '';

String getWebOrigin() => '';
