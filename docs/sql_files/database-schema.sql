-- Crawl4AI Dashboard Database Schema
-- This file contains the SQL schema for Supabase tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Crawl Jobs Table
-- Stores information about crawl job configurations
CREATE TABLE crawl_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config JSONB NOT NULL, -- Stores CrawlConfig object
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE -- For user-specific jobs when auth is implemented
);

-- Crawl Results Table
-- Stores the actual crawled content and metadata
CREATE TABLE crawl_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES crawl_jobs(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'crawling', 'completed', 'failed')),
    content TEXT, -- Raw text content
    markdown TEXT, -- Markdown formatted content
    links JSONB DEFAULT '[]'::jsonb, -- Array of found links
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error TEXT, -- Error message if crawl failed
    content_hash TEXT, -- Hash of content for deduplication
    content_length INTEGER, -- Length of content for statistics
    
    -- Full text search index
    content_search TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('english', COALESCE(content, '') || ' ' || COALESCE(markdown, ''))
    ) STORED
);

-- Content Embeddings Table
-- Stores AI embeddings for semantic search
CREATE TABLE content_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    result_id UUID REFERENCES crawl_results(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL DEFAULT 0, -- For splitting large content
    chunk_text TEXT NOT NULL,
    embedding VECTOR(1536), -- OpenAI embedding dimension (adjust based on model)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(result_id, chunk_index)
);

-- Search Queries Table
-- Stores user search queries and results for analytics
CREATE TABLE search_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query TEXT NOT NULL,
    results JSONB DEFAULT '[]'::jsonb, -- Array of search results
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    execution_time_ms INTEGER, -- Query performance tracking
    result_count INTEGER DEFAULT 0
);

-- Create indexes for better performance
CREATE INDEX idx_crawl_jobs_status ON crawl_jobs(status);
CREATE INDEX idx_crawl_jobs_created_at ON crawl_jobs(created_at);
CREATE INDEX idx_crawl_jobs_user_id ON crawl_jobs(user_id);

CREATE INDEX idx_crawl_results_job_id ON crawl_results(job_id);
CREATE INDEX idx_crawl_results_url ON crawl_results(url);
CREATE INDEX idx_crawl_results_status ON crawl_results(status);
CREATE INDEX idx_crawl_results_created_at ON crawl_results(created_at);
CREATE INDEX idx_crawl_results_content_hash ON crawl_results(content_hash);

-- Full text search index
CREATE INDEX idx_crawl_results_content_search ON crawl_results USING GIN(content_search);

-- Vector similarity search index (using cosine distance)
CREATE INDEX idx_content_embeddings_vector ON content_embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_content_embeddings_result_id ON content_embeddings(result_id);

CREATE INDEX idx_search_queries_user_id ON search_queries(user_id);
CREATE INDEX idx_search_queries_created_at ON search_queries(created_at);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_crawl_jobs_updated_at 
    BEFORE UPDATE ON crawl_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
-- Enable RLS on all tables (uncomment when implementing authentication)
-- ALTER TABLE crawl_jobs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE crawl_results ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE content_embeddings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users only
-- CREATE POLICY "Users can only see their own crawl jobs" ON crawl_jobs
--     FOR ALL USING (auth.uid() = user_id);

-- CREATE POLICY "Users can only see their own search queries" ON search_queries
--     FOR ALL USING (auth.uid() = user_id);

-- Function to search content using full-text search
CREATE OR REPLACE FUNCTION search_content(
    search_query TEXT,
    result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    url TEXT,
    content TEXT,
    markdown TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cr.id,
        cr.url,
        cr.content,
        cr.markdown,
        cr.metadata,
        cr.created_at,
        ts_rank(cr.content_search, websearch_to_tsquery('english', search_query)) as rank
    FROM crawl_results cr
    WHERE cr.content_search @@ websearch_to_tsquery('english', search_query)
        AND cr.status = 'completed'
    ORDER BY rank DESC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to search content using vector similarity (requires embeddings)
CREATE OR REPLACE FUNCTION search_content_semantic(
    query_embedding VECTOR(1536),
    similarity_threshold FLOAT DEFAULT 0.7,
    result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    url TEXT,
    chunk_text TEXT,
    similarity FLOAT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cr.id,
        cr.url,
        ce.chunk_text,
        1 - (ce.embedding <=> query_embedding) as similarity,
        cr.metadata,
        cr.created_at
    FROM content_embeddings ce
    JOIN crawl_results cr ON ce.result_id = cr.id
    WHERE 1 - (ce.embedding <=> query_embedding) > similarity_threshold
        AND cr.status = 'completed'
    ORDER BY similarity DESC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;