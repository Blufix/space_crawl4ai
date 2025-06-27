import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { SimplifiedCrawlConfig, CrawlResult } from '../types';
import { supabaseService } from './supabase';

// Event emitter for real-time crawl updates
export interface CrawlEvent {
  type: 'status' | 'url_discovered' | 'url_crawled' | 'url_skipped' | 'batch_start' | 'batch_complete' | 'progress';
  data: any;
}

class EventEmitter {
  private listeners: { [key: string]: Function[] } = {};

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: Function) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event: string, data?: any) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => callback(data));
  }
}

/**
 * Simplified Crawl4AI Service
 * 
 * This service handles two main scenarios:
 * 1. Single Page Crawl - Extract content from one specific page
 * 2. Smart Site Crawl - Discover and crawl related pages (up to 10 pages)
 * 
 * Key simplifications:
 * - Only two request formats (no complex fallbacks)
 * - Aligned with actual Crawl4AI API capabilities
 * - Clear error handling with fallback extraction
 * - Session management for smart crawls
 */
class SimplifiedCrawl4AIService extends EventEmitter {
  private client: AxiosInstance;
  private baseURL: string;
  private token: string;

  constructor() {
    super();
    this.baseURL = import.meta.env.VITE_CRAWL4AI_API_URL || '';
    this.token = import.meta.env.VITE_CRAWL4AI_API_KEY || '';
    
    if (!this.baseURL) {
      console.warn('⚠️ VITE_CRAWL4AI_API_URL not set');
    }
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': this.token,
        'Content-Type': 'application/json',
      },
      timeout: 300000, // 5 minutes timeout for crawling operations
    });
    
    console.log('🚀 Crawl4AI Service initialized:', {
      baseURL: this.baseURL,
      hasToken: !!this.token
    });
  }

  /**
   * Main crawl method - handles both single page and smart site crawling
   */
  async crawlUrl(config: SimplifiedCrawlConfig, signal?: AbortSignal): Promise<CrawlResult> {
    console.log(`🔍 Starting ${config.crawlType} crawl for:`, config.url);
    
    // Emit crawl start event
    this.emit('crawl_start', { 
      type: config.crawlType, 
      url: config.url, 
      timestamp: Date.now() 
    });
    
    // Emit initial status to trigger dashboard animations
    this.emit('status_update', { 
      status: 'discovering', 
      message: 'Initializing crawl operation...' 
    });
    
    try {
      // Check for abort signal
      if (signal?.aborted) {
        throw new Error('Crawl was cancelled');
      }
      
      // Health check first (but be more tolerant)
      const healthStatus = await this.healthCheck();
      if (!healthStatus.success) {
        console.warn('⚠️ Service health check failed, will attempt crawl anyway');
        this.emit('status_update', { status: 'service_warning', message: 'Service health check failed, attempting crawl anyway' });
        // Continue with crawl attempt instead of fallback
      }

      // Check for abort signal again
      if (signal?.aborted) {
        throw new Error('Crawl was cancelled');
      }

      if (config.crawlType === 'single') {
        return await this.singlePageCrawl(config.url, signal);
      } else {
        return await this.smartSiteCrawl(config.url, signal);
      }
    } catch (error) {
      console.error('❌ Crawl failed:', error);
      this.emit('crawl_error', { error: error instanceof Error ? error.message : 'Unknown error' });
      
      // Return error result instead of attempting CORS-problematic fallback
      return {
        id: crypto.randomUUID(),
        url: config.url,
        status: 'failed',
        error: `Crawl service failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please check service availability.`,
        createdAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Single page crawl - fast and focused
   */
  private async singlePageCrawl(url: string, signal?: AbortSignal): Promise<CrawlResult> {
    console.log('📄 Performing single page crawl');
    this.emit('status_update', { status: 'crawling', message: 'Crawling single page...' });
    
    const requestData = {
      urls: [url],
      browser_config: {
        headless: true,
        ignore_https_errors: true
      },
      crawler_config: {
        cache_mode: "bypass"
      }
    };

    // Add abort signal to axios request
    const requestConfig = signal ? { signal } : {};
    const response = await this.client.post('/crawl', requestData, requestConfig);
    
    this.emit('url_crawled', { 
      url, 
      contentLength: response.data.results?.[0]?.content?.length || 0,
      title: response.data.results?.[0]?.metadata?.title || 'Untitled'
    });
    
    const result = this.processResponse(response.data, url, 'single');
    
    // Emit completion event
    this.emit('crawl_complete', {
      totalUrls: 1,
      successfulUrls: result.status === 'completed' ? 1 : 0,
      successRate: result.status === 'completed' ? 100 : 0,
      totalBatches: 1
    });
    
    return result;
  }

  /**
   * Native deep crawl using Crawl4AI's built-in deep crawling capabilities
   */
  private async smartSiteCrawlNative(url: string): Promise<CrawlResult> {
    console.log('🚀 Starting native deep crawl for:', url);
    
    try {
      // Configure native deep crawling request with supported parameters
      const requestData = {
        urls: [url],
        browser_config: {
          headless: true,
          ignore_https_errors: true,
          viewport_width: 1920,
          viewport_height: 1080
        },
        crawler_config: {
          // Use basic parameters that are definitely supported
          cache_mode: "bypass",
          extract_links: true,
          same_domain_only: true,
          verbose: true,
          
          // Note: Deep crawling parameters might not be supported by the Azure service
          // We'll start with link extraction and use arun_many for discovered URLs
        }
      };
      
      console.log('📡 Starting enhanced native crawl (Azure-compatible):', { url });
      
      // Step 1: Get initial page with link extraction
      const initialResponse = await this.client.post('/crawl', requestData);
      
      if (!initialResponse.data.success || !initialResponse.data.results?.[0]) {
        throw new Error('Initial page crawl failed');
      }
      
      const initialResult = initialResponse.data.results[0];
      console.log('✅ Initial page crawled, extracting links...');
      
      // Step 2: Extract and filter links for multi-URL crawling
      const links = initialResult.links || {};
      const internalLinkObjects = links.internal || [];
      
      if (internalLinkObjects.length === 0) {
        console.log('ℹ️ No internal links found, returning single page result');
        return this.processResponse(initialResponse.data, url, 'native_deep_crawl');
      }
      
      // Extract href URLs from link objects
      const internalLinks = internalLinkObjects.map((link: any) => {
        // Handle both string and object formats
        return typeof link === 'string' ? link : link.href;
      }).filter((href: string) => href && href.startsWith('http'));
      
      console.log(`🔗 Extracted ${internalLinks.length} valid URLs from ${internalLinkObjects.length} link objects`);
      
      // Step 3: Filter and prioritize URLs using our existing logic
      const allUrls = [url, ...internalLinks];
      const prioritizedUrls = this.filterAndPrioritizeUrls(allUrls, url);
      
      console.log(`🔍 Found ${internalLinks.length} internal links, prioritized to ${prioritizedUrls.length} URLs`);
      
      // Step 4: Intelligent batching for large sites
      if (prioritizedUrls.length > 1) {
        return await this.intelligentBatchCrawl(prioritizedUrls, requestData, url);
      } else {
        // Single URL, return the initial result
        return this.processResponse(initialResponse.data, url, 'native_deep_crawl');
      }
      
    } catch (error) {
      console.error('❌ Native deep crawl failed:', error);
      
      // Re-throw error to allow fallback handling in parent method
      throw new Error(`Native deep crawl failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Intelligent smart site crawl using batch processing (FALLBACK METHOD)
   */
  private async smartSiteCrawlManual(url: string): Promise<CrawlResult> {
    console.log('🧠 Starting intelligent smart site crawl for:', url);
    
    try {
      // Step 1: Discover URLs from the starting page
      const discoveredUrls = await this.discoverUrls(url);
      console.log(`🔍 Discovered ${discoveredUrls.length} URLs to crawl`);
      
      // Step 2: Filter and prioritize URLs
      const prioritizedUrls = this.filterAndPrioritizeUrls(discoveredUrls, url);
      console.log(`✅ Filtered to ${prioritizedUrls.length} high-value URLs`);
      
      // Step 3: Crawl URLs with intelligent batch processing
      const crawlResults = await this.crawlManyWithBatching(prioritizedUrls);
      
      // Step 4: Save individual pages and create aggregated result
      await this.saveMultiplePages(crawlResults);
      return this.createAggregatedResult(crawlResults, url);
      
    } catch (error) {
      console.error('❌ Smart crawl failed:', error);
      
      // Return error instead of more fallback attempts
      return {
        id: crypto.randomUUID(),
        url,
        status: 'failed',
        error: `Smart crawl failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        createdAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Intelligent batch crawling with cool-off periods for large sites
   */
  private async intelligentBatchCrawl(urls: string[], requestConfig: any, originalUrl: string): Promise<CrawlResult> {
    console.log(`🎯 Starting intelligent batch crawl for ${urls.length} URLs`);
    
    // Configuration for batching (from environment variables)
    const maxBatchSize = parseInt(import.meta.env.VITE_CRAWL4AI_BATCH_SIZE || '50');
    const coolOffDelay = parseInt(import.meta.env.VITE_CRAWL4AI_COOL_OFF_DELAY || '5000');
    const maxRetries = parseInt(import.meta.env.VITE_CRAWL4AI_MAX_RETRIES || '3');
    
    const allResults: any[] = [];
    const batches = [];
    
    // Split URLs into batches
    for (let i = 0; i < urls.length; i += maxBatchSize) {
      batches.push(urls.slice(i, i + maxBatchSize));
    }
    
    console.log(`📦 Split ${urls.length} URLs into ${batches.length} batches of max ${maxBatchSize} URLs each`);
    console.log(`⏱️ Estimated time: ${Math.ceil((batches.length * coolOffDelay) / 1000 / 60)} minutes (with cool-off periods)`);
    
    // Emit batch info
    this.emit('batch_info', {
      totalUrls: urls.length,
      totalBatches: batches.length,
      batchSize: maxBatchSize,
      estimatedTime: Math.ceil((batches.length * coolOffDelay) / 1000 / 60)
    });
    
    // Process each batch with cool-off periods
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchNumber = batchIndex + 1;
      
      console.log(`🚀 Processing batch ${batchNumber}/${batches.length} (${batch.length} URLs)`);
      this.emit('batch_start', {
        batchNumber,
        totalBatches: batches.length,
        batchSize: batch.length,
        urls: batch
      });
      
      let retryCount = 0;
      let batchSuccess = false;
      
      while (retryCount < maxRetries && !batchSuccess) {
        try {
          const multiUrlRequest = {
            urls: batch,
            browser_config: requestConfig.browser_config,
            crawler_config: {
              ...requestConfig.crawler_config,
              extract_links: false // Don't need links for subsequent pages
            }
          };
          
          const response = await this.client.post('/crawl', multiUrlRequest);
          
          // Handle async responses if needed
          if (response.data.task_id && !response.data.results) {
            console.log(`⏳ Batch ${batchNumber} is async, polling for results...`);
            const asyncResult = await this.pollForResults(response.data.task_id, originalUrl);
            
            // Extract results from the async response
            if (asyncResult.metadata?.crawled_urls) {
              // This means it's an aggregated result, we need to handle it differently
              console.log(`✅ Batch ${batchNumber} completed asynchronously`);
              batchSuccess = true;
              continue; // The async handler already saved the pages
            }
          }
          
          // Process synchronous response
          if (response.data.results && Array.isArray(response.data.results)) {
            console.log(`✅ Batch ${batchNumber} completed: ${response.data.results.length} pages crawled`);
            
            // Save each page individually
            for (const result of response.data.results) {
              if (result && result.success) {
                console.log(`✅ Successfully crawled: ${result.url}`);
                this.emit('url_crawled', { 
                  url: result.url, 
                  contentLength: result.content?.length || 0,
                  title: result.metadata?.title || 'Untitled'
                });
                await this.saveIndividualPage(result);
                allResults.push(result);
              } else {
                console.log(`❌ Failed to crawl: ${result.url}`);
                this.emit('url_failed', { 
                  url: result.url, 
                  error: result.error_message || 'Unknown error' 
                });
              }
            }
            
            batchSuccess = true;
          } else {
            throw new Error(`Unexpected response format for batch ${batchNumber}`);
          }
          
        } catch (error) {
          retryCount++;
          console.warn(`⚠️ Batch ${batchNumber} attempt ${retryCount} failed:`, error);
          
          if (retryCount < maxRetries) {
            const retryDelay = coolOffDelay * retryCount; // Exponential backoff
            console.log(`🔄 Retrying batch ${batchNumber} in ${retryDelay / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          } else {
            console.error(`❌ Batch ${batchNumber} failed after ${maxRetries} attempts`);
          }
        }
      }
      
      // Cool-off period between batches (except for the last batch)
      if (batchIndex < batches.length - 1) {
        console.log(`⏸️ Cool-off period: waiting ${coolOffDelay / 1000}s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, coolOffDelay));
      }
    }
    
    const successRate = urls.length > 0 ? Math.round((allResults.length / urls.length) * 100) : 0;
    console.log(`🎉 Intelligent batch crawl completed: ${allResults.length}/${urls.length} pages successfully crawled (${successRate}% success rate)`);
    
    // Emit completion event
    this.emit('crawl_complete', {
      totalUrls: urls.length,
      successfulUrls: allResults.length,
      successRate,
      totalBatches: batches.length
    });
    
    // Return an aggregated result
    return this.createAggregatedResult(allResults, originalUrl);
  }

  /**
   * Main smart site crawl method - tries native deep crawling first, falls back to manual
   */
  private async smartSiteCrawl(url: string, signal?: AbortSignal): Promise<CrawlResult> {
    console.log('🎯 Starting smart site crawl with native-first approach for:', url);
    
    try {
      // Check for abort signal
      if (signal?.aborted) {
        throw new Error('Crawl was cancelled');
      }
      
      // Try native deep crawling first
      console.log('🚀 Attempting native deep crawl...');
      return await this.smartSiteCrawlNative(url);
      
    } catch (nativeError) {
      console.warn('⚠️ Native deep crawl failed, falling back to manual method:', nativeError);
      
      // Check for abort signal
      if (signal?.aborted) {
        throw new Error('Crawl was cancelled');
      }
      
      try {
        // Fallback to manual smart crawl
        console.log('🔄 Attempting manual smart crawl...');
        return await this.smartSiteCrawlManual(url);
        
      } catch (manualError) {
        console.error('❌ Both native and manual smart crawl failed:', {
          nativeError: nativeError instanceof Error ? nativeError.message : 'Unknown error',
          manualError: manualError instanceof Error ? manualError.message : 'Unknown error'
        });
        
        // Return error instead of endless fallback attempts
        console.error('❌ All crawl methods failed');
        return {
          id: crypto.randomUUID(),
          url,
          status: 'failed',
          error: `All crawl methods failed. Native: ${nativeError instanceof Error ? nativeError.message : 'Unknown'}. Manual: ${manualError instanceof Error ? manualError.message : 'Unknown'}`,
          createdAt: new Date().toISOString(),
        };
      }
    }
  }

  /**
   * Discover URLs from a starting page for smart crawling
   */
  private async discoverUrls(startUrl: string): Promise<string[]> {
    console.log('🔍 Discovering URLs from:', startUrl);
    this.emit('status_update', { status: 'discovering', message: 'Analyzing website structure...' });
    
    try {
      // First, get the starting page to extract links
      const requestData = {
        urls: [startUrl],
        browser_config: {
          headless: true,
          ignore_https_errors: true
        },
        crawler_config: {
          cache_mode: "bypass",
          extract_links: true,
          same_domain_only: true
        }
      };
      
      const response = await this.client.post('/crawl', requestData);
      const result = response.data.results?.[0] || response.data;
      
      // Extract links from the response
      const links = result.links || {};
      const internalLinks = links.internal || [];
      
      // Combine all discovered URLs (skip sitemap due to CORS)
      const allUrls = new Set([startUrl, ...internalLinks]);
      
      console.log(`📊 Link discovery results:`, {
        internalLinks: internalLinks.length,
        totalUnique: allUrls.size
      });
      
      // Emit discovery events
      this.emit('urls_discovered', { 
        total: allUrls.size, 
        internal: internalLinks.length,
        urls: Array.from(allUrls)
      });
      
      return Array.from(allUrls);
      
    } catch (error) {
      console.warn('⚠️ URL discovery failed, using starting URL only:', error);
      this.emit('discovery_error', { error: error instanceof Error ? error.message : 'Unknown error' });
      return [startUrl];
    }
  }
  
  /**
   * Filter and prioritize URLs for intelligent crawling
   */
  private filterAndPrioritizeUrls(urls: string[], baseUrl: string): string[] {
    const urlObj = new URL(baseUrl);
    const baseDomain = urlObj.hostname;
    
    console.log(`🔍 Filtering ${urls.length} URLs for domain: ${baseDomain}`);
    
    // Filter criteria
    const filtered = urls.filter(url => {
      try {
        const parsedUrl = new URL(url);
        
        // Must be same domain
        if (parsedUrl.hostname !== baseDomain) {
          console.log(`❌ Rejected (different domain): ${url}`);
          return false;
        }
        
        // Skip file downloads
        const path = parsedUrl.pathname.toLowerCase();
        const skipExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', 
                               '.zip', '.rar', '.tar', '.gz', '.exe', '.dmg', '.pkg',
                               '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp',
                               '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flv'];
        
        if (skipExtensions.some(ext => path.endsWith(ext))) {
          console.log(`❌ Rejected (file extension): ${url}`);
          this.emit('url_skipped', { url, reason: 'file_extension' });
          return false;
        }
        
        // Skip obvious low-value pages but be more permissive
        const skipPatterns = [
          /\/(login|register|signup|signin|auth)/i,
          /\/(cart|checkout|payment|billing)/i,
          /\/(admin|wp-admin)/i,
          /#/,  // Skip anchor links
          /\.(css|js|json|txt|xml)$/i
        ];
        
        if (skipPatterns.some(pattern => pattern.test(url))) {
          console.log(`❌ Rejected (low-value pattern): ${url}`);
          this.emit('url_skipped', { url, reason: 'low_value_pattern' });
          return false;
        }
        
        console.log(`✅ Accepted: ${url}`);
        return true;
        
      } catch (error) {
        console.log(`❌ Rejected (invalid URL): ${url}`);
        return false; // Invalid URL
      }
    });
    
    console.log(`📋 After filtering: ${filtered.length} URLs remaining`);
    
    // Prioritize URLs (closer to root = higher priority)
    const prioritized = filtered
      .map(url => {
        const parsedUrl = new URL(url);
        const pathDepth = parsedUrl.pathname.split('/').filter(Boolean).length;
        const hasImportantKeywords = /\/(docs|documentation|api|guide|tutorial|blog|news|product)/i.test(url);
        
        return {
          url,
          priority: hasImportantKeywords ? pathDepth - 1 : pathDepth // Boost important content
        };
      })
      .sort((a, b) => a.priority - b.priority)
      .map(item => item.url);
    
    // Use environment variable for max URLs, or no limit if set to a high value
    const maxUrls = parseInt(import.meta.env.VITE_CRAWL4AI_MAX_PAGES || '5000');
    const final = prioritized.slice(0, maxUrls);
    
    console.log(`📊 Final prioritized list: ${final.length} URLs (limit: ${maxUrls})`);
    
    return final;
  }
  
  /**
   * Crawl multiple URLs using intelligent batch processing with the /crawl endpoint
   */
  private async crawlManyWithBatching(urls: string[]): Promise<any[]> {
    console.log(`🚀 Crawling ${urls.length} URLs with intelligent batch processing`);
    
    const results: any[] = [];
    const batchSize = 5; // Process 5 URLs at a time
    const delay = 2000; // 2 second delay between batches
    
    // Process URLs in batches to avoid overwhelming the API
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(urls.length / batchSize)}: ${batch.length} URLs`);
      
      // Process batch concurrently
      const batchPromises = batch.map(async (url) => {
        try {
          const requestData = {
            urls: [url],
            browser_config: {
              headless: true,
              ignore_https_errors: true
            },
            crawler_config: {
              cache_mode: "bypass",
              extract_links: true,
              same_domain_only: true
            }
          };
          
          const response = await this.client.post('/crawl', requestData);
          
          // Handle async responses
          if (response.data.task_id && !response.data.results) {
            console.log(`⏳ URL ${url} is async, polling for results...`);
            const pollResult = await this.pollForResults(response.data.task_id, url);
            return pollResult;
          }
          
          // Process synchronous response
          const result = response.data.results?.[0] || response.data;
          return {
            ...result,
            url: url,
            success: !!result.success
          };
          
        } catch (error) {
          console.warn(`⚠️ Failed to crawl ${url}:`, error);
          return {
            url: url,
            success: false,
            error_message: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });
      
      // Wait for all URLs in this batch to complete
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add delay between batches (except for the last batch)
      if (i + batchSize < urls.length) {
        console.log(`⏸️ Waiting ${delay / 1000}s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    console.log(`✅ Completed crawling ${urls.length} URLs: ${results.filter(r => r.success).length} successful`);
    return results;
  }
  
  /**
   * Save multiple pages from batch crawl results
   */
  private async saveMultiplePages(results: any[]): Promise<void> {
    console.log(`💾 Saving ${results.length} pages from batch crawl`);
    
    for (const result of results) {
      await this.saveIndividualPage(result);
    }
  }
  
  /**
   * Save individual page with error handling
   */
  private async saveIndividualPage(result: any): Promise<void> {
    try {
      if (!result.success) {
        console.warn(`⚠️ Skipping failed result: ${result.error_message || 'Unknown error'}`);
        return;
      }
      
      // Extract content from various sources
      const rawMarkdown = result.markdown?.raw_markdown || result.markdown || '';
      const fitMarkdown = result.markdown?.fit_markdown || '';
      const htmlContent = result.cleaned_html || result.html || '';
      const extractedContent = result.extracted_content || '';
      
      const content = fitMarkdown || rawMarkdown || extractedContent || htmlContent || '';
      
      if (content.trim()) {
        // Use imported supabaseService
        
        const pageResult: CrawlResult = {
          id: result.task_id || result.id || crypto.randomUUID(),
          url: result.url,
          status: 'completed',
          content,
          markdown: rawMarkdown,
          rawMarkdown,
          fitMarkdown,
          links: result.links?.internal || [],
          metadata: {
            ...result.metadata,
            crawl_type: 'smart_site_page',
            batch_crawl: true,
            discovered_links: result.links?.internal?.length || 0
          },
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        };

        await supabaseService.saveCrawlResultAsDocument(pageResult);
        console.log(`💾 Saved: ${result.url}`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to save page ${result.url}:`, error);
    }
  }
  
  
  /**
   * Create aggregated result from multiple crawl results
   */
  private createAggregatedResult(results: any[], originalUrl: string): CrawlResult {
    const successfulResults = results.filter(r => r && r.content);
    
    // Aggregate content
    const aggregatedContent = successfulResults
      .map(r => r.content)
      .join('\n\n---\n\n');
    
    // Aggregate links
    const allLinks = new Set<string>();
    successfulResults.forEach(r => {
      if (r.links) {
        r.links.forEach((link: string) => allLinks.add(link));
      }
    });
    
    return {
      id: crypto.randomUUID(),
      url: originalUrl,
      status: 'completed',
      content: aggregatedContent,
      markdown: aggregatedContent,
      links: Array.from(allLinks),
      metadata: {
        crawl_type: 'smart_site_aggregated',
        total_pages_crawled: successfulResults.length,
        total_pages_attempted: results.length,
        success_rate: Math.round((successfulResults.length / results.length) * 100),
        note: 'Individual pages saved separately. This is an aggregated summary.',
        crawled_urls: successfulResults.map(r => r.url)
      },
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
  }

  /**
   * Process the API response and convert to our CrawlResult format
   */
  private processResponse(responseData: any, originalUrl: string, crawlType: string): CrawlResult {
    console.log('📊 Processing response:', {
      hasResults: !!responseData.results,
      resultsLength: responseData.results?.length,
      hasContent: !!responseData.content,
      success: responseData.success
    });
    
    // Debug: Log the full response structure
    console.log('🔍 Full API response structure:', JSON.stringify(responseData, null, 2));

    // Handle multiple results (smart crawl)
    if (responseData.results && Array.isArray(responseData.results)) {
      return this.processMultipleResults(responseData, originalUrl, crawlType);
    }
    
    // Handle single result
    return this.processSingleResult(responseData, originalUrl, crawlType);
  }

  /**
   * Process multiple results from smart crawl
   */
  private processMultipleResults(responseData: any, originalUrl: string, crawlType: string): CrawlResult {
    const results = responseData.results;
    console.log(`📚 Processing ${results.length} pages from smart crawl`);

    // Save each page individually to database
    this.saveIndividualPages(results);

    // Return summary result for UI
    return {
      id: responseData.task_id || crypto.randomUUID(),
      url: originalUrl,
      status: 'completed',
      content: '', // Empty to prevent duplicate saves in App.tsx
      markdown: '',
      links: [],
      metadata: {
        crawl_type: crawlType,
        pages_crawled: results.length,
        summary: `Successfully crawled ${results.length} pages`,
        note: 'Pages saved individually to database'
      },
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
  }

  /**
   * Process single result
   */
  private processSingleResult(responseData: any, originalUrl: string, crawlType: string): CrawlResult {
    const content = responseData.extracted_content || 
                   responseData.markdown?.raw_markdown || 
                   responseData.markdown || 
                   responseData.cleaned_html || 
                   responseData.content || '';

    const markdown = responseData.markdown?.raw_markdown || 
                    responseData.markdown?.fit_markdown || 
                    responseData.markdown || '';

    console.log('✅ Single result processed:', {
      contentLength: content.length,
      markdownLength: markdown.length,
      hasLinks: !!responseData.links
    });

    return {
      id: responseData.task_id || responseData.id || crypto.randomUUID(),
      url: originalUrl,
      status: responseData.success ? 'completed' : 'failed',
      content,
      markdown,
      links: responseData.links || [],
      metadata: {
        ...responseData.metadata,
        crawl_type: crawlType,
        title: responseData.metadata?.title || 'Untitled'
      },
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
  }

  /**
   * Save individual pages from smart crawl to database
   */
  private async saveIndividualPages(results: any[]): Promise<void> {
    console.log(`💾 Saving ${results.length} individual pages to database`);
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      
      // Skip failed results
      if (!result.success) {
        console.warn(`⚠️ Skipping failed result ${i + 1}: ${result.error_message || 'Unknown error'}`);
        continue;
      }
      
      // Extract content from various sources (prioritize markdown, fallback to HTML)
      const rawMarkdown = result.markdown?.raw_markdown || result.markdown || '';
      const fitMarkdown = result.markdown?.fit_markdown || '';
      const htmlContent = result.cleaned_html || result.html || '';
      const extractedContent = result.extracted_content || '';
      
      // Use the best available content
      const content = fitMarkdown || rawMarkdown || extractedContent || htmlContent || '';
      
      console.log(`🔍 Content extraction for ${result.url}:`, {
        hasRawMarkdown: !!rawMarkdown,
        hasFitMarkdown: !!fitMarkdown,
        hasHtml: !!htmlContent,
        hasExtracted: !!extractedContent,
        finalContentLength: content.length
      });

      if (content.trim()) {
        try {
          // Use imported supabaseService
          
          const pageResult: CrawlResult = {
            id: result.task_id || result.id || crypto.randomUUID(),
            url: result.url,
            status: 'completed',
            content,
            markdown: rawMarkdown,
            fitMarkdown,
            rawMarkdown,
            links: result.links || [],
            metadata: {
              ...result.metadata,
              crawl_type: 'smart_site_page',
              page_index: i + 1,
              total_pages: results.length
            },
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          };

          await supabaseService.saveCrawlResultAsDocument(pageResult);
          console.log(`✅ Saved page ${i + 1}/${results.length}: ${result.url}`);
        } catch (error) {
          console.warn(`⚠️ Failed to save page ${i + 1}:`, error);
        }
      }
    }
  }

  /**
   * Poll for async results
   */
  private async pollForResults(taskId: string, originalUrl: string, maxAttempts: number = 15): Promise<CrawlResult> {
    console.log(`🔄 Polling for task ${taskId}`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.client.get(`/task/${taskId}`);
        const result = response.data;
        
        if (result.status === 'completed' || result.state === 'completed') {
          console.log('✅ Async task completed');
          return this.processResponse(result, originalUrl, 'smart_site');
        } else if (result.status === 'failed' || result.state === 'failed') {
          throw new Error(`Task failed: ${result.error || 'Unknown error'}`);
        }
        
        console.log(`⏳ Attempt ${attempt}/${maxAttempts}: Task still in progress`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
      } catch (error) {
        if (attempt === maxAttempts) {
          throw new Error(`Polling failed after ${maxAttempts} attempts`);
        }
        console.warn(`Polling attempt ${attempt} failed:`, error);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    throw new Error('Polling timed out');
  }

  /**
   * Health check to verify service is available
   */
  async healthCheck(): Promise<{ success: boolean; message?: string }> {
    try {
      // Use shorter timeout for health check only
      const healthClient = axios.create({
        baseURL: this.baseURL,
        headers: {
          'Authorization': this.token,
          'Content-Type': 'application/json',
        },
        timeout: 15000, // 15 seconds timeout for health check
      });
      
      await healthClient.get('/health');
      return { success: true, message: 'Service is healthy' };
    } catch (error) {
      console.warn('Health check failed:', error);
      
      // Be more tolerant - only fail health check for severe errors
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const isTimeoutError = error.code === 'ECONNABORTED' || error.message.includes('timeout');
        
        // Allow service to be considered healthy even with some errors
        if (status && status < 500 && !isTimeoutError) {
          console.log('Service responding with non-500 status, considering healthy');
          return { success: true, message: `Service responding (${status})` };
        }
      }
      
      return { 
        success: false, 
        message: axios.isAxiosError(error) ? `HTTP ${error.response?.status || error.code}` : 'Unknown error'
      };
    }
  }

  // Compatibility method for test apps
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    const health = await this.healthCheck();
    return {
      success: health.success,
      message: health.message || 'Unknown status',
      details: { baseURL: this.baseURL, hasToken: !!this.token }
    };
  }

  // Fallback extraction removed - not possible from browser due to CORS restrictions
  // The crawl service should be the primary method for all extractions
}

export const crawl4aiService = new SimplifiedCrawl4AIService();