# J.A.R.V.I.S - AI Assistant Platform

## Overview
A comprehensive Jarvis-like AI assistant platform with Lovable-style code generation. Built as a web-based PWA with voice interaction, multi-model AI support (OpenRouter), live code preview, terminal, GitHub integration, and complete REST API.

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
- `server/replit_integrations/chat/routes.ts` - OpenRouter chat with streaming + system prompts
- `client/src/App.tsx` - Main app with routing, sidebar, theme, auth
- `client/src/components/markdown-renderer.tsx` - Markdown + syntax highlighting renderer
- `client/src/components/code-preview.tsx` - Live HTML/CSS/JS preview (Lovable-style)
- `client/src/pages/dashboard.tsx` - Command center dashboard
- `client/src/pages/chat.tsx` - AI chat with code preview, markdown, voice, system prompts
- `client/src/pages/models.tsx` - Model hub (add/search/filter/toggle/favorite)
- `client/src/pages/terminal.tsx` - Web terminal with command execution
- `client/src/pages/github.tsx` - GitHub repository management
- `client/src/pages/settings.tsx` - API keys, password change, API docs
- `client/src/pages/login.tsx` - Futuristic login page
- `client/src/components/app-sidebar.tsx` - Navigation sidebar (onClick + setLocation pattern)

## Navigation Pattern
- Sidebar uses onClick handlers with wouter's setLocation (not Link asChild)
- On mobile, sidebar closes after navigation via setOpenMobile(false)
- Pages: Dashboard, Chat, Models, Terminal, GitHub, Settings

## Default Credentials
- Password: `admin` (change in Settings)

## Features
1. Password-protected dashboard with secure login
2. AI chat with OpenRouter streaming (5 pre-configured models)
3. Dynamic model management (add any model by OpenRouter ID, search, filter, favorites)
4. **Lovable-style code preview** - AI generates HTML and users see live rendered preview
5. **Markdown rendering** with syntax-highlighted code blocks
6. **System prompt customization** - customize AI behavior per session
7. API key management for external access (generate, toggle, delete)
8. Dark/light theme toggle
9. Voice input (Web Speech API) with speech-to-text
10. Voice output (Text-to-Speech) with toggle
11. Continuous conversation mode (auto-listen after response)
12. Activity logging with source icons
13. Dashboard with stats, platform capabilities, quick actions
14. REST API documentation in settings
15. Copy message to clipboard
16. Collapsible chat sidebar
17. **Conversation export** to markdown file
18. **Web Terminal** with command execution, history, security
19. **GitHub repository** connection and management
20. **PWA support** - installable on mobile/desktop
21. Model cost display and context window info
22. Browse OpenRouter link for discovering models

## Database
PostgreSQL with tables: users, ai_models, api_keys, activity_logs, settings, conversations, messages, github_repos
Push schema: `npm run db:push`
