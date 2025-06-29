# 🕷️ Crawl4AI Dashboard

A modern, responsive web dashboard for the Crawl4AI web crawling service. Built with React, TypeScript, and Tailwind CSS, this dashboard provides an intuitive interface for crawling websites, managing crawl jobs, and searching through crawled content.

## ✨ Features

### 🔍 **Web Crawling**
- **URL Input & Validation**: Clean interface for entering URLs with real-time validation
- **Advanced Configuration**: Customizable crawl depth, page limits, extraction strategies
- **Multiple Extraction Methods**: Basic, LLM-enhanced, CSS selector, and XPath strategies
- **Real-time Status**: Live updates on crawl progress and completion
- **Smart Site Crawling**: Intelligent discovery and crawling of entire websites

### 🔎 **Content Search**
- **Full-text Search**: Search across all crawled content with highlighting
- **Vector Search**: AI-powered semantic search using embeddings
- **Natural Language Queries**: Ask questions about your crawled data
- **Relevance Scoring**: Results ranked by relevance and similarity
- **Search History**: Track and revisit previous searches

### 💾 **Data Management**
- **Supabase Integration**: Automatic saving and retrieval of crawl data
- **Content Deduplication**: Prevent duplicate content using content hashing
- **Vector Embeddings**: OpenAI-powered semantic search capabilities
- **Export Options**: Download results in various formats
- **Crawl History**: Track and manage all your crawling activities

### 🎨 **User Experience**
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Loading States**: Clear feedback during operations
- **Error Handling**: Graceful error messages and recovery options
- **Dark/Light Theme**: Modern UI with intuitive navigation

## 🏗️ Architecture

### **Crawl4AI Backend Service**
Our Crawl4AI instance is hosted on **Azure Container Apps** in the West Europe region:
- **Service URL**: 
- **Docker Image**: Official Crawl4AI image from Docker Hub
- **CORS Configuration**: Enabled for local development (`localhost:5173`)
- **Features**: Full Crawl4AI API with deep crawling, LLM extraction, and batch processing

### **Frontend Stack**
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development with strict mode
- **Tailwind CSS** - Utility-first CSS framework for rapid styling
- **Heroicons** - Beautiful SVG icons
- **Vite** - Fast build tool with hot module replacement

### **Backend Integration**
- **Crawl4AI API** - Azure Container Apps hosted service
- **Supabase** - PostgreSQL database with real-time capabilities
- **OpenAI** - Vector embeddings for semantic search
- **Vector Search** - Advanced similarity matching

## 🚀 Quick Start

### **1. Clone the Repository**
```bash
git clone https://github.com/Blufix/space_crawl4ai.git
cd dashboard
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Environment Setup**
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your actual values (see configuration section below)
nano .env  # or use your preferred editor
```

### **4. Start Development Server**
```bash
npm run dev
```

### **5. Open in Browser**
Navigate to `http://localhost:5173`

## ⚙️ Configuration

### **Environment Variables Setup**

The application requires several environment variables to function properly. Follow these steps:

#### **Step 1: Copy the Example File**
```bash
cp .env.example .env
```

#### **Step 2: Configure Required Variables**

Edit your `.env` file with the following values:

```bash
# ===== CRAWL4AI API CONFIGURATION =====
# Our hosted Crawl4AI service (already configured)
VITE_CRAWL4AI_API_URL=your container instance url here

# Your API key for Crawl4AI service
VITE_CRAWL4AI_API_KEY=Bearer YOUR_API_KEY_HERE

# ===== SUPABASE DATABASE CONFIGURATION =====
# Your Supabase project URL
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co

# Your Supabase anonymous key
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# ===== CRAWLING BEHAVIOR CONFIGURATION =====
# Maximum depth for recursive crawling
VITE_CRAWL4AI_MAX_DEPTH=10

# Maximum number of pages to crawl per session
VITE_CRAWL4AI_MAX_PAGES=5000

# Crawling strategy (bfs = breadth-first search)
VITE_CRAWL4AI_STRATEGY=bfs

# ===== PERFORMANCE TUNING =====
# Number of URLs to process in each batch
VITE_CRAWL4AI_BATCH_SIZE=50

# Delay between batches in milliseconds (rate limiting)
VITE_CRAWL4AI_COOL_OFF_DELAY=5000

# Maximum retry attempts for failed requests
VITE_CRAWL4AI_MAX_RETRIES=3
```

#### **Step 3: Get Your API Keys**

