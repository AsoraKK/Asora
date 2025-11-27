#!/bin/bash
# Display FCM credentials for Azure Portal configuration

set -e

FCM_KEY_FILE="$HOME/asora/secrets/fcm-dev.json"

if [ ! -f "$FCM_KEY_FILE" ]; then
    echo "ERROR: FCM key file not found at $FCM_KEY_FILE"
    exit 1
fi

echo "=========================================="
echo "FCM v1 Credentials for Azure Portal"
echo "=========================================="
echo ""
echo "📋 PASTE THESE VALUES INTO AZURE PORTAL:"
echo ""
echo "Azure Portal → Notification Hubs → asora-dev-hub → Settings → Google (FCM v1)"
echo ""
echo "----------------------------------------"
echo "Project ID:"
echo "----------------------------------------"
jq -r '.project_id' "$FCM_KEY_FILE"
echo ""
echo "----------------------------------------"
echo "Client Email:"
echo "----------------------------------------"
jq -r '.client_email' "$FCM_KEY_FILE"
echo ""
echo "----------------------------------------"
echo "Private Key (copy entire block including BEGIN/END):"
echo "----------------------------------------"
jq -r '.private_key' "$FCM_KEY_FILE"
echo ""
echo "=========================================="
echo "✅ Copy the values above and paste into Azure Portal"
echo "=========================================="
echo ""
echo "Then click Save in Azure Portal."
echo ""
