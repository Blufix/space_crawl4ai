# 🔐 GitHub Repository Secrets Setup Guide

This guide explains how to configure the required GitHub repository secrets for secure deployment of your Crawl4AI Dashboard with Azure Entra ID authentication.

## 📋 Required Secrets

Your GitHub repository needs the following secrets configured:

### **Authentication Secrets**
- `AZURE_TENANT_ID` - Your Azure AD tenant ID
- `AZURE_DOMAIN_HINT` - Your organization domain hint
- `AZURE_CLIENT_ID` - Your app registration client ID  
- `AZURE_CLIENT_SECRET` - Your app registration client secret

### **Application Secrets**
- `AZURE_STATIC_WEB_APPS_API_TOKEN` - Static Web App deployment token
- `VITE_CRAWL4AI_API_URL` - Your Crawl4AI API endpoint
- `VITE_CRAWL4AI_API_KEY` - Your Crawl4AI API key
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### **Optional Configuration Secrets**
- `VITE_CRAWL4AI_MAX_DEPTH` - Maximum crawling depth
- `VITE_CRAWL4AI_MAX_PAGES` - Maximum pages per crawl
- `VITE_CRAWL4AI_STRATEGY` - Crawling strategy
- `VITE_CRAWL4AI_BATCH_SIZE` - Batch processing size
- `VITE_CRAWL4AI_COOL_OFF_DELAY` - Delay between requests
- `VITE_CRAWL4AI_MAX_RETRIES` - Maximum retry attempts

## 🛠️ How to Add Secrets

### **Step 1: Navigate to Repository Settings**

1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables**
4. Select **Actions**

### **Step 2: Add Each Secret**

For each required secret:

1. Click **New repository secret**
2. Enter the **Name** (exactly as listed above)
3. Enter the **Value** (see value sources below)
4. Click **Add secret**

## 🔍 Where to Find Secret Values

### **Azure Tenant ID**
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory**
3. Go to **Properties**
4. Copy the **Tenant ID** (GUID format)

**Example**: `12345678-1234-1234-1234-123456789abc`

### **Azure Domain Hint**
Your organization's domain, typically:
- `yourdomain.onmicrosoft.com` (default Azure AD domain)
- `yourdomain.com` (if you have a custom domain)

**Example**: `contoso.onmicrosoft.com`

### **Azure Client ID & Secret**
From your App Registration:
1. Go to **Azure Portal** → **Azure Active Directory** → **App registrations**
2. Select your app registration
3. **Application (client) ID** is on the Overview page
4. For client secret: **Certificates & secrets** → **Client secrets** → Create new or copy existing

### **Static Web Apps API Token**
1. Go to **Azure Portal** → Your Static Web App
2. Navigate to **Overview**
3. Click **Manage deployment token**
4. Copy the deployment token

### **Supabase Credentials**
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy **Project URL** and **anon public** key

### **Crawl4AI Configuration**
These depend on your Crawl4AI setup:
- `VITE_CRAWL4AI_API_URL`: Your API endpoint (e.g., `https://api.crawl4ai.com`)
- `VITE_CRAWL4AI_API_KEY`: Your API authentication key

## ✅ Verification Checklist

After adding all secrets, verify:

- [ ] All required secrets are added with correct names
- [ ] Secret values don't have extra spaces or characters
- [ ] Azure tenant ID is in GUID format
- [ ] Domain hint matches your organization
- [ ] Client secret hasn't expired
- [ ] Static Web App token is valid
- [ ] Supabase URL includes `https://` prefix

## 🚀 Test the Setup

After adding secrets:

1. **Trigger a deployment** by pushing to main branch
2. **Check GitHub Actions** logs for successful secret replacement
3. **Monitor the build** for any missing environment variables
4. **Test the deployed app** for proper authentication

## 🔧 GitHub Actions Integration

Your secrets are automatically used in the workflow:

```yaml
- name: Update configuration with secrets
  env:
    AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
    AZURE_DOMAIN_HINT: ${{ secrets.AZURE_DOMAIN_HINT }}
  run: npm run config:update

- name: Build project
  env:
    VITE_CRAWL4AI_API_URL: ${{ secrets.VITE_CRAWL4AI_API_URL }}
    # ... other secrets
```

## 🛡️ Security Best Practices

### **Secret Management**
- ✅ Use GitHub secrets for all sensitive data
- ✅ Never commit secrets to repository
- ✅ Regularly rotate client secrets
- ✅ Monitor secret usage in Actions logs

### **Access Control**
- ✅ Limit repository access to authorized users
- ✅ Use branch protection rules
- ✅ Review secret access regularly
- ✅ Enable audit logging

## 🚨 Troubleshooting

### **Common Issues**

**Secret not found in Actions**
- Verify secret name matches exactly (case-sensitive)
- Check secret was added to the correct repository
- Ensure no typos in workflow file

**Authentication failures**
- Verify Azure tenant ID and domain hint
- Check client secret hasn't expired
- Confirm client ID is correct

**Build failures**
- Check all required secrets are set
- Verify Supabase and Crawl4AI credentials
- Review GitHub Actions logs for specific errors

### **Debug Steps**

1. **Check workflow logs** for secret replacement messages
2. **Verify secret names** in repository settings
3. **Test Azure credentials** in Azure Portal
4. **Validate Supabase connection** in project dashboard

## 📞 Support

If you encounter issues:

1. Check the **troubleshooting section** above
2. Review **GitHub Actions logs** for detailed error messages
3. Verify **Azure AD configuration** matches your setup
4. Test **individual services** (Supabase, Crawl4AI) separately

## ✨ Success!

Once all secrets are configured, your deployment pipeline will:

🔐 **Automatically replace** configuration placeholders  
🏗️ **Build securely** without exposing sensitive data  
🚀 **Deploy safely** to Azure Static Web Apps  
🛡️ **Protect access** with Azure Entra ID authentication  

Your Crawl4AI Dashboard is now ready for secure, automated deployment! 🎉