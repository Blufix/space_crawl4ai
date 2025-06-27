import { useState } from 'react';
import { crawl4aiService } from './services/crawl4ai';
import type { CrawlConfig as CrawlConfigType, CrawlResult, SearchResult } from './types';

// Space-themed icons (using Unicode emojis for now)
const SpaceIcons = {
  globe: '🌍',
  search: '🔍',
  settings: '⚙️',
  rocket: '🚀',
  star: '⭐',
  dashboard: '🌟',
  data: '📊',
  communications: '📡',
  scan: '🛸'
};

function SpaceApp() {
  console.log('SpaceApp rendering...');
  
  const [crawlConfig, setCrawlConfig] = useState<CrawlConfigType>({
    url: '',
    depth: 3,
    maxPages: 20,
    extractStrategy: 'basic',
    crawlStrategy: 'deep_crawl',
    deepCrawlMethod: 'bfs',
    timeout: 30000,
  });
  const [crawlResults, setCrawlResults] = useState<CrawlResult[]>([]);
  const [isCrawling, setIsCrawling] = useState(false);
  const [activeTab, setActiveTab] = useState<'crawl' | 'search' | 'results' | 'settings'>('crawl');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<{ tested: boolean; success: boolean; message: string; details?: any }>({
    tested: false,
    success: false,
    message: 'Not tested'
  });
  const [supabaseStatus, setSupabaseStatus] = useState<{ tested: boolean; success: boolean; message: string; details?: any }>({
    tested: false,
    success: false,
    message: 'Not tested'
  });
  const [openaiStatus, setOpenaiStatus] = useState<{ tested: boolean; success: boolean; message: string; details?: any }>({
    tested: false,
    success: false,
    message: 'Not tested'
  });

  const testConnection = async () => {
    setConnectionStatus({ tested: false, success: false, message: 'Testing...' });
    
    try {
      const result = await crawl4aiService.testConnection();
      setConnectionStatus({
        tested: true,
        success: result.success,
        message: result.message,
        details: result.details
      });
      console.log('Connection test result:', result);
    } catch (error) {
      setConnectionStatus({
        tested: true,
        success: false,
        message: 'Connection test failed',
        details: error
      });
      console.error('Connection test error:', error);
    }
  };

  const testSupabaseConnection = async () => {
    setSupabaseStatus({ tested: false, success: false, message: 'Testing...' });
    
    try {
      const { supabaseService } = await import('./services/supabase');
      const result = await supabaseService.testConnection();
      setSupabaseStatus({
        tested: true,
        success: result.success,
        message: result.message,
        details: result.details
      });
      console.log('Supabase connection test result:', result);
    } catch (error) {
      setSupabaseStatus({
        tested: true,
        success: false,
        message: 'Supabase connection test failed',
        details: error
      });
      console.error('Supabase connection test error:', error);
    }
  };

  const testOpenAIConnection = async () => {
    setOpenaiStatus({ tested: false, success: false, message: 'Testing...' });
    
    try {
      const { embeddingsService } = await import('./services/embeddings');
      const result = await embeddingsService.testConnection();
      setOpenaiStatus({
        tested: true,
        success: result.success,
        message: result.message,
        details: result.details
      });
      console.log('OpenAI connection test result:', result);
    } catch (error) {
      setOpenaiStatus({
        tested: true,
        success: false,
        message: 'OpenAI connection test failed',
        details: error
      });
      console.error('OpenAI connection test error:', error);
    }
  };

  const handleCrawl = async (url: string) => {
    console.log('Crawl requested for:', url);
    setIsCrawling(true);
    
    try {
      const config = { ...crawlConfig, url };
      const result = await crawl4aiService.crawlUrl(config);
      
      // Save to local state first
      setCrawlResults(prev => [result, ...prev]);
      
      // Save to Supabase with embeddings
      try {
        const { supabaseService } = await import('./services/supabase');
        await supabaseService.saveCrawlResultAsDocument(result);
        console.log('✅ Crawl result saved to database with embeddings');
      } catch (dbError) {
        console.error('⚠️ Failed to save to database:', dbError);
        // Continue anyway - the crawl was successful even if DB save failed
      }
      
      setActiveTab('results');
    } catch (error) {
      console.error('Crawl failed:', error);
      const errorResult: CrawlResult = {
        id: crypto.randomUUID(),
        url,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        createdAt: new Date().toISOString(),
      };
      setCrawlResults(prev => [errorResult, ...prev]);
    } finally {
      setIsCrawling(false);
    }
  };

  const handleSearch = async (query: string) => {
    console.log('Search requested for:', query);
    
    try {
      const { supabaseService } = await import('./services/supabase');
      
      // Try vector search first, fallback to text search
      const documents = await supabaseService.searchDocumentsByVector(query, 10);
      
      // Convert documents to SearchResult format
      const searchResults: SearchResult[] = documents.map(doc => ({
        id: doc.id || crypto.randomUUID(),
        content: doc.content.substring(0, 500) + (doc.content.length > 500 ? '...' : ''),
        url: doc.url,
        relevanceScore: 0.8, // This would come from vector similarity in a real implementation
        metadata: { 
          title: doc.title,
          ...doc.metadata 
        },
      }));
      
      setSearchResults(searchResults);
      console.log('✅ Search completed:', searchResults.length, 'results found');
    } catch (error) {
      console.error('Search failed:', error);
      // Fallback to mock results if search fails
      const mockResults: SearchResult[] = [
        {
          id: '1',
          content: 'Search temporarily unavailable. Mock result for: ' + query,
          url: 'https://example.com',
          relevanceScore: 0.5,
          metadata: { title: 'Mock Result - Search Error' },
        }
      ];
      setSearchResults(mockResults);
    }
  };

  const performSearch = () => {
    if (searchQuery.trim()) {
      handleSearch(searchQuery);
    }
  };

  return (
    <div className="space-app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');

        .space-app {
          font-family: 'Orbitron', monospace;
          background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%);
          color: #e6f3ff;
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
        }

        .space-app::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: 
            radial-gradient(2px 2px at 20px 30px, #fff, transparent),
            radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent),
            radial-gradient(1px 1px at 90px 40px, #8dd7f7, transparent),
            radial-gradient(1px 1px at 130px 80px, #fff, transparent),
            radial-gradient(2px 2px at 160px 30px, rgba(255,255,255,0.6), transparent);
          background-repeat: repeat;
          background-size: 200px 100px;
          animation: twinkle 4s ease-in-out infinite alternate;
          pointer-events: none;
          z-index: -1;
        }

        @keyframes twinkle {
          0% { opacity: 0.3; }
          100% { opacity: 1; }
        }

        .main-container {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .space-title {
          text-align: center;
          margin-bottom: 3rem;
          font-size: 2.5rem;
          font-weight: 900;
          color: #8dd7f7;
          text-shadow: 0 0 20px rgba(141, 215, 247, 0.5);
          letter-spacing: 2px;
        }

        .hybrid-component {
          background: rgba(26, 26, 46, 0.8);
          border: 2px solid rgba(141, 215, 247, 0.3);
          border-radius: 20px;
          padding: 2rem;
          backdrop-filter: blur(10px);
          box-shadow: 
            0 0 30px rgba(141, 215, 247, 0.2),
            inset 0 0 30px rgba(141, 215, 247, 0.1);
          position: relative;
          overflow: hidden;
        }

        .hybrid-component::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: conic-gradient(from 0deg, transparent, rgba(141, 215, 247, 0.1), transparent);
          border-radius: 50%;
          animation: orbit 20s linear infinite;
          pointer-events: none;
        }

        @keyframes orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .nav-hub {
          position: relative;
          z-index: 2;
        }

        .cosmic-search {
          position: relative;
          margin-bottom: 2rem;
        }

        .search-container {
          display: flex;
          align-items: center;
          background: linear-gradient(45deg, rgba(22, 33, 62, 0.8), rgba(26, 26, 46, 0.8));
          border: 2px solid rgba(141, 215, 247, 0.3);
          border-radius: 25px;
          padding: 0.5rem;
          transition: all 0.3s ease;
        }

        .search-container:focus-within {
          border-color: #8dd7f7;
          box-shadow: 0 0 20px rgba(141, 215, 247, 0.4);
        }

        .search-input {
          flex: 1;
          background: transparent;
          border: none;
          padding: 1rem 1.5rem;
          color: #e6f3ff;
          font-family: 'Orbitron', monospace;
          font-size: 1rem;
          outline: none;
        }

        .search-input::placeholder {
          color: rgba(230, 243, 255, 0.6);
        }

        .search-btn {
          background: linear-gradient(45deg, #4a9eff, #8dd7f7);
          border: none;
          padding: 1rem 1.5rem;
          border-radius: 20px;
          color: #0a0a0f;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: 'Orbitron', monospace;
        }

        .search-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 5px 15px rgba(141, 215, 247, 0.4);
        }

        .orbital-tabs {
          display: flex;
          margin-bottom: 2rem;
          background: rgba(22, 33, 62, 0.6);
          border-radius: 15px;
          padding: 0.5rem;
          position: relative;
        }

        .tab-indicator {
          position: absolute;
          background: linear-gradient(45deg, #4a9eff, #8dd7f7);
          border-radius: 10px;
          transition: all 0.3s ease;
          height: calc(100% - 1rem);
          top: 0.5rem;
          width: 25%;
          left: ${activeTab === 'crawl' ? '0.5rem' : 
                activeTab === 'search' ? '25%' : 
                activeTab === 'results' ? '50%' : '75%'};
        }

        .tab-btn {
          flex: 1;
          background: transparent;
          border: none;
          padding: 1rem 2rem;
          color: #e6f3ff;
          font-family: 'Orbitron', monospace;
          font-weight: 700;
          cursor: pointer;
          border-radius: 10px;
          transition: all 0.3s ease;
          position: relative;
          z-index: 2;
        }

        .tab-btn.active {
          color: #0a0a0f;
        }

        .tab-btn:hover:not(.active) {
          background: rgba(141, 215, 247, 0.1);
        }

        .tab-content {
          background: rgba(22, 33, 62, 0.4);
          border: 1px solid rgba(141, 215, 247, 0.2);
          border-radius: 15px;
          padding: 2rem;
          min-height: 400px;
        }

        .content-panel {
          display: none;
        }

        .content-panel.active {
          display: block;
          animation: fadeInUp 0.5s ease;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .content-title {
          color: #8dd7f7;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }

        .content-description {
          color: rgba(230, 243, 255, 0.9);
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }

        .space-form {
          max-width: 600px;
          margin: 0 auto;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: block;
          color: #8dd7f7;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .form-input {
          width: 100%;
          background: rgba(22, 33, 62, 0.8);
          border: 1px solid rgba(141, 215, 247, 0.3);
          border-radius: 10px;
          padding: 1rem;
          color: #e6f3ff;
          font-family: 'Orbitron', monospace;
          transition: all 0.3s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: #8dd7f7;
          box-shadow: 0 0 10px rgba(141, 215, 247, 0.3);
        }

        .form-input::placeholder {
          color: rgba(230, 243, 255, 0.6);
        }

        .space-btn {
          background: linear-gradient(45deg, #4a9eff, #8dd7f7);
          border: none;
          padding: 1rem 2rem;
          border-radius: 15px;
          color: #0a0a0f;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: 'Orbitron', monospace;
          width: 100%;
        }

        .space-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(141, 215, 247, 0.4);
        }

        .space-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .results-grid {
          display: grid;
          gap: 1rem;
        }

        .result-card {
          background: rgba(141, 215, 247, 0.1);
          border: 1px solid rgba(141, 215, 247, 0.2);
          border-radius: 10px;
          padding: 1.5rem;
          transition: all 0.3s ease;
        }

        .result-card:hover {
          background: rgba(141, 215, 247, 0.2);
          transform: translateY(-2px);
        }

        .result-url {
          color: #8dd7f7;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .result-content {
          color: rgba(230, 243, 255, 0.9);
          line-height: 1.6;
        }

        .loading-spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 3px solid rgba(141, 215, 247, 0.3);
          border-radius: 50%;
          border-top-color: #8dd7f7;
          animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="main-container">
        <h1 className="space-title">Crawl4AI Navigation Hub</h1>
        
        <div className="hybrid-component">
          <div className="nav-hub">
            {/* Cosmic Search */}
            <div className="cosmic-search">
              <div className="search-container">
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="Search the cosmos..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && performSearch()}
                />
                <button className="search-btn" onClick={performSearch}>
                  {SpaceIcons.search} Scan
                </button>
              </div>
            </div>

            {/* Orbital Tab Navigation */}
            <div className="orbital-tabs">
              <div className="tab-indicator"></div>
              <button 
                className={`tab-btn ${activeTab === 'crawl' ? 'active' : ''}`}
                onClick={() => setActiveTab('crawl')}
              >
                {SpaceIcons.rocket} Crawl
              </button>
              <button 
                className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
                onClick={() => setActiveTab('search')}
              >
                {SpaceIcons.search} Search
              </button>
              <button 
                className={`tab-btn ${activeTab === 'results' ? 'active' : ''}`}
                onClick={() => setActiveTab('results')}
              >
                {SpaceIcons.data} Results
              </button>
              <button 
                className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                {SpaceIcons.settings} Controls
              </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              {/* Crawl Panel */}
              <div className={`content-panel ${activeTab === 'crawl' ? 'active' : ''}`}>
                <h3 className="content-title">{SpaceIcons.rocket} Web Crawler Mission Control</h3>
                <p className="content-description">
                  Navigate through the digital cosmos and extract valuable data from any website. 
                  Configure your crawling parameters and launch your data extraction mission.
                </p>
                
                <div className="space-form">
                  <div className="form-group">
                    <label className="form-label">Target URL</label>
                    <input 
                      type="url" 
                      className="form-input"
                      placeholder="https://example.com"
                      value={crawlConfig.url}
                      onChange={(e) => setCrawlConfig(prev => ({ ...prev, url: e.target.value }))}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">🚀 Crawl Strategy</label>
                    <select 
                      className="form-input"
                      value={crawlConfig.crawlStrategy}
                      onChange={(e) => setCrawlConfig(prev => ({ ...prev, crawlStrategy: e.target.value as any }))}
                    >
                      <option value="single">Single Page Only</option>
                      <option value="deep_crawl">🌐 Deep Crawl (Whole Site)</option>
                    </select>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(230, 243, 255, 0.7)', marginTop: '0.5rem' }}>
                      {crawlConfig.crawlStrategy === 'deep_crawl' 
                        ? '🔍 Explores the entire website using smart navigation algorithms'
                        : '📄 Crawls only the specific URL provided'
                      }
                    </p>
                  </div>

                  {crawlConfig.crawlStrategy === 'deep_crawl' && (
                    <div className="form-group">
                      <label className="form-label">🧭 Navigation Strategy</label>
                      <select 
                        className="form-input"
                        value={crawlConfig.deepCrawlMethod}
                        onChange={(e) => setCrawlConfig(prev => ({ ...prev, deepCrawlMethod: e.target.value as any }))}
                      >
                        <option value="bfs">BFS - Breadth First (Recommended)</option>
                        <option value="dfs">DFS - Depth First</option>
                        <option value="bestfirst">Best First - Smart Priority</option>
                      </select>
                      <p style={{ fontSize: '0.8rem', color: 'rgba(230, 243, 255, 0.7)', marginTop: '0.5rem' }}>
                        BFS explores level by level, DFS goes deep first, Best First uses intelligent prioritization
                      </p>
                    </div>
                  )}
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Crawl Depth</label>
                      <input 
                        type="number" 
                        className="form-input"
                        min="1" 
                        max="5"
                        value={crawlConfig.depth}
                        onChange={(e) => setCrawlConfig(prev => ({ ...prev, depth: parseInt(e.target.value) }))}
                      />
                      <p style={{ fontSize: '0.8rem', color: 'rgba(230, 243, 255, 0.7)', marginTop: '0.5rem' }}>
                        How many link levels to follow
                      </p>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Max Pages</label>
                      <input 
                        type="number" 
                        className="form-input"
                        min="1" 
                        max="100"
                        value={crawlConfig.maxPages}
                        onChange={(e) => setCrawlConfig(prev => ({ ...prev, maxPages: parseInt(e.target.value) }))}
                      />
                      <p style={{ fontSize: '0.8rem', color: 'rgba(230, 243, 255, 0.7)', marginTop: '0.5rem' }}>
                        Maximum pages to crawl
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    className="space-btn"
                    onClick={() => handleCrawl(crawlConfig.url)}
                    disabled={isCrawling || !crawlConfig.url}
                  >
                    {isCrawling ? (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <span className="loading-spinner"></span>
                        Scanning Cosmos...
                      </span>
                    ) : (
                      `${SpaceIcons.rocket} Launch Crawl Mission`
                    )}
                  </button>
                </div>
              </div>

              {/* Search Panel */}
              <div className={`content-panel ${activeTab === 'search' ? 'active' : ''}`}>
                <h3 className="content-title">{SpaceIcons.search} Galactic Data Repository</h3>
                <p className="content-description">
                  Search through your collected data using advanced AI-powered queries. 
                  Ask questions in natural language and discover insights from your crawled content.
                </p>
                
                <div className="space-form">
                  <div className="form-group">
                    <label className="form-label">Search Query</label>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="Ask a question about your data..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <button className="space-btn" onClick={performSearch}>
                    {SpaceIcons.search} Initiate Deep Scan
                  </button>
                  
                  {searchResults.length > 0 && (
                    <div className="results-grid" style={{ marginTop: '2rem' }}>
                      {searchResults.map(result => (
                        <div key={result.id} className="result-card">
                          <div className="result-url">{result.url}</div>
                          <div className="result-content">{result.content}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Results Panel */}
              <div className={`content-panel ${activeTab === 'results' ? 'active' : ''}`}>
                <h3 className="content-title">{SpaceIcons.data} Mission Results Archive</h3>
                <p className="content-description">
                  Review your completed crawling missions and analyze the collected data. 
                  Each mission provides valuable intelligence from the digital frontier.
                </p>
                
                {crawlResults.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌌</div>
                    <div>No missions completed yet. Launch your first crawl mission to see results here.</div>
                  </div>
                ) : (
                  <div className="results-grid">
                    {crawlResults.map(result => (
                      <div key={result.id} className="result-card">
                        <div className="result-url">
                          {SpaceIcons.globe} {result.url}
                        </div>
                        <div style={{ color: '#8dd7f7', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                          Status: {result.status} | {new Date(result.createdAt).toLocaleString()}
                          {result.metadata?.pages_crawled && (
                            <span style={{ marginLeft: '1rem' }}>
                              📚 {result.metadata.pages_crawled} pages crawled
                            </span>
                          )}
                          {result.metadata?.crawl_strategy && (
                            <span style={{ marginLeft: '1rem' }}>
                              🧭 {result.metadata.crawl_strategy.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="result-content">
                          {result.content?.substring(0, 200)}...
                        </div>
                        {result.links && result.links.length > 0 && (
                          <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'rgba(230, 243, 255, 0.7)' }}>
                            Found {result.links.length} links
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Settings Panel */}
              <div className={`content-panel ${activeTab === 'settings' ? 'active' : ''}`}>
                <h3 className="content-title">{SpaceIcons.settings} Navigation Controls</h3>
                <p className="content-description">
                  Configure your space navigation preferences and system parameters. 
                  Test your backend connection and optimize performance.
                </p>
                
                <div className="space-form">
                  {/* Connection Test Section */}
                  <div className="form-group">
                    <label className="form-label">🚀 Backend Connection Test</label>
                    <div style={{ 
                      background: connectionStatus.success ? 'rgba(34, 197, 94, 0.2)' : connectionStatus.tested ? 'rgba(239, 68, 68, 0.2)' : 'rgba(141, 215, 247, 0.1)', 
                      border: `1px solid ${connectionStatus.success ? 'rgba(34, 197, 94, 0.4)' : connectionStatus.tested ? 'rgba(239, 68, 68, 0.4)' : 'rgba(141, 215, 247, 0.2)'}`,
                      borderRadius: '10px',
                      padding: '1rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Status: {connectionStatus.tested ? (connectionStatus.success ? '✅ Connected' : '❌ Failed') : '⏳ Ready to test'}
                      </div>
                      <div style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                        {connectionStatus.message}
                      </div>
                      <button 
                        className="space-btn"
                        onClick={testConnection}
                        style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                      >
                        📡 Test Connection
                      </button>
                    </div>
                  </div>

                  {/* Supabase Connection Test Section */}
                  <div className="form-group">
                    <label className="form-label">🗄️ Database Connection Test</label>
                    <div style={{ 
                      background: supabaseStatus.success ? 'rgba(34, 197, 94, 0.2)' : supabaseStatus.tested ? 'rgba(239, 68, 68, 0.2)' : 'rgba(141, 215, 247, 0.1)', 
                      border: `1px solid ${supabaseStatus.success ? 'rgba(34, 197, 94, 0.4)' : supabaseStatus.tested ? 'rgba(239, 68, 68, 0.4)' : 'rgba(141, 215, 247, 0.2)'}`,
                      borderRadius: '10px',
                      padding: '1rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Status: {supabaseStatus.tested ? (supabaseStatus.success ? '✅ Connected' : '❌ Failed') : '⏳ Ready to test'}
                      </div>
                      <div style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                        {supabaseStatus.message}
                      </div>
                      <button 
                        className="space-btn"
                        onClick={testSupabaseConnection}
                        style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                      >
                        🗄️ Test Database
                      </button>
                    </div>
                  </div>

                  {/* OpenAI Connection Test Section */}
                  <div className="form-group">
                    <label className="form-label">🤖 AI Embeddings Test</label>
                    <div style={{ 
                      background: openaiStatus.success ? 'rgba(34, 197, 94, 0.2)' : openaiStatus.tested ? 'rgba(239, 68, 68, 0.2)' : 'rgba(141, 215, 247, 0.1)', 
                      border: `1px solid ${openaiStatus.success ? 'rgba(34, 197, 94, 0.4)' : openaiStatus.tested ? 'rgba(239, 68, 68, 0.4)' : 'rgba(141, 215, 247, 0.2)'}`,
                      borderRadius: '10px',
                      padding: '1rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Status: {openaiStatus.tested ? (openaiStatus.success ? '✅ Connected' : '❌ Failed') : '⏳ Ready to test'}
                      </div>
                      <div style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                        {openaiStatus.message}
                      </div>
                      <button 
                        className="space-btn"
                        onClick={testOpenAIConnection}
                        style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                      >
                        🤖 Test Embeddings
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Extraction Strategy</label>
                    <select 
                      className="form-input"
                      value={crawlConfig.extractStrategy}
                      onChange={(e) => setCrawlConfig(prev => ({ ...prev, extractStrategy: e.target.value as any }))}
                    >
                      <option value="basic">Basic Extraction</option>
                      <option value="llm">AI-Enhanced Extraction</option>
                      <option value="css">CSS Selector</option>
                      <option value="xpath">XPath Selector</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Timeout (seconds)</label>
                    <input 
                      type="number" 
                      className="form-input"
                      min="5" 
                      max="300"
                      value={crawlConfig.timeout ? crawlConfig.timeout / 1000 : 30}
                      onChange={(e) => setCrawlConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) * 1000 }))}
                    />
                  </div>
                  
                  <button className="space-btn">
                    {SpaceIcons.settings} Apply Configuration
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SpaceApp;