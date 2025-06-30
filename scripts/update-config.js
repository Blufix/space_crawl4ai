#!/usr/bin/env node
/**
 * Build-time script to replace placeholders in staticwebapp.config.json
 * This ensures no sensitive data is committed to the repository
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '../public/staticwebapp.config.json');

// Read the configuration file
let configContent = fs.readFileSync(configPath, 'utf8');

// Debug: Log environment variables (without exposing values)
console.log('🔍 Environment check:');
console.log(`  AZURE_TENANT_ID: ${process.env.AZURE_TENANT_ID ? 'SET' : 'NOT_SET'}`);
console.log(`  AZURE_DOMAIN_HINT: ${process.env.AZURE_DOMAIN_HINT ? 'SET' : 'NOT_SET'}`);

// Environment variables that should be set in GitHub Actions or Azure DevOps
const replacements = {
  '{AZURE_TENANT_ID}': process.env.AZURE_TENANT_ID || '{AZURE_TENANT_ID}',
  '{AZURE_DOMAIN_HINT}': process.env.AZURE_DOMAIN_HINT || '{AZURE_DOMAIN_HINT}'
};

// Replace placeholders with actual values
for (const [placeholder, value] of Object.entries(replacements)) {
  configContent = configContent.replace(new RegExp(placeholder, 'g'), value);
}

// Write the updated configuration
fs.writeFileSync(configPath, configContent);

console.log('✅ Configuration file updated with environment variables');
console.log('Replacements made:');
Object.entries(replacements).forEach(([key, value]) => {
  const displayValue = value.startsWith('{') ? 'NOT_SET' : '***SET***';
  console.log(`  ${key} -> ${displayValue}`);
});

// Validate that all placeholders were replaced
if (configContent.includes('{AZURE_')) {
  console.warn('⚠️  Warning: Some placeholders were not replaced. Check environment variables.');
  console.warn('📋  Please configure these GitHub repository secrets:');
  console.warn('   - AZURE_TENANT_ID');
  console.warn('   - AZURE_DOMAIN_HINT');
  console.warn('📖  See docs/github-secrets-setup.md for detailed setup instructions');
  process.exit(1);
}

console.log('🚀 Configuration ready for deployment');