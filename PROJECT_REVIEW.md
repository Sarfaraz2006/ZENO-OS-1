# J.A.R.V.I.S - AI Assistant Platform
## Complete Project Review Document

---

## 1. Project Overview

**J.A.R.V.I.S** is a comprehensive AI assistant platform inspired by Iron Man's JARVIS, combined with **Lovable-style code generation** capabilities. It's a full-stack web application built as a **Progressive Web App (PWA)** that provides:

- AI-powered chat with live code preview
- Multi-model AI support via OpenRouter
- Voice interaction (speech-to-text + text-to-speech)
- GitHub integration with Pages deployment
- Email system (SMTP send + IMAP receive)
- Business Board for tracking emails, WhatsApp, payments, automations
- AI-powered Business Brain analytics
- Web terminal for command execution
- Multi-theme system with dark/light mode + 6 accent colors

**Total Codebase**: ~7,550 lines across 26 core files
**Status**: Feature-complete, published and live

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Tailwind CSS + Shadcn UI |
| **Backend** | Express.js 5 + TypeScript |
| **Database** | PostgreSQL (Neon-backed via Replit) + Drizzle ORM |
| **AI Provider** | OpenRouter via Replit AI Integrations (no API key needed) |
| **GitHub** | @octokit/rest via Replit OAuth Connector |
| **Email** | Nodemailer (SMTP send) + ImapFlow (IMAP receive) |
| **Charts** | Recharts (area, bar, pie charts) |
| **Markdown** | react-markdown + remark-gfm + react-syntax-highlighter |
| **Routing** | Wouter (lightweight client-side routing) |
| **State** | TanStack React Query v5 |
| **Forms** | React Hook Form + Zod validation |
| **Auth** | Express Session (password-based, single user) |
| **PWA** | Service Worker + Web App Manifest |

---

## 3. Architecture

### 3.1 Folder Structure

```
project/
├── client/                          # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/                   # All page components
│   │   │   ├── login.tsx            # Login page (129 lines)
│   │   │   ├── dashboard.tsx        # Analytics dashboard (392 lines)
│   │   │   ├── chat.tsx             # AI chat with split-view (751 lines)
│   │   │   ├── models.tsx           # Model hub (379 lines)
│   │   │   ├── terminal.tsx         # Web terminal (268 lines)
│   │   │   ├── github.tsx           # GitHub repos (416 lines)
│   │   │   ├── code-editor.tsx      # GitHub code editor (707 lines)
│   │   │   ├── business.tsx         # Business Board (950 lines)
│   │   │   └── settings.tsx         # Settings page (844 lines)
│   │   ├── components/
│   │   │   ├── app-sidebar.tsx      # Navigation sidebar (147 lines)
│   │   │   ├── markdown-renderer.tsx # Markdown + artifact cards (215 lines)
│   │   │   └── code-preview.tsx     # Live HTML/CSS/JS preview (181 lines)
│   │   ├── App.tsx                  # Main app with routing + theme
│   │   ├── lib/queryClient.ts       # TanStack Query setup
│   │   └── hooks/use-toast.ts       # Toast notifications
│   ├── public/
│   │   ├── manifest.json            # PWA manifest
│   │   └── sw.js                    # Service worker
│   └── index.html                   # Entry HTML with PWA meta tags
├── server/                          # Backend (Express)
│   ├── index.ts                     # Server entry point (103 lines)
│   ├── routes.ts                    # All API routes (918 lines)
│   ├── storage.ts                   # Database CRUD operations (231 lines)
│   ├── db.ts                        # PostgreSQL connection (14 lines)
│   ├── github-client.ts             # GitHub OAuth client (45 lines)
│   ├── business-brain.ts            # AI business intelligence (385 lines)
│   ├── vite.ts                      # Vite dev server setup (58 lines)
│   └── replit_integrations/chat/
│       ├── routes.ts                # OpenRouter chat streaming (133 lines)
│       └── storage.ts               # Chat DB operations (43 lines)
├── shared/                          # Shared types & schemas
│   ├── schema.ts                    # All DB schemas + types (166 lines)
│   └── models/chat.ts               # Chat-specific schemas (34 lines)
└── drizzle.config.ts                # Drizzle ORM config
```

### 3.2 Data Flow

