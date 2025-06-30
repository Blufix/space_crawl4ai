-- Alternative approach: Create predefined tables instead of dynamic creation
-- This avoids permission issues by creating all tables upfront as admin

-- Create additional predefined tables for different use cases
-- Users can then select from these predefined options

-- Table for Microsoft documentation
CREATE TABLE IF NOT EXISTS microsoft_docs (
    id bigserial PRIMARY KEY,
    url varchar NOT NULL,
    chunk_number integer NOT NULL,
    content text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    embedding vector(1536),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(url, chunk_number)
);

-- Table for agent building resources
CREATE TABLE IF NOT EXISTS agent_building (
    id bigserial PRIMARY KEY,
    url varchar NOT NULL,
    chunk_number integer NOT NULL,
    content text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    embedding vector(1536),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(url, chunk_number)
);

-- Table for Azure platform documentation
CREATE TABLE IF NOT EXISTS azure_platforms (
    id bigserial PRIMARY KEY,
    url varchar NOT NULL,
    chunk_number integer NOT NULL,
    content text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    embedding vector(1536),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(url, chunk_number)
);

-- Table for general knowledge base
CREATE TABLE IF NOT EXISTS knowledge_base (
    id bigserial PRIMARY KEY,
    url varchar NOT NULL,
    chunk_number integer NOT NULL,
    content text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    embedding vector(1536),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(url, chunk_number)
);

-- Create indices for all new tables
-- microsoft_docs indices
CREATE INDEX IF NOT EXISTS microsoft_docs_embedding_idx ON microsoft_docs USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS microsoft_docs_metadata_idx ON microsoft_docs USING gin (metadata);
CREATE INDEX IF NOT EXISTS microsoft_docs_source_idx ON microsoft_docs ((metadata->>'source'));

-- agent_building indices
CREATE INDEX IF NOT EXISTS agent_building_embedding_idx ON agent_building USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS agent_building_metadata_idx ON agent_building USING gin (metadata);
CREATE INDEX IF NOT EXISTS agent_building_source_idx ON agent_building ((metadata->>'source'));

-- azure_platforms indices
CREATE INDEX IF NOT EXISTS azure_platforms_embedding_idx ON azure_platforms USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS azure_platforms_metadata_idx ON azure_platforms USING gin (metadata);
CREATE INDEX IF NOT EXISTS azure_platforms_source_idx ON azure_platforms ((metadata->>'source'));

-- knowledge_base indices
CREATE INDEX IF NOT EXISTS knowledge_base_embedding_idx ON knowledge_base USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS knowledge_base_metadata_idx ON knowledge_base USING gin (metadata);
CREATE INDEX IF NOT EXISTS knowledge_base_source_idx ON knowledge_base ((metadata->>'source'));

-- Enable RLS for all tables
ALTER TABLE microsoft_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_building ENABLE ROW LEVEL SECURITY;
ALTER TABLE azure_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for microsoft_docs
DROP POLICY IF EXISTS "allow_public_read_microsoft_docs" ON microsoft_docs;
DROP POLICY IF EXISTS "allow_public_insert_microsoft_docs" ON microsoft_docs;
DROP POLICY IF EXISTS "allow_public_update_microsoft_docs" ON microsoft_docs;

CREATE POLICY "allow_public_read_microsoft_docs" ON microsoft_docs FOR SELECT TO public USING (true);
CREATE POLICY "allow_public_insert_microsoft_docs" ON microsoft_docs FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "allow_public_update_microsoft_docs" ON microsoft_docs FOR UPDATE TO public USING (true) WITH CHECK (true);

-- Create RLS policies for agent_building
DROP POLICY IF EXISTS "allow_public_read_agent_building" ON agent_building;
DROP POLICY IF EXISTS "allow_public_insert_agent_building" ON agent_building;
DROP POLICY IF EXISTS "allow_public_update_agent_building" ON agent_building;

CREATE POLICY "allow_public_read_agent_building" ON agent_building FOR SELECT TO public USING (true);
CREATE POLICY "allow_public_insert_agent_building" ON agent_building FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "allow_public_update_agent_building" ON agent_building FOR UPDATE TO public USING (true) WITH CHECK (true);

-- Create RLS policies for azure_platforms
DROP POLICY IF EXISTS "allow_public_read_azure_platforms" ON azure_platforms;
DROP POLICY IF EXISTS "allow_public_insert_azure_platforms" ON azure_platforms;
DROP POLICY IF EXISTS "allow_public_update_azure_platforms" ON azure_platforms;

