# ✦ CHRONICLE — Full-Stack Production Blogging Platform

> A production-ready, full-stack blogging platform with secure JWT authentication, relational database persistence, markdown authoring, and a real-time discussion system.

---

## 🌟 Key Features

### 1. User Authentication & Authorization
- **Secure Registration & Login**: User registration with input validation (regex email validation, username constraints, minimum password lengths).
- **Password Security**: Passwords salted and hashed with `bcryptjs` (cost factor 10).
- **Session / Token Management**: Stateless JSON Web Tokens (JWT) signed with expiration times.
- **Role & Ownership Enforcement**:
  - Only post authors can update or delete their own posts.
  - Only comment authors (and post moderators) can delete their comments.
  - Non-authenticated guests can browse posts, read full articles, and view discussions, but must sign in to publish or comment.

### 2. Post Management (CRUD)
- **Rich Content Creation**: Markdown support with real-time live preview tab.
- **Smart Metadata**:
  - Automatic URL-safe slug generation (`slugify`).
  - Reading time calculation based on word count.
  - Auto-generated 160-character card excerpts.
  - Cover image presets and custom URL support.
  - Category tagging (`Engineering`, `Design`, `AI`, `Architecture`, `DevOps`, `General`).
- **Dynamic Search & Filtering**: Client-side and server-side search by title/content/excerpt with debounced instant querying.

### 3. Comments & Community Discussion
- **Relational Integrity**: Comments linked via foreign keys to both `posts(id)` and `users(id)` with cascading deletion (`ON DELETE CASCADE`).
- **Instant Feedback**: Comments appear immediately upon submission with dynamic comment counter badges.
- **Strict Ownership**: Delete controls are strictly rendered and validated only for the author of that comment.

### 4. Modern UI/UX Design System
- **Rich Aesthetics**: Glassmorphic sticky navigation, vibrant gradient accents, curated typography (`Outfit`, `Plus Jakarta Sans`, `JetBrains Mono`).
- **Theme Switcher**: Instant Dark / Light mode toggle persisted across reloads in `localStorage`.
- **Micro-Animations**: Hover card elevation, reading progress bar, floating toast alerts, and custom animated confirmation dialogs.
- **Quick Demo Bar**: 1-click credential autofill buttons for fast demo account testing.

---

## 🛠️ Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Backend Runtime** | Node.js | v20+ / v26+ |
| **Server Framework** | Express 4 | RESTful routing, CORS, JSON parsing, Morgan logging |
| **Database** | SQLite 3 | High-performance embedded DB via `node:sqlite` (WAL mode enabled) |
| **Authentication** | JWT + Bcrypt | `jsonwebtoken`, `bcryptjs` |
| **Frontend** | HTML5 / CSS3 / ES Modules | Vanilla modern web technologies, zero build step required |
| **Typography** | Google Fonts | Outfit, Plus Jakarta Sans, JetBrains Mono |

---

## 📁 Project Structure

```text
/Users/varshan/Desktop/Blog/
├── .env                              # Environment variables (PORT, JWT secret, DB path)
├── .env.example                      # Template environment configuration
├── package.json                      # Project metadata, scripts, and dependencies
├── server/
│   ├── server.js                     # Main Express server & SPA routing
│   ├── config/
│   │   └── db.js                     # SQLite connection, pragmas, and schema initializer
│   ├── migrations/
│   │   └── 001_initial_schema.sql    # Relational schema (tables, foreign keys, indexes)
│   ├── middleware/
│   │   ├── auth.js                   # requireAuth & optionalAuth JWT middlewares
│   │   └── errorHandler.js           # Centralized API error handler & 404 handler
│   ├── controllers/
│   │   ├── authController.js         # Register, login, me, logout handlers
│   │   ├── postController.js         # Full CRUD post handlers + author checks
│   │   └── commentController.js      # Comment creation, listing, and deletion
│   ├── routes/
│   │   ├── authRoutes.js             # /api/auth routes
│   │   ├── postRoutes.js             # /api/posts routes
│   │   └── commentRoutes.js          # /api/comments routes
│   └── utils/
│       ├── seed.js                   # Database seeder with demo accounts & rich posts
│       └── test_api.js               # Automated integration tests
└── public/
    ├── index.html                    # Single-page application markup & modals
    ├── css/
    │   └── style.css                 # Comprehensive CSS design system (Dark & Light)
    └── js/
        ├── api.js                    # API client wrapper with JWT token management
        ├── state.js                  # Reactive client state store
        ├── ui.js                     # UI components, Markdown parser, toasts, modals
        ├── router.js                 # Hash router (#/, #/post/:id, #/category/:cat)
        └── app.js                    # Main coordinator & event listeners
```

---

## 🗄️ Database Schema & Relational Model