**Supabase Setup:**
1. Go to [supabase.com](https://supabase.com) and create a new project
2. In your project dashboard, go to **Settings** → **API**
3. Copy your **Project URL** and **Anon Public Key**
4. Run the database schema from `docs/sql_files/database-schema.sql`

**Crawl4AI API Key:**
Contact your administrator for the Crawl4AI API key, or set up your own instance.

**Optional - OpenAI (for AI-powered search):**
1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)
2. Add `OPENAI_API_KEY=your_openai_key` to your `.env` file

### **Database Setup**

#### **Step 1: Create Supabase Project**
1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the project to be ready

#### **Step 2: Run Database Schema**
1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Copy and run the contents of `docs/sql_files/database-schema.sql`

#### **Step 3: Enable Vector Extension (Optional)**
For AI-powered search capabilities:
```sql
-- Run this in your Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;
```

### **Configuration Validation**

After setting up your environment, the application will validate your configuration on startup. Check the browser console for any configuration warnings.

## 🛠️ Development

### **Available Scripts**

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build optimized production bundle
npm run preview      # Preview production build locally

# Code Quality
npm run lint         # Run ESLint for code quality
npm run typecheck    # Run TypeScript type checking
```

### **Development Workflow**

1. **Start the dev server**: `npm run dev`
2. **Make your changes** in the `src/` directory
3. **Test your changes** in the browser (auto-reloads)
4. **Check for errors**: `npm run lint && npm run typecheck`
5. **Build for production**: `npm run build`

### **Project Structure**

```
src/
├── components/          # React components
│   ├── CrawlConfig.tsx     # Crawl configuration
│   ├── CrawlHistory.tsx    # Crawl history management
│   ├── CrawlResults.tsx    # Results display
│   ├── SearchInterface.tsx # Search functionality
│   └── UrlInput.tsx        # URL input component
├── services/           # API services and utilities
│   ├── crawl4ai.ts        # Crawl4AI API integration
│   ├── supabase.ts        # Database operations
│   ├── embeddings.ts      # OpenAI embeddings
│   └── settings.ts        # App settings management
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## 🚀 Deployment

### **Azure Static Web Apps (Recommended)**

We provide complete deployment documentation for Azure:

1. **Follow the deployment guide**: See `docs/azure-deployment.md`
2. **Use Azure CLI**: See `docs/azure-cli-setup.md` for commands
3. **Configure environment variables**: See `docs/environment-variables.md`

Quick deployment:
```bash
# Install Azure CLI and login
az login

# Create Static Web App (replace with your GitHub repo)
az staticwebapp create \
  --name dashboard-static-app \
  --resource-group rg-dashboard-static \
  --source https://github.com/YOUR_USERNAME/YOUR_REPO \
  --location "West Europe" \
  --branch main \
  --app-location "/" \
  --output-location "dist"
```

### **Other Deployment Options**

- **Vercel**: Connect your GitHub repo to Vercel
- **Netlify**: Drag and drop the `dist/` folder after `npm run build`
- **GitHub Pages**: Use the provided GitHub Actions workflow

## 🔧 Troubleshooting

### **Common Issues**

**🚫 "Failed to fetch" errors:**
- Check your `VITE_CRAWL4AI_API_URL` is correct
- Ensure the Crawl4AI service is running
- Verify your API key is valid

**🚫 Database connection errors:**
- Verify your Supabase URL and key
- Check if the database schema is properly set up
- Ensure RLS policies are configured

**🚫 Build errors:**
- Run `npm run typecheck` to find TypeScript issues
- Check that all environment variables are set
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`

**🚫 Environment variables not loading:**
- Ensure variables start with `VITE_` prefix
- Restart the development server after changing `.env`
- Check for typos in variable names

### **Debug Commands**

```bash
# Check environment variables
npm run dev 2>&1 | grep -i "env\|vite_"

# Validate TypeScript
npx tsc --noEmit

# Check build output
npm run build && ls -la dist/
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Run quality checks: `npm run lint && npm run typecheck`
5. Commit your changes: `git commit -m "Add feature"`
6. Push to your branch: `git push origin feature-name`
7. Create a Pull Request

## 📚 Documentation

- **[Azure Deployment Guide](docs/azure-deployment.md)** - Complete deployment instructions
- **[Environment Variables](docs/environment-variables.md)** - Detailed configuration guide
- **[Azure CLI Setup](docs/azure-cli-setup.md)** - Azure CLI commands and scripts
- **[Database Schema](docs/sql_files/database-schema.sql)** - Supabase database setup
- **[Troubleshooting](docs/TROUBLESHOOTING_DIAGNOSTICS.md)** - Common issues and solutions

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Issues**: Create an issue on GitHub
- **Documentation**: Check the `docs/` folder
- **API Documentation**: Crawl4AI official documentation

---

**Built with ❤️ using Crawl4AI, React, and Azure**
