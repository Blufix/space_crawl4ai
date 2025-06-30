📦 Feature Request: Add New Storage Table Component to Dashboard
🔍 Overview
We need to add a new component to the dashboard that allows a user to create a new storage table in Supabase, designed to store crawled documents when our app scans websites.

✅ Requirements
Add Table Creation UI

Build a component that lets the user create a new table in Supabase.

This new table must follow the same schema and function definitions as our existing crawled_pages table.

Reference file:
D:\ai-local-project\dashboard\docs\sql_files\crawled_pages.sql

Database Selector

Add a dropdown or selector in the dashboard UI to allow users to choose the target table/database.

This selection will inform the crawl4ai API where to store the crawled results.

Integration with API

Ensure the selected table name is passed correctly to our crawl4ai API.

Our API is hosted in Azure and the frontend is an Azure Static Web App.

Maintain current Azure configurations—no breaking changes.

Non-Destructive Implementation

The app is currently stable and functional.

Be extremely careful not to break any existing features.

Add this feature as an optional and isolated module where possible.

💡 Notes
The goal is to allow better organisation of crawled data and separation of different knowledge bases.

This will make it easier to manage multiple crawls for different projects or sources without mixing data.

🧪 Testing
Validate that new tables are being created using the same structure as crawled_pages.

Confirm that crawling correctly routes output to the selected storage table.

Test thoroughly in staging before deploying live.

