# Synapse Workspace

A full-stack project management platform with real-time collaboration, built with React Native (Expo) and Node.js (Express, Prisma, PostgreSQL).

## Features

- **Workspaces** — Create and manage workspaces with role-based access (owner, admin, member, guest)
- **Projects** — Organize work into projects with customizable colors
- **Kanban Boards** — Drag-and-drop task management with backlog, todo, in_progress, review, done columns
- **Labels & Filtering** — Color-coded labels, filter by status/priority/assignee
- **Comments** — Inline task comments with author attribution
- **Activity Timeline** — Full audit trail of all task changes
- **Notifications** — Real-time push notifications via Socket.io
- **Calendar** — Monthly grid view with task indicators and agenda list
- **Global Search** — Debounced search across workspaces, projects, tasks, and labels
- **Analytics Dashboard** — KPI cards, progress rings, status/priority bar charts, productivity insights
- **Attachments** — File uploads with mime-type filtering, preview, and delete
- **Authentication** — Email/password and Google OAuth
- **Dark Mode** — Full dark/light theme support persisted via Zustand
- **Real-time** — WebSocket-powered live updates for tasks and notifications
- **Offline Support** — Optimistic updates via React Query

## Architecture

```
synapse-workspace/
├── backend/                    # Express API server
│   ├── prisma/                 # Schema, migrations, seed
│   ├── src/
│   │   ├── config/             # DB, env config
│   │   ├── controllers/        # Route handlers
│   │   ├── middleware/         # Auth, error handling, upload
│   │   ├── models/             # TypeScript interfaces
│   │   ├── routes/             # Express routers
│   │   ├── services/           # Business logic
│   │   ├── socket/             # Socket.io setup
│   │   ├── validators/         # Zod schemas
│   │   └── server.ts           # App entry point
│   └── uploads/                # File storage
├── frontend/                   # React Native (Expo) app
│   ├── app/
│   │   ├── (auth)/             # Login, register screens
│   │   └── (protected)/        # Main app screens
│   ├── components/             # Reusable UI components
│   ├── constants/              # Query keys, routes, config
│   ├── hooks/                  # React Query hooks
│   ├── providers/              # React Query provider
│   ├── services/               # API client calls
│   ├── store/                  # Zustand stores
│   ├── theme/                  # Light/dark theme tokens
│   ├── types/                  # TypeScript interfaces
│   └── utils/                  # Helpers (date, haptics, formatting)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native 0.76, Expo 52, TypeScript |
| Navigation | Expo Router (file-based routing) |
| State | Zustand, TanStack React Query |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| Auth | JWT, bcrypt, Google OAuth |
| Real-time | Socket.io |
| File Upload | Multer |
| Validation | Zod |
| Styling | StyleSheet with theme tokens |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Expo CLI (`npx expo`)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd synapse-workspace

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Environment

```bash
# backend/.env
DATABASE_URL="postgresql://user:password@localhost:5432/synapse_db"
JWT_SECRET="your-secret-key"
GOOGLE_CLIENT_ID="your-google-client-id"
PORT=5000
```

### Database Setup

```bash
cd backend

# Create database
npx prisma db push

