#!/bin/bash

# P1 EPIC Creation Script for Asora - Based on ADR-001
# Run after creating Azure DevOps organization: https://dev.azure.com/AsoraKK

echo "🚀 Creating P1 EPICs for Asora based on ADR-001..."

# Configure Azure DevOps CLI
az devops configure --defaults organization=https://dev.azure.com/AsoraKK project=Asora

echo "Creating EPIC 1: Feed System..."
az boards work-item create \
  --title "Feed System – Content Discovery and Personalization" \
  --type Epic \
  --description "Build a modular, high-performance feed system using Cosmos DB + Redis + Cloudflare CDN. Enable discovery, infinite scroll, per-tier filters, and per-post AI-human transparency scoring. Target: p95 latency <200ms with 30s TTL edge caching." \
  --fields "Priority=1" \
  --tags "P1,Feed,ADR-001,August Sprint" \
  --assigned-to "kyle.kern@asora.co.za"

echo "Creating EPIC 2: Authentication System..."
az boards work-item create \
  --title "Authentication System – Multi-IdP and Biometric Reauth" \
  --type Epic \
  --description "Implement PKCE OAuth2 auth with support for Email, Google, Apple, and World Auth. Add biometric reauthentication and logout flows. Integrate with Azure AD B2C and secure token handling via Key Vault. Transition from Firebase Auth emulator." \
  --fields "Priority=1" \
  --tags "P1,Auth,ADR-001,August Sprint" \
  --assigned-to "kyle.kern@asora.co.za"

echo "Creating EPIC 3: AI Moderation & Safety..."
az boards work-item create \
  --title "AI Moderation & Safety – Hive v2 Integration" \
  --type Epic \
  --description "Integrate Hive v2 APIs for image/text moderation and AI-detection ($0.50/1k text, $3.00/1k images). Wrap in ContentRiskService abstraction with toggle support for Azure Content Safety fallback. Prepare for accuracy benchmarking in Q4. Include deepfake detection." \
  --fields "Priority=1" \
  --tags "P1,Moderation,ADR-001,August Sprint" \
  --assigned-to "kyle.kern@asora.co.za"

echo "Creating EPIC 4: PrivacyService..."
az boards work-item create \
  --title "PrivacyService – Consent, Controls, Compliance" \
  --type Epic \
  --description "Build PrivacyService to handle consent UX, granular sharing controls (Public/Followers/Close Friends/Only Me), and user export/delete requests. Meet POPIA and GDPR requirements. Add alerting and breach logs. Include per-post audience controls and data-subject rights." \
  --fields "Priority=1" \
  --tags "P1,Privacy,GDPR,POPIA,ADR-001,August Sprint" \
  --assigned-to "kyle.kern@asora.co.za"

echo "✅ All 4 P1 EPICs created successfully!"
echo "📋 View them at: https://dev.azure.com/AsoraKK/Asora/_boards/epic"
