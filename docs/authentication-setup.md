# Azure Static Web Apps Authentication Setup Guide

This guide walks you through setting up authentication and authorization for Azure Static Web Apps using Microsoft Entra ID (Azure Active Directory).

## Overview

Azure Static Web Apps provides built-in authentication with multiple providers. This setup uses Microsoft Entra ID for enterprise authentication with support for local development testing.

### Architecture
- **Frontend**: React app running on Vite dev server (port 5173)
- **Backend**: Azure Functions API (./api folder)
- **Local Development**: SWA CLI proxy (port 4280) handles authentication and routes requests
- **Authentication**: Microsoft Entra ID (Azure AD)

## Prerequisites

- Azure subscription with access to create App Registrations
- Azure Static Web App deployed or ready for deployment
- Static Web Apps CLI for local testing: `npm install -g @azure/static-web-apps-cli`

## 1. Entra ID App Registration

### Create App Registration

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Go to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Configure the application:
   - **Name**: `YourApp-StaticWebApp`
   - **Supported account types**: Choose based on your needs
   - **Redirect URI**: Leave blank for now

### Configure Authentication

1. In your app registration, go to **Authentication**
2. Add platform configuration:
   - Click **Add a platform** > **Web**
   - Add redirect URIs:
     ```
     https://your-static-web-app.azurestaticapps.net/.auth/login/aad/callback
     http://localhost:4280/.auth/login/aad/callback
     ```
   - Enable **ID tokens** under Implicit grant and hybrid flows

**Note**: Even though your Vite dev server runs on port 5173, the SWA CLI proxy runs on port 4280 and handles authentication. Always use port 4280 for local authentication testing.

### Note App Details

Record these values for configuration:
- **Application (client) ID**
- **Directory (tenant) ID**

## 2. Static Web App Configuration

### Update staticwebapp.config.json

Your configuration file should include authentication routes:

```json
{
  "routes": [
    {
      "route": "/login",
      "rewrite": "/.auth/login/aad"
    },
    {
      "route": "/logout",
      "redirect": "/.auth/logout"
    },
    {
      "route": "/profile*",
      "allowedRoles": ["authenticated"]
    },
    {
      "route": "/admin/*",
      "allowedRoles": ["administrator"]
    },
    {
      "route": "/api/*",
      "allowedRoles": ["authenticated"]
    }
  ],
  "responseOverrides": {
    "401": {
      "redirect": "/login",
      "statusCode": 302
    }
  }
}
```

## 3. Local Development Setup

### Install SWA CLI

```bash
npm install -g @azure/static-web-apps-cli
```

### Start Local Development

You have two options for local development:

**Option 1: SWA CLI with your existing Vite setup**
```bash
# Start SWA CLI (this will also start your Vite dev server)
swa start http://localhost:5173 --run "npm run dev" --api-location ./api
```

**Option 2: Start services separately**
```bash
# Terminal 1: Start your Vite dev server
npm run dev

# Terminal 2: Start SWA CLI pointing to your running Vite server
swa start http://localhost:5173 --api-location ./api
```

**Important**: Always access your app through `http://localhost:4280` (SWA CLI) for authentication to work, not `http://localhost:5173` (Vite direct).

### Local Authentication Testing

The SWA CLI provides mock authentication for local testing:
- Navigate to `http://localhost:4280`
- Access `/.auth/login/aad` to simulate login
- Use the built-in user interface to test different roles

## 4. Authentication Implementation

### Login Component Example

```typescript
// components/LoginButton.tsx
import React from 'react';

export const LoginButton: React.FC = () => {
  return (
    <a href="/.auth/login/aad" className="btn btn-primary">
      Sign in with Microsoft
    </a>
  );
};
```

### Logout Component Example

```typescript
// components/LogoutButton.tsx
import React from 'react';

export const LogoutButton: React.FC = () => {
  return (
    <a href="/.auth/logout" className="btn btn-secondary">
      Sign out
    </a>
  );
};
```

