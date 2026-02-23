# J.A.R.V.I.S - AI Assistant Platform

## Overview
A comprehensive Jarvis-like AI assistant platform with Lovable-style code generation. Built as a web-based PWA with voice interaction, multi-model AI support (OpenRouter), live code preview with split-view, real terminal, GitHub integration with Pages deployment, and complete REST API.

## Architecture
- **Frontend**: React + TypeScript + Tailwind CSS + Shadcn UI
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI Provider**: OpenRouter via Replit AI Integrations (no API key needed)
- **GitHub**: Real GitHub API via Replit Connector (@octokit/rest)
- **Auth**: Session-based password authentication

## Key Files
- `shared/schema.ts` - All database schemas (users, aiModels, apiKeys, activityLogs, settings, githubRepos)
- `shared/models/chat.ts` - Chat-specific schemas (conversations, messages)
- `server/routes.ts` - All API endpoints (auth, models, API keys, stats, logs, terminal, github)
- `server/storage.ts` - Database CRUD operations (DatabaseStorage class)
- `server/db.ts` - PostgreSQL connection
- `server/github-client.ts` - GitHub OAuth client via Replit Connector (never cache client)
- `server/replit_integrations/chat/routes.ts` - OpenRouter chat with streaming + system prompts
- `client/src/App.tsx` - Main app with routing, sidebar, theme, auth
- `client/src/components/markdown-renderer.tsx` - Markdown + artifact cards (code hidden behind cards)
- `client/src/components/code-preview.tsx` - Live HTML/CSS/JS preview panel with srcdoc iframe
- `client/src/pages/dashboard.tsx` - Command center dashboard
- `client/src/pages/chat.tsx` - AI chat with split-view preview, voice, system prompts
- `client/src/pages/models.tsx` - Model hub (add/search/filter/toggle/favorite)
- `client/src/pages/terminal.tsx` - Real web terminal (child_process.exec, 30s timeout, 1MB buffer)
- `client/src/pages/github.tsx` - Real GitHub repos, create repos, deploy to GitHub Pages
- `client/src/pages/code-editor.tsx` - GitHub code editor (browse files, edit, save, create, delete)
- `client/src/pages/settings.tsx` - API keys, password change, API docs
- `client/src/pages/login.tsx` - Futuristic login page
- `client/src/components/app-sidebar.tsx` - Navigation sidebar (onClick + setLocation pattern)

## Navigation Pattern
- Sidebar uses onClick handlers with wouter's setLocation (not Link asChild)
- On mobile, sidebar closes after navigation via setOpenMobile(false)
- Pages: Dashboard, Chat, Models, Terminal, GitHub, Editor, Settings

## Default Credentials
- Password: `admin` (change in Settings)

## Features
1. Password-protected dashboard with secure login
2. AI chat with OpenRouter streaming (5 pre-configured models)
3. Dynamic model management (add any model by OpenRouter ID, search, filter, favorites)
4. **Lovable-style split-view** - Chat left, live preview right with artifact cards
5. **Artifact cards** - Code blocks hidden behind clickable cards, HTML auto-previews
6. **System prompt** - Optimized for professional website generation (Google Fonts, gradients, animations)
7. API key management for external access (generate, toggle, delete)
8. **Multi-theme system** - Dark/Light mode + 6 accent colors (Blue, Emerald, Violet, Rose, Amber, Cyan)
9. Voice input with **auto-send** after recognition (ref-based, avoids stale closures)
10. Voice output (Text-to-Speech) with toggle
11. Continuous conversation mode (auto-listen after response)
12. Activity logging with source icons
13. **Analytics Dashboard** - Charts (area, bar, pie via recharts), stats cards with gradients, quick actions grid
14. REST API documentation in settings
15. Copy message to clipboard
16. Collapsible chat sidebar
17. **Conversation export** to markdown file
18. **Real Web Terminal** - executes actual Linux commands (ls, node, python3, git, curl, etc.)
19. **Real GitHub Integration** - list repos, create repos, deploy to GitHub Pages
23. **GitHub Code Editor** - browse repo files, open/edit/save/create/delete files, Ctrl+S to commit
20. **PWA support** - installable on mobile/desktop
21. Model cost display and context window info
22. Browse OpenRouter link for discovering models
23. Auto-preview: when AI generates HTML, preview panel opens automatically

## GitHub Integration
- Connected via Replit Connector (OAuth)
- Uses @octokit/rest for API calls
- Permissions: read:org, read:project, read:user, repo, user:email
- Features: list repos, create repos, deploy HTML to GitHub Pages via gh-pages branch
- Never cache the Octokit client (tokens expire)

## Terminal
- Real command execution via child_process.exec
- 30 second timeout, 1MB buffer
- Blocked commands: rm, rmdir, kill, shutdown, reboot, mkfs, dd, chmod, chown, sudo, su
- Built-in shortcuts: help, clear, time, whoami, status, version, models

## Database
PostgreSQL with tables: users, ai_models, api_keys, activity_logs, settings, conversations, messages, github_repos
Push schema: `npm run db:push`