```
User Browser (React)
    ↓ HTTP/SSE
Express.js Server (port 5000)
    ↓ Drizzle ORM
PostgreSQL Database (Neon)
    ↓ OpenAI SDK
OpenRouter API (AI models)
    ↓ Octokit
GitHub API (repos, files)
    ↓ Nodemailer/ImapFlow
Email Servers (SMTP/IMAP)
```

### 3.3 Authentication Flow

1. Single-user system with password-based auth
2. Default password: `admin` (changeable in Settings)
3. Password hashed with SHA-256, stored in database
4. Express session cookie with 24-hour expiry
5. `requireAuth` middleware protects all API routes
6. Login page has futuristic JARVIS-themed design

---

## 4. Database Schema

### 4.1 Tables (10 total)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | Single admin user | username, password (hashed) |
| `ai_models` | AI model registry | name, model_id, provider, context_window, costs, isEnabled, isFavorite, category |
| `api_keys` | External API access keys | name, key, isActive, lastUsed |
| `activity_logs` | System activity tracking | action, details, source |
| `settings` | Key-value config store | key, value (SMTP creds, integrations, etc.) |
| `conversations` | Chat conversations | title, createdAt |
| `messages` | Chat messages | conversationId, role (user/assistant), content |
| `github_repos` | Tracked GitHub repos | name, repoUrl, branch, status |
| `business_emails` | Email tracking | direction, from, to, subject, body, threadId |
| `business_contacts` | Business contacts | name, email, phone, source, totalMessages |
| `business_metrics` | Business metrics | metricType, metricKey, metricValue, period |

### 4.2 Relationships
- `conversations` → has many `messages` (via conversationId)
- All other tables are independent (flat structure for simplicity)

---

## 5. Feature Details

### 5.1 AI Chat System (chat.tsx - 751 lines)

**How it works:**
1. User types a message or uses voice input
2. Message sent to `POST /api/conversations/:id/messages` with selected model + system prompt
3. Server calls OpenRouter API via OpenAI SDK with streaming enabled
4. Response streamed back via **Server-Sent Events (SSE)**
5. Frontend renders streaming text in real-time with markdown formatting
6. If HTML code detected in response, auto-opens live preview panel

**Key Features:**
- **Split-View Layout**: Chat on left, live preview panel on right
- **Model Selection**: Dropdown to pick any enabled AI model
- **System Prompt**: Customizable instruction for AI behavior (default: professional web developer prompt)
- **Streaming Responses**: Real-time token-by-token display
- **Markdown Rendering**: Full markdown with syntax highlighting via react-markdown
- **Artifact Cards**: Code blocks hidden behind clickable cards (like Lovable/Claude)
- **Voice Input**: Web Speech API with auto-send after recognition
- **Voice Output**: Text-to-Speech with toggle
- **Continuous Mode**: Auto-listen after AI responds
- **Conversation Sidebar**: Collapsible list of all conversations
- **Export**: Download conversation as markdown file
- **Copy Messages**: Click to copy any message

**Live Code Preview (code-preview.tsx - 181 lines):**
- Sandboxed iframe with `srcdoc` attribute
- Renders HTML/CSS/JS in real-time
- Auto-detects HTML in AI responses and opens preview
- Preview button on markdown artifact cards
- Full-width panel with close button

**Markdown Renderer (markdown-renderer.tsx - 215 lines):**
- Uses react-markdown with remark-gfm plugin
- Syntax highlighting via react-syntax-highlighter (oneDark theme)
- Code blocks displayed as "artifact cards" with language label
- Preview button for HTML artifacts
- Copy button for all code blocks
- Supports tables, lists, links, blockquotes, etc.

### 5.2 Model Hub (models.tsx - 379 lines)

**How it works:**
- Models stored in `ai_models` database table
- Pre-configured with 5 models: Llama 3.3 70B, DeepSeek V3, Claude Sonnet 4.6, Gemini 3 Flash, Qwen 3 Max
- Users can add any model by OpenRouter model ID

**Features:**
- **Search**: Filter models by name/ID
- **Category Filter**: All, General, Fast, Reasoning, Code, Creative
- **Enable/Disable**: Toggle models on/off for chat selector
- **Favorites**: Star models for quick access
- **Add Custom Models**: Enter any OpenRouter model ID
- **Model Info Cards**: Shows context window, input/output costs, provider
- **Delete**: Remove custom-added models

