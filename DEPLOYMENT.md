# Lagoon 440 Sailing App - Complete Deployment Guide

## Architecture Overview

The Lagoon 440 Sailing App consists of two main components:

1. **Mobile App** (React Native/Expo) - iOS, Android, and Web
2. **Backend API** (Node.js/Express) - Hosted on Azure

```
┌──────────────┐
│  Mobile App  │
│ (Expo/React  │
│   Native)    │
└──────┬───────┘
       │ HTTPS/REST
       ▼
┌──────────────────┐
│   Azure Web App  │
│  (Node.js API)   │
└──────┬───────────┘
       │
       ├─► MongoDB (Cosmos DB)
       ├─► Windy.com API
       ├─► Twilio (SMS)
       └─► Expo Push Service
```

## Part 1: Backend Deployment to Azure

### Prerequisites

- Azure account (https://azure.microsoft.com/)
- Azure CLI installed
- Node.js 18+
- MongoDB Atlas account OR Azure Cosmos DB

### Step 1: Set up MongoDB

**Option A: Azure Cosmos DB (Recommended for Azure)**

```bash
# Login to Azure
az login

# Create resource group
az group create --name lagoon440-rg --location eastus

# Create Cosmos DB with MongoDB API
az cosmosdb create \
  --name lagoon440-cosmos \
  --resource-group lagoon440-rg \
  --kind MongoDB \
  --server-version 4.2

# Get connection string
az cosmosdb keys list \
  --name lagoon440-cosmos \
  --resource-group lagoon440-rg \
  --type connection-strings \
  --query "connectionStrings[0].connectionString"
```

**Option B: MongoDB Atlas (Alternative)**

1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get connection string from Atlas dashboard

### Step 2: Set up Twilio for SMS (Optional)

1. Sign up at https://www.twilio.com/
2. Get Account SID, Auth Token, and Phone Number
3. Add credits for SMS sending

### Step 3: Deploy Backend to Azure

```bash
cd backend

# Install dependencies
npm install

# Create App Service Plan
az appservice plan create \
  --name lagoon440-plan \
  --resource-group lagoon440-rg \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --resource-group lagoon440-rg \
  --plan lagoon440-plan \
  --name lagoon440-api \
  --runtime "NODE:18-lts"

# Configure environment variables
az webapp config appsettings set \
  --resource-group lagoon440-rg \
  --name lagoon440-api \
  --settings \
    NODE_ENV=production \
    MONGODB_URI="<your-mongodb-connection-string>" \
    JWT_SECRET="<generate-random-secret-key>" \
    WINDY_API_KEY="<your-windy-api-key>" \
    TWILIO_ACCOUNT_SID="<your-twilio-sid>" \
    TWILIO_AUTH_TOKEN="<your-twilio-token>" \
    TWILIO_PHONE_NUMBER="<your-twilio-number>"

# Deploy
npm run build
az webapp up \
  --name lagoon440-api \
  --resource-group lagoon440-rg

# Enable CORS
az webapp cors add \
  --resource-group lagoon440-rg \
  --name lagoon440-api \
  --allowed-origins "*"

# Test deployment
curl https://lagoon440-api.azurewebsites.net/health
```

Your backend API should now be live at: `https://lagoon440-api.azurewebsites.net`

### Step 4: Monitor Backend

```bash
# View real-time logs
az webapp log tail --name lagoon440-api --resource-group lagoon440-rg

# View metrics
az monitor metrics list \
  --resource /subscriptions/<subscription-id>/resourceGroups/lagoon440-rg/providers/Microsoft.Web/sites/lagoon440-api
```

## Part 2: Mobile App Configuration

### Update API Endpoint

1. Create `/src/config/api.ts`:

```typescript
export const API_BASE_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://lagoon440-api.azurewebsites.net';

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    PROFILE: '/api/auth/profile',
    PUSH_TOKEN: '/api/auth/push-token',
  },
  ROUTES: {
    LIST: '/api/routes',
    CREATE: '/api/routes',
    UPDATE: (id: string) => `/api/routes/${id}`,
    DELETE: (id: string) => `/api/routes/${id}`,
    ACTIVATE: (id: string) => `/api/routes/${id}/activate`,
  },
  WEATHER: {
    HISTORY: '/api/weather/history',
    SAVE: '/api/weather/history',
    ACCURACY: '/api/weather/accuracy',
  },
  NOTIFICATIONS: {
    PUSH: '/api/notifications/push',
    SMS: '/api/notifications/sms',
    ALERT: '/api/notifications/weather-alert',
  },
};
```

### Install Additional Dependencies

```bash
npm install expo-notifications expo-secure-store @react-native-async-storage/async-storage
```

### Build and Deploy Mobile App

**For Development:**
```bash
npx expo start
```

**For Production (iOS):**
```bash
# Build for iOS
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

**For Production (Android):**
```bash
# Build for Android
eas build --platform android

# Submit to Play Store
eas submit --platform android
```

## Part 3: Weather Monitoring Setup

### Configure Weather Monitoring

In the mobile app, users can configure:

```typescript
const monitoringConfig = {
  intervalHours: 6,        // Check every 6 hours
  forecastDays: 3,         // Look ahead 3 days
  maxWindSpeed: 25,        // Alert if wind > 25 kts
  maxWaveHeight: 3,        // Alert if waves > 3m
  avoidStorms: true,       // Detect and avoid storms
  ensureDaytimeArrival: true, // Plan for daylight arrival
  notifyViaPush: true,     // Enable push notifications
  notifyViaSMS: false,     // Enable SMS (costs apply)
};
```

### Start Monitoring

```typescript
import { getWeatherMonitoringService } from './src/services/weatherMonitoringService';

const monitoringService = getWeatherMonitoringService(monitoringConfig);
monitoringService.startMonitoring(currentRoute, currentGPSPosition);
```

## Part 4: Push Notifications Setup

### Configure Expo Notifications

1. Get Expo push token in your app:

```typescript
import * as Notifications from 'expo-notifications';

async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    alert('Push notifications permission denied');
    return;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // Send token to backend
  await fetch(`${API_BASE_URL}/api/auth/push-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`,
    },
    body: JSON.stringify({ token }),
  });
}
```

2. Handle incoming notifications:

```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

