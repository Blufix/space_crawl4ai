import { useState } from 'react';
import { GlobeAltIcon } from '@heroicons/react/24/outline';

function MinimalApp() {
  console.log('MinimalApp rendering...');
  
  const [activeTab, setActiveTab] = useState<'crawl' | 'search'>('crawl');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <GlobeAltIcon className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Web Crawling Made Simple
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Active tab: {activeTab}. Header and navigation are working!
          </p>
        </div>
      </main>
    </div>
  );
}

export default MinimalApp;