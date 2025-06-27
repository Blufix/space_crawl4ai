import { createClient } from '@supabase/supabase-js';
import type { CrawlJob, CrawlResult, SearchQuery } from '../types';
import { embeddingsService } from './embeddings';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
// Direct connection to Supabase (simplified)
const effectiveSupabaseUrl = supabaseUrl;

console.log('Supabase configuration:', {
  url: effectiveSupabaseUrl,
  hasAnonKey: !!supabaseAnonKey
});

// Create Supabase client (simplified)
export const supabase = createClient(effectiveSupabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

export interface Document {
  id?: string;
  url: string;
  title?: string;
  content: string;
  markdown?: string;
  metadata?: Record<string, any>;
  embedding?: number[];
  created_at?: string;
  updated_at?: string;
}

export class SupabaseService {
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      console.log('🔍 Testing Supabase connection...');
      
      // Test basic connection and get table structure
      const { data, error, count } = await supabase
        .from('crawled_pages')
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (error) {
        console.error('❌ Supabase connection error:', error);
        return {
          success: false,
          message: `Connection failed: ${error.message}`,
          details: error
        };
      }
      
      console.log('✅ Supabase connected successfully');
      console.log('📊 Found', count || 0, 'crawled pages in database');
      
      return {
        success: true,
        message: `Connected successfully! Found ${count || 0} crawled pages in table.`,
        details: { 
          count, 
          tableName: 'crawled_pages',
          sampleColumns: data?.[0] ? Object.keys(data[0]) : 'Empty table',
        }
      };
    } catch (error) {
      console.error('❌ Supabase test failed:', error);
      return {
        success: false,
        message: 'Connection test failed',
        details: error
      };
    }
  }

  async getDocuments(limit = 10): Promise<any[]> {
    try {
      console.log('🔍 Fetching', limit, 'documents from database...');
      
      // Use more efficient query with only necessary fields for large datasets
      const fields = limit > 1000 
        ? 'id,url,created_at,metadata,chunk_number' // Minimal fields for large queries
        : '*'; // All fields for smaller queries
      
      const { data, error } = await supabase
        .from('crawled_pages')
        .select(fields)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Database query error:', error);
        throw error;
      }
      
      console.log('✅ Successfully fetched', data?.length || 0, 'documents');
      return data || [];
    } catch (error) {
      console.error('Failed to fetch crawled pages:', error);
      throw error;
    }
  }

  async saveDocument(document: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .insert([document])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to save document:', error);
      throw error;
    }
  }

  async saveCrawlResultAsDocument(crawlResult: CrawlResult): Promise<Document> {
    try {
      console.log('💾 Saving crawl result to crawled_pages table with embeddings...');
      console.log('📊 Crawl result structure:', {
        hasContent: !!crawlResult.content,
        contentLength: crawlResult.content?.length,
        hasMarkdown: !!crawlResult.markdown,
        markdownLength: crawlResult.markdown?.length,
        hasMetadata: !!crawlResult.metadata,
        metadataKeys: crawlResult.metadata ? Object.keys(crawlResult.metadata) : [],
        status: crawlResult.status,
        url: crawlResult.url
      });
      
      // Log actual content samples for debugging
      if (crawlResult.content) {
        console.log('📄 Content sample (first 300 chars):', crawlResult.content.substring(0, 300));
      } else {
        console.log('⚠️ No content field in crawl result');
      }
      
      if (crawlResult.markdown) {
        console.log('📝 Markdown sample (first 300 chars):', crawlResult.markdown.substring(0, 300));
      } else {
        console.log('⚠️ No markdown field in crawl result');
      }
      
      // Prepare content for embedding (prioritize fit_markdown, then raw_markdown, then content)
      const markdownContent = crawlResult.fitMarkdown || crawlResult.rawMarkdown || crawlResult.markdown || crawlResult.content || '';
      const textForEmbedding = [
        crawlResult.metadata?.title || '',
        markdownContent
      ].filter(Boolean).join('\n\n');

      let embedding: number[] | undefined;
      
      console.log('🧠 Embedding generation check:', {
        embeddingsConfigured: embeddingsService.isConfigured(),
        hasTextForEmbedding: !!textForEmbedding.trim(),
        textLength: textForEmbedding.length,
        textSample: textForEmbedding.substring(0, 100) + '...'
      });

      // Generate embedding if OpenAI is configured and we have content
      if (embeddingsService.isConfigured() && textForEmbedding.trim()) {
        try {
          console.log('🔄 Generating embedding...');
          embedding = await embeddingsService.generateEmbedding(textForEmbedding);
          console.log('✅ Generated embedding for crawl result:', {
            embeddingLength: embedding?.length,
            embeddingType: typeof embedding,
            firstFewValues: embedding?.slice(0, 3)
          });
        } catch (error) {
          console.warn('⚠️ Failed to generate embedding, saving without vector data:', error);
        }
      } else {
        console.log('⚠️ OpenAI not configured or no content, saving without embeddings');
      }

      // Prepare document for storage in crawled_pages table (matching your schema)
      // Use markdown as content if regular content is empty (many crawlers return better markdown)
      // Use the best available content for storage
      const actualContent = markdownContent || '';
      
      // Simplified chunk numbering - use page_index if available, otherwise 1
      const chunkNumber = crawlResult.metadata?.page_index || 1;
      
      const document: any = {
        url: crawlResult.url,
        chunk_number: chunkNumber,
        content: actualContent,
        metadata: {
          title: crawlResult.metadata?.title || new URL(crawlResult.url).hostname,
          crawl_id: crawlResult.id,
          crawl_status: crawlResult.status,
          links_found: crawlResult.links?.length || 0,
          crawled_at: crawlResult.createdAt,
          completed_at: crawlResult.completedAt,
          source: 'crawl4ai',
          ...crawlResult.metadata
        }
      };

      // Add embedding if available
      if (embedding) {
        document.embedding = embedding;
      }

      // Add all markdown variants if available (store in metadata)
      if (crawlResult.rawMarkdown) {
        document.metadata.raw_markdown = crawlResult.rawMarkdown;
      }
      if (crawlResult.fitMarkdown) {
        document.metadata.fit_markdown = crawlResult.fitMarkdown;
      }
      if (crawlResult.markdown) {
        document.metadata.markdown = crawlResult.markdown;
      }

      console.log('📄 Inserting crawled page:', { 
        url: document.url, 
        chunk_number: document.chunk_number,
        content_length: document.content?.length || 0,
        has_embedding: !!embedding,
        embedding_dimensions: embedding?.length,
        metadata_keys: Object.keys(document.metadata)
      });

      console.log('📤 Attempting database upsert...');
      
      // Use upsert with URL and chunk_number as conflict resolution (matches unique constraint)
      let insertResult = await supabase
        .from('crawled_pages')
        .upsert([document], {
          onConflict: 'url,chunk_number'
        })
        .select()
        .single();
        
      console.log('📥 Database response:', { 
        hasData: !!insertResult.data, 
        hasError: !!insertResult.error, 
        errorCode: insertResult.error?.code 
      });

      // Check if upsert succeeded
      if (insertResult.data && !insertResult.error) {
        console.log('✅ Successfully upserted crawled page to database');
        return insertResult.data as Document;
      } else if (insertResult.error) {
        // Log the error but don't fail completely
        console.error('❌ Database upsert error:', insertResult.error);
        console.error('Document structure attempted:', Object.keys(document));
        console.log('🔍 Error details:', {
          code: insertResult.error?.code,
          message: insertResult.error?.message,
          details: insertResult.error?.details,
          hint: insertResult.error?.hint
        });
        throw insertResult.error;
      } else {
        // This shouldn't happen but handle it gracefully
        console.warn('⚠️ Upsert returned no data and no error');
        throw new Error('Upsert operation completed but returned no data');
      }
    } catch (error) {
      console.error('❌ Failed to save crawl result as document:', error);
      throw new Error(`Failed to save to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchDocumentsByVector(query: string, limit = 10): Promise<Document[]> {
    try {
      if (!embeddingsService.isConfigured()) {
        console.warn('OpenAI not configured, falling back to text search');
        return this.searchDocumentsByText(query, limit);
      }

      console.log('🔍 Performing vector search for:', query);
      
      // Generate embedding for the search query
      const queryEmbedding = await embeddingsService.generateEmbedding(query);
      
      // Use your match_crawled_pages function
      const { data, error } = await supabase.rpc('match_crawled_pages', {
        query_embedding: queryEmbedding,
        match_count: limit,
        filter: {} // Can be used to filter by metadata
      });

      if (error) {
        console.warn('Vector search with match_crawled_pages failed, falling back to text search:', error);
        return this.searchDocumentsByText(query, limit);
      }

      console.log('✅ Vector search returned', data?.length || 0, 'results');
      
      // Convert to Document format for consistency
      const documents = data?.map((item: any) => ({
        id: item.id?.toString(),
        url: item.url,
        title: item.metadata?.title || item.url,
        content: item.content,
        metadata: {
          ...item.metadata,
          chunk_number: item.chunk_number,
          similarity: item.similarity
        }
      })) || [];
      
      return documents;
    } catch (error) {
      console.error('Vector search error:', error);
      console.log('Falling back to text search');
      return this.searchDocumentsByText(query, limit);
    }
  }

  async searchDocumentsByText(query: string, limit = 10): Promise<Document[]> {
    try {
      console.log('🔍 Performing text search for:', query);
      
      const { data, error } = await supabase
        .from('crawled_pages')
        .select('*')
        .or(`content.ilike.%${query}%,metadata->>title.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      console.log('✅ Text search returned', data?.length || 0, 'results');
      
      // Convert to Document format for consistency
      const documents = data?.map((item: any) => ({
        id: item.id?.toString(),
        url: item.url,
        title: item.metadata?.title || item.url,
        content: item.content,
        metadata: {
          ...item.metadata,
          chunk_number: item.chunk_number
        }
      })) || [];
      
      return documents;
    } catch (error) {
      console.error('Text search error:', error);
      throw error;
    }
  }
  async saveCrawlJob(job: CrawlJob): Promise<CrawlJob> {
    const { data, error } = await supabase
      .from('crawl_jobs')
      .insert([{
        id: job.id,
        config: job.config,
        status: job.status,
        created_at: job.createdAt,
        updated_at: job.updatedAt,
      }])
      .select()
      .single();

    if (error) throw error;
    return this.mapCrawlJob(data);
  }

  async updateCrawlJob(id: string, updates: Partial<CrawlJob>): Promise<CrawlJob> {
    const { data, error } = await supabase
      .from('crawl_jobs')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapCrawlJob(data);
  }

  async getCrawlJob(id: string): Promise<CrawlJob | null> {
    const { data, error } = await supabase
      .from('crawl_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return this.mapCrawlJob(data);
  }

  async getCrawlJobs(limit = 50): Promise<CrawlJob[]> {
    const { data, error } = await supabase
      .from('crawl_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data.map(this.mapCrawlJob);
  }

  async saveCrawlResult(result: CrawlResult, jobId: string): Promise<CrawlResult> {
    const { data, error } = await supabase
      .from('crawl_results')
      .insert([{
        id: result.id,
        job_id: jobId,
        url: result.url,
        status: result.status,
        content: result.content,
        markdown: result.markdown,
        links: result.links,
        metadata: result.metadata,
        created_at: result.createdAt,
        completed_at: result.completedAt,
        error: result.error,
      }])
      .select()
      .single();

    if (error) throw error;
    return this.mapCrawlResult(data);
  }

  async getCrawlResults(jobId: string): Promise<CrawlResult[]> {
    const { data, error } = await supabase
      .from('crawl_results')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this.mapCrawlResult);
  }

  async searchContent(query: string, limit = 10): Promise<CrawlResult[]> {
    const { data, error } = await supabase
      .from('crawl_results')
      .select('*')
      .textSearch('content', query)
      .limit(limit);

    if (error) throw error;
    return data.map(this.mapCrawlResult);
  }

  async saveSearchQuery(query: SearchQuery): Promise<SearchQuery> {
    const { data, error } = await supabase
      .from('search_queries')
      .insert([{
        id: query.id,
        query: query.query,
        results: query.results,
        created_at: query.createdAt,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private mapCrawlJob(data: any): CrawlJob {
    return {
      id: data.id,
      config: data.config,
      status: data.status,
      results: [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapCrawlResult(data: any): CrawlResult {
    return {
      id: data.id,
      url: data.url,
      status: data.status,
      content: data.content,
      markdown: data.markdown,
      links: data.links || [],
      metadata: data.metadata || {},
      createdAt: data.created_at,
      completedAt: data.completed_at,
      error: data.error,
    };
  }
}

export const supabaseService = new SupabaseService();