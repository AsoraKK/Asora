// P1 MODULES - PRIORITY 1 FEATURES
//
// This directory contains high-priority features that require
// 80% test coverage before deployment.
//
// Examples of P1 modules:
// - Authentication & security
// - Core user features
// - Payment processing
// - Critical business logic
//
// All modules in this directory must maintain >= 80% test coverage
// to pass CI/CD quality gates.

export '../core/security/cert_pinning.dart';
export '../core/security/device_integrity.dart';
export '../services/privacy_service.dart';
export '../features/auth/application/auth_providers.dart';
