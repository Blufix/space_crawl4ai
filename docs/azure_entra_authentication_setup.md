# 🔐 Azure Entra ID Authentication Setup Guide

This guide will help you restrict access to your Static Web App so only people in your organization can log in.

## 📋 **Prerequisites**

- Azure subscription with appropriate permissions
- Static Web App already deployed
- Admin access to Azure Entra ID (Azure AD)

## 🚀 **Step 1: Create Entra ID App Registration**

1. **Navigate to Azure Portal:**
   - Go to [portal.azure.com](https://portal.azure.com)
   - Search for "Azure Active Directory" or "Entra ID"

2. **Create App Registration:**
   - Click **App registrations** → **New registration**
   - **Name**: `Crawl4AI Dashboard` (or your preferred name)
   - **Supported account types**: `Accounts in this organizational directory only (Single tenant)`
   - **Redirect URI**: Select `Web` and enter:
     ```
     https://YOUR-STATIC-APP-NAME.azurestaticapps.net/.auth/login/aad/callback
     ```
   - Click **Register**

3. **Note Important Values:**
   After registration, copy these values:
   - **Application (client) ID**: `12345678-1234-1234-1234-123456789012`
   - **Directory (tenant) ID**: `87654321-4321-4321-4321-210987654321`

## 🔧 **Step 2: Configure Authentication**

### **A. Set up Redirect URIs**

1. Go to **Authentication** in your app registration
2. **Add platform** → **Web**
3. **Add these Redirect URIs:**
   ```
   https://YOUR-STATIC-APP-NAME.azurestaticapps.net/.auth/login/aad/callback
   ```
4. **Front-channel logout URL:**
   ```
   https://YOUR-STATIC-APP-NAME.azurestaticapps.net/.auth/logout
   ```
5. **Enable these token types:**
   - ✅ Access tokens (used for implicit flows)
   - ✅ ID tokens (used for implicit and hybrid flows)

### **B. Create Client Secret**

1. Go to **Certificates & secrets**
2. **New client secret**
3. **Description**: `Static Web App Authentication`
4. **Expires**: Choose `24 months` (or as per your policy)
5. **Copy the secret value** immediately (you won't see it again!)

## ⚙️ **Step 3: Configure Static Web App**

### **A. Add Environment Variables**

1. Go to your **Static Web App** in Azure Portal
2. Click **Configuration** → **Application settings**
3. **Add these settings:**

   | Name | Value |
   |------|-------|
   | `AZURE_CLIENT_ID` | `YOUR_APPLICATION_CLIENT_ID` |
   | `AZURE_CLIENT_SECRET` | `YOUR_CLIENT_SECRET_VALUE` |

### **B. Update Configuration File**

The `staticwebapp.config.json` file has been updated with authentication settings. You need to replace the placeholders:

1. **Replace `{TENANT_ID}`** with your actual Directory (tenant) ID
2. **Replace `{YOUR_DOMAIN}`** with your organization domain (e.g., `contoso`)

Example:
```json
"openIdIssuer": "https://login.microsoftonline.com/87654321-4321-4321-4321-210987654321/v2.0",
"domain_hint": "contoso.onmicrosoft.com"
```

## 🌐 **Step 4: Deploy Updated Configuration**

1. **Commit the changes:**
   ```bash
   git add public/staticwebapp.config.json
   git commit -m "Add Azure Entra ID authentication"
   git push
   ```

2. **Wait for deployment** (GitHub Actions will automatically deploy)

## ✅ **Step 5: Test Authentication**

1. **Navigate to your Static Web App URL**
2. **You should be redirected to Microsoft login**
3. **Sign in with your organizational account**
4. **You should be redirected back to your app**

### **Test URLs:**
- **Login**: `https://YOUR-APP.azurestaticapps.net/login`
- **Logout**: `https://YOUR-APP.azurestaticapps.net/logout`
- **User Info**: `https://YOUR-APP.azurestaticapps.net/.auth/me`

## 🔍 **Verification**

### **Check Authentication Status:**
Navigate to `https://YOUR-APP.azurestaticapps.net/.auth/me` to see user information:

```json
{
  "clientPrincipal": {
    "identityProvider": "aad",
    "userId": "user-id-here",
    "userDetails": "user@yourdomain.com",
    "userRoles": ["anonymous", "authenticated"]
  }
}
```

## 🛠️ **Troubleshooting**

### **Common Issues:**

1. **Redirect URI Mismatch:**
   - Ensure the redirect URI in Entra ID exactly matches your Static Web App URL
   - Include the full path: `/.auth/login/aad/callback`

2. **Client Secret Expired:**
   - Check if the client secret has expired
   - Generate a new secret and update the Static Web App configuration

3. **Tenant Configuration:**
   - Verify the tenant ID is correct in the `openIdIssuer` URL
   - Check that the domain hint matches your organization

4. **Still Accessible Without Login:**
   - Ensure the configuration has been deployed
   - Check that routes are configured with `"allowedRoles": ["authenticated"]`

### **Debug Steps:**

1. **Check Application Settings:**
   - Verify `AZURE_CLIENT_ID` and `AZURE_CLIENT_SECRET` are set correctly

2. **Validate Configuration:**
   - Ensure `staticwebapp.config.json` is in the `public` folder
   - Check JSON syntax is valid

3. **Check Deployment:**
   - Verify GitHub Actions deployment completed successfully
   - Check deployment logs for any configuration errors

## 🔐 **Security Best Practices**

1. **Regular Secret Rotation:**
   - Set client secret expiration to 24 months maximum
   - Set up alerts before expiration

2. **Monitor Access:**
   - Review sign-in logs in Azure AD
   - Set up conditional access policies if needed

3. **Principle of Least Privilege:**
   - Only grant access to users who need it
   - Consider using Azure AD groups for role-based access

## 📱 **Optional: Add Login/Logout UI**

You can add login/logout buttons to your app:

```typescript
// Check if user is authenticated
fetch('/.auth/me')
  .then(response => response.json())
  .then(data => {
    if (data.clientPrincipal) {
      // User is logged in
      console.log('User:', data.clientPrincipal.userDetails);
    } else {
      // Redirect to login
      window.location.href = '/login';
    }
  });
```

## 🎯 **Next Steps**

1. **Test with different organizational users**
2. **Set up monitoring and alerts**
3. **Consider implementing role-based access control**
4. **Document the process for your team**

Your Crawl4AI Dashboard is now secured with Azure Entra ID and only accessible to users in your organization! 🎉