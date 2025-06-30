# Azure CLI Setup and Commands

## Quick Start Guide

Complete Azure CLI commands for deploying the Dashboard application to Azure Static Web Apps.

## Prerequisites

1. Azure CLI installed
2. GitHub account with repository
3. Azure subscription
4. Environment variables ready

## Installation

### Windows
```powershell
# Download and install from Microsoft
winget install Microsoft.AzureCLI
```

### macOS
```bash
# Using Homebrew
brew install azure-cli
```

### Linux (Ubuntu/Debian)
```bash
# Import Microsoft signing key
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

## Setup Commands

### 1. Login and Subscription

```bash
# Login to Azure
az login

# List available subscriptions
az account list --output table

# Set active subscription (if you have multiple)
az account set --subscription "Your Subscription Name"

# Verify current subscription
az account show --output table
```

### 2. Install Required Extensions

```bash
# Install Static Web Apps extension
az extension add --name staticwebapp

# Verify extension installation
az extension list --output table
```

### 3. Create Resource Group

```bash
# Create resource group in West Europe
az group create \
  --name rg-dashboard-static \
  --location "West Europe" \
  --output table

# Verify resource group creation
az group show --name rg-dashboard-static --output table
```

## Deployment Commands

### 4. Create Static Web App

```bash
# Replace YOUR_USERNAME and YOUR_REPO_NAME with actual values
az staticwebapp create \
  --name dashboard-static-app \
  --resource-group rg-dashboard-static \
  --source https://github.com/YOUR_USERNAME/YOUR_REPO_NAME \
  --location "West Europe" \
  --branch main \
  --app-location "/" \
  --api-location "" \
  --output-location "dist" \
  --login-with-github
```

**Important Notes:**
- Replace `YOUR_USERNAME/YOUR_REPO_NAME` with your GitHub details
- This command will open a browser for GitHub authentication
- The deployment token will be automatically configured

### 5. Configure Environment Variables

```bash
# Set all required environment variables
az staticwebapp appsettings set \
  --name dashboard-static-app \
  --resource-group rg-dashboard-static \
  --setting-names \
    VITE_CRAWL4AI_API_URL=
    VITE_CRAWL4AI_API_KEY="Bearer your_actual_api_key" \
    VITE_SUPABASE_URL="your_actual_supabase_url" \
    VITE_SUPABASE_ANON_KEY="your_actual_supabase_anon_key" \
    VITE_CRAWL4AI_MAX_DEPTH="10" \
    VITE_CRAWL4AI_MAX_PAGES="5000" \
    VITE_CRAWL4AI_STRATEGY="bfs" \
    VITE_CRAWL4AI_BATCH_SIZE="50" \
    VITE_CRAWL4AI_COOL_OFF_DELAY="5000" \
    VITE_CRAWL4AI_MAX_RETRIES="3"
```

**Replace the placeholder values with your actual:**
- API key for Crawl4AI
- Supabase URL and anonymous key

## Management Commands

### View Configuration

```bash
# Show Static Web App details
az staticwebapp show \
  --name dashboard-static-app \
  --resource-group rg-dashboard-static \
  --output table

# List environment variables
az staticwebapp appsettings list \
  --name dashboard-static-app \
  --resource-group rg-dashboard-static \
  --output table

# Get deployment token
az staticwebapp secrets list \
  --name dashboard-static-app \
  --resource-group rg-dashboard-static \
  --query "properties.apiKey" \
  --output tsv
```

### Manage Environments

```bash
# List all environments (production + preview)
az staticwebapp environment list \
  --name dashboard-static-app \
  --resource-group rg-dashboard-static \
  --output table

# Show environment details
az staticwebapp environment show \
  --name dashboard-static-app \
  --resource-group rg-dashboard-static \
  --environment-name default \
  --output table
```

### Custom Domain (Optional)

```bash
# Add custom domain
az staticwebapp hostname set \
  --name dashboard-static-app \
  --resource-group rg-dashboard-static \
  --hostname yourdomain.com

# List custom domains
az staticwebapp hostname list \
  --name dashboard-static-app \
  --resource-group rg-dashboard-static \
  --output table

# Delete custom domain
az staticwebapp hostname delete \
  --name dashboard-static-app \
  --resource-group rg-dashboard-static \
  --hostname yourdomain.com
```

### User Access Management

```bash
# Create user invitation
az staticwebapp users invite \
  --name dashboard-static-app \
  --resource-group rg-dashboard-static \
  --invitation-expiration-in-hours 24 \
  --domain yourdomain.com \
  --provider github \
  --user-details "user@example.com" \
  --roles "contributor"

# List users
az staticwebapp users list \
  --name dashboard-static-app \
  --resource-group rg-dashboard-static \
  --output table
```

## Monitoring and Diagnostics

### Application Insights Integration

```bash
# Create Application Insights resource
az monitor app-insights component create \
  --app dashboard-insights \
  --location "West Europe" \
  --resource-group rg-dashboard-static \
  --output table

# Get instrumentation key
az monitor app-insights component show \
  --app dashboard-insights \
  --resource-group rg-dashboard-static \
  --query "instrumentationKey" \
  --output tsv