### User Information Access

```typescript
// Get user information
const getUserInfo = async () => {
  try {
    const response = await fetch('/.auth/me');
    const payload = await response.json();
    const { clientPrincipal } = payload;
    return clientPrincipal;
  } catch (error) {
    console.error('Error fetching user info:', error);
    return null;
  }
};

// Usage
const userInfo = await getUserInfo();
if (userInfo) {
  console.log('User:', userInfo.userDetails);
  console.log('Roles:', userInfo.userRoles);
}
```

## 5. Role Management

### Built-in Roles

Azure Static Web Apps provides these default roles:
- `anonymous`: All users (unauthenticated and authenticated)
- `authenticated`: Any logged-in user

### Custom Roles

Custom roles must be assigned through:
1. **Invitations**: Send invitations with specific roles
2. **Function-based roles**: Use Azure Functions to assign roles programmatically

### Function-based Role Assignment

```javascript
// api/GetRoles/index.js
module.exports = async function (context, req) {
    const user = req.headers['x-ms-client-principal'];
    
    if (user) {
        const userObject = JSON.parse(Buffer.from(user, 'base64').toString('ascii'));
        
        // Assign roles based on user properties
        const roles = ['authenticated'];
        
        if (userObject.userDetails.includes('admin@')) {
            roles.push('administrator');
        }
        
        context.res = {
            status: 200,
            body: {
                roles: roles
            }
        };
    } else {
        context.res = {
            status: 401,
            body: "Unauthorized"
        };
    }
};
```

## 6. Security Configuration

### Content Security Policy

Add CSP headers in your configuration:

```json
{
  "globalHeaders": {
    "content-security-policy": "default-src 'self' https://login.microsoftonline.com; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  }
}
```

### Route Protection

Secure sensitive routes:

```json
{
  "routes": [
    {
      "route": "/admin/*",
      "allowedRoles": ["administrator"]
    },
    {
      "route": "/api/sensitive/*",
      "allowedRoles": ["authenticated"],
      "methods": ["GET", "POST"]
    }
  ]
}
```

## 7. Testing Authentication

### Local Testing Steps

1. Start your application with SWA CLI
2. Navigate to `http://localhost:4280`
3. Try accessing protected routes
4. Use `/.auth/login/aad` to simulate login
5. Test role-based access

### Production Testing

1. Deploy your Static Web App
2. Configure the Entra ID redirect URIs
3. Test authentication flow
4. Verify role assignments work correctly

## 8. Troubleshooting

### Common Issues

**Authentication not working locally:**
- Ensure SWA CLI is running on port 4280
- Check that redirect URIs include localhost

**Roles not assigned:**
- Verify role assignment logic
- Check user invitation status
- Validate custom role functions

**Redirect loops:**
- Check `responseOverrides` configuration
- Ensure login routes are properly configured

### Debug User Information

```typescript
// Debug user info in development
const debugAuth = async () => {
  const response = await fetch('/.auth/me');
  const data = await response.json();
  console.log('Auth data:', data);
};
```

## 9. Production Deployment

### Configuration Checklist

- [ ] Entra ID app registration configured
- [ ] Redirect URIs include production URLs
- [ ] Static Web App configuration deployed
- [ ] Custom roles configured (if needed)
- [ ] Security headers configured
- [ ] Authentication tested end-to-end

### Environment Variables

For API functions requiring additional configuration:

```bash
# In Azure Static Web App settings
AZURE_CLIENT_ID=your-app-client-id
AZURE_TENANT_ID=your-tenant-id
```

## Resources

- [Azure Static Web Apps Documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [Authentication and Authorization](https://docs.microsoft.com/en-us/azure/static-web-apps/authentication-authorization)
- [SWA CLI Documentation](https://azure.github.io/static-web-apps-cli/)
- [Entra ID App Registration](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)