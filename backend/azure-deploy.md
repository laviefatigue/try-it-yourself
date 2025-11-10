# Azure Deployment Guide for Lagoon 440 Backend API

## Prerequisites

1. **Azure CLI**: Install from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
2. **Azure Account**: Sign up at https://azure.microsoft.com/
3. **Node.js 18+**: Installed on your local machine

## Step 1: Azure Login

```bash
az login
```

## Step 2: Create Resource Group

```bash
az group create --name lagoon440-rg --location eastus
```

## Step 3: Create MongoDB (Azure Cosmos DB)

```bash
# Create Cosmos DB account with MongoDB API
az cosmosdb create \
  --name lagoon440-cosmos \
  --resource-group lagoon440-rg \
  --kind MongoDB \
  --server-version 4.2 \
  --default-consistency-level Session \
  --locations regionName=eastus

# Get connection string
az cosmosdb keys list \
  --name lagoon440-cosmos \
  --resource-group lagoon440-rg \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" \
  --output tsv
```

## Step 4: Create App Service Plan

```bash
az appservice plan create \
  --name lagoon440-plan \
  --resource-group lagoon440-rg \
  --sku B1 \
  --is-linux
```

## Step 5: Create Web App

```bash
az webapp create \
  --resource-group lagoon440-rg \
  --plan lagoon440-plan \
  --name lagoon440-api \
  --runtime "NODE:18-lts"
```

## Step 6: Configure Environment Variables

```bash
az webapp config appsettings set \
  --resource-group lagoon440-rg \
  --name lagoon440-api \
  --settings \
    NODE_ENV=production \
    MONGODB_URI="<your-cosmos-db-connection-string>" \
    JWT_SECRET="<generate-strong-secret>" \
    WINDY_API_KEY="<your-windy-api-key>" \
    TWILIO_ACCOUNT_SID="<your-twilio-sid>" \
    TWILIO_AUTH_TOKEN="<your-twilio-token>" \
    TWILIO_PHONE_NUMBER="<your-twilio-number>"
```

## Step 7: Deploy Application

### Option A: Using Azure CLI (from backend directory)

```bash
cd backend
npm run build
az webapp up \
  --name lagoon440-api \
  --resource-group lagoon440-rg \
  --runtime "NODE:18-lts"
```

### Option B: Using GitHub Actions

1. Get publish profile:
```bash
az webapp deployment list-publishing-profiles \
  --name lagoon440-api \
  --resource-group lagoon440-rg \
  --xml
```

2. Add the output as a secret named `AZURE_WEBAPP_PUBLISH_PROFILE` in your GitHub repository

3. The included `.github/workflows/azure-deploy.yml` will automatically deploy on push to main

## Step 8: Enable CORS

```bash
az webapp cors add \
  --resource-group lagoon440-rg \
  --name lagoon440-api \
  --allowed-origins "*"
```

For production, replace `"*"` with your specific domain.

## Step 9: Verify Deployment

```bash
# Check if app is running
curl https://lagoon440-api.azurewebsites.net/health

# View logs
az webapp log tail \
  --name lagoon440-api \
  --resource-group lagoon440-rg
```

## Optional: Set up Custom Domain

```bash
# Add custom domain
az webapp config hostname add \
  --webapp-name lagoon440-api \
  --resource-group lagoon440-rg \
  --hostname api.yourdomain.com

# Enable HTTPS
az webapp config ssl bind \
  --certificate-thumbprint <thumbprint> \
  --ssl-type SNI \
  --name lagoon440-api \
  --resource-group lagoon440-rg
```

## Monitoring and Logging

### Enable Application Insights

```bash
az monitor app-insights component create \
  --app lagoon440-insights \
  --location eastus \
  --resource-group lagoon440-rg \
  --application-type web

# Get instrumentation key
az monitor app-insights component show \
  --app lagoon440-insights \
  --resource-group lagoon440-rg \
  --query instrumentationKey \
  --output tsv
```

### View Logs

```bash
# Stream logs
az webapp log tail --name lagoon440-api --resource-group lagoon440-rg

# Download logs
az webapp log download --name lagoon440-api --resource-group lagoon440-rg
```

## Scaling

### Scale up (vertical scaling)
```bash
az appservice plan update \
  --name lagoon440-plan \
  --resource-group lagoon440-rg \
  --sku P1V2
```

### Scale out (horizontal scaling)
```bash
az webapp scale \
  --name lagoon440-api \
  --resource-group lagoon440-rg \
  --instance-count 3
```

## Cost Optimization

- **Development**: Use B1 tier (~$13/month)
- **Production**: Use P1V2 tier with autoscaling (~$75/month)
- **Cosmos DB**: Start with 400 RU/s (~$24/month)

## Security Best Practices

1. **Never commit secrets** - Use Azure Key Vault
2. **Enable Authentication** - Azure AD B2C for user management
3. **Use HTTPS only** - Enforce SSL/TLS
4. **Regular updates** - Keep dependencies updated
5. **Monitor logs** - Set up alerts for errors

## Troubleshooting

### App not starting
```bash
az webapp log tail --name lagoon440-api --resource-group lagoon440-rg
```

### Database connection issues
- Check connection string in app settings
- Verify Cosmos DB firewall rules
- Ensure MongoDB compatibility mode is enabled

### High memory usage
- Check for memory leaks
- Increase app service plan tier
- Optimize database queries

## Cleanup (Delete All Resources)

```bash
az group delete --name lagoon440-rg --yes --no-wait
```

## API Endpoints

Once deployed, your API will be available at:
- **Base URL**: `https://lagoon440-api.azurewebsites.net`
- **Health Check**: `/health`
- **Auth**: `/api/auth/*`
- **Routes**: `/api/routes/*`
- **Weather**: `/api/weather/*`
- **Notifications**: `/api/notifications/*`

## Next Steps

1. Update mobile app API endpoint
2. Configure push notifications (Expo)
3. Set up Twilio for SMS
4. Test all features
5. Monitor usage and costs