## Part 5: SMS Notifications Setup

### Configure Twilio

1. Sign up at https://www.twilio.com/
2. Get phone number ($1/month)
3. Add $20 credit for SMS
4. Cost: ~$0.0075 per SMS

### Send Test SMS

```bash
curl -X POST https://lagoon440-api.azurewebsites.net/api/notifications/sms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "message": "Test weather alert: High winds forecast"
  }'
```

## Part 6: User Authentication Flow

### Register New User

```bash
curl -X POST https://lagoon440-api.azurewebsites.net/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sailor@example.com",
    "password": "SecurePass123!",
    "name": "Captain Jack",
    "phoneNumber": "+1234567890"
  }'
```

### Login

```bash
curl -X POST https://lagoon440-api.azurewebsites.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sailor@example.com",
    "password": "SecurePass123!"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "sailor@example.com",
    "name": "Captain Jack"
  }
}
```

## Part 7: Testing

### Test Weather Monitoring

```bash
# Get weather history
curl -X GET "https://lagoon440-api.azurewebsites.net/api/weather/history?limit=10" \
  -H "Authorization: Bearer <your-token>"

# Save weather data
curl -X POST https://lagoon440-api.azurewebsites.net/api/weather/history \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "timestamp": "2025-11-10T12:00:00Z",
    "location": {
      "latitude": 14.6037,
      "longitude": -61.0589
    },
    "forecast": {
      "windSpeed": 15.5,
      "windDirection": 90,
      "gustSpeed": 20.2,
      "waveHeight": 1.5
    }
  }'
```

### Test Routes API

```bash
# Create route
curl -X POST https://lagoon440-api.azurewebsites.net/api/routes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "name": "Caribbean Cruise",
    "waypoints": [
      {
        "id": "wp1",
        "name": "Martinique",
        "latitude": 14.6037,
        "longitude": -61.0589,
        "order": 0
      },
      {
        "id": "wp2",
        "name": "St. Lucia",
        "latitude": 14.0833,
        "longitude": -60.9667,
        "order": 1
      }
    ]
  }'
```

## Part 8: Monitoring & Maintenance

### Application Insights

```bash
# Enable Application Insights
az monitor app-insights component create \
  --app lagoon440-insights \
  --location eastus \
  --resource-group lagoon440-rg
```

### Set Up Alerts

```bash
# Alert on high error rate
az monitor metrics alert create \
  --name high-error-rate \
  --resource-group lagoon440-rg \
  --scopes /subscriptions/<sub-id>/resourceGroups/lagoon440-rg/providers/Microsoft.Web/sites/lagoon440-api \
  --condition "avg Http5xx > 5"
```

### Backup Database

```bash
# Cosmos DB automatic backups are enabled by default
# Restore from backup:
az cosmosdb restore \
  --target-database-account-name lagoon440-cosmos-restored \
  --account-name lagoon440-cosmos \
  --resource-group lagoon440-rg \
  --restore-timestamp "2025-11-10T10:00:00Z"
```

## Cost Estimates

### Monthly Costs (Development)
- Azure App Service B1: $13/month
- Cosmos DB (400 RU/s): $24/month
- **Total: ~$37/month**

### Monthly Costs (Production)
- Azure App Service P1V2: $75/month
- Cosmos DB (1000 RU/s): $60/month
- Twilio SMS (100 msgs): $0.75
- Storage & Bandwidth: $5/month
- **Total: ~$140/month**

## Security Checklist

- [ ] Change default JWT secret
- [ ] Enable HTTPS only
- [ ] Set up Azure Key Vault for secrets
- [ ] Configure CORS for specific domains only
- [ ] Enable Azure AD authentication
- [ ] Set up rate limiting
- [ ] Enable database encryption
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity
- [ ] Backup data regularly

## Troubleshooting

### Backend won't start
```bash
az webapp log tail --name lagoon440-api --resource-group lagoon440-rg
```

### Database connection fails
- Check connection string in app settings
- Verify IP whitelist in Cosmos DB/Atlas
- Test connection locally first

### Push notifications not working
- Verify Expo push token is valid
- Check notification permissions in app
- Test with Expo push notification tool

### SMS not sending
- Verify Twilio credentials
- Check phone number format (+1234567890)
- Ensure Twilio account has credits

## Support

For issues:
1. Check logs: `az webapp log tail`
2. Review Azure metrics
3. Test API endpoints with curl
4. Check GitHub issues

## Next Steps

1. ✅ Deploy backend to Azure
2. ✅ Configure environment variables
3. ✅ Test all API endpoints
4. ✅ Build and deploy mobile app
5. ✅ Set up push notifications
6. ✅ Configure SMS alerts
7. ✅ Test weather monitoring
8. ✅ Monitor usage and costs
9. ⬜ Scale as needed
10. ⬜ Add custom domain
