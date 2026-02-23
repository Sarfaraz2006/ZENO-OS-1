# J.A.R.V.I.S - AI Assistant Platform

## Overview
A comprehensive Jarvis-like AI assistant platform serving as a personal AI control center. Built as a web-based PWA with voice interaction, multi-model AI support (OpenRouter with dynamic model ID), chat interface, terminal, GitHub integration, and complete REST API.

## Architecture
- **Frontend**: React + TypeScript + Tailwind CSS + Shadcn UI
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI Provider**: OpenRouter via Replit AI Integrations (no API key needed)
- **Auth**: Session-based password authentication

## Key Files
- `shared/schema.ts` - All database schemas (users, aiModels, apiKeys, activityLogs, settings, githubRepos)
- `shared/models/chat.ts` - Chat-specific schemas (conversations, messages)
- `server/routes.ts` - All API endpoints (auth, models, API keys, stats, logs, terminal, github)
- `server/storage.ts` - Database CRUD operations (DatabaseStorage class)
- `server/db.ts` - PostgreSQL connection
- `server/replit_integrations/chat/` - OpenRouter chat integration with streaming
- `client/src/App.tsx` - Main app with routing, sidebar, theme, auth
- `client/src/lib/auth.tsx` - Auth context provider
- `client/src/lib/theme.tsx` - Dark/light theme provider
- `client/src/pages/dashboard.tsx` - Command center dashboard with stats, capabilities, activity
- `client/src/pages/chat.tsx` - AI chat with model selection, voice, streaming, copy messages
- `client/src/pages/models.tsx` - Model hub (add/search/filter/toggle/favorite models)
- `client/src/pages/terminal.tsx` - Web terminal with command execution and history
- `client/src/pages/github.tsx` - GitHub repository connection and management
- `client/src/pages/settings.tsx` - API keys, password change, API usage docs
- `client/src/pages/login.tsx` - Futuristic login page with secure access
- `client/src/components/app-sidebar.tsx` - Navigation sidebar with branding, uses onClick+setLocation for navigation

## Navigation
- Sidebar uses onClick handlers with wouter's setLocation for navigation (not Link component)
- On mobile, sidebar closes after navigation via setOpenMobile(false)
- Pages: Dashboard, Chat, Models, Terminal, GitHub, Settings

## Default Credentials
- Password: `admin` (change in Settings)

## Features Implemented
1. Password-protected dashboard with secure login
2. AI chat with OpenRouter streaming (5 pre-configured models)
3. Dynamic model management (add any model by OpenRouter ID, search, filter by category, favorites)
4. API key management for external access (generate, toggle, delete)
5. Dark/light theme toggle
6. Voice input (Web Speech API) with speech-to-text
7. Voice output (Text-to-Speech) with toggle
8. Continuous conversation mode (auto-listen after response)
9. Activity logging with source icons
10. Dashboard with stats, platform capabilities overview, quick actions
11. REST API documentation in settings
12. Copy message to clipboard
13. Collapsible chat sidebar
14. Model cost display and context window info
15. Browse OpenRouter link for discovering models
16. Web Terminal with command execution, history, blocked dangerous commands
17. GitHub repository connection and management (connect, sync, disconnect)

## Database
PostgreSQL with tables: users, ai_models, api_keys, activity_logs, settings, conversations, messages, github_repos
Push schema: `npm run db:push`
