# Family Tree Mini-Builder

A full-stack application for building and visualizing family trees with parent-child relationship validation.

---

## How to Run Locally

### Option 1: Docker (Recommended)

```bash
docker-compose up --build
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Hot-reload enabled for development.

### Option 2: Manual Setup

**Prerequisites:** Node.js 18+

```bash
# Backend (Terminal 1)
cd backend
cp .env.example .env
npm install
npm run dev             # Runs on http://localhost:3001

# Frontend (Terminal 2)
cd frontend
cp .env.example .env
npm install
npm run dev             # Runs on http://localhost:3000
```

### Run Tests
```bash
# Backend unit tests
cd backend && npm test

# Frontend E2E tests (requires app running)
cd frontend && npm test
```

---

## AI Approach

**What tools:** Claude Code (CLI)

**What I used it for:**
- Project scaffolding and Docker configuration
- Boilerplate code (Sequelize models, API error handling patterns)
- Test case generation for validation edge cases
- Documentation drafting (this README)

**Why I chose it:**
- Speeds up repetitive setup tasks so I could focus on architecture and validation logic
- Helps maintain consistent patterns across the codebase
- Good at generating comprehensive test cases for edge cases

---

## Architecture Overview

```
Frontend (Next.js)                    Backend (Express)
┌────────────────────┐               ┌────────────────────────────┐
│ PersonForm         │               │ Routes                     │
│ RelationshipManager│ ──HTTP/JSON─► │   ↓                        │
│ FamilyTree         │               │ Zod Validation             │
└────────────────────┘               │   ↓                        │
        │                            │ Controllers                │
        ▼                            │   ↓                        │
  TanStack Query                     │ Services (business logic)  │
  react-hook-form                    │   ↓                        │
  Zod (UX only)                      │ Sequelize Models → SQLite  │
                                     └────────────────────────────┘
```

**Key decisions:**
- **Backend is source of truth** for all validation - frontend performs optional pre-checks for UX only
- **Service layer** handles business logic (cycle detection, age validation) separate from controllers
- **Consistent error format** with `{ error: string, details?: string[] }` across all endpoints

---

## Data Model & Validation

```
Person                          ParentChild (Join Table)
┌─────────────────┐            ┌─────────────────┐
│ id (PK)         │◄───────────│ parentId (FK)   │
│ name            │            │ childId (FK)    │
│ dateOfBirth     │◄───────────│ createdAt       │
│ placeOfBirth?   │            └─────────────────┘
│ createdAt       │            Unique: (parentId, childId)
│ updatedAt       │
└─────────────────┘
```

### Validation Rules (Server-Side)

| Rule | Error Message |
|------|---------------|
| Name required, max 255 chars | "Name is required" |
| DOB required, not in future | "Date of birth cannot be in the future" |
| Max 2 parents | "A person can have at most 2 parents" |
| Parent 15+ years older | "Parent must be at least 15 years older than child" |
| No cycles | "This relationship would create a cycle" |

**Cycle Detection:** BFS traversal collects all ancestors of the parent, then checks if the child is already an ancestor.

---

## API Reference

Base URL: `http://localhost:3001/api/v1`

### People Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/people` | List all people |
| POST | `/people` | Create person |
| PUT | `/people/:id` | Update person |
| DELETE | `/people/:id` | Delete person (cascades relationships) |

#### List All People
```http
GET /api/v1/people
```

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "dateOfBirth": "1950-01-15"
    },
    {
      "id": 2,
      "name": "Jane Doe",
      "dateOfBirth": "1980-03-20"
    }
  ]
}
```

#### Create Person
```http
POST /api/v1/people
Content-Type: application/json

{
  "name": "John Doe",
  "dateOfBirth": "1950-01-15",
  "placeOfBirth": "New York"
}
```

**Success (201):**
```json
{
  "data": {
    "id": 1,
    "name": "John Doe",
    "dateOfBirth": "1950-01-15",
    "placeOfBirth": "New York",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error (400):**
```json
{
  "error": "Validation failed",
  "details": ["dateOfBirth: Date of birth cannot be in the future"]
}
```

#### Update Person
```http
PUT /api/v1/people/1
Content-Type: application/json

{ "name": "John Smith" }
```

#### Delete Person
```http
DELETE /api/v1/people/1
```
**Response:** `204 No Content`

---

### Relationships Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/relationships/tree` | Get all people with parent relationships |
| POST | `/relationships/link` | Create parent-child link |
| POST | `/relationships/unlink` | Remove parent-child link |

#### Get Family Tree
```http
GET /api/v1/relationships/tree
```

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "dateOfBirth": "1950-01-15",
      "placeOfBirth": "New York",
      "parents": []
    },
    {
      "id": 2,
      "name": "Jane Doe",
      "dateOfBirth": "1980-03-20",
      "placeOfBirth": "Boston",
      "parents": [{ "id": 1 }]
    }
  ]
}
```

#### Link Relationship
```http
POST /api/v1/relationships/link
Content-Type: application/json

{ "parentId": 1, "childId": 2 }
```

**Success (201):**
```json
{ "data": { "id": 1, "parentId": 1, "childId": 2 } }
```

**Errors (400):**
```json
{ "error": "Parent must be at least 15 years older than child. Current age difference: 10.5 years." }
{ "error": "A person can have at most 2 parents" }
{ "error": "This relationship would create a cycle. A person cannot be their own ancestor." }
```

#### Unlink Relationship
```http
POST /api/v1/relationships/unlink
Content-Type: application/json

{ "parentId": 1, "childId": 2 }
```
**Response:** `204 No Content`

---

## What I Would Do With More Time

### Backend Improvements
- **Authentication** - JWT-based authentication with refresh tokens
- **Database** - Migrate to PostgreSQL with proper migration tooling
- **Caching & Rate limiting** - Redis for tree queries and API protection
- **Query optimization** - Cycle detection could be further optimized (DOB validation already uses eager loading)

### Frontend Improvements
- **Visual tree graph** - D3.js or React Flow for interactive visualization
- **Filtering & search** - Filter people by name, date range, relationships
- **Dark mode** - Theme support with system preference detection

### Infrastructure Improvements
- **API Documentation** - Swagger/OpenAPI for interactive docs
- **Monitoring** - Grafana for metrics and alerting

---

## Tech Stack

**Backend:** Node.js, Express, TypeScript, Sequelize, SQLite, Zod, Jest
**Frontend:** Next.js 15, TypeScript, TanStack Query, react-hook-form, Tailwind CSS v4, Playwright