**API Endpoints:**
- `GET /api/models` - List all models
- `POST /api/models` - Add new model
- `PATCH /api/models/:id/toggle` - Enable/disable
- `PATCH /api/models/:id/favorite` - Toggle favorite
- `DELETE /api/models/:id` - Delete model

### 5.3 Analytics Dashboard (dashboard.tsx - 392 lines)

**Features:**
- **Stats Cards**: Total conversations, messages, active models, API keys (with gradient backgrounds)
- **Area Chart**: Message activity over time (last 7 days)
- **Bar Chart**: Top conversations by message count
- **Pie Chart**: Model usage distribution
- **Quick Actions Grid**: Links to Chat, Terminal, GitHub, Models, Settings, Business
- **Recent Activity**: Last 10 activity log entries with source icons

**API:** `GET /api/stats` returns aggregated counts

### 5.4 Web Terminal (terminal.tsx - 268 lines)

**How it works:**
1. User types a command
2. Sent to `POST /api/terminal/execute` with `{ command }`
3. Server executes via `child_process.exec` with 30s timeout + 1MB buffer
4. Output returned to frontend

**Security:**
- Blocked dangerous commands: rm, rmdir, kill, shutdown, reboot, mkfs, dd, chmod, chown, sudo, su
- 30-second execution timeout
- 1MB output buffer limit

**Built-in Shortcuts:**
- `help` - Show available commands
- `clear` - Clear terminal
- `time` - Current date/time
- `whoami` - System info
- `status` - Server status
- `version` - App version
- `models` - List AI models

### 5.5 GitHub Integration (github.tsx - 416 lines)

**How it works:**
- Connected via Replit OAuth Connector
- Uses @octokit/rest for GitHub API calls
- Tokens managed by Replit (auto-refresh, never cached)

**Features:**
- **User Profile**: Shows GitHub avatar, username, profile link
- **Repository List**: All repos with language, visibility, last update
- **Create Repository**: New public/private repos with description
- **Deploy to GitHub Pages**: Push HTML content to gh-pages branch
- **Refresh**: Reload repo list

**API Endpoints:**
- `GET /api/github/user` - GitHub user profile
- `GET /api/github/repos` - List repositories
- `POST /api/github/repos` - Create new repository
- `POST /api/github/deploy` - Deploy to GitHub Pages

### 5.6 GitHub Code Editor (code-editor.tsx - 707 lines)

**How it works:**
1. Select a repository from dropdown
2. Browse file tree (directories expand on click)
3. Open any file to view/edit content
4. Edit and save (commits directly to GitHub)

**Features:**
- **File Browser**: Tree view with folder/file icons
- **File Editor**: Textarea with monospace font
- **Save (Ctrl+S)**: Commits changes to GitHub with commit message
- **Create File**: New files with custom path
- **Delete File**: Remove files from repository
- **Breadcrumb Path**: Shows current file location

**API Endpoints:**
- `GET /api/github/repos/:owner/:repo/tree` - Get file tree
- `GET /api/github/repos/:owner/:repo/file` - Get file content
- `PUT /api/github/repos/:owner/:repo/file` - Save/create file
- `DELETE /api/github/repos/:owner/:repo/file` - Delete file

### 5.7 Email System

**Sending (Nodemailer):**
- Configure SMTP settings in Settings (host, port, user, password)
- Compose and send emails from Business Board
- Emails logged in `business_emails` table

**Receiving (ImapFlow):**
- IMAP host auto-derived from SMTP host (smtp.gmail.com → imap.gmail.com)
- "Check Inbox" button fetches last 10 emails
- Reply functionality with thread tracking via messageId/threadId

**API Endpoints:**
- `POST /api/email/send` - Send email via SMTP
- `POST /api/email/check-inbox` - Fetch emails via IMAP
- `GET /api/business/emails` - List all tracked emails

### 5.8 Business Board (business.tsx - 950 lines)

**4 Tabs:**

**Tab 1 - Overview:**
- Stat cards: Email (sent/received), WhatsApp, Payments, Automations
- Email activity chart (area chart)
- Channel distribution (pie chart)
- Integration status cards (Email, WhatsApp, Stripe, n8n)
- Recent emails list

**Tab 2 - Emails:**
- Full inbox/outbox list
- Compose new email dialog
- Reply to received emails
- Status badges (sent/received/replied)

