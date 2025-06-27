# Troubleshooting Diagnostics - Crawl4AI Dashboard

## Issue Summary
**Problem**: Authentication failures when switching from `documents` table to `crawled_pages` table
**Root Cause**: Missing Row Level Security (RLS) policies for INSERT/UPDATE operations on `crawled_pages` table
**Status**: IDENTIFIED - Requires SQL execution to fix

## Background Context
- Project: React/TypeScript dashboard with Vite for Crawl4AI integration
- Database: Supabase with pgvector extension for embeddings
- Environment: Local development with Azure-hosted Crawl4AI API
- Previous working state: `documents` table was working fine with same connection
- Current issue: `crawled_pages` table causing 401 authentication errors

## Technical Details

### Environment Configuration
- **Supabase URL**: `https://supabase.blufix.co.uk`
- **Connection Method**: Direct HTTPS (not using Kong proxy)
- **Current Setting**: `VITE_USE_LOCAL_PROXY=false` in `.env`
- **OpenAI Integration**: Configured with `text-embedding-3-small` model

### Database Schema
- **Table**: `crawled_pages` 
- **Key Columns**: id, url, chunk_number, content, metadata, embedding (vector 1536), created_at
- **Vector Search Function**: `match_crawled_pages()` for similarity search
- **Constraints**: unique(url, chunk_number)

### RLS Policy Issue (ROOT CAUSE)
The `crawled_pages` table has Row Level Security enabled but missing policies:

**Current Policies**:
- ✅ SELECT: "Allow public read access" (EXISTS)
- ❌ INSERT: Missing policy (CAUSES 401 ERRORS)
- ❌ UPDATE: Missing policy (CAUSES 401 ERRORS)

**File Location**: `/mnt/d/ai-local-project/dashboard/docs/crawled_pages.sql` (lines 58-66)

## Files Modified During Investigation

### 1. `/mnt/d/ai-local-project/dashboard/src/services/supabase.ts`
- **Purpose**: Database service layer with OpenAI embeddings integration
- **Key Method**: `saveCrawlResultAsDocument()` - saves crawl results with embeddings
- **Current State**: Configured for `crawled_pages` table
- **Authentication**: Uses `VITE_SUPABASE_ANON_KEY` with direct connection

### 2. `/mnt/d/ai-local-project/dashboard/src/services/embeddings.ts`
- **Purpose**: OpenAI embeddings generation service
- **Model**: `text-embedding-3-small`
- **Dimensions**: 1536
- **Integration**: Called from `saveCrawlResultAsDocument()`

### 3. `/mnt/d/ai-local-project/dashboard/src/SpaceApp.tsx`
- **Purpose**: Main UI component with crawl functionality
- **Auto-save**: Automatically saves crawl results to database with embeddings
- **Error Handling**: Logs database errors but continues crawling

### 4. `/mnt/d/ai-local-project/dashboard/vite.config.ts`
- **Kong Proxy Config**: Present but not currently used
- **Current State**: Proxy disabled, using direct connection

## Error Patterns Observed

### 1. Authentication Errors
```
401 Unauthorized when inserting to crawled_pages
```

### 2. RLS Policy Violations
```
Policy violation: No policy allows INSERT on crawled_pages
```

### 3. Working vs Non-Working Comparison
- **documents table**: ✅ Working (proper RLS policies or RLS disabled)
- **crawled_pages table**: ❌ Failing (RLS enabled, missing INSERT/UPDATE policies)

## Solution Required

### Immediate Fix
Execute the following SQL in Supabase SQL Editor:

```sql
-- Create INSERT policy
create policy "Allow public insert access"
  on crawled_pages
  for insert
  to public
  with check (true);

-- Create UPDATE policy  
create policy "Allow public update access"
  on crawled_pages
  for update
  to public
  using (true)
  with check (true);
```

**SQL File Created**: `/mnt/d/ai-local-project/dashboard/docs/fix_crawled_pages_rls.sql`

### Verification Steps
1. Run the SQL commands in Supabase dashboard
2. Start dev server: `npm run dev`
3. Test crawl functionality with a simple URL
4. Check browser console for database save confirmation
5. Verify data appears in `crawled_pages` table

## Local AI Stack Configuration
- **Kong URL**: `http://host.docker.internal:8000`
- **Bearer Token**: `testauth` 
- **Caddy**: Handles HTTPS/TLS for production domains
- **Services**: n8n, OpenWebUI, Supabase, Ollama, etc.
- **Domain**: `blufix.co.uk` (production)

## Environment Files
- **Main Config**: `/mnt/d/ai-local-project/dashboard/.env`
- **Stack Config**: `/mnt/d/ai-local-project/dashboard/env_example_full_stack`
- **Documentation**: `/mnt/d/ai-local-project/dashboard/docs/README2.md`

## Development Workflow
1. **Crawl Request**: User enters URL in dashboard
2. **API Call**: Send to Azure Crawl4AI service
3. **Embedding Generation**: OpenAI creates vector embeddings
4. **Database Save**: Insert into `crawled_pages` with embeddings
5. **Search**: Vector similarity search using `match_crawled_pages()`

## Next Steps After Restart
1. ✅ Execute RLS policy fix SQL in Supabase
2. ✅ Test crawl functionality 
3. ✅ Verify embeddings are generated and stored
4. ✅ Test vector search functionality
5. ⏸️ Consider implementing proper authentication (currently using public policies)

## Implementation Status
- ✅ OpenAI embeddings service implemented
- ✅ Vector storage in Supabase configured  
- ✅ Automatic saving on crawl completion
- ❌ RLS policies missing (requires SQL execution)
- ✅ Search functionality ready (vector + text fallback)

## Key Learnings
- RLS policies must be configured for all operations (SELECT, INSERT, UPDATE)
- Switching tables requires reviewing all security policies
- Direct Supabase connection works fine when policies are correct
- Kong proxy was not the issue - it was database permissions

---
*Generated: 2025-06-26 - Status: Issue identified, solution ready*