CREATE POLICY "allow_public_read_azure_platforms" ON azure_platforms FOR SELECT TO public USING (true);
CREATE POLICY "allow_public_insert_azure_platforms" ON azure_platforms FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "allow_public_update_azure_platforms" ON azure_platforms FOR UPDATE TO public USING (true) WITH CHECK (true);

-- Create RLS policies for knowledge_base
DROP POLICY IF EXISTS "allow_public_read_knowledge_base" ON knowledge_base;
DROP POLICY IF EXISTS "allow_public_insert_knowledge_base" ON knowledge_base;
DROP POLICY IF EXISTS "allow_public_update_knowledge_base" ON knowledge_base;

CREATE POLICY "allow_public_read_knowledge_base" ON knowledge_base FOR SELECT TO public USING (true);
CREATE POLICY "allow_public_insert_knowledge_base" ON knowledge_base FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "allow_public_update_knowledge_base" ON knowledge_base FOR UPDATE TO public USING (true) WITH CHECK (true);

-- Create match functions for each table

-- Match function for microsoft_docs
CREATE OR REPLACE FUNCTION match_microsoft_docs (
    query_embedding vector(1536),
    match_count int DEFAULT 10,
    filter jsonb DEFAULT '{}'::jsonb
) RETURNS TABLE (
    id bigint,
    url varchar,
    chunk_number integer,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
BEGIN
    RETURN QUERY
    SELECT
        microsoft_docs.id,
        microsoft_docs.url,
        microsoft_docs.chunk_number,
        microsoft_docs.content,
        microsoft_docs.metadata,
        1 - (microsoft_docs.embedding <=> query_embedding) as similarity
    FROM microsoft_docs
    WHERE microsoft_docs.metadata @> filter
    ORDER BY microsoft_docs.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Match function for agent_building
CREATE OR REPLACE FUNCTION match_agent_building (
    query_embedding vector(1536),
    match_count int DEFAULT 10,
    filter jsonb DEFAULT '{}'::jsonb
) RETURNS TABLE (
    id bigint,
    url varchar,
    chunk_number integer,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
BEGIN
    RETURN QUERY
    SELECT
        agent_building.id,
        agent_building.url,
        agent_building.chunk_number,
        agent_building.content,
        agent_building.metadata,
        1 - (agent_building.embedding <=> query_embedding) as similarity
    FROM agent_building
    WHERE agent_building.metadata @> filter
    ORDER BY agent_building.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Match function for azure_platforms
CREATE OR REPLACE FUNCTION match_azure_platforms (
    query_embedding vector(1536),
    match_count int DEFAULT 10,
    filter jsonb DEFAULT '{}'::jsonb
) RETURNS TABLE (
    id bigint,
    url varchar,
    chunk_number integer,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
BEGIN
    RETURN QUERY
    SELECT
        azure_platforms.id,
        azure_platforms.url,
        azure_platforms.chunk_number,
        azure_platforms.content,
        azure_platforms.metadata,
        1 - (azure_platforms.embedding <=> query_embedding) as similarity
    FROM azure_platforms
    WHERE azure_platforms.metadata @> filter
    ORDER BY azure_platforms.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Match function for knowledge_base
CREATE OR REPLACE FUNCTION match_knowledge_base (
    query_embedding vector(1536),
    match_count int DEFAULT 10,
    filter jsonb DEFAULT '{}'::jsonb
) RETURNS TABLE (
    id bigint,
    url varchar,
    chunk_number integer,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
BEGIN
    RETURN QUERY
    SELECT
        knowledge_base.id,
        knowledge_base.url,
        knowledge_base.chunk_number,
        knowledge_base.content,
        knowledge_base.metadata,
        1 - (knowledge_base.embedding <=> query_embedding) as similarity
    FROM knowledge_base
    WHERE knowledge_base.metadata @> filter
    ORDER BY knowledge_base.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Simple function to get predefined tables
CREATE OR REPLACE FUNCTION get_crawled_pages_tables()
RETURNS text[]
LANGUAGE sql
AS $$
    SELECT ARRAY['crawled_pages', 'microsoft_docs', 'agent_building', 'azure_platforms', 'knowledge_base'];
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_crawled_pages_tables() TO public;
GRANT EXECUTE ON FUNCTION match_microsoft_docs(vector, int, jsonb) TO public;
GRANT EXECUTE ON FUNCTION match_agent_building(vector, int, jsonb) TO public;
GRANT EXECUTE ON FUNCTION match_azure_platforms(vector, int, jsonb) TO public;
GRANT EXECUTE ON FUNCTION match_knowledge_base(vector, int, jsonb) TO public;