**Tab 3 - Contacts:**
- Business contacts list
- Add new contacts (name, email, phone, source)
- Contact cards with message counts

**Tab 4 - Business Brain:**
- Health score circle (0-100, color-coded)
- Insight cards with priority badges (high/medium/low) and category icons
- "Deep AI Analysis" button for AI-powered insights
- "Ask Brain" Q&A input with quick question shortcuts
- Rule-based analysis (fast, deterministic) + AI analysis (Llama 3.3 70B)

### 5.9 Business Brain (business-brain.ts - 385 lines)

**How it works:**
1. Gathers context from all business data (emails, contacts, metrics, integrations)
2. **Rule-based mode**: Analyzes data with deterministic rules, generates insights
3. **AI mode**: Sends context to Llama 3.3 70B for deep analysis
4. Returns health score (0-100) + categorized insights

**Insight Categories:** Email, WhatsApp, Payment, Automation, Contacts, General
**Insight Types:** Opportunity, Warning, Trend, Suggestion
**Priority Levels:** High, Medium, Low

**API Endpoints:**
- `GET /api/brain/analyze?mode=rules|ai` - Get analysis (rule-based or AI)
- `POST /api/brain/ask` - Ask a question (max 500 chars)
- `GET /api/brain/context` - Get raw business context

### 5.10 Settings Page (settings.tsx - 844 lines)

**Sections:**
1. **API Keys**: Generate/manage API keys for external access
2. **Change Password**: Update admin password
3. **SMTP Configuration**: Email server settings (host, port, user, password)
4. **WhatsApp Integration**: Twilio credentials (SID, Auth Token, Phone number)
5. **Stripe Integration**: API keys (Secret Key, Webhook Secret)
6. **n8n Webhook**: Webhook URL display for automation
7. **REST API Documentation**: Complete API reference with endpoints

### 5.11 Multi-Theme System

- **Dark/Light Mode**: Toggle with sun/moon icon
- **6 Accent Colors**: Blue, Emerald, Violet, Rose, Amber, Cyan
- Theme persisted in localStorage
- Applied via CSS custom properties on `:root`

### 5.12 PWA Support

- **manifest.json**: App name, icons, theme colors, display: standalone
- **Service Worker (sw.js)**: Caches static assets for offline access
- **Meta Tags**: viewport, theme-color, apple-mobile-web-app-capable
- Installable on mobile (Android/iOS) and desktop (Chrome/Edge)

---

## 6. API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with `{ password }` |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/check` | Check auth status |
| POST | `/api/auth/change-password` | Change password `{ currentPassword, newPassword }` |

### Chat & Conversations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations` | List all conversations |
| POST | `/api/conversations` | Create conversation `{ title }` |
| GET | `/api/conversations/:id` | Get conversation with messages |
| DELETE | `/api/conversations/:id` | Delete conversation |
| POST | `/api/conversations/:id/messages` | Send message (SSE streaming response) `{ content, model, systemPrompt }` |

### Models
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/models` | List all models |
| POST | `/api/models` | Add model `{ name, modelId, ... }` |
| PATCH | `/api/models/:id/toggle` | Toggle enable/disable |
| PATCH | `/api/models/:id/favorite` | Toggle favorite |
| DELETE | `/api/models/:id` | Delete model |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Get dashboard statistics |
| GET | `/api/logs` | Get activity logs |

### Terminal
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/terminal/execute` | Execute command `{ command }` |

### GitHub
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/github/user` | Get GitHub user profile |
| GET | `/api/github/repos` | List repositories |
| POST | `/api/github/repos` | Create repository |
| POST | `/api/github/deploy` | Deploy to GitHub Pages |
| GET | `/api/github/repos/:owner/:repo/tree` | Get file tree |
| GET | `/api/github/repos/:owner/:repo/file` | Get file content |
| PUT | `/api/github/repos/:owner/:repo/file` | Save/create file |
| DELETE | `/api/github/repos/:owner/:repo/file` | Delete file |

### Email & Business
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/email/send` | Send email via SMTP |
| POST | `/api/email/check-inbox` | Fetch inbox via IMAP |
| GET | `/api/business/emails` | List tracked emails |
| GET | `/api/business/contacts` | List contacts |
| POST | `/api/business/contacts` | Add contact |
| GET | `/api/business/stats` | Business statistics |
| GET | `/api/integrations/status` | Integration connection status |
| POST | `/api/business/webhook/n8n` | n8n webhook endpoint |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings/:key` | Get setting value |
| POST | `/api/settings` | Save setting `{ key, value }` |
| GET | `/api/api-keys` | List API keys |
| POST | `/api/api-keys` | Generate API key `{ name }` |
| PATCH | `/api/api-keys/:id/toggle` | Toggle API key |
| DELETE | `/api/api-keys/:id` | Delete API key |

### Business Brain
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/brain/analyze?mode=rules\|ai` | Get business analysis |
| POST | `/api/brain/ask` | Ask Brain `{ question }` (max 500 chars) |
| GET | `/api/brain/context` | Get raw business context |

