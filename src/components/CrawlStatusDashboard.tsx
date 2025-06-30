import { useState, useEffect, useRef } from 'react';

interface CrawlStats {
  totalUrlsFound: number;
  totalUrlsSkipped: number;
  totalUrlsCrawled: number;
  currentUrl: string;
  status: 'idle' | 'discovering' | 'crawling' | 'completed' | 'error';
  batchInfo: {
    currentBatch: number;
    totalBatches: number;
    batchSize: number;
  };
  recentUrls: string[];
  startTime: number | null;
  estimatedTimeRemaining: number | null;
}

interface CrawlStatusDashboardProps {
  isActive: boolean;
  crawlService?: any; // The crawl4ai service instance
  onStatsUpdate?: (stats: CrawlStats) => void;
}

export default function CrawlStatusDashboard({ isActive, crawlService }: CrawlStatusDashboardProps) {
  const [stats, setStats] = useState<CrawlStats>({
    totalUrlsFound: 0,
    totalUrlsSkipped: 0,
    totalUrlsCrawled: 0,
    currentUrl: '',
    status: 'idle',
    batchInfo: {
      currentBatch: 0,
      totalBatches: 0,
      batchSize: 0
    },
    recentUrls: [],
    startTime: null,
    estimatedTimeRemaining: null
  });

  const starFieldRef = useRef<HTMLDivElement>(null);
  const rocketRef = useRef<HTMLDivElement>(null);

  // Listen to real crawl events from the service
  useEffect(() => {
    if (!crawlService) {
      return;
    }

    if (!isActive) {
      setStats(prev => ({ ...prev, status: 'idle' }));
      return;
    }

    // Immediately set status to discovering when crawl becomes active
    console.log('🚀 Setting status to discovering because isActive=true');
    setStats(prev => ({ 
      ...prev, 
      status: 'discovering',
      currentUrl: 'Initializing crawl...'
    }));

    const handleCrawlStart = (data: any) => {
      console.log('🎯 Dashboard received crawl_start:', data);
      setStats(prev => ({
        ...prev,
        status: 'discovering',
        startTime: data.timestamp,
        totalUrlsFound: 0,
        totalUrlsCrawled: 0,
        totalUrlsSkipped: 0,
        currentUrl: data.url,
        recentUrls: [],
        batchInfo: { currentBatch: 0, totalBatches: 0, batchSize: 0 }
      }));
    };

    const handleStatusUpdate = (data: any) => {
      console.log('📊 Dashboard received status_update:', data);
      console.log('🚀 Setting rocket status to:', data.status);
      setStats(prev => ({ ...prev, status: data.status }));
    };

    const handleUrlsDiscovered = (data: any) => {
      console.log('🔍 Dashboard received urls_discovered:', data);
      setStats(prev => ({
        ...prev,
        totalUrlsFound: data.total,
        status: 'crawling'
      }));
    };

    const handleBatchInfo = (data: any) => {
      console.log('📦 Dashboard received batch_info:', data);
      setStats(prev => ({
        ...prev,
        batchInfo: {
          currentBatch: 0,
          totalBatches: data.totalBatches,
          batchSize: data.batchSize
        }
      }));
    };

    const handleBatchStart = (data: any) => {
      console.log('🚀 Dashboard received batch_start:', data);
      setStats(prev => ({
        ...prev,
        batchInfo: {
          ...prev.batchInfo,
          currentBatch: data.batchNumber
        }
      }));
    };

    const handleUrlCrawled = (data: any) => {
      console.log('✅ Dashboard received url_crawled:', data);
      setStats(prev => {
        const newStats = { ...prev };
        newStats.totalUrlsCrawled++;
        newStats.currentUrl = data.url;
        newStats.recentUrls = [data.url, ...newStats.recentUrls.slice(0, 4)];
        
        // Calculate time remaining
        if (newStats.startTime && newStats.totalUrlsFound > 0) {
          const elapsed = Date.now() - newStats.startTime;
          const rate = newStats.totalUrlsCrawled / elapsed;
          const remaining = (newStats.totalUrlsFound - newStats.totalUrlsCrawled) / rate;
          newStats.estimatedTimeRemaining = remaining;
        }
        
        return newStats;
      });
    };

    const handleUrlSkipped = (data: any) => {
      console.log('⚠️ Dashboard received url_skipped:', data);
      setStats(prev => ({ ...prev, totalUrlsSkipped: prev.totalUrlsSkipped + 1 }));
    };

    const handleUrlFailed = (data: any) => {
      console.log('❌ Dashboard received url_failed:', data);
      setStats(prev => ({ ...prev, totalUrlsSkipped: prev.totalUrlsSkipped + 1 }));
    };

    const handleCrawlComplete = (data: any) => {
      console.log('🎉 Dashboard received crawl_complete:', data);
      setStats(prev => ({
        ...prev,
        status: 'completed',
        currentUrl: '',
        estimatedTimeRemaining: 0
      }));
    };

    const handleCrawlError = (data: any) => {
      console.log('💥 Dashboard received crawl_error:', data);
      setStats(prev => ({ ...prev, status: 'error' }));
    };

    // Subscribe to events
    crawlService.on('crawl_start', handleCrawlStart);
    crawlService.on('status_update', handleStatusUpdate);
    crawlService.on('urls_discovered', handleUrlsDiscovered);
    crawlService.on('batch_info', handleBatchInfo);
    crawlService.on('batch_start', handleBatchStart);
    crawlService.on('url_crawled', handleUrlCrawled);
    crawlService.on('url_skipped', handleUrlSkipped);
    crawlService.on('url_failed', handleUrlFailed);
    crawlService.on('crawl_complete', handleCrawlComplete);
    crawlService.on('crawl_error', handleCrawlError);

    return () => {
      // Unsubscribe from events
      crawlService.off('crawl_start', handleCrawlStart);
      crawlService.off('status_update', handleStatusUpdate);
      crawlService.off('urls_discovered', handleUrlsDiscovered);
      crawlService.off('batch_info', handleBatchInfo);
      crawlService.off('batch_start', handleBatchStart);
      crawlService.off('url_crawled', handleUrlCrawled);
      crawlService.off('url_skipped', handleUrlSkipped);
      crawlService.off('url_failed', handleUrlFailed);
      crawlService.off('crawl_complete', handleCrawlComplete);
      crawlService.off('crawl_error', handleCrawlError);
    };
  }, [isActive, crawlService]);

  // Animate star field
  useEffect(() => {
    const createStar = () => {
      if (!starFieldRef.current) return;
      
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = Math.random() * 100 + '%';
      star.style.animationDuration = (Math.random() * 3 + 2) + 's';
      star.style.opacity = (Math.random() * 0.8 + 0.2).toString();
      
      starFieldRef.current.appendChild(star);
      
      // Remove star after animation
      setTimeout(() => {
        if (star.parentNode) {
          star.parentNode.removeChild(star);
        }
      }, 5000);
    };

    let starInterval: NodeJS.Timeout;
    if (stats.status === 'discovering' || stats.status === 'crawling') {
      starInterval = setInterval(createStar, 200);
    }

    return () => {
      if (starInterval) clearInterval(starInterval);
    };
  }, [stats.status]);

  // Debug status changes for rocket animation
  useEffect(() => {
    console.log('🚀 Status changed to:', stats.status, '- Rocket should be:', (stats.status === 'crawling' || stats.status === 'discovering') ? 'flying' : 'idle');
    console.log('🚀 isActive prop:', isActive);
    console.log('🚀 crawlService available:', !!crawlService);
  }, [stats.status, isActive, crawlService]);

  const getStatusColor = () => {
    switch (stats.status) {
      case 'idle': return '#6b7280';
      case 'discovering': return '#f59e0b';
      case 'crawling': return '#8dd7f7';
      case 'completed': return '#10b981';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (stats.status) {
      case 'idle': return 'Ready for Mission';
      case 'discovering': return 'Discovering URLs...';
      case 'crawling': return 'Crawling in Progress';
      case 'completed': return 'Mission Complete';
      case 'error': return 'Mission Failed';
      default: return 'Unknown Status';
    }
  };

  const formatTime = (ms: number | null) => {
    if (!ms) return '--:--';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (stats.totalUrlsFound === 0) return 0;
    return Math.round((stats.totalUrlsCrawled / stats.totalUrlsFound) * 100);
  };

  return (
    <div className="crawl-dashboard">
      <style>{`
        .crawl-dashboard {
          background: linear-gradient(135deg, rgba(10, 10, 15, 0.95) 0%, rgba(22, 33, 62, 0.9) 100%);
          border: 2px solid rgba(141, 215, 247, 0.3);
          border-radius: 20px;
          padding: 2rem;
          margin: 2rem 0;
          position: relative;
          overflow: hidden;
          min-height: 400px;
        }

        .crawl-dashboard::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: conic-gradient(from 0deg, transparent, rgba(141, 215, 247, 0.05), transparent);
          border-radius: 50%;
          animation: rotate 30s linear infinite;
          pointer-events: none;
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .dashboard-content {
          position: relative;
          z-index: 2;
        }

        .dashboard-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .dashboard-title {
          font-size: 1.8rem;
          font-weight: 900;
          color: #8dd7f7;
          margin-bottom: 0.5rem;
          text-shadow: 0 0 20px rgba(141, 215, 247, 0.5);
        }

        .status-indicator {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(0, 0, 0, 0.4);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          border: 1px solid ${getStatusColor()};
          box-shadow: 0 0 15px ${getStatusColor()}33;
        }

        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: ${getStatusColor()};
          animation: ${stats.status === 'crawling' || stats.status === 'discovering' ? 'pulse' : 'none'} 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }

        .visual-area {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-bottom: 2rem;
          min-height: 200px;
        }

        .star-field {
          position: relative;
          background: radial-gradient(circle at center, rgba(141, 215, 247, 0.1) 0%, transparent 50%);
          border: 1px solid rgba(141, 215, 247, 0.2);
          border-radius: 15px;
          padding: 1rem;
          overflow: hidden;
        }

        .star {
          position: absolute;
          width: 3px;
          height: 3px;
          background: #8dd7f7;
          border-radius: 50%;
          animation: twinkle 2s ease-in-out infinite, fall 5s linear infinite;
          box-shadow: 0 0 6px #8dd7f7;
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        @keyframes fall {
          0% { transform: translateY(-20px); }
          100% { transform: translateY(220px); }
        }

        .rocket-area {
          position: relative;
          background: linear-gradient(135deg, rgba(26, 26, 46, 0.6) 0%, rgba(22, 33, 62, 0.6) 100%);
          border: 1px solid rgba(141, 215, 247, 0.2);
          border-radius: 15px;
          padding: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .rocket {
          font-size: 3rem;
          filter: drop-shadow(0 0 10px rgba(141, 215, 247, 0.5));
          transition: all 0.3s ease;
        }

        .rocket.flying {
          animation: fly 3s ease-in-out infinite;
        }

        .rocket.idle {
          animation: idle 6s ease-in-out infinite;
        }

        @keyframes fly {
          0%, 100% { transform: translateX(-50px) translateY(0px) rotate(-10deg); }
          25% { transform: translateX(0px) translateY(-20px) rotate(5deg); }
          50% { transform: translateX(50px) translateY(0px) rotate(-5deg); }
          75% { transform: translateX(0px) translateY(20px) rotate(10deg); }
        }

        @keyframes idle {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
        }

        .rocket-trail {
          position: absolute;
          width: 100px;
          height: 3px;
          background: linear-gradient(90deg, transparent, #8dd7f7, transparent);
          opacity: 0;
          animation: trail 3s ease-in-out infinite;
          transition: opacity 0.3s ease;
        }

        .rocket-trail.active {
          opacity: 1;
        }

        @keyframes trail {
          0%, 100% { left: -100px; }
          50% { left: calc(100% + 100px); }
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: rgba(26, 26, 46, 0.7);
          border: 1px solid rgba(141, 215, 247, 0.2);
          border-radius: 12px;
          padding: 1rem;
          text-align: center;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          border-color: rgba(141, 215, 247, 0.4);
          background: rgba(26, 26, 46, 0.9);
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #8dd7f7;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          color: rgba(230, 243, 255, 0.8);
          font-size: 0.9rem;
        }

        .progress-section {
          background: rgba(22, 33, 62, 0.6);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .progress-title {
          color: #8dd7f7;
          font-weight: 700;
        }

        .progress-percentage {
          color: #8dd7f7;
          font-weight: 700;
          font-size: 1.1rem;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: rgba(141, 215, 247, 0.2);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 1rem;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4a9eff, #8dd7f7);
          border-radius: 4px;
          transition: width 0.5s ease;
          width: ${getProgressPercentage()}%;
        }

        .batch-info {
          display: flex;
          justify-content: space-between;
          color: rgba(230, 243, 255, 0.8);
          font-size: 0.9rem;
        }

        .current-url {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(141, 215, 247, 0.3);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .current-url-label {
          color: #8dd7f7;
          font-weight: 600;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
        }

        .current-url-text {
          color: rgba(230, 243, 255, 0.9);
          font-family: 'Courier New', monospace;
          word-break: break-all;
          background: rgba(141, 215, 247, 0.1);
          padding: 0.5rem;
          border-radius: 4px;
          border-left: 3px solid #8dd7f7;
        }

        .recent-urls {
          background: rgba(22, 33, 62, 0.6);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .recent-urls-title {
          color: #8dd7f7;
          font-weight: 700;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .url-list {
          max-height: 150px;
          overflow-y: auto;
        }

        .url-item {
          background: rgba(141, 215, 247, 0.05);
          border: 1px solid rgba(141, 215, 247, 0.1);
          border-radius: 6px;
          padding: 0.5rem;
          margin-bottom: 0.5rem;
          font-family: 'Courier New', monospace;
          font-size: 0.8rem;
          color: rgba(230, 243, 255, 0.8);
          word-break: break-all;
          animation: slideIn 0.5s ease-out;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .time-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 0.75rem;
          margin-top: 1rem;
        }

        .time-item {
          text-align: center;
        }

        .time-value {
          color: #8dd7f7;
          font-weight: 700;
          font-size: 1.1rem;
        }

        .time-label {
          color: rgba(230, 243, 255, 0.8);
          font-size: 0.8rem;
        }

        @media (max-width: 768px) {
          .visual-area {
            grid-template-columns: 1fr;
          }
          
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h3 className="dashboard-title">🚀 Real-Time Crawl Observatory</h3>
          <div className="status-indicator">
            <div className="status-dot"></div>
            <span>{getStatusText()}</span>
          </div>
        </div>

        <div className="visual-area">
          <div className="star-field" ref={starFieldRef}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#8dd7f7',
              textAlign: 'center',
              fontSize: '0.9rem',
              opacity: stats.status === 'idle' ? 1 : 0.7
            }}>
              {stats.status === 'idle' ? '🌌 Awaiting Launch' : '✨ Discovering Universe'}
            </div>
          </div>

          <div className="rocket-area" ref={rocketRef}>
            <div className={`rocket-trail ${(stats.status === 'crawling' || stats.status === 'discovering') ? 'active' : ''}`}></div>
            <div 
              className={`rocket ${(stats.status === 'crawling' || stats.status === 'discovering') ? 'flying' : 'idle'}`}
              title={`Status: ${stats.status} | Animation: ${(stats.status === 'crawling' || stats.status === 'discovering') ? 'flying' : 'idle'}`}
            >🚀</div>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalUrlsFound.toLocaleString()}</div>
            <div className="stat-label">URLs Discovered</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalUrlsCrawled.toLocaleString()}</div>
            <div className="stat-label">URLs Crawled</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalUrlsSkipped.toLocaleString()}</div>
            <div className="stat-label">URLs Skipped</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.status === 'crawling' ? `${stats.batchInfo.currentBatch}/${stats.batchInfo.totalBatches}` : '--'}</div>
            <div className="stat-label">Current Batch</div>
          </div>
        </div>

        {stats.status !== 'idle' && (
          <div className="progress-section">
            <div className="progress-header">
              <span className="progress-title">Mission Progress</span>
              <span className="progress-percentage">{getProgressPercentage()}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill"></div>
            </div>
            <div className="batch-info">
              <span>Batch Size: {stats.batchInfo.batchSize}</span>
              <span>Total Batches: {stats.batchInfo.totalBatches}</span>
            </div>
          </div>
        )}

        {stats.currentUrl && (
          <div className="current-url">
            <div className="current-url-label">🎯 Currently Scanning:</div>
            <div className="current-url-text">{stats.currentUrl}</div>
          </div>
        )}

        {stats.recentUrls.length > 0 && (
          <div className="recent-urls">
            <div className="recent-urls-title">
              📡 Recent Crawls
            </div>
            <div className="url-list">
              {stats.recentUrls.map((url, index) => (
                <div key={index} className="url-item">
                  {url}
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.startTime && (
          <div className="time-info">
            <div className="time-item">
              <div className="time-value">{formatTime(stats.startTime ? Date.now() - stats.startTime : 0)}</div>
              <div className="time-label">Elapsed</div>
            </div>
            <div className="time-item">
              <div className="time-value">{formatTime(stats.estimatedTimeRemaining)}</div>
              <div className="time-label">Remaining</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}