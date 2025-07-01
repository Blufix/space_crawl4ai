# 🚀 Deployment Checklist for Secured Crawl4AI Dashboard

## ✅ **Pre-Deployment Checklist**

### **1. Azure Entra ID Setup**
- [ ] App registration created in Azure Entra ID
- [ ] Redirect URIs configured correctly
- [ ] Client secret generated and noted down
- [ ] Application and Tenant IDs recorded

### **2. Configuration Updates**
- [ ] `staticwebapp.config.json` updated with correct:
  - [ ] Tenant ID in `openIdIssuer`
  - [ ] Domain hint for your organization
- [ ] Authentication wrapper integrated in App.tsx

### **3. Static Web App Configuration**
- [ ] Application settings added:
  - [ ] `AZURE_CLIENT_ID` = Your Application ID
  - [ ] `AZURE_CLIENT_SECRET` = Your Client Secret

## 🔧 **Deployment Steps**

### **Step 1: Update Configuration File**

Before deploying, update your `staticwebapp.config.json`:

```json
{
  "openIdIssuer": "https://login.microsoftonline.com/YOUR-TENANT-ID/v2.0",
  "domain_hint": "YOUR-DOMAIN.onmicrosoft.com"
}
```

Replace:
- `YOUR-TENANT-ID` with your actual Directory (tenant) ID
- `YOUR-DOMAIN` with your organization domain

### **Step 2: Commit and Deploy**

```bash
# Commit the configuration changes
git add .
git commit -m "Add Azure Entra ID authentication"
git push origin main

# GitHub Actions will automatically deploy
```

### **Step 3: Configure Static Web App Settings**

1. Go to Azure Portal → Your Static Web App
2. Navigate to **Configuration** → **Application settings**
3. Add the environment variables:
   - `AZURE_CLIENT_ID`: Your app registration client ID
   - `AZURE_CLIENT_SECRET`: Your client secret value

### **Step 4: Test Authentication**

1. Navigate to your Static Web App URL
2. Verify redirect to Microsoft login
3. Test with organizational account
4. Confirm access to dashboard

## 🧪 **Testing Checklist**

### **Authentication Flow**
- [ ] Unauthenticated users are redirected to login
- [ ] Organizational users can log in successfully
- [ ] External users are denied access
- [ ] Logout functionality works correctly

### **Application Functionality**
- [ ] Dashboard loads after authentication
- [ ] Table selection works
- [ ] Crawling functionality operational
- [ ] Search features working
- [ ] Rocket animation functioning

### **Security Verification**
- [ ] Direct URL access requires authentication
- [ ] API endpoints protected
- [ ] User information displayed correctly
- [ ] Session management working

## 🔍 **Post-Deployment Verification**

### **Test URLs**
Test these endpoints to verify setup:

1. **Main App**: `https://YOUR-APP.azurestaticapps.net/`
   - Should redirect to login if not authenticated

2. **Login**: `https://YOUR-APP.azurestaticapps.net/login`
   - Should redirect to Microsoft login

3. **User Info**: `https://YOUR-APP.azurestaticapps.net/.auth/me`
   - Should show user details when authenticated

4. **Logout**: `https://YOUR-APP.azurestaticapps.net/logout`
   - Should log out and redirect

### **Expected Authentication Response**
```json
{
  "clientPrincipal": {
    "identityProvider": "aad",
    "userId": "unique-user-id",
    "userDetails": "user@yourdomain.com",
    "userRoles": ["anonymous", "authenticated"]
  }
}
```

## 🛠️ **Troubleshooting Guide**

### **Common Issues & Solutions**

1. **"Redirect URI mismatch" error**
   - Check App Registration redirect URIs
   - Ensure exact match with Static Web App URL
   - Include `/.auth/login/aad/callback` path

2. **Still accessible without login**
   - Verify `staticwebapp.config.json` deployed correctly
   - Check application settings in Static Web App
   - Ensure routes have `"allowedRoles": ["authenticated"]`

3. **Login loop or authentication errors**
   - Verify tenant ID in configuration
   - Check client secret hasn't expired
   - Validate domain hint is correct

4. **App functionality broken after auth**
   - Check browser console for errors
   - Verify all API calls include authentication
   - Test with network tab open

### **Debug Steps**

1. **Check deployment logs** in GitHub Actions
2. **Inspect network requests** during login flow  
3. **Verify environment variables** in Static Web App settings
4. **Test with different browsers** and incognito mode

## 📋 **Security Best Practices**

### **Ongoing Maintenance**
- [ ] Set up client secret expiration alerts
- [ ] Monitor sign-in logs in Azure AD
- [ ] Regular security reviews
- [ ] Keep authentication configuration updated

### **Access Management**
- [ ] Document authorized users
- [ ] Set up conditional access policies if needed
- [ ] Regular access reviews
- [ ] Monitor for suspicious activity

## 🎯 **Success Criteria**

Your deployment is successful when:

✅ **Only organizational users can access the app**  
✅ **External users are denied access**  
✅ **All dashboard functionality works after authentication**  
✅ **User information is displayed correctly**  
✅ **Login/logout flow works smoothly**  

## 🆘 **Support**

If you encounter issues:

1. **Check the troubleshooting section** in `azure_entra_authentication_setup.md`
2. **Review Azure AD sign-in logs** for authentication errors
3. **Verify GitHub Actions deployment** completed successfully
4. **Test with the debug endpoints** listed above

Your Crawl4AI Dashboard is now secured with enterprise-grade authentication! 🔐🚀