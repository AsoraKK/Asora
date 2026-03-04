#!/usr/bin/env bash
set -e

echo "Verifying Google Identity Provider configuration in Azure AD B2C"
echo "================================================================"
echo ""

# B2C tenant details
B2C_TENANT_ID="ac06df30-fd50-4195-96fc-4c1fd1de6c43"
POLICY_NAME="B2C_1_signupsignin"

echo "🔍 Manual verification steps:"
echo ""
echo "1. Azure Portal → Entra External ID (Azure AD B2C)"
echo "   Switch to B2C tenant: asoraauth.onmicrosoft.com"
echo ""
echo "2. External Identities → Identity providers"
echo "   ✓ Verify 'Google' is listed"
echo "   ✓ Click Google → verify client ID matches:"
echo "     387920894359-od1qh8iv588ofv1t572v6spkl264srci.apps.googleusercontent.com"
echo ""
echo "3. External Identities → User flows → $POLICY_NAME"
echo "   ✓ Click on user flow → Identity providers"
echo "   ✓ Verify both are enabled:"
echo "     - Email signup (Local Account)"
echo "     - Google"
echo ""
echo "4. Test the user flow:"
echo "   ✓ User flows → $POLICY_NAME → 'Run user flow'"
echo "   ✓ Should see login page with:"
echo "     - Email field (for local accounts)"
echo "     - 'Sign in with Google' button"
echo ""
echo "5. Test discovery endpoint:"
echo ""

DISCOVERY_URL="https://asoraauth.b2clogin.com/asoraauth.onmicrosoft.com/$POLICY_NAME/v2.0/.well-known/openid-configuration"

echo "curl -s \"$DISCOVERY_URL\" | jq -r '.issuer, .authorization_endpoint, .token_endpoint, .jwks_uri'"
echo ""

if command -v curl &> /dev/null && command -v jq &> /dev/null; then
  echo "📡 Testing discovery endpoint..."
  RESPONSE=$(curl -s "$DISCOVERY_URL")
  
  if echo "$RESPONSE" | jq -e . > /dev/null 2>&1; then
    echo "✓ Discovery endpoint is accessible"
    echo ""
    echo "Issuer: $(echo "$RESPONSE" | jq -r '.issuer')"
    echo "Authorization: $(echo "$RESPONSE" | jq -r '.authorization_endpoint')"
    echo "Token: $(echo "$RESPONSE" | jq -r '.token_endpoint')"
    echo "JWKS: $(echo "$RESPONSE" | jq -r '.jwks_uri')"
  else
    echo "❌ Failed to fetch discovery document"
    echo "Response: $RESPONSE"
  fi
else
  echo "ℹ️  Install curl and jq to automatically test the discovery endpoint"
fi

echo ""
echo "6. Test authorization URL (paste in browser):"
echo ""
AUTH_URL="https://asoraauth.b2clogin.com/asoraauth.onmicrosoft.com/$POLICY_NAME/oauth2/v2.0/authorize"
AUTH_URL+="?client_id=d993e983-9f6e-44b4-b098-607af033832f"
AUTH_URL+="&redirect_uri=com.asora.app://oauth/callback"
AUTH_URL+="&response_type=code"
AUTH_URL+="&scope=openid%20offline_access"
AUTH_URL+="&p=$POLICY_NAME"
AUTH_URL+="&prompt=select_account"
AUTH_URL+="&idp=Google"

echo "$AUTH_URL"
echo ""
echo "Expected result: B2C login page with Email and Google options"
echo ""