# Seed demo data
npx prisma db seed
```

### Running

```bash
# Terminal 1: Backend API
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npx expo start
```

### Demo Credentials

After seeding:
- `alice@synapse.dev` / `password123` — Owner
- `bob@synapse.dev` / `password123` — Admin
- `charlie@synapse.dev` / `password123` — Member

## API Overview

All endpoints are mounted at `/api/v1/`.

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Sign in (returns JWT) |
| POST | `/auth/google` | Google OAuth |
| GET | `/auth/me` | Current user profile |
| POST | `/auth/logout` | Invalidate session |

### Workspaces
| Method | Path | Description |
|--------|------|-------------|
| GET | `/workspaces` | List user workspaces |
| POST | `/workspaces` | Create workspace |
| GET | `/workspaces/:id` | Get workspace |
| PATCH | `/workspaces/:id` | Update workspace |
| DELETE | `/workspaces/:id` | Soft-delete workspace |
| GET | `/workspaces/:id/members` | List members |
| POST | `/workspaces/:id/members` | Invite member |
| PATCH | `/workspaces/:id/members/:memberId` | Update role |
| DELETE | `/workspaces/:id/members/:memberId` | Remove member |

### Projects
| Method | Path | Description |
|--------|------|-------------|
| GET | `/workspaces/:workspaceId/projects` | List projects |
| POST | `/workspaces/:workspaceId/projects` | Create project |
| GET | `/workspaces/:workspaceId/projects/:projectId` | Get project |
| PATCH | `/workspaces/:workspaceId/projects/:projectId` | Update project |
| DELETE | `/workspaces/:workspaceId/projects/:projectId` | Delete project |

### Tasks
| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects/:projectId/tasks` | List tasks (filterable) |
| POST | `/projects/:projectId/tasks` | Create task |
| GET | `/tasks/:id` | Get task details |
| PATCH | `/tasks/:id` | Update task |
| DELETE | `/tasks/:id` | Delete task |
| PUT | `/projects/:projectId/tasks/reorder` | Reorder tasks |

### Comments & Labels
| Method | Path | Description |
|--------|------|-------------|
| GET | `/tasks/:taskId/comments` | List comments |
| POST | `/tasks/:taskId/comments` | Add comment |
| DELETE | `/tasks/:taskId/comments/:commentId` | Delete comment |
| GET | `/projects/:projectId/labels` | List labels |
| POST | `/projects/:projectId/labels` | Create label |
| PATCH | `/projects/:projectId/labels/:id` | Update label |
| DELETE | `/projects/:projectId/labels/:id` | Delete label |
| POST | `/tasks/:taskId/labels` | Assign label |
| DELETE | `/tasks/:taskId/labels/:labelId` | Remove label |

### Analytics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/analytics/workspaces/:workspaceId` | Workspace KPIs, charts, insights |
| GET | `/analytics/projects/:projectId` | Project velocity, trends |
| GET | `/analytics/user` | User productivity stats |

### Search & Attachments
| Method | Path | Description |
|--------|------|-------------|
| GET | `/search?q=term` | Global search |
| GET | `/tasks/:taskId/attachments` | List attachments |
| POST | `/tasks/:taskId/attachments` | Upload file |
| DELETE | `/tasks/:taskId/attachments/:id` | Delete attachment |

### Activity & Notifications
| Method | Path | Description |
|--------|------|-------------|
| GET | `/tasks/:taskId/activity` | Task activity log |
| GET | `/notifications` | User notifications |
| PATCH | `/notifications/:id/read` | Mark read |

## Socket Architecture

Socket.io is used for real-time updates. The server emits events when tasks, comments, or labels change. Clients listen for events and invalidate React Query caches.

**Events:**
- `task:created` / `task:updated` / `task:deleted`
- `comment:added` / `comment:deleted`
- `label:assigned` / `label:removed`
- `notification:new`

## Analytics Architecture

Analytics are computed server-side using aggregate Prisma queries:

- **Workspace Analytics**: Task counts by status/priority, completion percentage, recent activity, upcoming deadlines, AI-generated insights
- **Project Analytics**: Completion velocity (tasks/week), 4-week completion trend, status/priority distribution
- **User Analytics**: Tasks assigned, completed this week/month, overdue count

Insights are rule-based (not AI), generated from current workspace state.

## Screenshots

*Screenshots to be added — run the app to see:*
- Dashboard with KPI cards, progress ring, bar charts, activity feed
- Kanban boards with drag-and-drop column management
- Calendar with monthly grid and date-selected task list
- Global search with grouped results by entity type
- Task detail with inline editing, labels, comments, attachments, activity timeline

## License

ISC
