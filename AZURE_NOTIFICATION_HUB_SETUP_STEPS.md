# Azure Notification Hub Setup - Manual Steps

**Resource Group**: `asora-psql-flex` (North Europe)  
**Function App**: `asora-function-dev` → `asora-function-dev.azurewebsites.net`  
**FCM Service Account**: `~/asora/secrets/fcm-dev.json`

---

## ✅ STEP 2 — Create Azure Notification Hub

### Option A: Using Azure Portal (Recommended)

1. Go to [Azure Portal](https://portal.azure.com/)
2. Search for **Notification Hubs** → **Create**
3. Fill in:
   - **Subscription**: Azure subscription 1
   - **Resource Group**: `asora-psql-flex`
   - **Namespace Name**: `asora-ns-dev`
   - **Location**: `North Europe`
   - **Pricing Tier**: `Standard` (required for FCM v1 and APNs)
   - **Notification Hub Name**: `asora-dev-hub`
4. Click **Review + Create** → **Create**
5. Wait ~2 minutes for deployment

### Option B: Using Azure CLI

```bash
# Create namespace
az notification-hub namespace create \
  --resource-group asora-psql-flex \
  --name asora-ns-dev \
  --location northeurope \
  --sku Standard

# Create notification hub
az notification-hub create \
  --resource-group asora-psql-flex \
  --namespace-name asora-ns-dev \
  --name asora-dev-hub \
  --location northeurope
```

---

## ✅ STEP 3 — Configure FCM v1 in Notification Hub

### 3.1 Get FCM Credentials

**Project ID**: `asora-dev`  
**Client Email**: `asora-fcm-notifications@asora-dev.iam.gserviceaccount.com`  
**Private Key**: Get from `~/asora/secrets/fcm-dev.json`

```bash
# View the full private key
jq -r '.private_key' ~/asora/secrets/fcm-dev.json
```

### 3.2 Configure in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate: **Notification Hubs** → `asora-dev-hub`
3. Settings → **Google (FCM v1)**
4. Paste values:

| Azure Field | Value |
|-------------|-------|
| **Project ID** | `asora-dev` |
| **Client Email** | `asora-fcm-notifications@asora-dev.iam.gserviceaccount.com` |
| **Private Key** | Full `-----BEGIN PRIVATE KEY-----` block (copy from terminal output above) |

5. Click **Save**
6. Verify: No red error messages

---

## ✅ STEP 4 — Get Notification Hub Connection String

### 4.1 Via Azure Portal

1. Go to **Notification Hubs** → `asora-dev-hub`
2. Settings → **Access Policies**
3. Click **DefaultFullSharedAccessSignature**
4. Copy **Connection String - Primary**

### 4.2 Via Azure CLI

```bash
# Get connection string
az notification-hub authorization-rule list-keys \
  --resource-group asora-psql-flex \
  --namespace-name asora-ns-dev \
  --notification-hub-name asora-dev-hub \
  --name DefaultFullSharedAccessSignature \
  --query primaryConnectionString -o tsv

# Save to environment variable
export NOTIFICATION_HUB_CONNECTION_STRING=$(az notification-hub authorization-rule list-keys \
  --resource-group asora-psql-flex \
  --namespace-name asora-ns-dev \
  --notification-hub-name asora-dev-hub \
  --name DefaultFullSharedAccessSignature \
  --query primaryConnectionString -o tsv)

echo $NOTIFICATION_HUB_CONNECTION_STRING
```

---

## ✅ STEP 5 — Configure Function App Environment Variables

### 5.1 Via Azure Portal

1. Go to **Function Apps** → `asora-function-dev`
2. Settings → **Configuration** → **Application settings**
3. Click **+ New application setting** for each:

| Name | Value |
|------|-------|
| `NOTIFICATION_HUB_NAME` | `asora-dev-hub` |
| `NOTIFICATION_HUB_CONNECTION_STRING` | `<paste from Step 4>` |

4. Click **Save** (top of page)
5. Click **Continue** to restart the Function App

### 5.2 Via Azure CLI (Automated)

```bash
# Set the connection string environment variable first (from Step 4.2)
# Then run:

az functionapp config appsettings set \
  --name asora-function-dev \
  --resource-group asora-psql-flex \
  --settings \
    NOTIFICATION_HUB_NAME=asora-dev-hub \
    NOTIFICATION_HUB_CONNECTION_STRING="$NOTIFICATION_HUB_CONNECTION_STRING"

# Restart Function App
az functionapp restart \
  --name asora-function-dev \
  --resource-group asora-psql-flex

echo "Waiting 30 seconds for restart..."
sleep 30
```

---

## ✅ STEP 6 — Test Health Endpoint

### 6.1 Via Browser

Open: https://asora-function-dev.azurewebsites.net/api/health

**Expected Response** (HTTP 200):
```json
{
  "status": "healthy",
  "timestamp": "2025-11-25T21:00:00Z",
  "notificationHub": {
    "configured": true,
    "hubName": "asora-dev-hub",
    "status": "connected"
  }
}
```

### 6.2 Via curl

```bash
curl -i https://asora-function-dev.azurewebsites.net/api/health
```

### 6.3 Troubleshooting

**If health check fails**:

```bash
# Check Function App logs
az monitor activity-log list \
  --resource-group asora-psql-flex \
  --max-events 20 \
  --query "[?contains(resourceId, 'asora-function-dev')]" \
  -o table

# Check app settings
az functionapp config appsettings list \
  --name asora-function-dev \
  --resource-group asora-psql-flex \
  --query "[?name=='NOTIFICATION_HUB_NAME' || name=='NOTIFICATION_HUB_CONNECTION_STRING']" \
  -o table

# View Function App logs (live streaming)
az functionapp log tail \
  --name asora-function-dev \
  --resource-group asora-psql-flex
```

---

## ✅ STEP 7 — End-to-End Test

### Prerequisites

1. **Android device** with Asora app installed
2. **Device registered** with FCM token (call `POST /notifications/device-tokens` from app)
3. **Test user ID** (your account's `userId` from Cosmos DB)

### 7.1 Using Test Script

```bash
cd /home/kylee/asora

# Export Cosmos connection string (get from Azure Portal → Cosmos DB → Keys)
export COSMOS_CONNECTION_STRING="AccountEndpoint=https://...;AccountKey=..."

# Run E2E test
./scripts/run-e2e-notification-test.sh
```

**When prompted, enter**:
- **Environment**: `dev`
- **Function App**: `asora-function-dev`
- **User ID**: Your test account's `userId`
- **Event Type**: `POST_LIKE` or `POST_COMMENT`

### 7.2 Manual Test (Without Script)

```bash
# 1. Insert test event into Cosmos DB
node scripts/enqueue-test-notification.js <your-user-id> POST_LIKE

# 2. Wait 60-90 seconds for timer trigger

# 3. Check Function App logs
az functionapp log tail \
  --name asora-function-dev \
  --resource-group asora-psql-flex

# 4. Verify push notification on device
```

### 7.3 Expected Results

✅ **Function App logs show**:
```
[Notification Dispatcher] Processing event: POST_LIKE for user <user-id>
[Notification Hub] Sending to 1 device(s)
[Notification Hub] Success: 1, Failed: 0
```

✅ **Android device receives**:
- Push notification with title/body
- Tapping opens app with deep-link
- Notification appears in in-app notification list

✅ **Cosmos DB shows**:
- Event status: `COMPLETED` in `notification_events`
- History record created in `notification_history`

---

## Verification Checklist

- [ ] Notification Hub namespace created (`asora-ns-dev`)
- [ ] Notification Hub created (`asora-dev-hub`)
- [ ] FCM v1 credentials configured (Project ID, Client Email, Private Key)
- [ ] Connection string retrieved
- [ ] Function App settings updated (`NOTIFICATION_HUB_NAME`, `NOTIFICATION_HUB_CONNECTION_STRING`)
- [ ] Function App restarted
- [ ] Health endpoint returns HTTP 200
- [ ] Device token registered in Cosmos DB
- [ ] Test event inserted successfully
- [ ] Push notification received on device
- [ ] Deep-link navigation works
- [ ] In-app notification list shows notification

---

## Quick Reference Commands

```bash
# View FCM credentials
jq . ~/asora/secrets/fcm-dev.json

# Get notification hub connection string
az notification-hub authorization-rule list-keys \
  --resource-group asora-psql-flex \
  --namespace-name asora-ns-dev \
  --notification-hub-name asora-dev-hub \
  --name DefaultFullSharedAccessSignature \
  --query primaryConnectionString -o tsv

# Update Function App settings
az functionapp config appsettings set \
  --name asora-function-dev \
  --resource-group asora-psql-flex \
  --settings NOTIFICATION_HUB_NAME=asora-dev-hub

# Test health endpoint
curl https://asora-function-dev.azurewebsites.net/api/health

# View Function App logs
az functionapp log tail --name asora-function-dev --resource-group asora-psql-flex

# Run E2E test
export COSMOS_CONNECTION_STRING="..."
./scripts/run-e2e-notification-test.sh
```

---

## Next Steps After Completion

1. **iOS Configuration**: Add APNs certificate/key to Notification Hub
2. **Production Deployment**: Repeat for `asora-function-prod` environment
3. **Monitoring Setup**: Configure Azure Monitor alerts for push failures
4. **Rate Limit Testing**: Verify 3/hr social notification cap
5. **Quiet Hours Testing**: Verify notifications respect user preferences

See `NOTIFICATIONS_DEPLOYMENT_GUIDE.md` for complete production deployment workflow.
