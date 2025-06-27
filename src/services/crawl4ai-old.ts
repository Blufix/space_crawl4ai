import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { CrawlConfig, CrawlResult } from '../types';

class Crawl4AIService {
  private client: AxiosInstance;
  private baseURL: string;
  private token: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_CRAWL4AI_API_URL || '';
    this.token = import.meta.env.VITE_CRAWL4AI_API_KEY || '';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': this.token,
        'Content-Type': 'application/json',
      },
      timeout: 300000, // 5 minutes for deep crawl operations
    });
    
    console.log('Crawl4AI Service initialized:', {
      baseURL: this.baseURL,
      hasToken: !!this.token,
      tokenPrefix: this.token.substring(0, 12) + '...'
    });
  }

  async crawlUrl(config: CrawlConfig): Promise<CrawlResult> {
    try {
      console.log('Attempting crawl with config:', config);
      console.log('Using endpoint:', `${this.baseURL}/crawl`);
      
      // First, let's test if the service is responsive
      console.log('🔍 Testing service health first...');
      const healthCheck = await this.healthCheck();
      if (!healthCheck.success) {
        console.error('❌ Service health check failed:', healthCheck);
        throw new Error(`Crawl4AI service appears to be down: ${healthCheck.error}`);
      }
      console.log('✅ Service health check passed');
      
      // Check if this is a deep crawl request
      const isDeepCrawl = config.crawlStrategy === 'deep_crawl';
      const strategy = config.deepCrawlMethod || 'bfs';
      
      console.log('🔍 Deep crawl mode:', isDeepCrawl, 'Strategy:', strategy);
      console.log('🔍 Config details:', {
        crawlStrategy: config.crawlStrategy,
        deepCrawlMethod: config.deepCrawlMethod,
        depth: config.depth,
        maxPages: config.maxPages,
        url: config.url
      });
      
      // If deep crawl requested, use proper multi-URL crawling
      if (isDeepCrawl) {
        console.log('🚀 Using native deep crawl with proper multi-URL approach');
        return await this.performDeepCrawl(config);
      }
      
      const requestFormats = [
        // Standard single page crawl (deep crawl handled above)
        {
          urls: [config.url],
          browser_config: {
            type: "BrowserConfig",
            params: {
              headless: true,
              ignore_https_errors: true
            }
          },
          crawler_config: {
            type: "CrawlerRunConfig", 
            params: {
              stream: false,
              cache_mode: "bypass",
              markdown_generator: {
                type: "DefaultMarkdownGenerator",
                params: {
                  options: {
                    ignore_links: false,
                    body_width: 0
                  }
                }
              }
            }
          }
        },
        // Format 2: Simple legacy format (fallback)
        {
          urls: [config.url],
          max_pages: 1,
          extract_strategy: config.extractStrategy || 'basic',
          timeout: config.timeout || 30000,
        }
      ];

      let lastError;
      
      // Try each format until one works
      for (let i = 0; i < requestFormats.length; i++) {
        const crawlData = requestFormats[i];
        console.log(`Trying request format ${i + 1}:`, JSON.stringify(crawlData, null, 2));
        
        try {
          const response = await this.client.post('/crawl', crawlData);
          console.log('✅ Request successful with format', i + 1);
          
          // Handle both single result and multiple results from deep crawling
          const responseData = response.data;
          
          console.log('Response data structure:', {
            hasResults: !!responseData.results,
            resultsLength: responseData.results?.length,
            hasContent: !!responseData.content,
            contentLength: responseData.content?.length,
            hasMarkdown: !!responseData.markdown,
            markdownLength: responseData.markdown?.length,
            hasCleanedHtml: !!responseData.cleaned_html,
            cleanedHtmlLength: responseData.cleaned_html?.length,
            hasExtractedContent: !!responseData.extracted_content,
            hasTaskId: !!responseData.task_id,
            success: responseData.success,
            responseKeys: Object.keys(responseData)
          });
          console.log('Full response data:', response.data);
          
          // Check if this is an async response with task_id
          if (responseData.task_id && !responseData.content && !responseData.results) {
            console.log('🔄 Async crawl detected, polling for results with task_id:', responseData.task_id);
            
            // Poll for results
            const finalResult = await this.pollForResults(responseData.task_id);
            console.log('✅ Got final results from polling:', finalResult);
            
            return finalResult;
          }
          
          // If response contains multiple results (deep crawl), process them
          if (responseData.results && Array.isArray(responseData.results)) {
            console.log(`📚 Deep crawl found ${responseData.results.length} pages`);
            
            // Log each page's content availability
            responseData.results.forEach((result: any, index: number) => {
              console.log(`📄 Page ${index + 1} (${result.url || 'unknown URL'}):`, {
                hasExtractedContent: !!result.extracted_content,
                hasMarkdown: !!result.markdown,
                hasCleanedHtml: !!result.cleaned_html,
                hasContent: !!result.content,
                depth: result.metadata?.depth
              });
            });
            
            // Process each result individually and save to database
            const processedResults: CrawlResult[] = [];
            
            for (let i = 0; i < responseData.results.length; i++) {
              const result = responseData.results[i];
              
              const extractedContent = result.extracted_content || 
                                     result.markdown?.raw_markdown || 
                                     result.markdown || 
                                     result.cleaned_html || 
                                     result.content || 
                                     result.html || '';
              
              const markdownContent = result.markdown?.raw_markdown || 
                                    result.markdown?.fit_markdown || 
                                    result.markdown || '';
              
              const pageResult: CrawlResult = {
                id: result.task_id || result.id || crypto.randomUUID(),
                url: result.url || config.url,
                status: result.success !== false ? 'completed' : 'failed',
                content: extractedContent,
                markdown: markdownContent,
                links: result.links || [],
                metadata: {
                  ...result.metadata,
                  depth: result.metadata?.depth || i,
                  crawl_strategy: 'deep_crawl',
                  page_index: i,
                  total_pages: responseData.results.length
                },
                createdAt: new Date().toISOString(),
                completedAt: new Date().toISOString(),
              };
              
              processedResults.push(pageResult);
              
              // Save each page to database individually
              if (extractedContent.trim()) {
                try {
                  // Import the supabase service here to avoid circular dependency
                  const { supabaseService } = await import('./supabase');
                  await supabaseService.saveCrawlResultAsDocument(pageResult);
                  console.log(`✅ Saved page ${i + 1}/${responseData.results.length} to database`);
                } catch (error) {
                  // Log more specific error details for debugging
                  if (error instanceof Error && error.message.includes('duplicate key')) {
                    console.log(`ℹ️ Page ${i + 1} already exists in database, should have been updated`);
                  } else {
                    console.warn(`⚠️ Failed to save page ${i + 1} to database:`, error);
                  }
                }
              }
            }
            
            console.log(`🎉 Deep crawl completed! Processed ${processedResults.length} pages from ${responseData.results.length} results`);
            console.log(`📊 Pages with content: ${processedResults.filter(r => (r.content?.length || 0) > 0).length}`);
            console.log(`🔗 Total unique URLs: ${[...new Set(processedResults.map(r => r.url))].length}`);
            
            // Return a summary result for UI display (without content to prevent duplicate save)
            return {
              id: responseData.task_id || responseData.id || crypto.randomUUID(),
              url: config.url,
              status: 'completed',
              content: '', // Empty to prevent duplicate save
              markdown: '',
              links: [],
              metadata: { 
                pages_crawled: responseData.results.length,
                crawl_strategy: 'deep_crawl',
                total_pages: responseData.results.length,
                note: 'Multiple pages crawled and saved individually',
                pages_processed: processedResults.length,
                first_page_url: processedResults[0]?.url,
                last_page_url: processedResults[processedResults.length - 1]?.url
              },
              createdAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
            };
          } else {
            // Single result format
            // Debug: Log all available content fields
            console.log('🔍 Content field analysis:', {
              hasExtractedContent: !!responseData.extracted_content,
              extractedContentLength: typeof responseData.extracted_content === 'string' ? responseData.extracted_content.length : 0,
              hasMarkdownObj: !!responseData.markdown && typeof responseData.markdown === 'object',
              hasMarkdownStr: !!responseData.markdown && typeof responseData.markdown === 'string',
              markdownType: typeof responseData.markdown,
              hasCleanedHtml: !!responseData.cleaned_html,
              cleanedHtmlLength: responseData.cleaned_html?.length || 0,
              hasContent: !!responseData.content,
              contentLength: responseData.content?.length || 0,
              hasHtml: !!responseData.html,
              htmlLength: responseData.html?.length || 0
            });
            
            // Log actual content samples if available
            if (responseData.extracted_content) {
              console.log('📄 extracted_content sample:', responseData.extracted_content.substring(0, 200));
            }
            if (responseData.markdown?.raw_markdown) {
              console.log('📝 markdown.raw_markdown sample:', responseData.markdown.raw_markdown.substring(0, 200));
            }
            if (responseData.markdown && typeof responseData.markdown === 'string') {
              console.log('📝 markdown (string) sample:', responseData.markdown.substring(0, 200));
            }
            if (responseData.cleaned_html) {
              console.log('🧹 cleaned_html sample:', responseData.cleaned_html.substring(0, 200));
            }
            if (responseData.content) {
              console.log('📄 content sample:', responseData.content.substring(0, 200));
            }
            if (responseData.html) {
              console.log('🌐 html sample:', responseData.html.substring(0, 200));
            }
            
            // Extract content using the proper hierarchy from CrawlResult
            const extractedContent = responseData.extracted_content || 
                                   responseData.markdown?.raw_markdown || 
                                   responseData.markdown || 
                                   responseData.cleaned_html || 
                                   responseData.content || 
                                   responseData.html || '';
            
            const markdownContent = responseData.markdown?.raw_markdown || 
                                  responseData.markdown?.fit_markdown || 
                                  responseData.markdown || '';
                                  
            console.log('✅ Final extracted content length:', extractedContent.length);
            console.log('✅ Final markdown content length:', markdownContent.length);
            
            return {
              id: responseData.task_id || responseData.id || crypto.randomUUID(),
              url: config.url,
              status: responseData.success ? 'completed' : 'failed',
              content: extractedContent,
              markdown: markdownContent,
              links: responseData.links || [],
              metadata: {
                ...responseData.metadata,
                success: responseData.success,
                status_code: responseData.status_code,
                has_cleaned_html: !!responseData.cleaned_html,
                has_extracted_content: !!responseData.extracted_content
              },
              createdAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
            };
          }
        } catch (error) {
          if (axios.isAxiosError(error)) {
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
              console.log(`❌ Format ${i + 1} timed out after ${this.client.defaults.timeout}ms`);
            } else if (error.response) {
              console.log(`❌ Format ${i + 1} failed: HTTP ${error.response.status}`);
              if (error.response.status === 422) {
                console.log(`Format ${i + 1} validation error:`, error.response.data);
              }
            } else {
              console.log(`❌ Format ${i + 1} failed: ${error.message}`);
            }
          } else {
            console.log(`❌ Format ${i + 1} failed:`, error);
          }
          
          lastError = error;
          // Continue to next format
        }
      }
      
      // If all formats failed, try a basic fallback
      console.log('❌ All crawl formats failed, attempting basic content extraction...');
      console.log('Last error before fallback:', lastError);
      return await this.fallbackContentExtraction(config.url);
    } catch (error) {
      console.error('Crawl4AI API Error:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response status:', error.response?.status);
        console.error('Response data:', error.response?.data);
        console.error('Response headers:', error.response?.headers);
        console.error('Request config:', error.config);
        
        // 422 usually means validation error - log the details
        if (error.response?.status === 422) {
          console.error('Validation error details:', error.response.data);
          console.error('Full validation details:', JSON.stringify(error.response.data, null, 2));
          if (error.response.data.detail && Array.isArray(error.response.data.detail)) {
            error.response.data.detail.forEach((detail: any, index: number) => {
              console.error(`Validation error ${index + 1}:`, detail);
            });
          }
        }
      }
      throw new Error(
        axios.isAxiosError(error) 
          ? error.response?.data?.message || error.response?.data?.detail || error.message
          : 'Failed to crawl URL'
      );
    }
  }

  async getCrawlStatus(jobId: string): Promise<CrawlResult> {
    try {
      const response = await this.client.get(`/crawl/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get crawl status:', error);
      throw error;
    }
  }

  async performDeepCrawl(config: CrawlConfig): Promise<CrawlResult> {
    console.log('🧠 Starting native deep crawl for:', config.url);
    
    const maxPages = config.maxPages || 10;
    const depth = config.depth || 2;
    const strategy = config.deepCrawlMethod || 'bfs';
    
    console.log('🔧 Deep crawl parameters:', { maxPages, depth, strategy });
    
    try {
      // Use the native deep crawl configuration based on Crawl4AI docs
      const deepCrawlRequest = {
        urls: [config.url],
        browser_config: {
          type: "BrowserConfig",
          params: {
            headless: true,
            ignore_https_errors: true,
            browser_type: "chromium",
            sleep_on_close: false
          }
        },
        crawler_config: {
          type: "CrawlerRunConfig",
          params: {
            // Deep crawl specific settings
            crawler_strategy: {
              type: "DeepCrawlStrategy",
              params: {
                max_depth: depth,
                max_pages: maxPages,
                same_domain_only: true,
                exclude_patterns: [
                  ".*\\.(pdf|jpg|jpeg|png|gif|svg|ico|css|js|zip|exe|doc|docx)$",
                  ".*/search/.*",
                  ".*/tag/.*",
                  ".*/category/.*"
                ],
                include_patterns: [
                  ".*/docs?/.*",
                  ".*/guide/.*",
                  ".*/tutorial/.*",
                  ".*/api/.*",
                  ".*/reference/.*"
                ]
              }
            },
            // Additional crawler settings
            stream: false,
            cache_mode: "bypass",
            markdown_generator: {
              type: "DefaultMarkdownGenerator",
              params: {
                options: {
                  ignore_links: false,
                  body_width: 0
                }
              }
            },
            // Session management for consistency
            session_id: `deep_crawl_${Date.now()}`,
            // Rate limiting
            semaphore_count: 3,
            base_delay: 1.0,
            max_range: 2.0
          }
        }
      };
      
      console.log('📡 Sending deep crawl request:', JSON.stringify(deepCrawlRequest, null, 2));
      
      const response = await this.client.post('/crawl', deepCrawlRequest);
      const responseData = response.data;
      
      console.log('📊 Deep crawl response structure:', {
        hasTaskId: !!responseData.task_id,
        hasResults: !!responseData.results,
        resultsLength: responseData.results?.length,
        success: responseData.success,
        responseKeys: Object.keys(responseData)
      });
      
      // Handle async response
      if (responseData.task_id && !responseData.results) {
        console.log('⏳ Deep crawl is async, polling for results...');
        return await this.pollForResults(responseData.task_id);
      }
      
      // Handle direct response with results
      if (responseData.results && Array.isArray(responseData.results)) {
        return await this.processDeepCrawlResults(responseData, config);
      }
      
      // Fallback to single result
      return {
        id: responseData.task_id || crypto.randomUUID(),
        url: config.url,
        status: responseData.success ? 'completed' : 'failed',
        content: responseData.content || '',
        markdown: responseData.markdown?.raw_markdown || responseData.markdown || '',
        links: responseData.links || [],
        metadata: {
          ...responseData.metadata,
          crawl_strategy: 'deep_crawl',
          note: 'Single result from deep crawl request'
        },
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
      
    } catch (error) {
      console.error('❌ Native deep crawl failed:', error);
      console.log('🔄 Falling back to smart deep crawl...');
      return await this.smartDeepCrawl(config);
    }
  }

  async processDeepCrawlResults(responseData: any, config: CrawlConfig): Promise<CrawlResult> {
    console.log(`📚 Processing ${responseData.results.length} deep crawl results`);
    
    // Process each result individually and save to database
    const processedResults: CrawlResult[] = [];
    
    for (let i = 0; i < responseData.results.length; i++) {
      const result = responseData.results[i];
      
      const extractedContent = result.extracted_content || 
                             result.markdown?.raw_markdown || 
                             result.markdown || 
                             result.cleaned_html || 
                             result.content || 
                             result.html || '';
      
      const markdownContent = result.markdown?.raw_markdown || 
                            result.markdown?.fit_markdown || 
                            result.markdown || '';
      
      const pageResult: CrawlResult = {
        id: result.task_id || result.id || crypto.randomUUID(),
        url: result.url || config.url,
        status: result.success !== false ? 'completed' : 'failed',
        content: extractedContent,
        markdown: markdownContent,
        links: result.links || [],
        metadata: {
          ...result.metadata,
          depth: result.metadata?.depth || i,
          crawl_strategy: 'deep_crawl_native',
          page_index: i,
          total_pages: responseData.results.length
        },
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
      
      processedResults.push(pageResult);
      
      // Save each page to database individually with unique chunk numbers
      if (extractedContent.trim()) {
        try {
          // Import the supabase service here to avoid circular dependency
          const { supabaseService } = await import('./supabase');
          
          // Create a unique document with proper chunk numbering
          const documentToSave = {
            ...pageResult,
            metadata: {
              ...pageResult.metadata,
              chunk_number: i + 1 // Use 1-based indexing for chunk numbers
            }
          };
          
          await supabaseService.saveCrawlResultAsDocument(documentToSave);
          console.log(`✅ Saved page ${i + 1}/${responseData.results.length} to database`);
        } catch (error) {
          // Log more specific error details for debugging
          if (error instanceof Error && error.message.includes('duplicate key')) {
            console.log(`ℹ️ Page ${i + 1} already exists in database (URL: ${pageResult.url})`);
          } else {
            console.warn(`⚠️ Failed to save page ${i + 1} to database:`, error);
          }
        }
      }
    }
    
    console.log(`🎉 Deep crawl completed! Processed ${processedResults.length} pages`);
    console.log(`📊 Pages with content: ${processedResults.filter(r => (r.content?.length || 0) > 0).length}`);
    
    // Return a summary result for UI display (without content to prevent duplicate save)
    return {
      id: responseData.task_id || responseData.id || crypto.randomUUID(),
      url: config.url,
      status: 'completed',
      content: '', // Empty to prevent duplicate save
      markdown: '',
      links: [],
      metadata: { 
        pages_crawled: responseData.results.length,
        crawl_strategy: 'deep_crawl_native',
        total_pages: responseData.results.length,
        note: 'Multiple pages crawled and saved individually using native deep crawl',
        pages_processed: processedResults.length,
        first_page_url: processedResults[0]?.url,
        last_page_url: processedResults[processedResults.length - 1]?.url
      },
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
  }

  async smartDeepCrawl(config: CrawlConfig): Promise<CrawlResult> {
    console.log('🧠 Starting smart deep crawl for:', config.url);
    
    const maxPages = config.maxPages || 5;
    
    try {
      // Step 1: Crawl the initial page with link extraction
      console.log('📄 Step 1: Crawling initial page to discover links...');
      const initialResult = await this.crawlSinglePage(config.url, {
        ...config,
        crawlStrategy: 'single' // Override to single page
      });
      
      if (!initialResult) {
        throw new Error('Failed to crawl initial page');
      }
      
      console.log('✅ Initial page crawled, found', initialResult.links?.length || 0, 'links');
      console.log('🔍 Sample links from API:', initialResult.links?.slice(0, 5));
      console.log('📊 Initial result structure:', {
        hasLinks: !!initialResult.links,
        linksLength: initialResult.links?.length,
        hasContent: !!initialResult.content,
        contentLength: initialResult.content?.length,
        metadataKeys: Object.keys(initialResult.metadata || {})
      });
      
      // Step 2: Extract and filter relevant links
      let allLinks = initialResult.links || [];
      
      // Fallback: Extract links from HTML if API didn't return them
      if (allLinks.length === 0 && initialResult.content) {
        console.log('📝 API returned no links, extracting from HTML content...');
        allLinks = this.extractLinksFromHTML(initialResult.content, config.url);
        console.log('🔗 Extracted', allLinks.length, 'links from HTML');
      }
      
      const relevantLinks = this.filterRelevantLinks(config.url, allLinks, maxPages - 1);
      console.log('🔗 Filtered to', relevantLinks.length, 'relevant links for crawling');
      console.log('🔗 Relevant links:', relevantLinks);
      
      if (relevantLinks.length === 0) {
        console.log('⚠️ No additional links found, returning single page result');
        return initialResult;
      }
      
      // Step 3: Crawl additional pages using multi-URL approach
      console.log('📚 Step 2: Crawling additional pages using arun_many...');
      const additionalResults = await this.crawlMultiplePages(relevantLinks, config);
      
      // Step 4: Combine all results
      console.log('🔄 Step 3: Combining results from', additionalResults.length + 1, 'pages');
      return this.combineMultiPageResults(initialResult, additionalResults, config);
      
    } catch (error) {
      console.error('❌ Smart deep crawl failed:', error);
      throw error;
    }
  }

  private extractLinksFromHTML(htmlContent: string, _baseUrl: string): string[] {
    try {
      // Simple regex to extract href attributes from anchor tags
      const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
      const links: string[] = [];
      let match;
      
      while ((match = linkRegex.exec(htmlContent)) !== null) {
        const href = match[1];
        if (href && !href.startsWith('javascript:') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
          links.push(href);
        }
      }
      
      console.log('🔍 Extracted', links.length, 'raw links from HTML');
      return links;
    } catch (error) {
      console.warn('Error extracting links from HTML:', error);
      return [];
    }
  }

  private filterRelevantLinks(baseUrl: string, links: string[], maxLinks: number): string[] {
    try {
      const baseUrlObj = new URL(baseUrl);
      const baseDomain = baseUrlObj.hostname;
      
      const filtered = links
        .filter(link => {
          try {
            // Convert relative URLs to absolute
            const absoluteUrl = new URL(link, baseUrl).href;
            const linkUrl = new URL(absoluteUrl);
            
            // Same domain only
            if (linkUrl.hostname !== baseDomain) {
              return false;
            }
            
            // Skip common non-content URLs
            const skipPatterns = [
              /\.(jpg|jpeg|png|gif|svg|ico|css|js|pdf|zip|exe)$/i,
              /#/, // Skip anchors
              /\/search/, // Skip search pages
              /\/tag\//, // Skip tag pages
              /\/category\//, // Skip category pages
              /\/author\//, // Skip author pages
              /\/feed/, // Skip RSS feeds
              /api\//, // Skip API endpoints
            ];
            
            if (skipPatterns.some(pattern => pattern.test(absoluteUrl))) {
              return false;
            }
            
            // Prefer documentation, guide, or content pages
            const preferPatterns = [
              /\/docs?\//, 
              /\/guide/, 
              /\/tutorial/, 
              /\/core\//, 
              /\/api\//, 
              /\/reference/,
              /\/examples?/,
              /\/blog/
            ];
            
            return preferPatterns.some(pattern => pattern.test(absoluteUrl));
          } catch {
            return false;
          }
        })
        .map(link => new URL(link, baseUrl).href) // Convert to absolute URLs
        .filter((url, index, array) => array.indexOf(url) === index) // Remove duplicates
        .slice(0, maxLinks); // Limit number of links
      
      return filtered;
    } catch (error) {
      console.warn('Error filtering links:', error);
      return [];
    }
  }

  private combineMultiPageResults(initialResult: CrawlResult, additionalResults: CrawlResult[], config: CrawlConfig): CrawlResult {
    // Combine all content
    const allResults = [initialResult, ...additionalResults];
    
    const combinedContent = allResults
      .map(result => result.content || '')
      .join('\n\n---PAGE BREAK---\n\n');
    
    const combinedMarkdown = allResults
      .map(result => result.markdown || '')
      .join('\n\n---PAGE BREAK---\n\n');
    
    const allLinks = allResults
      .flatMap(result => result.links || []);
    
    const uniqueLinks = [...new Set(allLinks)];
    
    // Create metadata with page information
    const pagesInfo = allResults.map(result => ({
      url: result.url,
      title: result.metadata?.title,
      contentLength: result.content?.length || 0
    }));
    
    return {
      id: initialResult.id,
      url: config.url,
      status: 'completed',
      content: combinedContent,
      markdown: combinedMarkdown,
      links: uniqueLinks,
      metadata: {
        ...initialResult.metadata,
        crawl_strategy: 'smart_deep_crawl',
        pages_crawled: allResults.length,
        pages_info: pagesInfo,
        total_content_length: combinedContent.length
      },
      createdAt: initialResult.createdAt,
      completedAt: new Date().toISOString(),
    };
  }

  private async crawlMultiplePages(urls: string[], config: CrawlConfig): Promise<CrawlResult[]> {
    if (urls.length === 0) return [];
    
    console.log('🔄 Crawling multiple pages:', urls.length, 'URLs');
    
    try {
      // Use the multi-URL endpoint with proper configuration
      const requestData = {
        urls: urls, // Multiple URLs
        extract_strategy: config.extractStrategy || 'basic',
        timeout: config.timeout || 30000,
        // Multi-URL specific settings
        semaphore_count: Math.min(3, urls.length), // Limit concurrency
        mean_delay: 1.0, // 1 second between requests
        max_range: 2.0, // Random delay range
        extract_links: true,
        include_links: true,
      };
      
      console.log('📡 Sending multi-URL request:', requestData);
      
      const response = await this.client.post('/crawl', requestData);
      const responseData = response.data;
      
      console.log('📊 Multi-URL response structure:', {
        hasTaskId: !!responseData.task_id,
        hasResults: !!responseData.results,
        resultsLength: responseData.results?.length,
        responseKeys: Object.keys(responseData)
      });
      
      if (responseData.task_id && !responseData.results) {
        // Async response, poll for results
        console.log('⏳ Multi-URL crawl is async, polling for results...');
        const finalResult = await this.pollForResults(responseData.task_id);
        
        // If the result contains multiple results, extract them
        if (finalResult.metadata?.pages_crawled > 1) {
          // This is likely a combined result, we need to split it or handle differently
          return [finalResult]; // For now, return as single combined result
        } else {
          return [finalResult];
        }
      } else if (responseData.results && Array.isArray(responseData.results)) {
        // Direct multi-result response
        console.log('✅ Multi-URL direct response with', responseData.results.length, 'results');
        
        return responseData.results.map((result: any, index: number) => ({
          id: result.task_id || result.id || crypto.randomUUID(),
          url: urls[index] || result.url || '',
          status: 'completed',
          content: result.content || '',
          markdown: result.markdown?.raw_markdown || result.markdown || '',
          links: result.links || [],
          metadata: result.metadata || {},
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        }));
      } else {
        // Single result for multiple URLs (unexpected but handle gracefully)
        console.log('⚠️ Multi-URL request returned single result');
        return [{
          id: responseData.task_id || responseData.id || crypto.randomUUID(),
          url: urls[0] || '',
          status: 'completed',
          content: responseData.content || '',
          markdown: responseData.markdown?.raw_markdown || responseData.markdown || '',
          links: responseData.links || [],
          metadata: responseData.metadata || {},
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        }];
      }
    } catch (error) {
      console.error('❌ Multi-URL crawl failed:', error);
      // Fallback to individual crawls
      console.log('🔄 Falling back to individual page crawls...');
      
      const results: CrawlResult[] = [];
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        console.log(`📄 Fallback: Crawling page ${i + 1}/${urls.length}: ${url}`);
        
        try {
          const result = await this.crawlSinglePage(url, config);
          if (result && result.content) {
            results.push(result);
            console.log(`✅ Fallback page ${i + 1} crawled successfully`);
          }
        } catch (error) {
          console.warn(`❌ Fallback crawl failed for ${url}:`, error);
        }
        
        // Add delay between requests
        if (i < urls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      return results;
    }
  }

  private async crawlSinglePage(url: string, config: CrawlConfig): Promise<CrawlResult> {
    // Use the existing single page crawl logic
    const requestData = {
      urls: [url],
      extract_strategy: config.extractStrategy || 'basic',
      timeout: config.timeout || 30000,
      // Explicitly request link extraction
      extract_links: true,
      include_links: true,
      capture_links: true,
    };
    
    console.log('🔄 Crawling single page:', url);
    
    try {
      const response = await this.client.post('/crawl', requestData);
      const responseData = response.data;
      
      if (responseData.task_id && !responseData.content && !responseData.results) {
        // Async response, poll for results
        return await this.pollForResults(responseData.task_id);
      } else {
        // Direct response
        return {
          id: responseData.task_id || responseData.id || crypto.randomUUID(),
          url: url,
          status: 'completed',
          content: responseData.content || '',
          markdown: responseData.markdown?.raw_markdown || responseData.markdown || '',
          links: responseData.links || [],
          metadata: responseData.metadata || {},
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.error('Failed to crawl single page:', url, error);
      throw error;
    }
  }

  async pollForResults(taskId: string, maxAttempts: number = 30, delayMs: number = 2000): Promise<CrawlResult> {
    console.log(`🔄 Starting to poll for task ${taskId}, max attempts: ${maxAttempts}`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`📡 Polling attempt ${attempt}/${maxAttempts} for task ${taskId}`);
        
        // Try different endpoint patterns
        const endpoints = [`/task/${taskId}`, `/crawl/${taskId}`, `/status/${taskId}`, `/result/${taskId}`];
        
        let result = null;
        let lastError = null;
        
        for (const endpoint of endpoints) {
          try {
            const response = await this.client.get(endpoint);
            console.log(`✅ Got response from ${endpoint}:`, response.data);
            result = response.data;
            break;
          } catch (error) {
            console.log(`❌ ${endpoint} failed:`, axios.isAxiosError(error) ? error.response?.status : error);
            lastError = error;
            continue;
          }
        }
        
        if (!result) {
          throw lastError || new Error('All endpoints failed');
        }
        
        // Check if task is completed
        if (result.status === 'completed' || result.state === 'completed') {
          console.log('✅ Task completed, processing results');
          console.log('📊 Result structure:', {
            hasContent: !!result.content,
            contentLength: result.content?.length,
            hasMarkdown: !!result.markdown,
            markdownLength: result.markdown?.length,
            hasResults: !!result.results,
            resultsLength: result.results?.length,
            resultKeys: Object.keys(result)
          });
          
          // Log sample content for debugging
          if (result.content) {
            console.log('📝 Content sample:', result.content.substring(0, 200) + '...');
          }
          if (result.markdown) {
            console.log('📝 Markdown sample:', result.markdown.substring(0, 200) + '...');
          }
          if (result.results?.length > 0) {
            console.log('📝 First result sample:', {
              hasContent: !!result.results[0].content,
              contentLength: result.results[0].content?.length,
              hasMarkdown: !!result.results[0].markdown,
              markdownLength: result.results[0].markdown?.length,
              contentSample: result.results[0].content?.substring(0, 100) + '...',
              markdownSample: result.results[0].markdown?.substring(0, 100) + '...'
            });
          }
          
          // Handle both single result and multiple results formats
          if (result.results && Array.isArray(result.results)) {
            // Multiple results (deep crawl)
            const combinedContent = result.results
              .map((res: any) => res.content || '')
              .join('\n\n---\n\n');
            
            const combinedMarkdown = result.results
              .map((res: any) => res.markdown?.raw_markdown || res.markdown || '')
              .join('\n\n---\n\n');
              
            const allLinks = result.results
              .flatMap((res: any) => res.links || []);
              
            return {
              id: taskId,
              url: result.url || result.results[0]?.url || '',
              status: 'completed',
              content: combinedContent,
              markdown: combinedMarkdown,
              links: [...new Set(allLinks)] as string[],
              metadata: { 
                ...result.metadata,
                pages_crawled: result.results.length,
                crawl_strategy: 'deep_crawl'
              },
              createdAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
            };
          } else {
            // Single result
            // Debug: Log all available content fields from polling result
            console.log('🔍 Polling result content field analysis:', {
              hasExtractedContent: !!result.extracted_content,
              extractedContentLength: typeof result.extracted_content === 'string' ? result.extracted_content.length : 0,
              hasMarkdownObj: !!result.markdown && typeof result.markdown === 'object',
              hasMarkdownStr: !!result.markdown && typeof result.markdown === 'string',
              markdownType: typeof result.markdown,
              hasCleanedHtml: !!result.cleaned_html,
              cleanedHtmlLength: result.cleaned_html?.length || 0,
              hasContent: !!result.content,
              contentLength: result.content?.length || 0,
              hasHtml: !!result.html,
              htmlLength: result.html?.length || 0
            });
            
            // Use proper content hierarchy for single result
            const extractedContent = result.extracted_content || 
                                   result.markdown?.raw_markdown || 
                                   result.markdown || 
                                   result.cleaned_html || 
                                   result.content || 
                                   result.html || '';
            
            const markdownContent = result.markdown?.raw_markdown || 
                                  result.markdown?.fit_markdown || 
                                  result.markdown || '';
                                  
            console.log('✅ Polling final extracted content length:', extractedContent.length);
            console.log('✅ Polling final markdown content length:', markdownContent.length);
                                  
            return {
              id: taskId,
              url: result.url || '',
              status: result.success ? 'completed' : 'failed',
              content: extractedContent,
              markdown: markdownContent,
              links: result.links || [],
              metadata: result.metadata || {},
              createdAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
            };
          }
        } else if (result.status === 'failed' || result.state === 'failed') {
          throw new Error(`Crawl task failed: ${result.error || 'Unknown error'}`);
        } else {
          console.log(`⏳ Task still in progress (${result.status || result.state}), waiting ${delayMs}ms...`);
        }
        
      } catch (error) {
        console.error(`Poll attempt ${attempt} failed:`, error);
        if (attempt === maxAttempts) {
          throw new Error(`Polling failed after ${maxAttempts} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    throw new Error(`Polling timed out after ${maxAttempts} attempts`);
  }

  async fallbackContentExtraction(url: string): Promise<CrawlResult> {
    console.log('🔄 Attempting fallback content extraction for:', url);
    
    try {
      // Simple fetch to get the HTML
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      
      // Basic content extraction
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : '';
      
      // Remove scripts, styles, and other non-content elements
      let cleanContent = html
        .replace(/<script[^>]*>.*?<\/script>/gis, '')
        .replace(/<style[^>]*>.*?<\/style>/gis, '')
        .replace(/<nav[^>]*>.*?<\/nav>/gis, '')
        .replace(/<header[^>]*>.*?<\/header>/gis, '')
        .replace(/<footer[^>]*>.*?<\/footer>/gis, '')
        .replace(/<aside[^>]*>.*?<\/aside>/gis, '')
        .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      // Limit content length
      if (cleanContent.length > 50000) {
        cleanContent = cleanContent.substring(0, 50000) + '...';
      }
      
      console.log('✅ Fallback extraction completed:', {
        url,
        title,
        contentLength: cleanContent.length
      });
      
      return {
        id: crypto.randomUUID(),
        url,
        status: 'completed',
        content: cleanContent,
        markdown: cleanContent, // Basic content as markdown
        links: [],
        metadata: {
          title,
          extraction_method: 'fallback',
          warning: 'Content extracted via fallback method due to service issues'
        },
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
      
    } catch (error) {
      console.error('❌ Fallback extraction also failed:', error);
      
      // Return a minimal error result
      return {
        id: crypto.randomUUID(),
        url,
        status: 'failed',
        error: `Both Crawl4AI service and fallback extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        createdAt: new Date().toISOString(),
      };
    }
  }

  async healthCheck(): Promise<{ success: boolean; status?: number; error?: string }> {
    try {
      console.log('Testing connection to:', this.baseURL);
      const response = await this.client.get('/health');
      console.log('Health check response:', response.status, response.data);
      return { success: true, status: response.status };
    } catch (error) {
      console.error('Health check failed:', error);
      if (axios.isAxiosError(error)) {
        return { 
          success: false, 
          status: error.response?.status,
          error: error.response?.data?.message || error.message 
        };
      }
      return { success: false, error: 'Unknown error' };
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    console.log('Testing Crawl4AI connection...');
    console.log('Base URL:', this.baseURL);
    console.log('Token format:', this.token.substring(0, 20) + '...');
    
    const endpoints = ['/health', '/api/health', '/', '/docs', '/openapi.json', '/api/docs', '/swagger', '/api/crawl', '/crawl'];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Testing endpoint: ${endpoint}`);
        const response = await this.client.get(endpoint);
        console.log(`✅ ${endpoint} responded:`, response.status);
        
        // Log more details for documentation endpoints
        if (endpoint.includes('docs') || endpoint.includes('openapi') || endpoint.includes('swagger')) {
          console.log(`📚 Documentation endpoint ${endpoint}:`, response.data);
        } else {
          console.log(`📊 ${endpoint} data:`, response.data);
        }
        
        return { 
          success: true, 
          message: `Connected via ${endpoint}`, 
          details: { endpoint, status: response.status, data: response.data } 
        };
      } catch (error) {
        console.log(`❌ ${endpoint} failed:`, axios.isAxiosError(error) ? error.response?.status : error);
        
        // Log 422 errors from crawl endpoint to see expected format
        if (endpoint === '/crawl' && axios.isAxiosError(error) && error.response?.status === 422) {
          console.log(`💡 /crawl endpoint exists but expects different format:`, error.response.data);
        }
      }
    }

    // If all endpoints fail, return detailed error from the base URL attempt
    try {
      const response = await this.client.get('/');
      return { success: true, message: 'Base URL accessible', details: response };
    } catch (error) {
      console.error('All endpoints failed:', error);
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          message: `All endpoints failed. Last error: ${error.response?.status || 'Network Error'}`,
          details: {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            headers: error.response?.headers,
            url: error.config?.url,
            baseURL: this.baseURL,
            hasToken: !!this.token
          }
        };
      }
      return { success: false, message: 'Complete connection failure' };
    }
  }
}

export const crawl4aiService = new Crawl4AIService();