---

## 7. How to Run

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server
npm run dev
# → App runs on http://localhost:5000
```

**Default Login:** Password is `admin` (change in Settings)

---

## 8. Pre-configured AI Models

| Model | ID | Category | Context Window |
|-------|----|----------|----------------|
| Llama 3.3 70B | meta-llama/llama-3.3-70b-instruct | General | 131K |
| DeepSeek V3 | deepseek/deepseek-chat | General | 65K |
| Claude Sonnet 4.6 | anthropic/claude-sonnet-4.6 | Reasoning | 200K |
| Gemini 3 Flash | google/gemini-3-flash-preview | Fast | 1M |
| Qwen 3 Max | qwen/qwen3-max-thinking | Reasoning | 40K |

Users can add any OpenRouter model by ID from the Models page.

---

## 9. Integration Setup Guide

### Email (SMTP/IMAP)
1. Go to Settings → SMTP Configuration
2. Enter: Host (e.g., smtp.gmail.com), Port (587), Username, Password
3. For Gmail: Use App Password (not regular password)
4. IMAP host auto-derived from SMTP host

### WhatsApp (Twilio)
1. Go to Settings → WhatsApp Integration
2. Enter: Twilio Account SID, Auth Token, WhatsApp Phone Number
3. Status updates from "Not Connected" to "Connected"

### Stripe (Payments)
1. Go to Settings → Stripe Integration
2. Enter: Stripe Secret Key, Webhook Secret
3. Status updates from "Not Connected" to "Connected"

### n8n (Automation)
1. Webhook URL shown in Settings and Business Board
2. POST data to `/api/business/webhook/n8n`
3. Status shows "Not Tested" until first webhook received

### GitHub
- Automatically connected via Replit OAuth Connector
- No manual setup needed

---

## 10. Security Measures

1. Password hashed with SHA-256 before storage
2. Session-based authentication with 24-hour expiry
3. `requireAuth` middleware on all API routes
4. Terminal blocks dangerous commands (rm, sudo, kill, etc.)
5. Terminal has 30s timeout and 1MB buffer limit
6. Code preview uses sandboxed iframe (srcdoc)
7. Brain API validates input length (500 char limit) and mode parameter
8. GitHub tokens never cached (Replit manages rotation)
9. SMTP/API credentials stored in database settings table

---

## 11. Key Design Decisions

1. **Single-user system**: Designed for personal use, no multi-user complexity
2. **OpenRouter via Replit Integration**: No API key management needed for AI
3. **SSE for streaming**: Server-Sent Events for real-time AI response streaming
4. **Artifact cards**: Code hidden behind cards to keep chat clean (like Lovable/Claude)
5. **Manual integration setup**: User chose manual credential entry over OAuth for Twilio/Stripe
6. **Rule-based + AI Brain**: Fast deterministic analysis + deep AI insights
7. **Flat database schema**: Simple tables without complex relations for easy maintenance
8. **Shadcn UI + Tailwind**: Consistent, accessible component library

---

## 12. Possible Future Improvements

1. **Multi-user support** with role-based access
2. **File upload** for images/documents in chat
3. **Code execution sandbox** for running generated code
4. **Webhook dashboard** for monitoring incoming webhooks
5. **Contact CRM features** (notes, tags, deal tracking)
6. **Email templates** for common business communications
7. **Scheduled tasks** (auto-check inbox, periodic reports)
8. **Mobile-optimized** layouts for all pages
9. **Export/import** settings and configuration
10. **Real-time notifications** via WebSocket

---

*Document generated: February 2026*
*Total features: 29 major features implemented*
*Codebase: ~7,550 lines across 26 core files*
