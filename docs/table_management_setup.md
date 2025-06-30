# 🗃️ Table Management Setup Guide

## 🔧 Setup Instructions

**Step 1:** Run the predefined tables setup
1. Go to your Supabase Dashboard → SQL Editor
2. Copy and paste the entire contents of `docs/sql_files/predefined_tables_setup.sql`
3. Execute the SQL to create 5 predefined tables: `crawled_pages`, `microsoft_docs`, `agent_building`, `azure_platforms`, `knowledge_base`

**Step 2:** Use the table selector
1. Refresh your dashboard application
2. You'll see all 5 tables available in the dropdown
3. Select the appropriate table for your content type
4. All crawling and search operations will use the selected table

## 📋 Available Predefined Tables

| Table Name | Purpose | Best For |
|------------|---------|----------|
| `crawled_pages` | Default table | General web crawling |
| `microsoft_docs` | Microsoft documentation | Azure docs, .NET guides, Microsoft APIs |
| `agent_building` | AI Agent resources | Agent frameworks, development guides |
| `azure_platforms` | Azure platform docs | Azure services, cloud architecture |
| `knowledge_base` | General knowledge | FAQs, internal docs, mixed content |

## 🔍 How It Works

1. **Table Selection**: Use the dropdown to choose your storage table
2. **Automatic Routing**: All crawl operations automatically save to the selected table
3. **Independent Search**: Search operates only within the selected table
4. **Data Separation**: Each table maintains its own vector embeddings and indices

## 🚀 Benefits

- **Organization**: Separate different types of content
- **Performance**: Smaller, focused datasets for faster search
- **Scalability**: No mixing of unrelated content
- **Flexibility**: Switch between knowledge bases instantly

## 📊 Table Schema

Each table follows the same structure:
```sql
- id (bigserial) - Unique identifier
- url (varchar) - Source URL
- chunk_number (integer) - Content chunk number
- content (text) - Extracted content
- metadata (jsonb) - Additional metadata
- embedding (vector) - AI vector embedding for search
- created_at (timestamp) - Creation timestamp
```

## 🛠️ Troubleshooting

### Tables not appearing in dropdown?
- Check that you've run the setup SQL in Supabase
- Refresh the page
- Check browser console for errors

### Search not working with tables?
- Ensure vector functions were created (`match_table_name`)
- Check that embeddings are being generated
- Verify OpenAI API key is configured

### SQL execution errors?
- Make sure you're running the SQL as database owner/admin
- Check that the vector extension is enabled
- Run the SQL in smaller chunks if needed

## 🔐 Security

- All tables use Row Level Security (RLS)
- Public read/write access (same as original `crawled_pages`)
- Suitable for public knowledge bases
- Modify RLS policies for restricted access if needed