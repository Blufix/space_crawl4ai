import { useState, useEffect, useCallback } from 'react';
import { supabaseService, supabase, type Document } from '../services/supabase';

interface CrawlHistoryStats {
  totalPages: number;
  totalSites: number;
  recentActivity: number;
  avgContentLength: number;
  isLoading: boolean;
  lastUpdated: string;
}

interface GroupedCrawls {
  [domain: string]: Document[];
}

export default function CrawlHistory() {
  const [crawlHistory, setCrawlHistory] = useState<Document[]>([]);
  const [stats, setStats] = useState<CrawlHistoryStats>({
    totalPages: 0,
    totalSites: 0,
    recentActivity: 0,
    avgContentLength: 0,
    isLoading: false,
    lastUpdated: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<'date' | 'domain'>('domain');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'size'>('newest');
  const [filterDomain, setFilterDomain] = useState<string>('');
  const [, setSelectedPage] = useState<Document | null>(null);
  const [pageLimit, setPageLimit] = useState(100); // Reasonable default limit
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Optimized stats calculation with proper error handling
  const calculateStats = useCallback(async (pages: Document[]) => {
    console.log('📊 Calculating stats for', pages.length, 'pages');
    
    try {
      // Use the supabase client from the imported service
      
      // Get total count with timeout protection
      console.log('🔢 Getting total page count...');
      const { count: totalCount, error: countError } = await supabase
        .from('crawled_pages')
        .select('*', { count: 'exact', head: true });
        
      if (countError) {
        console.warn('Count query failed, using displayed pages count:', countError);
      }
      
      const actualTotalPages = totalCount || pages.length;
      
      // Calculate unique domains from displayed pages to avoid timeout
      // This is more efficient than querying all URLs
      console.log('🌐 Calculating unique domains from displayed pages...');
      const uniqueDomains = new Set(pages.map(page => {
        try {
          return new URL(page.url).hostname;
        } catch {
          return 'unknown';
        }
      }));
      
      // If we have a good sample size, estimate total unique domains
      let estimatedTotalSites = uniqueDomains.size;
      if (pages.length >= 100 && actualTotalPages > pages.length) {
        // Estimate based on ratio
        const ratio = actualTotalPages / pages.length;
        estimatedTotalSites = Math.round(uniqueDomains.size * Math.sqrt(ratio));
      }
      
      // Recent activity calculation from displayed pages
      const recentPages = pages.filter(page => {
        const pageDate = new Date(page.created_at || '');
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return pageDate > weekAgo;
      });
      
      // Average content length from displayed pages
      const avgLength = pages.length > 0 
        ? Math.round(pages.reduce((sum, page) => sum + (page.content?.length || 0), 0) / pages.length)
        : 0;
      
      console.log('📈 Stats calculated:', {
        actualTotalPages,
        uniqueDomains: estimatedTotalSites,
        recentActivity: recentPages.length,
        avgLength,
        sampleSize: pages.length
      });
      
      return {
        totalPages: actualTotalPages,
        totalSites: estimatedTotalSites,
        recentActivity: recentPages.length,
        avgContentLength: avgLength,
        isLoading: false,
        lastUpdated: new Date().toLocaleTimeString()
      };
      
    } catch (error) {
      console.error('Error calculating stats:', error);
      
      // Fallback to simple calculation from displayed pages only
      console.log('📊 Using fallback calculation from displayed pages');
      const uniqueDomains = new Set(pages.map(page => {
        try {
          return new URL(page.url).hostname;
        } catch {
          return 'unknown';
        }
      }));
      
      const recentPages = pages.filter(page => {
        const pageDate = new Date(page.created_at || '');
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return pageDate > weekAgo;
      });
      
      const avgLength = pages.length > 0 
        ? Math.round(pages.reduce((sum, page) => sum + (page.content?.length || 0), 0) / pages.length)
        : 0;
      
      return {
        totalPages: pages.length,
        totalSites: uniqueDomains.size,
        recentActivity: recentPages.length,
        avgContentLength: avgLength,
        isLoading: false,
        lastUpdated: new Date().toLocaleTimeString()
      };
    }
  }, []);

  const loadCrawlHistory = useCallback(async (showLoadingIndicator = true) => {
    try {
      if (showLoadingIndicator) {
        setLoading(true);
        setStats(prev => ({ ...prev, isLoading: true }));
      }
      setError(null);
      
      console.log('🔄 Loading crawl history with limit:', pageLimit);
      
      // Load pages with timeout protection
      let pages: Document[] = [];
      try {
        pages = await Promise.race([
          supabaseService.getDocuments(pageLimit),
          new Promise<Document[]>((_, reject) => 
            setTimeout(() => reject(new Error('Query timeout')), 30000)
          )
        ]);
        console.log('✅ Successfully loaded', pages.length, 'pages');
      } catch (loadError) {
        console.warn('⚠️ Primary load failed, trying with smaller limit:', loadError);
        
        // Fallback to smaller limit if timeout
        const fallbackLimit = Math.min(50, pageLimit);
        try {
          pages = await supabaseService.getDocuments(fallbackLimit);
          console.log('✅ Fallback load successful with', pages.length, 'pages');
          setError(`Loaded with reduced limit (${fallbackLimit} pages) due to large dataset. Consider using filters.`);
        } catch (fallbackError) {
          console.error('❌ Fallback load also failed:', fallbackError);
          throw fallbackError;
        }
      }
      
      setCrawlHistory(pages);
      
      // Calculate stats with loaded pages
      console.log('📊 Calculating stats for loaded pages...');
      const newStats = await calculateStats(pages);
      setStats(newStats);
      
    } catch (err) {
      console.error('Failed to load crawl history:', err);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to load crawl history.';
      if (err instanceof Error) {
        if (err.message.includes('timeout') || err.message.includes('57014')) {
          errorMessage = 'Database query timeout. Try reducing the page limit or using filters.';
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else {
          errorMessage = `Error: ${err.message}`;
        }
      }
      
      setError(errorMessage);
      setStats(prev => ({ ...prev, isLoading: false }));
    } finally {
      setLoading(false);
    }
  }, [pageLimit, calculateStats]);

  // Refresh function for external use
  const refreshHistory = useCallback(async () => {
    setIsRefreshing(true);
    await loadCrawlHistory(false);
    setIsRefreshing(false);
  }, [loadCrawlHistory]);

  // Suppress unused variable warning
  void refreshHistory;

  // Initial load
  useEffect(() => {
    loadCrawlHistory();
  }, [loadCrawlHistory]);

  const getFilteredAndSortedHistory = (): Document[] => {
    let filtered = crawlHistory;
    
    // Filter by domain if specified
    if (filterDomain) {
      filtered = filtered.filter(page => {
        try {
          return new URL(page.url).hostname.toLowerCase().includes(filterDomain.toLowerCase());
        } catch {
          return false;
        }
      });
    }
    
    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
        case 'oldest':
          return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
        case 'size':
          return (b.content?.length || 0) - (a.content?.length || 0);
        default:
          return 0;
      }
    });
    
    return sorted;
  };

  const getGroupedHistory = (): GroupedCrawls => {
    const filtered = getFilteredAndSortedHistory();
    
    if (groupBy === 'domain') {
      return filtered.reduce((groups, page) => {
        try {
          const domain = new URL(page.url).hostname;
          if (!groups[domain]) groups[domain] = [];
          groups[domain].push(page);
          return groups;
        } catch {
          if (!groups['unknown']) groups['unknown'] = [];
          groups['unknown'].push(page);
          return groups;
        }
      }, {} as GroupedCrawls);
    } else {
      // Group by date
      return filtered.reduce((groups, page) => {
        const date = new Date(page.created_at || '').toDateString();
        if (!groups[date]) groups[date] = [];
        groups[date].push(page);
        return groups;
      }, {} as GroupedCrawls);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Unknown date';
    }
  };

  const formatContentSize = (length: number) => {
    if (length < 1024) return `${length} chars`;
    if (length < 1024 * 1024) return `${Math.round(length / 1024)} KB`;
    return `${Math.round(length / (1024 * 1024) * 10) / 10} MB`;
  };

  const getCrawlTypeIcon = (metadata: any) => {
    const crawlType = metadata?.crawl_type || 'unknown';
    switch (crawlType) {
      case 'single': return '📄';
      case 'smart_site': return '🌐';
      case 'smart_site_page': return '📑';
      case 'native_deep_crawl': return '🚀';
      default: return '🔍';
    }
  };

  if (loading) {
    return (
      <div className="crawl-history-loading">
        <div className="loading-spinner"></div>
        <p>Loading crawl history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="crawl-history-error">
        <div className="error-icon">⚠️</div>
        <p>{error}</p>
        <button onClick={() => loadCrawlHistory()} className="retry-btn">
          🔄 Retry
        </button>
      </div>
    );
  }

  const groupedHistory = getGroupedHistory();

  return (
    <div className="crawl-history">
      <style>{`
        .crawl-history {
          padding: 1rem;
        }

        .history-header {
          margin-bottom: 2rem;
        }

        .history-title {
          color: #8dd7f7;
          font-size: 1.8rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .history-subtitle {
          color: rgba(230, 243, 255, 0.8);
          font-size: 1rem;
          margin-bottom: 1.5rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: rgba(141, 215, 247, 0.1);
          border: 1px solid rgba(141, 215, 247, 0.2);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          background: rgba(141, 215, 247, 0.15);
          transform: translateY(-2px);
        }

        .stat-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .stat-number {
          font-size: 1.8rem;
          font-weight: 700;
          color: #8dd7f7;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          color: rgba(230, 243, 255, 0.8);
          font-size: 0.9rem;
        }

        .controls-panel {
          background: rgba(22, 33, 62, 0.6);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          align-items: center;
        }

        .control-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .control-label {
          color: #8dd7f7;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .control-select, .control-input {
          background: rgba(141, 215, 247, 0.1);
          border: 1px solid rgba(141, 215, 247, 0.3);
          border-radius: 8px;
          padding: 0.5rem 0.75rem;
          color: #e6f3ff;
          font-family: 'Orbitron', monospace;
          font-size: 0.9rem;
        }

        .control-select:focus, .control-input:focus {
          outline: none;
          border-color: #8dd7f7;
          box-shadow: 0 0 10px rgba(141, 215, 247, 0.3);
        }

        .history-content {
          max-height: 600px;
          overflow-y: auto;
        }

        .history-group {
          margin-bottom: 2rem;
        }

        .group-header {
          background: rgba(141, 215, 247, 0.2);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .group-title {
          color: #8dd7f7;
          font-weight: 700;
          font-size: 1.1rem;
        }

        .group-count {
          background: rgba(141, 215, 247, 0.3);
          color: #0a0a0f;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 700;
        }

        .history-items {
          display: grid;
          gap: 0.75rem;
        }

        .history-item {
          background: rgba(141, 215, 247, 0.05);
          border: 1px solid rgba(141, 215, 247, 0.2);
          border-radius: 10px;
          padding: 1rem;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .history-item:hover {
          background: rgba(141, 215, 247, 0.1);
          border-color: rgba(141, 215, 247, 0.4);
          transform: translateY(-1px);
        }

        .item-header {
          display: flex;
          justify-content: between;
          align-items: flex-start;
          margin-bottom: 0.5rem;
          gap: 1rem;
        }

        .item-url {
          color: #8dd7f7;
          font-weight: 600;
          font-size: 0.95rem;
          word-break: break-all;
          flex: 1;
        }

        .item-meta {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          flex-shrink: 0;
        }

        .crawl-type-badge {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: rgba(141, 215, 247, 0.2);
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-size: 0.8rem;
        }

        .item-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .detail-item {
          color: rgba(230, 243, 255, 0.8);
          font-size: 0.85rem;
        }

        .detail-label {
          color: #8dd7f7;
          font-weight: 600;
        }

        .item-preview {
          color: rgba(230, 243, 255, 0.7);
          font-size: 0.85rem;
          line-height: 1.4;
          max-height: 60px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.2);
          padding: 0.5rem;
          border-radius: 6px;
          border-left: 3px solid rgba(141, 215, 247, 0.5);
        }

        .crawl-history-loading, .crawl-history-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          text-align: center;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(141, 215, 247, 0.3);
          border-top: 3px solid #8dd7f7;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        .error-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .retry-btn {
          background: linear-gradient(45deg, #4a9eff, #8dd7f7);
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          color: #0a0a0f;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Orbitron', monospace;
          margin-top: 1rem;
        }

        .retry-btn:hover {
          transform: scale(1.05);
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .controls-panel {
            flex-direction: column;
            align-items: stretch;
          }
          
          .control-group {
            flex-direction: column;
            align-items: stretch;
          }
          
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>

      <div className="history-header">
        <h2 className="history-title">
          📚 Crawl History Dashboard
        </h2>
        <p className="history-subtitle">
          Track and manage your crawled sites with detailed analytics and search capabilities
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📄</div>
          <div className="stat-number">
            {stats.isLoading ? '⏳' : stats.totalPages.toLocaleString()}
          </div>
          <div className="stat-label">Total Pages</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🌐</div>
          <div className="stat-number">
            {stats.isLoading ? '⏳' : stats.totalSites.toLocaleString()}
          </div>
          <div className="stat-label">Unique Sites</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-number">
            {stats.isLoading ? '⏳' : stats.recentActivity.toLocaleString()}
          </div>
          <div className="stat-label">This Week</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-number">
            {stats.isLoading ? '⏳' : formatContentSize(stats.avgContentLength)}
          </div>
          <div className="stat-label">Avg Content</div>
        </div>
      </div>

      <div className="controls-panel">
        <div className="control-group">
          <label className="control-label">Group By:</label>
          <select 
            className="control-select"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as 'date' | 'domain')}
          >
            <option value="domain">Domain</option>
            <option value="date">Date</option>
          </select>
        </div>
        
        <div className="control-group">
          <label className="control-label">Sort By:</label>
          <select 
            className="control-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'size')}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="size">Content Size</option>
          </select>
        </div>
        
        <div className="control-group">
          <label className="control-label">Load:</label>
          <select 
            className="control-select"
            value={pageLimit}
            onChange={(e) => setPageLimit(Number(e.target.value))}
          >
            <option value="100">100 pages</option>
            <option value="500">500 pages</option>
            <option value="1000">1,000 pages</option>
            <option value="2500">2,500 pages</option>
            <option value="5000">5,000 pages</option>
          </select>
        </div>
        
        <div className="control-group">
          <label className="control-label">Filter Domain:</label>
          <input 
            type="text"
            className="control-input"
            placeholder="Filter by domain..."
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
          />
        </div>
        
        <div className="control-group">
          <span className="control-label">Updated: {stats.lastUpdated}</span>
        </div>
        
        <button 
          onClick={() => loadCrawlHistory()} 
          className="retry-btn"
          disabled={isRefreshing || stats.isLoading}
        >
          {isRefreshing ? '🔄 Refreshing...' : '🔄 Refresh Now'}
        </button>
      </div>

      <div className="history-content">
        {Object.keys(groupedHistory).length === 0 ? (
          <div className="crawl-history-error">
            <div className="error-icon">📭</div>
            <p>No crawl history found. Start crawling some sites to see them here!</p>
          </div>
        ) : (
          Object.entries(groupedHistory).map(([groupKey, pages]) => (
            <div key={groupKey} className="history-group">
              <div className="group-header">
                <div className="group-title">
                  {groupBy === 'domain' ? `🌐 ${groupKey}` : `📅 ${groupKey}`}
                </div>
                <div className="group-count">{pages.length} pages</div>
              </div>
              
              <div className="history-items">
                {pages.map((page) => (
                  <div 
                    key={page.id} 
                    className="history-item"
                    onClick={() => setSelectedPage(page)}
                  >
                    <div className="item-header">
                      <div className="item-url">{page.url}</div>
                      <div className="item-meta">
                        <div className="crawl-type-badge">
                          {getCrawlTypeIcon(page.metadata)}
                          {page.metadata?.crawl_type || 'unknown'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="item-details">
                      <div className="detail-item">
                        <span className="detail-label">Date:</span> {formatDate(page.created_at || '')}
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Size:</span> {formatContentSize(page.content?.length || 0)}
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Title:</span> {page.metadata?.title || 'Untitled'}
                      </div>
                      {page.metadata?.chunk_number && (
                        <div className="detail-item">
                          <span className="detail-label">Chunk:</span> #{page.metadata.chunk_number}
                        </div>
                      )}
                    </div>
                    
                    {page.content && (
                      <div className="item-preview">
                        {page.content.substring(0, 150)}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}