# J.A.R.V.I.S - AI Assistant Platform

## Overview
A comprehensive Jarvis-like AI assistant platform serving as a personal AI control center. Built as a web-based PWA with voice interaction, multi-model AI support (OpenRouter with dynamic model ID), chat interface, and complete REST API.

## Architecture
- **Frontend**: React + TypeScript + Tailwind CSS + Shadcn UI
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI Provider**: OpenRouter via Replit AI Integrations (no API key needed)
- **Auth**: Session-based password authentication

## Key Files
- `shared/schema.ts` - All database schemas (users, aiModels, apiKeys, activityLogs, settings)
- `shared/models/chat.ts` - Chat-specific schemas (conversations, messages)
- `server/routes.ts` - All API endpoints (auth, models, API keys, stats, logs)
- `server/storage.ts` - Database CRUD operations (DatabaseStorage class)
- `server/db.ts` - PostgreSQL connection
- `server/replit_integrations/chat/` - OpenRouter chat integration with streaming
- `server/replit_integrations/batch/` - Batch processing utilities
- `client/src/App.tsx` - Main app with routing, sidebar, theme, auth
- `client/src/lib/auth.tsx` - Auth context provider
- `client/src/lib/theme.tsx` - Dark/light theme provider
- `client/src/pages/dashboard.tsx` - Command center dashboard
- `client/src/pages/chat.tsx` - AI chat interface with model selection, voice, streaming
- `client/src/pages/models.tsx` - Model management (add/remove OpenRouter models by ID)
- `client/src/pages/settings.tsx` - API key management, password change
- `client/src/components/app-sidebar.tsx` - Navigation sidebar

## File Connections
```
App.tsx -> AuthProvider -> LoginPage | AuthenticatedApp
  AuthenticatedApp -> SidebarProvider -> AppSidebar + Router
    Router -> DashboardPage | ChatPage | ModelsPage | SettingsPage

ChatPage -> /api/conversations (CRUD) -> server/replit_integrations/chat/
ChatPage -> /api/models (list) -> server/storage.ts
ModelsPage -> /api/models (CRUD) -> server/storage.ts -> shared/schema.ts
SettingsPage -> /api/api-keys (CRUD) -> server/storage.ts
SettingsPage -> /api/auth/change-password -> server/routes.ts
DashboardPage -> /api/stats, /api/logs -> server/storage.ts
```

## Default Credentials
- Password: `admin` (change in Settings)

## Features Implemented
1. Password-protected dashboard
2. AI chat with OpenRouter streaming (5 pre-configured models)
3. Dynamic model management (add any model by OpenRouter ID)
4. API key management for external access
5. Dark/light theme
6. Voice input (Web Speech API)
7. Continuous conversation mode
8. Activity logging
9. Dashboard with stats

## Database
PostgreSQL with tables: users, ai_models, api_keys, activity_logs, settings, conversations, messages
Push schema: `npm run db:push`
