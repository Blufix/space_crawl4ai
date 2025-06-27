import { useState } from 'react';
import { UrlInput } from './components/UrlInput';
import { CrawlConfig } from './components/CrawlConfig';
import { CrawlResults } from './components/CrawlResults';
import { SearchInterface } from './components/SearchInterface';
import type { CrawlConfig as CrawlConfigType, CrawlResult, SearchResult } from './types';
import { GlobeAltIcon } from '@heroicons/react/24/outline';

function WorkingApp() {
  console.log('WorkingApp rendering...');
  
  const [crawlConfig, setCrawlConfig] = useState<CrawlConfigType>({
    url: '',
    depth: 1,
    maxPages: 10,
    extractStrategy: 'basic',
    timeout: 30000,
  });
  const [crawlResults, setCrawlResults] = useState<CrawlResult[]>([]);
  const [isCrawling, setIsCrawling] = useState(false);
  const [activeTab, setActiveTab] = useState<'crawl' | 'search'>('crawl');

  const handleCrawl = async (url: string) => {
    console.log('Crawl requested for:', url);
    setIsCrawling(true);
    
    // Mock crawl result for now (without service calls)
    setTimeout(() => {
      const mockResult: CrawlResult = {
        id: crypto.randomUUID(),
        url,
        status: 'completed',
        content: 'Mock crawled content for ' + url,
        markdown: '# Mock Content\n\nThis is mock crawled content.',
        links: ['https://example.com/link1', 'https://example.com/link2'],
        metadata: { title: 'Mock Page' },
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
      setCrawlResults(prev => [mockResult, ...prev]);
      setIsCrawling(false);
    }, 2000);
  };

  const handleSearch = async (query: string): Promise<SearchResult[]> => {
    console.log('Search requested for:', query);
    // Mock search results
    return [
      {
        id: '1',
        content: 'Mock search result for: ' + query,
        url: 'https://example.com',
        relevanceScore: 0.9,
        metadata: { title: 'Mock Result' },
      }
    ];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <GlobeAltIcon className="h-6 w-6 text-blue-600" />
              <h1 className="text-lg font-semibold text-gray-900">
                Crawl4AI Dashboard
              </h1>
            </div>
            
            <nav className="flex space-x-4">
              <button
                onClick={() => setActiveTab('crawl')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'crawl'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Crawl
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'search'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Search
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'crawl' ? (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Web Crawling Made Simple
              </h2>
              <p className="text-base text-gray-600 max-w-2xl mx-auto">
                Enter a URL to crawl and extract content using our powerful AI-enhanced crawler.
              </p>
            </div>

            <UrlInput onSubmit={handleCrawl} isLoading={isCrawling} />
            
            <CrawlConfig config={crawlConfig} onChange={setCrawlConfig} />
            
            <CrawlResults results={crawlResults} isLoading={isCrawling} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Search Your Knowledge Base
              </h2>
              <p className="text-base text-gray-600 max-w-2xl mx-auto">
                Ask questions about your crawled content using natural language.
              </p>
            </div>

            <SearchInterface onSearch={handleSearch} />
          </div>
        )}
      </main>
    </div>
  );
}

export default WorkingApp;