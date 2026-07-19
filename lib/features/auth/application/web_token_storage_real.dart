// ignore_for_file: public_member_api_docs

import 'package:web/web.dart' as web;

/// Web implementation of token storage using sessionStorage.
/// Tokens are cleared when the tab/window is closed (explicit product decision).
class WebTokenStorage {
  static const _prefix = 'lythaus_auth_';

  String? read(String key) {
    return web.window.sessionStorage.getItem('$_prefix$key');
  }

  void write(String key, String value) {
    web.window.sessionStorage.setItem('$_prefix$key', value);
  }

  void delete(String key) {
    web.window.sessionStorage.removeItem('$_prefix$key');
  }

  void clearAll() {
    final keysToRemove = <String>[];
    for (var i = 0; i < web.window.sessionStorage.length; i++) {
      final key = web.window.sessionStorage.key(i);
      if (key != null && key.startsWith(_prefix)) {
        keysToRemove.add(key);
      }
    }
    for (final key in keysToRemove) {
      web.window.sessionStorage.removeItem(key);
    }
  }
}

/// Redirect the browser to the given [url].
void webRedirectTo(String url) {
  web.window.location.assign(url);
}

/// Returns the current browser URL.
String getWebLocationHref() {
  return web.window.location.href;
}

/// Returns the origin portion of the current URL.
String getWebOrigin() {
  return web.window.location.origin;
}

/// Remove OAuth response parameters from browser history after parsing them.
/// Authorization codes and state must not remain in a reloadable URL.
void clearWebCallbackQuery() {
  final location = web.window.location;
  web.window.history.replaceState(
    null,
    '',
    '${location.pathname}${location.hash}',
  );
}

String? getWebEmailActionFragmentToken() {
  final fragment = web.window.location.hash;
  if (fragment.isEmpty) return null;
  try {
    return Uri.splitQueryString(
      fragment.startsWith('#') ? fragment.substring(1) : fragment,
    )['token'];
  } on FormatException {
    return null;
  }
}

void clearWebEmailActionUrl() {
  final location = web.window.location;
  web.window.history.replaceState(null, '', location.pathname);
}
