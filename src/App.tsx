import { useState, useEffect } from 'react';
import { crawl4aiService } from './services/crawl4ai';
import { supabaseService, type Document } from './services/supabase';
import { settingsService } from './services/settings';
import CrawlHistory from './components/CrawlHistory';
import CrawlStatusDashboard from './components/CrawlStatusDashboard';
import TableManager from './components/TableManager';
import type { SimplifiedCrawlConfig, CrawlResult } from './types';

function App() {
  const [crawlConfig, setCrawlConfig] = useState<{ crawlType: 'single' | 'smart_site' }>({ 
    crawlType: 'single' 
  });
  const [crawlResults, setCrawlResults] = useState<CrawlResult[]>([]);
  const [isCrawling, setIsCrawling] = useState(false);
  const [activeTab, setActiveTab] = useState<'crawl' | 'search' | 'results' | 'history' | 'settings'>('crawl');
  const [urlInput, setUrlInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Document[]>([]);
  const [recentCrawls, setRecentCrawls] = useState<string[]>([]);
  const [appStats, setAppStats] = useState(settingsService.getFormattedStats());
  const [crawlController, setCrawlController] = useState<AbortController | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>('crawled_pages');

  useEffect(() => {
    // Load recent crawls from localStorage
    const stored = localStorage.getItem('recentCrawls');
    if (stored) {
      setRecentCrawls(JSON.parse(stored));
    }
    
    // Initialize settings and load preferences
    const settings = settingsService.getSettings();
    setCrawlConfig({ crawlType: settings.crawlPreferences.defaultCrawlType });
    setActiveTab(settings.uiPreferences.defaultTab as 'crawl' | 'search' | 'results' | 'history' | 'settings');
    setAppStats(settingsService.getFormattedStats());
  }, []);

  const handleCrawl = async () => {
    if (!urlInput.trim()) return;
    
    setIsCrawling(true);
    
    // Create new abort controller for this crawl
    const controller = new AbortController();
    setCrawlController(controller);
    
    const config: SimplifiedCrawlConfig = { url: urlInput, crawlType: crawlConfig.crawlType };
    
    try {
      console.log(`🚀 Starting ${config.crawlType} crawl for:`, urlInput);
      const result = await crawl4aiService.crawlUrl(config, controller.signal);
      setCrawlResults(prev => [result, ...prev]);
      
      // Save to recent crawls
      const newRecentCrawls = [urlInput, ...recentCrawls.filter(url => url !== urlInput)].slice(0, 5);
      setRecentCrawls(newRecentCrawls);
      localStorage.setItem('recentCrawls', JSON.stringify(newRecentCrawls));
      
      // Save to Supabase if there's content
      const hasContent = (result.content?.length || 0) > 0;
      const isAlreadySaved = result.metadata?.note?.includes('saved individually');
      
      if (hasContent && !isAlreadySaved) {
        try {
          console.log('💾 Saving crawl result to database...');
          await supabaseService.saveCrawlResultAsDocument(result);
          console.log('✅ Successfully saved to database');
        } catch (error) {
          console.error('❌ Failed to save to database:', error);
        }
      }
      
      // Record successful mission in settings
      const pagesCrawled = result.metadata?.pages_crawled || result.metadata?.total_pages_crawled || 1;
      const contentSize = result.content?.length || 0;
      settingsService.recordMission(true, pagesCrawled, contentSize);
      
      // Record site if it's a new domain
      try {
        const hostname = new URL(urlInput).hostname;
        if (hostname) {
          settingsService.recordSiteCrawled();
        }
      } catch {
        // Invalid URL, ignore
      }
      
      // Update stats display
      setAppStats(settingsService.getFormattedStats());
      
      // Switch to results tab
      setActiveTab('results');
      
    } catch (error) {
      console.error('❌ Crawl failed:', error);
      
      // Record failed mission
      settingsService.recordMission(false, 0, 0);
      setAppStats(settingsService.getFormattedStats());
      
      const errorResult: CrawlResult = {
        id: crypto.randomUUID(),
        url: urlInput,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        createdAt: new Date().toISOString(),
      };
      setCrawlResults(prev => [errorResult, ...prev]);
    } finally {
      setIsCrawling(false);
      setCrawlController(null);
    }
  };

  const handleCancelCrawl = () => {
    if (crawlController) {
      console.log('🕳️ Cancelling crawl operation...');
      crawlController.abort();
      setCrawlController(null);
      setIsCrawling(false);
      
      // Add cancelled result to results
      const cancelledResult: CrawlResult = {
        id: crypto.randomUUID(),
        url: urlInput,
        status: 'failed',
        error: 'Crawl operation was cancelled by user',
        createdAt: new Date().toISOString(),
      };
      setCrawlResults(prev => [cancelledResult, ...prev]);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const results = await supabaseService.searchDocumentsByVector(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    }
  };

  const updateTabIndicator = (activeTabButton: HTMLElement) => {
    const indicator = document.getElementById('tabIndicator');
    if (indicator && activeTabButton) {
      const tabRect = activeTabButton.getBoundingClientRect();
      const containerRect = activeTabButton.parentElement?.getBoundingClientRect();
      if (containerRect) {
        const left = tabRect.left - containerRect.left;
        const width = tabRect.width;
        indicator.style.left = left + 'px';
        indicator.style.width = width + 'px';
      }
    }
  };

  const handleTabClick = (tab: 'crawl' | 'search' | 'results' | 'history' | 'settings', event: React.MouseEvent) => {
    setActiveTab(tab);
    updateTabIndicator(event.currentTarget as HTMLElement);
  };

  const handleTableChange = (tableName: string) => {
    setSelectedTable(tableName);
    supabaseService.setCurrentTable(tableName);
    console.log('🔄 Switched to table:', tableName);
  };

  useEffect(() => {
    // Initialize tab indicator on first load
    const activeTabButton = document.querySelector('.tab-btn.active') as HTMLElement;
    if (activeTabButton) {
      updateTabIndicator(activeTabButton);
    }
  }, []);

  return (
    <div className="space-app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Orbitron', monospace;
          background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%);
          color: #e6f3ff;
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
        }

        body::before {
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

        .space-app {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .cosmic-title {
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

        .search-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* Black Hole Cancel Button Styles */
        .cancel-btn.blackhole-btn {
          background: transparent;
          border: none;
          padding: 1rem;
          border-radius: 50%;
          cursor: pointer;
          position: relative;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          overflow: hidden;
        }

        .cancel-btn.blackhole-btn:hover {
          transform: scale(1.1);
        }

        .blackhole {
          position: relative;
          width: 45px;
          height: 45px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .event-horizon {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: radial-gradient(circle at center, 
            transparent 0%, 
            transparent 30%, 
            rgba(0, 0, 0, 0.8) 40%, 
            #000000 50%, 
            #000000 100%);
          animation: horizon-pulse 2s ease-in-out infinite;
          z-index: 3;
        }

        .accretion-disk {
          position: absolute;
          width: 120%;
          height: 120%;
          border-radius: 50%;
          background: conic-gradient(from 0deg, 
            transparent, 
            rgba(255, 69, 0, 0.8), 
            rgba(255, 165, 0, 0.6), 
            rgba(255, 255, 255, 0.4), 
            rgba(138, 43, 226, 0.8), 
            transparent);
          animation: accretion-spin 3s linear infinite;
          z-index: 1;
          filter: blur(1px);
        }

        .accretion-disk::before {
          content: '';
          position: absolute;
          top: 10%;
          left: 10%;
          width: 80%;
          height: 80%;
          border-radius: 50%;
          background: conic-gradient(from 180deg, 
            transparent, 
            rgba(255, 215, 0, 0.6), 
            rgba(255, 69, 0, 0.8), 
            rgba(138, 43, 226, 0.6), 
            transparent);
          animation: accretion-spin 2s linear infinite reverse;
        }

        .singularity {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #000000;
          box-shadow: 
            0 0 10px rgba(0, 0, 0, 1),
            0 0 20px rgba(0, 0, 0, 0.8),
            0 0 30px rgba(0, 0, 0, 0.6);
          animation: singularity-flicker 1.5s ease-in-out infinite;
          z-index: 4;
        }

        @keyframes horizon-pulse {
          0%, 100% { 
            transform: scale(1); 
            opacity: 1; 
          }
          50% { 
            transform: scale(1.05); 
            opacity: 0.9; 
          }
        }

        @keyframes accretion-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes singularity-flicker {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1); 
          }
          25% { 
            opacity: 0.8; 
            transform: scale(1.1); 
          }
          50% { 
            opacity: 1; 
            transform: scale(0.9); 
          }
          75% { 
            opacity: 0.9; 
            transform: scale(1.05); 
          }
        }

        /* Black hole gravitational lensing effect */
        .cancel-btn.blackhole-btn:hover .blackhole {
          animation: gravitational-lens 0.5s ease-in-out;
        }

        @keyframes gravitational-lens {
          0% { transform: scale(1); }
          50% { transform: scale(0.95) rotateZ(5deg); }
          100% { transform: scale(1); }
        }

        /* Input field disabled state */
        .search-input:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          background: rgba(141, 215, 247, 0.05);
        }

        .crawl-type-selector {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          background: rgba(22, 33, 62, 0.6);
          border-radius: 15px;
          padding: 0.5rem;
        }

        .crawl-type-btn {
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
        }

        .crawl-type-btn.active {
          background: linear-gradient(45deg, #4a9eff, #8dd7f7);
          color: #0a0a0f;
        }

        .crawl-type-btn:hover:not(.active) {
          background: rgba(141, 215, 247, 0.1);
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

        .memory-panel {
          background: linear-gradient(135deg, rgba(22, 33, 62, 0.6), rgba(26, 26, 46, 0.6));
          border: 1px solid rgba(141, 215, 247, 0.2);
          border-radius: 15px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .memory-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .memory-title {
          color: #8dd7f7;
          font-weight: 700;
          font-size: 1.2rem;
        }

        .memory-status {
          background: linear-gradient(45deg, #4a9eff, #8dd7f7);
          color: #0a0a0f;
          padding: 0.5rem 1rem;
          border-radius: 10px;
          font-size: 0.8rem;
          font-weight: 700;
        }

        .memory-items {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
        }

        .memory-item {
          background: rgba(141, 215, 247, 0.1);
          border: 1px solid rgba(141, 215, 247, 0.2);
          border-radius: 10px;
          padding: 1rem;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .memory-item:hover {
          background: rgba(141, 215, 247, 0.2);
          transform: scale(1.02);
        }

        .memory-item-title {
          color: #8dd7f7;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .memory-item-desc {
          color: rgba(230, 243, 255, 0.8);
          font-size: 0.9rem;
        }

        .crawl-result {
          background: rgba(141, 215, 247, 0.1);
          border: 1px solid rgba(141, 215, 247, 0.2);
          border-radius: 10px;
          padding: 1rem;
          margin-bottom: 1rem;
          transition: all 0.3s ease;
        }

        .crawl-result:hover {
          background: rgba(141, 215, 247, 0.2);
        }

        .result-url {
          color: #8dd7f7;
          font-weight: 700;
          margin-bottom: 0.5rem;
          word-break: break-all;
        }

        .result-status {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 15px;
          font-size: 0.8rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .result-status.completed {
          background: linear-gradient(45deg, #4ade80, #22c55e);
          color: #0a0a0f;
        }

        .result-status.failed {
          background: linear-gradient(45deg, #ef4444, #dc2626);
          color: #fff;
        }

        .result-content {
          color: rgba(230, 243, 255, 0.8);
          font-size: 0.9rem;
          line-height: 1.4;
          max-height: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .search-result {
          background: rgba(141, 215, 247, 0.1);
          border: 1px solid rgba(141, 215, 247, 0.2);
          border-radius: 10px;
          padding: 1rem;
          margin-bottom: 1rem;
          transition: all 0.3s ease;
        }

        .search-result:hover {
          background: rgba(141, 215, 247, 0.2);
        }

        .loading-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 2rem;
          color: #8dd7f7;
          font-weight: 700;
        }

        .spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(141, 215, 247, 0.3);
          border-top: 3px solid #8dd7f7;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .orbital-tabs {
            flex-direction: column;
          }
          
          .tab-indicator {
            display: none;
          }
          
          .cosmic-title {
            font-size: 2rem;
          }
        }
      `}</style>

      <main>
        <h1 className="cosmic-title">🌌 Crawl4AI Navigation Hub</h1>
        
        {/* Real-time Crawling Dashboard */}
        <CrawlStatusDashboard isActive={isCrawling} crawlService={crawl4aiService} />
        
        <div className="hybrid-component">
          <div className="nav-hub">
            
            {/* Table Manager */}
            <TableManager 
              selectedTable={selectedTable}
              onTableChange={handleTableChange}
            />

            {/* Main URL Input */}
            <div className="cosmic-search">
              <div className="search-container">
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="Enter URL to crawl the cosmos..." 
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isCrawling && handleCrawl()}
                  disabled={isCrawling}
                />
                {!isCrawling ? (
                  <button 
                    className="search-btn" 
                    onClick={handleCrawl}
                    disabled={!urlInput.trim()}
                  >
                    🚀 Crawl
                  </button>
                ) : (
                  <button 
                    className="cancel-btn blackhole-btn" 
                    onClick={handleCancelCrawl}
                    title="Cancel Crawl"
                  >
                    <div className="blackhole">
                      <div className="event-horizon"></div>
                      <div className="accretion-disk"></div>
                      <div className="singularity"></div>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Crawl Type Selector */}
            <div className="crawl-type-selector">
              <button 
                className={`crawl-type-btn ${crawlConfig.crawlType === 'single' ? 'active' : ''}`}
                onClick={() => setCrawlConfig({crawlType: 'single'})}
              >
                📄 Single Page
              </button>
              <button 
                className={`crawl-type-btn ${crawlConfig.crawlType === 'smart_site' ? 'active' : ''}`}
                onClick={() => setCrawlConfig({crawlType: 'smart_site'})}
              >
                🌐 Smart Site Crawl
              </button>
            </div>

            {/* Recent Crawls Memory Panel */}
            {recentCrawls.length > 0 && (
              <div className="memory-panel">
                <div className="memory-header">
                  <h3 className="memory-title">🕰️ Recent Crawl Missions</h3>
                  <div className="memory-status">ACTIVE</div>
                </div>
                <div className="memory-items">
                  {recentCrawls.map((url, index) => (
                    <div 
                      key={index} 
                      className="memory-item"
                      onClick={() => setUrlInput(url)}
                    >
                      <div className="memory-item-title">Mission {index + 1}</div>
                      <div className="memory-item-desc">{url}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="orbital-tabs">
              <div className="tab-indicator" id="tabIndicator"></div>
              <button 
                className={`tab-btn ${activeTab === 'crawl' ? 'active' : ''}`}
                onClick={(e) => handleTabClick('crawl', e)}
              >
                🚀 Crawl
              </button>
              <button 
                className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
                onClick={(e) => handleTabClick('search', e)}
              >
                🔍 Search
              </button>
              <button 
                className={`tab-btn ${activeTab === 'results' ? 'active' : ''}`}
                onClick={(e) => handleTabClick('results', e)}
              >
                📊 Results ({crawlResults.length})
              </button>
              <button 
                className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                onClick={(e) => handleTabClick('history', e)}
              >
                📚 History
              </button>
              <button 
                className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={(e) => handleTabClick('settings', e)}
              >
                ⚙️ Settings
              </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              
              {/* Crawl Tab */}
              <div className={`content-panel ${activeTab === 'crawl' ? 'active' : ''}`}>
                <h3 className="content-title">🌌 Cosmic Web Crawler</h3>
                <p className="content-description">
                  Navigate through the infinite expanse of the web using our advanced AI-powered crawler. 
                  Extract content, discover knowledge, and explore the digital cosmos.
                </p>
                
                {isCrawling && (
                  <div className="loading-indicator">
                    <div className="spinner"></div>
                    <span>Scanning the digital cosmos...</span>
                  </div>
                )}

                <div className="content-description">
                  <strong>🔭 How it works:</strong><br/>
                  <strong>📄 Single Page:</strong> Extract content from one specific page - fast and focused<br/>
                  <strong>🌐 Smart Site Crawl:</strong> Discover and crawl entire websites using intelligent batch processing. Automatically finds internal links, prioritizes content pages, and processes sites in manageable batches with cool-off periods to respect server resources.
                  <br/><br/>
                  <strong>📋 Storage:</strong> All crawled content will be saved to the <code style={{color: '#8dd7f7', background: 'rgba(141, 215, 247, 0.1)', padding: '0.2rem 0.4rem', borderRadius: '4px'}}>{selectedTable}</code> table.
                </div>
              </div>

              {/* Search Tab */}
              <div className={`content-panel ${activeTab === 'search' ? 'active' : ''}`}>
                <h3 className="content-title">🔍 Knowledge Base Search</h3>
                <p className="content-description">
                  Search through your collected web data using advanced vector similarity. 
                  Find relevant information across all your crawled content.
                  <br/><br/>
                  <strong>📋 Searching in:</strong> <code style={{color: '#8dd7f7', background: 'rgba(141, 215, 247, 0.1)', padding: '0.2rem 0.4rem', borderRadius: '4px'}}>{selectedTable}</code> table.
                </p>
                
                <div className="cosmic-search">
                  <div className="search-container">
                    <input 
                      type="text" 
                      className="search-input" 
                      placeholder="Search your knowledge base..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button 
                      className="search-btn" 
                      onClick={handleSearch}
                      disabled={!searchQuery.trim()}
                    >
                      🔍 Search
                    </button>
                  </div>
                </div>

                {searchResults.length > 0 && (
                  <div>
                    <h4 className="content-title">Search Results ({searchResults.length})</h4>
                    {searchResults.map((result, index) => (
                      <div key={index} className="search-result">
                        <div className="result-url">{result.url}</div>
                        <div className="result-content">
                          {result.content?.substring(0, 200)}...
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Results Tab */}
              <div className={`content-panel ${activeTab === 'results' ? 'active' : ''}`}>
                <h3 className="content-title">📊 Crawl Mission Results</h3>
                <p className="content-description">
                  Review all your completed crawl missions and their extracted data.
                </p>
                
                {crawlResults.length === 0 ? (
                  <div className="content-description">
                    No crawl results yet. Start your first mission by entering a URL in the crawl tab!
                  </div>
                ) : (
                  <div>
                    {crawlResults.map((result) => (
                      <div key={result.id} className="crawl-result">
                        <div className="result-url">{result.url}</div>
                        <div className={`result-status ${result.status}`}>
                          {result.status === 'completed' ? '✅ COMPLETED' : '❌ FAILED'}
                        </div>
                        {result.error && (
                          <div style={{color: '#ef4444', fontSize: '0.9rem', marginBottom: '0.5rem'}}>
                            Error: {result.error}
                          </div>
                        )}
                        {result.content && (
                          <div className="result-content">
                            {result.content.substring(0, 300)}...
                          </div>
                        )}
                        {result.metadata?.pages_crawled && (
                          <div style={{color: '#8dd7f7', fontSize: '0.9rem', marginTop: '0.5rem'}}>
                            📊 {result.metadata.pages_crawled} pages crawled
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* History Tab */}
              <div className={`content-panel ${activeTab === 'history' ? 'active' : ''}`}>
                <CrawlHistory />
              </div>

              {/* Settings Tab */}
              <div className={`content-panel ${activeTab === 'settings' ? 'active' : ''}`}>
                <h3 className="content-title">⚙️ Navigation Controls</h3>
                <p className="content-description">
                  Configure your space crawler settings and monitor persistent system statistics.
                </p>
                
                <div className="memory-panel">
                  <div className="memory-header">
                    <h3 className="memory-title">📊 Mission Statistics</h3>
                    <div className="memory-status">PERSISTENT</div>
                  </div>
                  <div className="memory-items">
                    <div className="memory-item">
                      <div className="memory-item-title">🚀 Total Missions</div>
                      <div className="memory-item-desc">{appStats.totalMissions}</div>
                    </div>
                    <div className="memory-item">
                      <div className="memory-item-title">📄 Pages Crawled</div>
                      <div className="memory-item-desc">{appStats.totalPages}</div>
                    </div>
                    <div className="memory-item">
                      <div className="memory-item-title">🌐 Sites Explored</div>
                      <div className="memory-item-desc">{appStats.totalSites}</div>
                    </div>
                    <div className="memory-item">
                      <div className="memory-item-title">✅ Success Rate</div>
                      <div className="memory-item-desc">{appStats.successRate}</div>
                    </div>
                    <div className="memory-item">
                      <div className="memory-item-title">💾 Content Collected</div>
                      <div className="memory-item-desc">{appStats.totalContentSize}</div>
                    </div>
                    <div className="memory-item">
                      <div className="memory-item-title">🕐 Last Mission</div>
                      <div className="memory-item-desc">{appStats.lastCrawl}</div>
                    </div>
                  </div>
                </div>

                <div className="memory-panel">
                  <div className="memory-header">
                    <h3 className="memory-title">🛰️ System Status</h3>
                    <div className="memory-status">OPERATIONAL</div>
                  </div>
                  <div className="memory-items">
                    <div className="memory-item">
                      <div className="memory-item-title">Crawl4AI Service</div>
                      <div className="memory-item-desc">Connected & Ready</div>
                    </div>
                    <div className="memory-item">
                      <div className="memory-item-title">Database</div>
                      <div className="memory-item-desc">Supabase Online</div>
                    </div>
                    <div className="memory-item">
                      <div className="memory-item-title">AI Embeddings</div>
                      <div className="memory-item-desc">OpenAI Connected</div>
                    </div>
                    <div className="memory-item">
                      <div className="memory-item-title">Session Results</div>
                      <div className="memory-item-desc">{crawlResults.length} This Session</div>
                    </div>
                  </div>
                </div>

                <div className="memory-panel">
                  <div className="memory-header">
                    <h3 className="memory-title">🔧 Quick Actions</h3>
                    <div className="memory-status">CONTROLS</div>
                  </div>
                  <div className="memory-items">
                    <div 
                      className="memory-item"
                      onClick={() => {
                        setAppStats(settingsService.getFormattedStats());
                        console.log('📊 Stats refreshed');
                      }}
                      style={{cursor: 'pointer'}}
                    >
                      <div className="memory-item-title">🔄 Refresh Stats</div>
                      <div className="memory-item-desc">Update display with latest data</div>
                    </div>
                    <div 
                      className="memory-item"
                      onClick={() => {
                        if (confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
                          settingsService.resetStats();
                          setAppStats(settingsService.getFormattedStats());
                          console.log('📊 All statistics reset');
                        }
                      }}
                      style={{cursor: 'pointer', borderColor: 'rgba(239, 68, 68, 0.3)'}}
                    >
                      <div className="memory-item-title">🗑️ Reset Stats</div>
                      <div className="memory-item-desc">Clear all mission statistics</div>
                    </div>
                    <div 
                      className="memory-item"
                      onClick={() => {
                        const settings = settingsService.exportSettings();
                        const blob = new Blob([settings], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `crawl4ai-settings-${new Date().toISOString().split('T')[0]}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      style={{cursor: 'pointer'}}
                    >
                      <div className="memory-item-title">💾 Export Settings</div>
                      <div className="memory-item-desc">Download settings backup</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;