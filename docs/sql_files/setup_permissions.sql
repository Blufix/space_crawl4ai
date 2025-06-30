-- Setup script for Supabase table management permissions
-- Run these commands as a Supabase admin/owner in the SQL Editor

-- 1. First, create the functions as admin/owner
-- Enable the pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Function to get all tables that follow the crawled_pages schema
CREATE OR REPLACE FUNCTION get_crawled_pages_tables()
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER  -- This allows the function to run with elevated privileges
AS $$
DECLARE
    table_names text[];
BEGIN
    -- Get all tables that have the crawled_pages structure
    SELECT array_agg(table_name)
    INTO table_names
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND EXISTS (
        SELECT 1 
        FROM information_schema.columns c
        WHERE c.table_name = t.table_name
        AND c.table_schema = 'public'
        AND c.column_name IN ('url', 'chunk_number', 'content', 'metadata', 'embedding')
        GROUP BY c.table_name
        HAVING count(*) = 5
    );
    
    -- Always include crawled_pages if it exists
    IF NOT 'crawled_pages' = ANY(table_names) THEN
        table_names := array_append(table_names, 'crawled_pages');
    END IF;
    
    RETURN COALESCE(table_names, ARRAY['crawled_pages']);
END;
$$;

-- Function to create a new crawled_pages-style table
CREATE OR REPLACE FUNCTION create_crawled_pages_table(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER  -- This allows the function to run with elevated privileges
AS $$
DECLARE
    sql_command text;
    function_name text;
BEGIN
    -- Validate table name
    IF table_name !~ '^[a-z][a-z0-9_]*$' THEN
        RAISE EXCEPTION 'Invalid table name. Must start with letter and contain only lowercase letters, numbers, and underscores.';
    END IF;
    
    -- Check if table already exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = create_crawled_pages_table.table_name
    ) THEN
        RAISE EXCEPTION 'Table % already exists', table_name;
    END IF;
    
    -- Create the table with same structure as crawled_pages
    sql_command := format('
        CREATE TABLE %I (
            id bigserial PRIMARY KEY,
            url varchar NOT NULL,
            chunk_number integer NOT NULL,
            content text NOT NULL,
            metadata jsonb NOT NULL DEFAULT ''{}''::jsonb,
            embedding vector(1536),
            created_at timestamp with time zone DEFAULT timezone(''utc''::text, now()) NOT NULL,
            UNIQUE(url, chunk_number)
        )', table_name);
    
    EXECUTE sql_command;
    
    -- Create vector similarity search index
    sql_command := format('CREATE INDEX %I ON %I USING ivfflat (embedding vector_cosine_ops)', 
                         table_name || '_embedding_idx', table_name);
    EXECUTE sql_command;
    
    -- Create metadata index
    sql_command := format('CREATE INDEX %I ON %I USING gin (metadata)', 
                         table_name || '_metadata_idx', table_name);
    EXECUTE sql_command;
    
    -- Create source index
    sql_command := format('CREATE INDEX %I ON %I ((metadata->>''source''))', 
                         table_name || '_source_idx', table_name);
    EXECUTE sql_command;
    
    -- Enable RLS
    sql_command := format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE sql_command;
    
    -- Create RLS policies
    sql_command := format('
        CREATE POLICY %I
        ON %I
        FOR SELECT
        TO public
        USING (true)', 
        'allow_public_read_' || table_name, table_name);
    EXECUTE sql_command;
    
    sql_command := format('
        CREATE POLICY %I
        ON %I
        FOR INSERT
        TO public
        WITH CHECK (true)', 
        'allow_public_insert_' || table_name, table_name);
    EXECUTE sql_command;
    
    sql_command := format('
        CREATE POLICY %I
        ON %I
        FOR UPDATE
        TO public
        USING (true)
        WITH CHECK (true)', 
        'allow_public_update_' || table_name, table_name);
    EXECUTE sql_command;
    
    -- Create a custom match function for this table
    function_name := 'match_' || table_name;
    sql_command := format('
        CREATE OR REPLACE FUNCTION %I (
            query_embedding vector(1536),
            match_count int DEFAULT 10,
            filter jsonb DEFAULT ''{}''::jsonb
        ) RETURNS TABLE (
            id bigint,
            url varchar,
            chunk_number integer,
            content text,
            metadata jsonb,
            similarity float
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $func$
        #variable_conflict use_column
        BEGIN
            RETURN QUERY
            SELECT
                %I.id,
                %I.url,
                %I.chunk_number,
                %I.content,
                %I.metadata,
                1 - (%I.embedding <=> query_embedding) as similarity
            FROM %I
            WHERE %I.metadata @> filter
            ORDER BY %I.embedding <=> query_embedding
            LIMIT match_count;
        END;
        $func$', 
        function_name, 
        table_name, table_name, table_name, table_name, table_name, table_name,
        table_name, table_name, table_name);
    EXECUTE sql_command;
    
    -- Grant permissions on the new table
    sql_command := format('GRANT ALL ON TABLE %I TO authenticated', table_name);
    EXECUTE sql_command;
    
    sql_command := format('GRANT ALL ON TABLE %I TO anon', table_name);
    EXECUTE sql_command;
    
    sql_command := format('GRANT USAGE, SELECT ON SEQUENCE %I TO authenticated', table_name || '_id_seq');
    EXECUTE sql_command;
    
    sql_command := format('GRANT USAGE, SELECT ON SEQUENCE %I TO anon', table_name || '_id_seq');
    EXECUTE sql_command;
    
    -- Grant execute permissions on the match function
    sql_command := format('GRANT EXECUTE ON FUNCTION %I(vector, int, jsonb) TO authenticated', function_name);
    EXECUTE sql_command;
    
    sql_command := format('GRANT EXECUTE ON FUNCTION %I(vector, int, jsonb) TO anon', function_name);
    EXECUTE sql_command;
    
    RETURN true;
END;
$$;

-- Grant execute permissions on management functions to public
GRANT EXECUTE ON FUNCTION get_crawled_pages_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION get_crawled_pages_tables() TO anon;
GRANT EXECUTE ON FUNCTION create_crawled_pages_table(text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_crawled_pages_table(text) TO anon;

-- Note: The SECURITY DEFINER clause allows these functions to run with the privileges
-- of the user who created them (the admin/owner), not the user who calls them.
-- This is necessary for creating tables and functions from the frontend.