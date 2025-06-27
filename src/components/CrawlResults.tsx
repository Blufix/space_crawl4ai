import React, { useState } from 'react';
import type { CrawlResult } from '../types';
import { 
  DocumentTextIcon, 
  LinkIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface CrawlResultsProps {
  results: CrawlResult[];
  isLoading?: boolean;
}

export const CrawlResults: React.FC<CrawlResultsProps> = ({ results, isLoading = false }) => {
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

  const toggleExpanded = (resultId: string) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(resultId)) {
      newExpanded.delete(resultId);
    } else {
      newExpanded.add(resultId);
    }
    setExpandedResults(newExpanded);
  };

  const getStatusIcon = (status: CrawlResult['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'crawling':
        return (
          <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: CrawlResult['status']) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'crawling':
        return 'Crawling...';
      default:
        return 'Pending';
    }
  };

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No results yet</h3>
        <p className="mt-1 text-sm text-gray-500">Start crawling a website to see results here.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <h2 className="text-lg font-medium text-gray-900 mb-4">
        Crawl Results ({results.length})
      </h2>
      
      {results.map((result) => {
        const isExpanded = expandedResults.has(result.id);
        
        return (
          <div key={result.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(result.status)}
                    <span className={`text-sm font-medium ${
                      result.status === 'completed' ? 'text-green-700' :
                      result.status === 'failed' ? 'text-red-700' :
                      result.status === 'crawling' ? 'text-blue-700' :
                      'text-gray-700'
                    }`}>
                      {getStatusText(result.status)}
                    </span>
                  </div>
                  
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <LinkIcon className="h-4 w-4 text-gray-400" />
                      <a 
                        href={result.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 truncate"
                      >
                        {result.url}
                      </a>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center text-xs text-gray-500">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {new Date(result.createdAt).toLocaleString()}
                    {result.completedAt && (
                      <span className="ml-2">
                        • Completed {new Date(result.completedAt).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {result.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      {result.error}
                    </div>
                  )}
                </div>

                {result.status === 'completed' && result.content && (
                  <button
                    onClick={() => toggleExpanded(result.id)}
                    className="ml-4 flex items-center text-sm text-gray-500 hover:text-gray-700"
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    {isExpanded ? 'Hide' : 'View'}
                    {isExpanded ? 
                      <ChevronDownIcon className="h-4 w-4 ml-1" /> : 
                      <ChevronRightIcon className="h-4 w-4 ml-1" />
                    }
                  </button>
                )}
              </div>

              {isExpanded && result.content && (
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {result.content && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Content</h4>
                        <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 max-h-64 overflow-y-auto">
                          <pre className="whitespace-pre-wrap">{truncateText(result.content, 1000)}</pre>
                        </div>
                      </div>
                    )}

                    {result.markdown && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Markdown</h4>
                        <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 max-h-64 overflow-y-auto">
                          <pre className="whitespace-pre-wrap">{truncateText(result.markdown, 1000)}</pre>
                        </div>
                      </div>
                    )}
                  </div>

                  {result.links && result.links.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Links Found ({result.links.length})
                      </h4>
                      <div className="bg-gray-50 p-3 rounded-md max-h-32 overflow-y-auto">
                        <ul className="space-y-1">
                          {result.links.slice(0, 10).map((link, index) => (
                            <li key={index}>
                              <a 
                                href={link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 break-all"
                              >
                                {link}
                              </a>
                            </li>
                          ))}
                          {result.links.length > 10 && (
                            <li className="text-xs text-gray-500">
                              ... and {result.links.length - 10} more
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};