The database is defined in [`server/migrations/001_initial_schema.sql`](file:///Users/varshan/Desktop/Blog/server/migrations/001_initial_schema.sql) with strict foreign keys enabled (`PRAGMA foreign_keys = ON;`).

```sql
-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Posts Table (Foreign key: author_id -> users.id)
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    excerpt TEXT DEFAULT '',
    category TEXT DEFAULT 'General',
    cover_image TEXT DEFAULT '',
    reading_time INTEGER DEFAULT 1,
    author_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Comments Table (Foreign keys: post_id -> posts.id, author_id -> users.id)
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
```

---

## 🚀 Quickstart & Installation

### 1. Clone & Enter Project Directory
```bash
cd /Users/varshan/Desktop/Blog
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Verify or adjust `.env` (already created):
```env
PORT=4000
NODE_ENV=development
JWT_SECRET=production_grade_jwt_secret_key_antigravity_blog_2026
JWT_EXPIRES_IN=7d
DB_PATH=./server/data/blog.db
```

### 4. Seed Demo Data
Populate demo users, technical articles, and discussion comments:
```bash
npm run seed
```

### 5. Launch Application
```bash
# Start server
npm start

# Or with file watching in development
npm run dev
```

Open your browser and navigate to: **[http://localhost:4000](http://localhost:4000)**.

---

## 👥 Demo Accounts

The seeder preconfigures 3 realistic developer accounts with preloaded articles and comments:

| Username | Email | Password | Role / Specialty |
|---|---|---|---|
| `alex_chen` | `alex@example.com` | `password123` | Principal Distributed Systems Engineer |
| `sarah_dev` | `sarah@example.com` | `password123` | Senior Frontend Architect |
| `marcus_ai` | `marcus@example.com` | `password123` | ML Systems Researcher |

> *Tip: In the sign-in modal, click any of the 1-click demo chips to autofill credentials instantly!*

---

## 📡 RESTful API Documentation

All API responses return JSON format. Protected endpoints require the `Authorization` header:
```text
Authorization: Bearer <JWT_TOKEN>
```

### 1. Authentication Endpoints

#### Register New User
- **POST** `/api/auth/register`
- **Request Body:**
  ```json
  {
    "username": "jane_doe",
    "email": "jane@example.com",
    "password": "securepassword123",
    "bio": "Software developer & tech writer",
    "avatar_url": "https://..."
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "User registered successfully!",
    "user": { "id": 4, "username": "jane_doe", "email": "jane@example.com", ... },
    "token": "eyJhbGciOiJIUz..."
  }
  ```

#### Login
- **POST** `/api/auth/login`
- **Request Body:**
  ```json
  {
    "identifier": "alex_chen",
    "password": "password123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Login successful!",
    "user": { "id": 1, "username": "alex_chen", "email": "alex@example.com", ... },
    "token": "eyJhbGciOiJIUz..."
  }
  ```

#### Get Current Profile
- **GET** `/api/auth/me` *(Requires Auth)*
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "user": {
      "id": 1,
      "username": "alex_chen",
      "email": "alex@example.com",
      "stats": { "posts": 2, "comments": 2 }
    }
  }
  ```

---

### 2. Posts Endpoints

#### Get All Posts
- **GET** `/api/posts`
- **Query Parameters:**
  - `category` (optional): Filter by category (e.g. `Engineering`, `Design`, `AI`)
  - `search` (optional): Full-text search across titles, contents, excerpts
  - `author` (optional): Filter by author username
  - `limit` (default: 50), `offset` (default: 0)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "count": 4,
    "posts": [
      {
        "id": 1,
        "title": "Architecting Resilient Event-Driven Microservices in 2026",
        "slug": "architecting-resilient-event-driven-microservices-2026",
        "category": "Engineering",
        "reading_time": 6,
        "author_name": "alex_chen",
        "author_avatar": "https://...",
        "comment_count": 3,
        "created_at": "2026-10-05T18:00:00.000Z"
      }
    ]
  }
  ```

#### Get Post By ID or Slug
- **GET** `/api/posts/:id`
- **Response (200 OK):** Returns complete post details including author profile and nested comments array.

#### Create Post
- **POST** `/api/posts` *(Requires Auth)*
- **Request Body:**
  ```json
  {
    "title": "Optimizing Web Vitals in Single Page Applications",
    "category": "Design",
    "cover_image": "https://images.unsplash.com/...",
    "excerpt": "A hands-on guide to measuring and minimizing Cumulative Layout Shift.",
    "content": "Full markdown content goes here..."
  }
  ```
- **Response (201 Created):** Returns created post object with generated slug and reading time.

#### Update Post
- **PUT** `/api/posts/:id` *(Requires Auth — Author Only)*
- **Response (200 OK):** Returns updated post object.
- **Error (403 Forbidden):** If user is not the author of this post.

#### Delete Post
- **DELETE** `/api/posts/:id` *(Requires Auth — Author Only)*
- **Response (200 OK):** Post and cascading comments deleted.

---

### 3. Comments Endpoints

#### Get Comments by Post
- **GET** `/api/posts/:postId/comments`
- **Response (200 OK):** Returns array of comments sorted chronologically with author details.

#### Add Comment
- **POST** `/api/posts/:postId/comments` *(Requires Auth)*
- **Request Body:**
  ```json
  {
    "content": "Great architectural breakdown! Idempotency keys are crucial."
  }
  ```
- **Response (201 Created):** Returns newly created comment object with author information.

#### Delete Comment
- **DELETE** `/api/comments/:id` *(Requires Auth — Comment Author Only)*
- **Response (200 OK):** Deletes comment.
- **Error (403 Forbidden):** If logged-in user is not the comment creator.

---

## 🧪 Testing

Run direct controller unit & integration tests:
```bash
node server/utils/test_api.js
```
Expected output:
```text
🧪 Starting Direct Controller Integration Tests...
1. Login status: 200 Success: true
2. Current user: alex_chen Posts: 1
3. All posts count: 3
4. Create post status: 201 Post ID: 4
5. Add comment status: 201 Comment ID: 5
6. Delete comment status: 200 Success: true
7. Delete post status: 200 Success: true
8. Register status: 201 New user: test_dev_3049
🎉 ALL CONTROLLER LOGIC VALIDATED 100% SUCCESSFULLY!
```

---

## 🔒 Security Best Practices Implemented
- Passwords hashed using bcrypt with salt rounds.
- SQL injection prevention using parameterized prepared statements throughout.
- Foreign key constraints enabled to prevent orphaned comments on deleted posts.
- Route-level and controller-level authorization checks ensuring users cannot modify or delete content authored by others.
- Sanitized markdown rendering preventing raw script tag execution.
- CORS and rate-ready architecture.
