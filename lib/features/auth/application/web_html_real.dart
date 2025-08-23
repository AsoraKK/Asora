// Real implementation for web
// ignore: avoid_web_libraries_in_flutter, deprecated_member_use
import 'dart:html' as html;

String? getWebHref() => html.window.location.href;
