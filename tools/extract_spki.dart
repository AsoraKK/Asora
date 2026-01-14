#!/usr/bin/env dart

/// ASORA SPKI EXTRACTOR
///
/// 🎯 Purpose: Extract SPKI (Subject Public Key Info) hash from certificates
/// 🔐 Security: Used for TLS certificate pinning configuration
/// 📦 Usage: dart run tools/extract_spki.dart <pem_file_or_url>
///
/// Example:
///   dart run tools/extract_spki.dart cert.pem
///   dart run tools/extract_spki.dart https://asora-function-dev.azurewebsites.net
library;

import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';

Future<void> main(List<String> args) async {
  if (args.isEmpty) {
    _printUsage();
    exit(1);
  }

  final input = args[0];

  try {
    if (input.startsWith('http://') || input.startsWith('https://')) {
      await _extractFromUrl(input);
    } else {
      await _extractFromFile(input);
    }
  } catch (e) {
    stderr.writeln('❌ Error: $e');
    exit(1);
  }
}

/// Extract SPKI from URL by connecting and reading certificate
Future<void> _extractFromUrl(String url) async {
  final uri = Uri.parse(url);
  final host = uri.host;
  final port = uri.hasPort ? uri.port : 443;

  stdout.writeln('🔍 Connecting to $host:$port...');

  final socket = await SecureSocket.connect(
    host,
    port,
    onBadCertificate: (_) => true, // Accept all for inspection
  );

  final cert = socket.peerCertificate;
  if (cert == null) {
    stderr.writeln('❌ Failed to retrieve certificate from server');
    await socket.close();
    exit(1);
  }

  stdout.writeln('✅ Certificate retrieved successfully\n');
  _printCertificateInfo(cert);
  _extractAndPrintSpki(cert);

  await socket.close();
}

/// Extract SPKI from PEM file
Future<void> _extractFromFile(String filePath) async {
  final file = File(filePath);

  if (!file.existsSync()) {
    stderr.writeln('❌ File not found: $filePath');
    exit(1);
  }

  // Verify it's a PEM file
  final content = file.readAsStringSync();
  if (!content.contains('BEGIN CERTIFICATE')) {
    stderr.writeln('⚠️  Warning: File does not appear to be a PEM certificate');
  }

  // TODO: Parse PEM and extract X509Certificate
  // For now, show instructions
  stdout.writeln('📄 PEM file: $filePath');
  stdout.writeln(
    '\n⚠️  Note: Direct PEM parsing requires additional dependencies.',
  );
  stdout.writeln('Use OpenSSL for now:\n');
  stdout.writeln('  # Extract SPKI hash with OpenSSL:');
  stdout.writeln(
    '  openssl x509 -in $filePath -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64',
  );
  stdout.writeln('\n  # Or view certificate info:');
  stdout.writeln('  openssl x509 -in $filePath -text -noout');
}

/// Print certificate information
void _printCertificateInfo(X509Certificate cert) {
  stdout.writeln('📋 Certificate Information:');
  stdout.writeln('   Subject: ${cert.subject}');
  stdout.writeln('   Issuer: ${cert.issuer}');
  stdout.writeln('   Valid from: ${cert.startValidity}');
  stdout.writeln('   Valid until: ${cert.endValidity}');
  stdout.writeln('');
}

/// Extract and print SPKI hash
void _extractAndPrintSpki(X509Certificate cert) {
  // WARNING: This is a simplified fallback implementation.
  // Proper SPKI extraction requires parsing the certificate ASN.1 structure
  // to isolate the SubjectPublicKeyInfo field.
  //
  // Current implementation hashes the entire certificate DER, which is NOT
  // the same as SPKI pinning. This is for demonstration purposes only.

  final certDer = cert.der;
  final hash = sha256.convert(certDer);
  final spkiHashBase64 = base64.encode(hash.bytes);

  stdout.writeln(
    '⚠️  WARNING: Simplified SPKI extraction (hashes full cert DER)',
  );
  stdout.writeln('   For production use, extract SPKI with OpenSSL:\n');
  stdout.writeln(
    '   echo | openssl s_client -servername ${_extractHostFromSubject(cert.subject)} -connect ${_extractHostFromSubject(cert.subject)}:443 2>/dev/null | \\',
  );
  stdout.writeln('   openssl x509 -pubkey -noout | \\');
  stdout.writeln('   openssl pkey -pubin -outform der | \\');
  stdout.writeln('   openssl dgst -sha256 -binary | \\');
  stdout.writeln('   base64');
  stdout.writeln('');
  stdout.writeln('📌 Computed Hash (full cert DER - NOT proper SPKI):');
  stdout.writeln('   $spkiHashBase64');
  stdout.writeln('');
}

/// Extract hostname from certificate subject
String _extractHostFromSubject(String subject) {
  // Simple CN extraction
  final cnMatch = RegExp(r'CN\s*=\s*([^,]+)').firstMatch(subject);
  return cnMatch?.group(1)?.trim() ?? 'unknown';
}

void _printUsage() {
  stdout.writeln('Usage: dart run tools/extract_spki.dart <pem_file_or_url>');
  stdout.writeln('');
  stdout.writeln('Examples:');
  stdout.writeln('  dart run tools/extract_spki.dart cert.pem');
  stdout.writeln(
    '  dart run tools/extract_spki.dart https://asora-function-dev.azurewebsites.net',
  );
  stdout.writeln('');
  stdout.writeln('For production SPKI extraction, use OpenSSL:');
  stdout.writeln(
    '  echo | openssl s_client -servername your-host.com -connect your-host.com:443 2>/dev/null | \\',
  );
  stdout.writeln('    openssl x509 -pubkey -noout | \\');
  stdout.writeln('    openssl pkey -pubin -outform der | \\');
  stdout.writeln('    openssl dgst -sha256 -binary | \\');
  stdout.writeln('    base64');
}
