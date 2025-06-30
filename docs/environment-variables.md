# Environment Variables Configuration

## Overview

This document outlines all environment variables required for the Dashboard application deployment.

## Required Environment Variables

### Crawl4AI Configuration

| Variable | Description | Example Value | Required |
|----------|-------------|---------------|----------|
| `VITE_CRAWL4AI_API_URL` | Crawl4AI API endpoint | `your url` | Yes |
| `VITE_CRAWL4AI_API_KEY` | API authentication key | `Bearer your_api_key_here` | Yes |
| `VITE_CRAWL4AI_MAX_DEPTH` | Maximum crawl depth | `10` | No |
| `VITE_CRAWL4AI_MAX_PAGES` | Maximum pages to crawl | `5000` | No |
| `VITE_CRAWL4AI_STRATEGY` | Crawling strategy | `bfs` | No |
| `VITE_CRAWL4AI_BATCH_SIZE` | Batch processing size | `50` | No |
| `VITE_CRAWL4AI_COOL_OFF_DELAY` | Delay between requests (ms) | `5000` | No |
| `VITE_CRAWL4AI_MAX_RETRIES` | Maximum retry attempts | `3` | No |

### Supabase Configuration

| Variable | Description | Example Value | Required |
|----------|-------------|---------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://your-project.supabase.co` | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Yes |

## Configuration Methods

### 1. Local Development (.env file)

Create a `.env` file in the project root:

```bash
# Crawl4AI Configuration
VITE_CRAWL4AI_API_URL=
VITE_CRAWL4AI_API_KEY=Bearer your_api_key_here
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Crawl4AI Native Deep Crawling Configuration
VITE_CRAWL4AI_MAX_DEPTH=10
VITE_CRAWL4AI_MAX_PAGES=5000
VITE_CRAWL4AI_STRATEGY=bfs

# Intelligent Batching Configuration
VITE_CRAWL4AI_BATCH_SIZE=50
VITE_CRAWL4AI_COOL_OFF_DELAY=5000
VITE_CRAWL4AI_MAX_RETRIES=3
```

### 2. Azure Static Web Apps

#### Via Azure CLI

```bash
az staticwebapp appsettings set \
  --name dashboard-static-app \
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

#### Via Azure Portal

1. Navigate to your Static Web App in Azure Portal
2. Go to **Configuration** in the left menu
3. Click **+ Add** for each environment variable
4. Enter the name and value for each variable
5. Click **Save**

### 3. GitHub Secrets (for CI/CD)

Add these secrets in your GitHub repository:

**Repository Settings → Secrets and variables → Actions → New repository secret**

1. `AZURE_STATIC_WEB_APPS_API_TOKEN`
2. `VITE_CRAWL4AI_API_URL`
3. `VITE_CRAWL4AI_API_KEY`
4. `VITE_SUPABASE_URL`
5. `VITE_SUPABASE_ANON_KEY`
6. `VITE_CRAWL4AI_MAX_DEPTH`
7. `VITE_CRAWL4AI_MAX_PAGES`
8. `VITE_CRAWL4AI_STRATEGY`
9. `VITE_CRAWL4AI_BATCH_SIZE`
10. `VITE_CRAWL4AI_COOL_OFF_DELAY`
11. `VITE_CRAWL4AI_MAX_RETRIES`

## Security Best Practices

### 1. Environment Variable Handling

- ✅ **DO**: Use environment variables for all sensitive data
- ✅ **DO**: Use different values for development/production
- ✅ **DO**: Use GitHub Secrets for CI/CD pipelines
- ❌ **DON'T**: Commit `.env` files to version control
- ❌ **DON'T**: Hard-code sensitive values in source code

### 2. Access Control

- Limit access to environment variables in Azure Portal
- Use principle of least privilege for API keys
- Regularly rotate API keys and tokens
- Monitor usage of API endpoints

### 3. Development vs Production

#### Development Environment
```bash
# Use development/staging endpoints
VITE_CRAWL4AI_API_URL=https://dev-api.example.com
VITE_SUPABASE_URL=https://dev-project.supabase.co
```

#### Production Environment
```bash
# Use production endpoints
VITE_CRAWL4AI_API_URL=
VITE_SUPABASE_URL=https://prod-project.supabase.co
```

## Validation and Testing

### 1. Environment Variable Validation

The application validates environment variables on startup:

```typescript
// Example validation in src/services/supabase.ts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required Supabase configuration');
}
```

### 2. Testing Configuration

```bash
# Test build with environment variables
npm run build

# Check if variables are loaded correctly
npm run dev
```

### 3. Runtime Verification

Monitor browser console for configuration warnings:
- Supabase connection status
- API endpoint accessibility
- Environment variable presence

## Troubleshooting

### Common Issues

1. **Variables Not Loading**
   - Ensure variables start with `VITE_` prefix
   - Restart development server after adding variables
   - Check for typos in variable names

2. **Build Failures**
   - Verify all required variables are set
   - Check GitHub Secrets are configured
   - Ensure Azure configuration is complete

3. **Runtime Errors**
   - Check browser network tab for API call failures
   - Verify API endpoints are accessible
   - Check CORS configuration on APIs

### Debugging Commands

```bash
# Check current environment variables in build
npm run build 2>&1 | grep -i "env\|vite_"

# Verify Azure Static Web Apps configuration
az staticwebapp appsettings list --name dashboard-static-app

# Check GitHub repository secrets (names only)
gh secret list
```

## Environment Templates

### Development Template (.env.local)
```bash
# Copy this template for local development
VITE_CRAWL4AI_API_URL=http://localhost:8000
VITE_CRAWL4AI_API_KEY=Bearer dev_key
VITE_SUPABASE_URL=https://dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=dev_anon_key
VITE_CRAWL4AI_MAX_DEPTH=3
VITE_CRAWL4AI_MAX_PAGES=100
VITE_CRAWL4AI_STRATEGY=bfs
VITE_CRAWL4AI_BATCH_SIZE=10
VITE_CRAWL4AI_COOL_OFF_DELAY=1000
VITE_CRAWL4AI_MAX_RETRIES=2
```

### Production Template
```bash
# Production values (use in Azure/GitHub Secrets)
VITE_CRAWL4AI_API_URL=
VITE_CRAWL4AI_API_KEY=Bearer prod_api_key
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=prod_anon_key
VITE_CRAWL4AI_MAX_DEPTH=10
VITE_CRAWL4AI_MAX_PAGES=5000
VITE_CRAWL4AI_STRATEGY=bfs
VITE_CRAWL4AI_BATCH_SIZE=50
VITE_CRAWL4AI_COOL_OFF_DELAY=5000
VITE_CRAWL4AI_MAX_RETRIES=3
```
