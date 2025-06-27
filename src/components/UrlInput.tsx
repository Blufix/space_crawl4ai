import React, { useState } from 'react';
import { GlobeAltIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading?: boolean;
}

export const UrlInput: React.FC<UrlInputProps> = ({ onSubmit, isLoading = false }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const validateUrl = (urlString: string): boolean => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    if (!validateUrl(url)) {
      setError('Please enter a valid URL');
      return;
    }

    setError('');
    onSubmit(url);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (error) setError('');
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
            Website URL
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <GlobeAltIcon className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="url"
              id="url"
              value={url}
              onChange={handleUrlChange}
              placeholder="https://example.com"
              className={`
                block w-full pl-9 pr-10 py-2.5 border rounded-md text-sm
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                ${error 
                  ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 placeholder-gray-400'
                }
              `}
              disabled={isLoading}
            />
            {error && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <ExclamationCircleIcon className="h-4 w-4 text-red-500" />
              </div>
            )}
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600" id="url-error">
              {error}
            </p>
          )}
        </div>
        
        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className={`
            w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
            ${isLoading || !url.trim()
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
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
              Crawling...
            </>
          ) : (
            'Start Crawling'
          )}
        </button>
      </form>
    </div>
  );
};