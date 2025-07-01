# Crawl4AI Dashboard Setup Guide

## Prerequisites

- Node.js (v20.19.0 or higher)
- npm or yarn
- Supabase account (for database)
- Crawl4AI API access (Azure deployment)

## Environment Setup

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Fill in your environment variables:
```bash
VITE_CRAWL4AI_API_URL=
VITE_RUBERA_TOKEN=your_rubera_token_here
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Database Setup

### Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. In the SQL Editor, run the database schema:
```sql
-- Copy and paste the contents of docs/database-schema.sql
```

3. Enable the Vector extension for semantic search:
   - Go to Database > Extensions
   - Enable the `vector` extension

4. Get your project URL and anon key:
   - Go to Settings > API
   - Copy the Project URL and anon/public key

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

## Project Structure

```
src/
├── components/          # React components
│   ├── UrlInput.tsx    # URL input with validation
│   ├── CrawlConfig.tsx # Crawl configuration panel
│   ├── CrawlResults.tsx # Results display
│   └── SearchInterface.tsx # Search functionality
├── services/           # API services
│   ├── crawl4ai.ts    # Crawl4AI API client
│   └── supabase.ts    # Supabase client & functions
├── types/             # TypeScript type definitions
│   └── index.ts       # Main types
├── hooks/             # Custom React hooks (future)
├── utils/             # Utility functions (future)
└── pages/             # Page components (future)
```

## Features

### Web Crawling
- URL input with validation
- Configurable crawl depth and page limits
- Multiple extraction strategies (basic, LLM, CSS, XPath)
- Custom user agent and timeout settings
- Real-time crawl status and results display

### Content Search
- Full-text search across crawled content
- Natural language query interface
- Search result highlighting
- Relevance scoring

### Data Storage
- Automatic saving of crawl results to Supabase
- Content deduplication using hashes
- Full-text search indexing
- Vector embeddings for semantic search (future enhancement)

## API Integration

### Crawl4AI API
The dashboard integrates with the Crawl4AI API deployed on Azure Container Apps. The API provides:
- Single URL crawling
- Batch crawling (future)
- Content extraction with multiple strategies
- Proxy support
- Authentication via Bearer token

### Supabase Integration
- Real-time data synchronization
- Full-text search capabilities
- Vector similarity search (with embeddings)
- Row-level security (when authentication is enabled)

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Code Style
- TypeScript strict mode enabled
- ESLint with React and TypeScript rules
- Prettier for code formatting
- Tailwind CSS for styling

## Deployment

### Building for Production

1. Build the application:
```bash
npm run build
```

2. The build output will be in the `dist/` directory

### Environment Variables for Production
Ensure all environment variables are properly set in your deployment environment:
- `VITE_CRAWL4AI_API_URL`
- `VITE_Crawl4AI_API_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Deployment Options
- **Vercel**: Connect your GitHub repository for automatic deployments
- **Netlify**: Drag and drop the `dist` folder or connect via Git
- **Azure Static Web Apps**: Deploy alongside your Crawl4AI API
- **AWS S3 + CloudFront**: For AWS-based infrastructure

## Authentication (Future Enhancement)

The database schema includes support for user authentication via Supabase Auth. To enable:

1. Enable authentication in your Supabase project
2. Uncomment the RLS policies in the database schema
3. Implement authentication components in the frontend
4. Add user session management

## Troubleshooting

### Common Issues

1. **Build errors with Tailwind**: Ensure PostCSS and Tailwind are properly configured
2. **API connection issues**: Verify the Crawl4AI API URL and token
3. **Database connection errors**: Check Supabase URL and keys
4. **CORS issues**: Ensure the API allows requests from your domain

### Debug Mode
Enable debug logging by adding to your `.env`:
```bash
VITE_DEBUG=true
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
