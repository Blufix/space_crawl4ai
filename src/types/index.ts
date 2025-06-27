// Simplified configuration for the new interface
export interface SimplifiedCrawlConfig {
  url: string;
  crawlType: 'single' | 'smart_site';
}

// Legacy interface maintained for backward compatibility
export interface CrawlConfig {
  url: string;
  depth?: number;
  maxPages?: number;
  extractStrategy?: 'basic' | 'llm' | 'css' | 'xpath';
  crawlStrategy?: 'single' | 'deep_crawl';
  deepCrawlMethod?: 'bfs' | 'dfs' | 'bestfirst';
  proxySettings?: {
    server?: string;
    username?: string;
    password?: string;
  };
  userAgent?: string;
  timeout?: number;
}

export interface CrawlResult {
  id: string;
  url: string;
  status: 'pending' | 'crawling' | 'completed' | 'failed';
  content?: string;
  markdown?: string;
  rawMarkdown?: string;
  fitMarkdown?: string;
  links?: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface CrawlJob {
  id: string;
  config: CrawlConfig;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results: CrawlResult[];
  createdAt: string;
  updatedAt: string;
}

export interface SearchQuery {
  id: string;
  query: string;
  results: SearchResult[];
  createdAt: string;
}

export interface SearchResult {
  id: string;
  content: string;
  url: string;
  relevanceScore: number;
  metadata?: Record<string, any>;
}