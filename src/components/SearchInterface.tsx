import React, { useState } from 'react';
import { MagnifyingGlassIcon, SparklesIcon } from '@heroicons/react/24/outline';
import type { SearchResult } from '../types';

interface SearchInterfaceProps {
  onSearch: (query: string) => Promise<SearchResult[]>;
  isLoading?: boolean;
}

export const SearchInterface: React.FC<SearchInterfaceProps> = ({ onSearch, isLoading = false }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;

    setHasSearched(true);
    try {
      const searchResults = await onSearch(query);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-md border border-gray-200 shadow-sm p-4">
        <div className="flex items-center space-x-2 mb-4">
          <SparklesIcon className="h-5 w-5 text-purple-500" />
          <h2 className="text-base font-medium text-gray-900">
            Search Knowledge Base
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about your crawled content..."
              className="block w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              disabled={isLoading}
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className={`
              w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
              ${isLoading || !query.trim()
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
              }
              transition-colors duration-200
            `}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Searching...
              </>
            ) : (
              'Search'
            )}
          </button>
        </form>
      </div>

      {hasSearched && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            Search Results ({results.length})
          </h3>
          
          {results.length === 0 ? (
            <div className="text-center py-8">
              <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try rephrasing your question or check if you have crawled content.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((result) => (
                <div key={result.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Relevance: {Math.round(result.relevanceScore * 100)}%
                        </span>
                      </div>
                      
                      <div className="mb-2">
                        <a 
                          href={result.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          {result.url}
                        </a>
                      </div>

                      <div className="text-sm text-gray-700 leading-relaxed">
                        {highlightText(result.content, query)}
                      </div>

                      {result.metadata && Object.keys(result.metadata).length > 0 && (
                        <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                          <strong>Metadata:</strong>
                          <pre className="mt-1 whitespace-pre-wrap">
                            {JSON.stringify(result.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};