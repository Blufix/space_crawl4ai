import { useState } from 'react';

function TestApp() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Crawl4AI Dashboard Test
        </h1>
        <p className="text-gray-600 mb-4">
          If you can see this, the basic React app is working!
        </p>
        <button 
          onClick={() => setCount(count + 1)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Count: {count}
        </button>
      </div>
    </div>
  );
}

export default TestApp;