# Add Application Insights to Static Web App
az staticwebapp appsettings set \
  --name dashboard-static-app \
  --resource-group rg-dashboard-static \
  --setting-names \
    APPINSIGHTS_INSTRUMENTATIONKEY="your-instrumentation-key"
```

### Logs and Diagnostics

```bash
# Enable diagnostic settings (requires Log Analytics workspace)
az monitor diagnostic-settings create \
  --name dashboard-diagnostics \
  --resource dashboard-static-app \
  --resource-group rg-dashboard-static \
  --resource-type Microsoft.Web/staticSites \
  --workspace your-log-analytics-workspace-id \
  --logs '[{"category": "FunctionAppLogs", "enabled": true}]'
```

## Cleanup Commands

### Remove Individual Components

```bash
# Delete custom domain
az staticwebapp hostname delete \
  --name dashboard-static-app \
  --resource-group rg-dashboard-static \
  --hostname yourdomain.com

# Delete Static Web App
az staticwebapp delete \
  --name dashboard-static-app \
  --resource-group rg-dashboard-static \
  --yes
```

### Complete Cleanup

```bash
# Delete entire resource group (removes all resources)
az group delete \
  --name rg-dashboard-static \
  --yes \
  --no-wait
```

## Automation Scripts

### Complete Setup Script

Create `deploy.sh`:

```bash
#!/bin/bash

# Configuration
RESOURCE_GROUP="rg-dashboard-static"
STATIC_APP_NAME="dashboard-static-app"
LOCATION="West Europe"
GITHUB_REPO="YOUR_USERNAME/YOUR_REPO_NAME"

# Login check
echo "Checking Azure login status..."
az account show > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Please login to Azure first: az login"
    exit 1
fi

# Create resource group
echo "Creating resource group..."
az group create \
  --name $RESOURCE_GROUP \
  --location "$LOCATION"

# Create Static Web App
echo "Creating Static Web App..."
az staticwebapp create \
  --name $STATIC_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --source https://github.com/$GITHUB_REPO \
  --location "$LOCATION" \
  --branch main \
  --app-location "/" \
  --api-location "" \
  --output-location "dist" \
  --login-with-github

echo "Deployment complete!"
echo "Don't forget to:"
echo "1. Configure environment variables"
echo "2. Add GitHub Secrets"
echo "3. Push your code to trigger deployment"
```

Make executable and run:
```bash
chmod +x deploy.sh
./deploy.sh
```

### Environment Variables Script

Create `set-env-vars.sh`:

```bash
#!/bin/bash

# Configuration
RESOURCE_GROUP="rg-dashboard-static"
STATIC_APP_NAME="dashboard-static-app"

# Prompt for sensitive values
read -p "Enter Crawl4AI API Key: " CRAWL_API_KEY
read -p "Enter Supabase URL: " SUPABASE_URL
read -s -p "Enter Supabase Anon Key: " SUPABASE_KEY
echo

# Set environment variables
az staticwebapp appsettings set \
  --name $STATIC_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --setting-names \
    VITE_CRAWL4AI_API_URL=
    VITE_CRAWL4AI_API_KEY="Bearer $CRAWL_API_KEY" \
    VITE_SUPABASE_URL="$SUPABASE_URL" \
    VITE_SUPABASE_ANON_KEY="$SUPABASE_KEY" \
    VITE_CRAWL4AI_MAX_DEPTH="10" \
    VITE_CRAWL4AI_MAX_PAGES="5000" \
    VITE_CRAWL4AI_STRATEGY="bfs" \
    VITE_CRAWL4AI_BATCH_SIZE="50" \
    VITE_CRAWL4AI_COOL_OFF_DELAY="5000" \
    VITE_CRAWL4AI_MAX_RETRIES="3"

echo "Environment variables configured successfully!"
```

## Troubleshooting

### Common CLI Issues

1. **Authentication Errors**
   ```bash
   # Clear cached credentials
   az logout
   az login --use-device-code
   ```

2. **Extension Issues**
   ```bash
   # Update extensions
   az extension update --name staticwebapp
   
   # Reinstall if needed
   az extension remove --name staticwebapp
   az extension add --name staticwebapp
   ```

3. **Resource Conflicts**
   ```bash
   # Check if name is available
   az staticwebapp show --name dashboard-static-app --resource-group rg-dashboard-static
   
   # Use different name if exists
   az staticwebapp create --name dashboard-static-app-2 ...
   ```

### Verification Commands

```bash
# Check resource group exists
az group exists --name rg-dashboard-static

# Verify Static Web App status
az staticwebapp show \
  --name dashboard-static-app \
  --resource-group rg-dashboard-static \
  --query "{name:name,state:repositoryUrl,defaultHostname:defaultHostname}"

# Test deployment
curl -I https://dashboard-static-app.azurestaticapps.net
```

## Next Steps

After running these commands:

1. **Push your code** to GitHub to trigger the first deployment
2. **Configure GitHub Secrets** for the CI/CD pipeline
3. **Test the application** at the provided URL
4. **Set up monitoring** and alerts as needed
5. **Configure custom domain** if required

Your application will be available at:
`https://dashboard-static-app.azurestaticapps.net`
