import React from 'react';
import { GlobeAltIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

// Removed unused interface

interface CrawlConfigProps {
  config: { crawlType: 'single' | 'smart_site' };
  onChange: (config: { crawlType: 'single' | 'smart_site' }) => void;
}

export const CrawlConfig: React.FC<CrawlConfigProps> = ({ config, onChange }) => {
  const handleCrawlTypeChange = (crawlType: 'single' | 'smart_site') => {
    onChange({ crawlType });
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Crawl Type</h3>
      
      <div className="space-y-3">
        {/* Single Page Option */}
        <div
          className={`relative rounded-lg border-2 cursor-pointer transition-all ${
            config.crawlType === 'single'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => handleCrawlTypeChange('single')}
        >
          <div className="p-4">
            <div className="flex items-center">
              <input
                type="radio"
                name="crawlType"
                value="single"
                checked={config.crawlType === 'single'}
                onChange={() => handleCrawlTypeChange('single')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <DocumentTextIcon className="ml-3 h-6 w-6 text-gray-400" />
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-900">
                  Single Page Crawl
                </div>
                <div className="text-sm text-gray-500">
                  Extract content from one page only - fast and focused
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Smart Site Option */}
        <div
          className={`relative rounded-lg border-2 cursor-pointer transition-all ${
            config.crawlType === 'smart_site'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => handleCrawlTypeChange('smart_site')}
        >
          <div className="p-4">
            <div className="flex items-center">
              <input
                type="radio"
                name="crawlType"
                value="smart_site"
                checked={config.crawlType === 'smart_site'}
                onChange={() => handleCrawlTypeChange('smart_site')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <GlobeAltIcon className="ml-3 h-6 w-6 text-gray-400" />
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-900">
                  Smart Site Crawl
                </div>
                <div className="text-sm text-gray-500">
                  Intelligently discover and crawl entire sites with smart filtering
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <p className="text-xs text-gray-600">
          {config.crawlType === 'single' 
            ? '✨ Perfect for extracting content from a specific article, blog post, or documentation page.'
            : '🚀 Discovers related pages, parses sitemaps, filters out low-value content, and crawls systematically in batches with automatic database saves.'
          }
        </p>
      </div>
    </div>
  );
};