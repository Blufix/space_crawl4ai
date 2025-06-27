# Prompt for Claude Coding Agent: Crawl4AI Dashboard Development

## Project Overview
Develop a modern, sleek frontend dashboard that integrates with the Crawl4AI application hosted on Azure. The dashboard should provide URL crawling functionality with configurable options, store data in a local Supabase database with AI embeddings, and allow natural language queries against the crawled knowledge base.

## Technical Requirements

### Frontend
- Build using latest React (v18+) with TypeScript  
- Modern UI framework (consider Chakra UI, Material UI v5, or Tailwind CSS)  
- Responsive design with clean, professional aesthetics  
- Key components:  
  - URL input field with validation  
  - Crawl configuration panel (depth, crawl type, etc.)  
  - Results display area  
  - Search interface with natural language query capability  

### Backend Integration
- Connect to Crawl4AI API at: `https://aca-crawl4ai.delightfulhill-db34dc69.westeurope.azurecontainerapps.io`  
- Implement all relevant API endpoints from [Crawl4AI documentation](https://docs.crawl4ai.com/)  
- Use Rubera token authentication (store in `.env` file)  
- Error handling and loading states  

### Database
- Utilize existing local Supabase instance  
- Design appropriate tables for:  
  - Crawl jobs  
  - Crawled content  
  - AI embeddings/vectors  
  - User queries/responses  
- Use Supabase MCP tool for table management  

### Authentication
- Implement Entra ID (Azure AD) authentication for frontend  
- Secure API communication between frontend and Crawl4AI backend  

### Documentation
- Create comprehensive docs in `/docs` folder including:  
  - Architecture decisions  
  - Setup instructions  
  - API documentation  
  - Database schema  
- Maintain clean project structure with appropriate folders  

## Task List

1. **Research & Planning**  
   - Review Crawl4AI documentation thoroughly  
   - Create technical architecture diagram  
   - Define UI wireframes  
   - Plan database schema  

2. **Setup Project**  
   - Initialize React/TypeScript project  
   - Configure build tools (Vite recommended)  
   - Set up linting/prettier  
   - Create basic folder structure  

3. **Core Functionality**  
   - Implement Crawl4AI API service layer  
   - Build URL input and crawl configuration UI  
   - Create results display components  
   - Develop search interface with natural language processing  

4. **Database Integration**  
   - Design and implement Supabase tables  
   - Create data access layer  
   - Implement embedding/vector storage  

5. **Authentication**  
   - Integrate Entra ID authentication  
   - Secure API communications  

6. **Testing**  
   - Unit tests for components/logic  
   - Integration tests for API calls  
   - End-to-end testing for user flows  

7. **Documentation**  
   - Document all implementation details  
   - Create setup/usage guides  
   - Prepare deployment instructions  

8. **Deployment Prep**  
   - Configure for Azure hosting  
   - Optimize build  
   - Prepare environment variables  

## Deliverables
- Modern, functional dashboard with all specified features  
- Clean, well-documented codebase  
- Comprehensive documentation  
- Test suite  
- Deployment-ready package  

## Constraints
- Must use latest technologies (no legacy code)  
- Maintain clean project structure  
- Follow security best practices  
- Prioritize user experience  