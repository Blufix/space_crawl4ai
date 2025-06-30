# 🔧 Authentication Troubleshooting Guide

## 🚨 401 Unauthorized Error

If you're getting a "401: Unauthorized" error, follow these steps:

### **Step 1: Check App Registration Settings**

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Select your app registration
3. **Verify Application Type**:
   - Go to **Authentication**
   - Under **Platform configurations**, ensure you have **Web** (not SPA)
   - If it's SPA, delete it and add a **Web** platform

### **Step 2: Configure Redirect URIs**

1. In your app registration → **Authentication**
2. Under **Web** → **Redirect URIs**, add:
   ```
   https://YOUR-STATIC-WEB-APP-URL/.auth/login/aad/callback
   ```
   Replace `YOUR-STATIC-WEB-APP-URL` with your actual Static Web App URL

3. **Also add** (for testing):
   ```
   https://YOUR-STATIC-WEB-APP-URL/.auth/login/aad/callback
   https://YOUR-STATIC-WEB-APP-URL/
   ```

### **Step 3: Verify Client Secret**

1. Go to **Certificates & secrets**
2. Check if your client secret is still valid (not expired)
3. If expired, create a new one and update your Static Web App settings

### **Step 4: Check Static Web App Configuration**

1. Go to your Azure Static Web App in the portal
2. Navigate to **Configuration** → **Application settings**
3. Verify these settings exist:
   - `AZURE_CLIENT_ID` = Your app registration Client ID
   - `AZURE_CLIENT_SECRET` = Your client secret value

### **Step 5: Verify Domain and Tenant**

1. Check your GitHub secrets:
   - `AZURE_TENANT_ID` = Your Directory (tenant) ID
   - `AZURE_DOMAIN_HINT` = Your organization domain (e.g., `contoso.onmicrosoft.com`)

### **Step 6: Test Authentication Endpoint**

Visit these URLs to debug:

1. **User Info** (when logged in):
   ```
   https://YOUR-STATIC-WEB-APP-URL/.auth/me
   ```

2. **Manual Login**:
   ```
   https://YOUR-STATIC-WEB-APP-URL/.auth/login/aad
   ```

3. **Check Configuration**:
   ```
   https://YOUR-STATIC-WEB-APP-URL/.auth/login/aad?post_login_redirect_url=/
   ```

## 🔍 Common Issues & Solutions

### **Issue: "AADSTS50011: The reply URL specified in the request does not match"**
**Solution**: Add the exact callback URL to your app registration redirect URIs

### **Issue: "AADSTS70001: Application not found"** 
**Solution**: Check your `AZURE_CLIENT_ID` in Static Web App settings

### **Issue: "AADSTS7000215: Invalid client secret"**
**Solution**: Regenerate client secret and update Static Web App settings

### **Issue: Users from other organizations can access**
**Solution**: In app registration → **Authentication** → **Supported account types**, select "Accounts in this organizational directory only"

## 📋 Checklist

- [ ] App registration is type **Web** (not SPA)
- [ ] Redirect URI includes `/.auth/login/aad/callback` 
- [ ] Client secret is valid and correctly set
- [ ] `AZURE_CLIENT_ID` and `AZURE_CLIENT_SECRET` are in Static Web App settings
- [ ] Tenant ID and domain hint are correct in GitHub secrets
- [ ] App registration supports only your organization accounts

## 🆘 Still Having Issues?

1. Check Azure AD sign-in logs for detailed error messages
2. Test the authentication flow in an incognito window
3. Verify the configuration was deployed properly by checking the build logs
4. Use browser developer tools to inspect network requests during login

## 📞 Debug Commands

To get your current configuration values:

```bash
# Check your tenant ID
az account show --query tenantId -o tsv

# List your app registrations  
az ad app list --display-name "YOUR-APP-NAME" --query "[].{appId:appId,displayName:displayName}" -o table
```

Your authentication should work once these settings are correctly configured! 🔐✅