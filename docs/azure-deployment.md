# Azure Static Web Apps Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Dashboard application to Azure Static Web Apps using GitHub Actions for CI/CD in the West Europe region.

## Project Details

- **Framework**: React + TypeScript + Vite
- **Build Output**: `dist/` directory
- **Backend**: Supabase (external)
- **Environment**: Production-ready with environment variables
- **Region**: West Europe
- **CI/CD**: GitHub Actions

## Prerequisites

1. **Azure CLI** installed and configured
2. **GitHub repository** with your code
3. **Azure subscription** with appropriate permissions
4. **Environment variables** ready (see Configuration section)

### Install Azure CLI Extensions

```bash
# Install Static Web Apps extension
az extension add --name staticwebapp
```

## Step 1: Azure Resource Setup

### 1.1 Login to Azure

```bash
# Login to your Azure account
az login

# Verify your subscription
az account show
```

### 1.2 Create Resource Group

```bash
# Create resource group in West Europe
az group create \
  --name rg-dashboard-static \
  --location "West Europe"
```

### 1.3 Create Static Web App

```bash
# Create static web app with GitHub integration
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

**Replace `YOUR_USERNAME/YOUR_REPO_NAME` with your actual GitHub repository.**

## Step 2: Environment Variables Configuration

### 2.1 Required Environment Variables

Your application requires these environment variables:

```bash
VITE_CRAWL4AI_API_URL=
VITE_CRAWL4AI_API_KEY=Bearer your_api_key_here
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_CRAWL4AI_MAX_DEPTH=10
VITE_CRAWL4AI_MAX_PAGES=5000
VITE_CRAWL4AI_STRATEGY=bfs
VITE_CRAWL4AI_BATCH_SIZE=50
VITE_CRAWL4AI_COOL_OFF_DELAY=5000
VITE_CRAWL4AI_MAX_RETRIES=3
```

### 2.2 Configure in Azure Static Web Apps

```bash
# Set environment variables in Azure
az staticwebapp appsettings set \
  --name dashboard-static-app \
  --setting-names \
    VITE_CRAWL4AI_API_URL="https://aca-crawl4ai.delightfulhill-db34dc69.westeurope.azurecontainerapps.io" \
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

### 2.3 Configure GitHub Secrets

Add these secrets in your GitHub repository (Settings → Secrets and variables → Actions):

1. `AZURE_STATIC_WEB_APPS_API_TOKEN` - Get from Azure Portal
2. `VITE_CRAWL4AI_API_URL` - Your Crawl4AI API endpoint
3. `VITE_CRAWL4AI_API_KEY` - Your API key
4. `VITE_SUPABASE_URL` - Your Supabase project URL
5. `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
6. `VITE_CRAWL4AI_MAX_DEPTH` - "10"
7. `VITE_CRAWL4AI_MAX_PAGES` - "5000"
8. `VITE_CRAWL4AI_STRATEGY` - "bfs"
9. `VITE_CRAWL4AI_BATCH_SIZE` - "50"
10. `VITE_CRAWL4AI_COOL_OFF_DELAY` - "5000"
11. `VITE_CRAWL4AI_MAX_RETRIES` - "3"

## Step 3: Get Azure Static Web Apps API Token

### 3.1 Via Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Static Web App resource
3. Go to **Overview** → **Manage deployment token**
4. Copy the deployment token
5. Add it as `AZURE_STATIC_WEB_APPS_API_TOKEN` in GitHub Secrets

### 3.2 Via Azure CLI

```bash
# Get the deployment token
az staticwebapp secrets list --name dashboard-static-app --query "properties.apiKey"
```

## Step 4: GitHub Actions Workflow

The GitHub Actions workflow will be automatically created when you set up the Static Web App. However, you can customize it by creating `.github/workflows/azure-static-web-apps.yml` in your repository.

## Step 5: Deployment Process

### 5.1 Push to GitHub

```bash
# Add all files
git add .

# Commit changes
git commit -m "Add Azure Static Web Apps deployment configuration"

# Push to main branch
git push origin main
```

### 5.2 Monitor Deployment

1. Check GitHub Actions tab in your repository
2. Monitor the deployment progress
3. Check Azure Portal for deployment status

## Step 6: Access Your Application

Once deployed, your application will be available at:

```
https://dashboard-static-app.azurestaticapps.net
```

You can also find the URL in:
- Azure Portal → Your Static Web App → Overview → URL
- GitHub Actions deployment logs

## Custom Domain (Optional)

### Add Custom Domain

```bash
# Add custom domain
az staticwebapp hostname set \
  --name dashboard-static-app \
  --hostname yourdomain.com
```

## Monitoring and Logs

### View Application Insights

```bash
# Enable Application Insights (optional)
az staticwebapp appsettings set \
  --name dashboard-static-app \
  --setting-names \
    APPINSIGHTS_INSTRUMENTATIONKEY="your-app-insights-key"
```

### View Deployment History

```bash
# List deployments
az staticwebapp environment list \
  --name dashboard-static-app
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check TypeScript errors
   - Verify environment variables
   - Check GitHub Actions logs

2. **Runtime Errors**
   - Verify environment variables in Azure
   - Check browser console for errors
   - Verify API endpoints are accessible

3. **Deployment Token Issues**
   - Regenerate token in Azure Portal
   - Update GitHub Secrets

### Useful Commands

```bash
# Check static web app status
az staticwebapp show --name dashboard-static-app

# View environment variables
az staticwebapp appsettings list --name dashboard-static-app

# Delete static web app (if needed)
az staticwebapp delete --name dashboard-static-app
```

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to GitHub
2. **API Keys**: Use GitHub Secrets for all sensitive values
3. **CORS**: Ensure your APIs allow requests from your domain
4. **Authentication**: Configure Supabase RLS policies appropriately

## Performance Optimization

1. **Bundle Size**: Current build is ~525KB (acceptable for Static Web Apps)
2. **Caching**: Azure Static Web Apps provides automatic CDN caching
3. **Compression**: Gzip compression is enabled by default

## Cost Estimation

- **Azure Static Web Apps**: Free tier includes 100GB bandwidth/month
- **Supabase**: External service (separate billing)
- **GitHub Actions**: 2000 minutes/month free for public repos

## Next Steps

1. Set up custom domain (optional)
2. Configure monitoring and alerts
3. Set up staging environments for testing
4. Implement automated testing in CI/CD pipeline

## Support

For issues related to:
- **Azure Static Web Apps**: [Azure Documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- **GitHub Actions**: [GitHub Actions Documentation](https://docs.github.com/en/actions)
- **Supabase**: [Supabase Documentation](https://supabase.com/docs)
