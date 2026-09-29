# Group Study Management System

A full-stack web application that allows college students to create and join subject-based study groups and collaborate through a shared message board. Admins can monitor platform activity and manage users and groups.

---

## 📌 Project Overview

| Feature | Details |
|---|---|
| Student registration & login | Role-based auth with JWT |
| Create study groups | Name + subject, creator auto-joins |
| Join any group | One-click join; no duplicate membership |
| Message board | Real-time feel via 5-second polling |
| Admin dashboard | Stats, user management, group management |
| Cascade delete | Deleting a user removes them from groups; deleting a group removes all messages |

---

## 🛠 Tech Stack

| Tool | Why |
|---|---|
| **Node.js + Express** | Lightweight, fast HTTP server; huge ecosystem |
| **MongoDB + Mongoose** | Flexible document store; Mongoose gives schema validation and `.populate()` for joins |
| **bcryptjs** | Industry-standard password hashing |
| **jsonwebtoken** | Stateless auth — the server doesn't need to store sessions |
| **dotenv** | Keeps secrets out of source code |
| **cors** | Allows the browser to call the API (needed during dev) |
| **Plain HTML/CSS/JS** | Zero build step, easy to understand and explain in an interview |

---

## 📁 Folder Structure

```
group-study-system/
├── server.js                  # Entry point — Express setup, routes, static serving
├── package.json
├── .env.example               # Template for environment variables
├── .gitignore
│
├── config/
│   └── db.js                  # Mongoose connection helper
│
├── models/
│   ├── User.js                # User schema (name, email, password hash, role)
│   ├── Group.js               # Group schema (name, subject, creator, members[])
│   └── Message.js             # Message schema (group ref, sender ref, text)
│
├── middleware/
│   ├── auth.js                # JWT verification → req.user
│   ├── role.js                # Role-based access control factory
│   └── errorHandler.js        # Central error → clean JSON response
│
├── controllers/
│   ├── authController.js      # register, login
│   ├── groupController.js     # CRUD + join logic
│   ├── messageController.js   # Get + post messages (member-only)
│   └── adminController.js     # Stats, user/group management
│
├── routes/
│   ├── authRoutes.js          # POST /api/auth/*
│   ├── groupRoutes.js         # /api/groups/* (JWT protected)
│   └── adminRoutes.js         # /api/admin/* (JWT + admin role)
│
├── scripts/
│   └── seedAdmin.js           # Creates demo accounts + sample group
│
└── public/                    # Served as static files by Express
    ├── register.html
    ├── login.html
    ├── student-dashboard.html
    ├── group.html
    ├── admin-dashboard.html
    ├── css/
    │   └── style.css          # Complete design system (dark theme, CSS variables)
    └── js/
        ├── api.js             # Fetch helper + auth guards + toast notifications
        ├── auth.js            # Register/login form handlers
        ├── dashboard.js       # Student dashboard logic
        ├── group.js           # Message board + polling
        └── admin.js           # Admin dashboard logic
```

---

## ⚙️ Local Setup

### Prerequisites
- Node.js 18+
- A MongoDB Atlas cluster (free tier works fine)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/group-study-system.git
cd group-study-system

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Open .env and fill in MONGO_URI and JWT_SECRET

# 4. Seed the database with demo accounts
npm run seed

# 5. Start the server
npm start

# For development (auto-restart on file changes)
npm run dev
```

Open your browser at **http://localhost:5000**

---

## 🔐 Test Credentials (created by seed script)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@studygroup.com | admin123 |
| Student | alice@studygroup.com | alice123 |
| Student | bob@studygroup.com | bob123 |

> The seed script also creates a sample group "Mathematics Study Circle" with Alice and Bob as members and two sample messages.

---

## 🌐 API Endpoints

### Auth (public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login → returns JWT + user |

### Groups (JWT required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/groups` | All groups (with isMember + memberCount) |
| POST | `/api/groups` | Create group (creator auto-joins) |
| GET | `/api/groups/mine` | Groups the current user belongs to |
| GET | `/api/groups/:id` | Group details + members (members only) |
| POST | `/api/groups/:id/join` | Join a group |
| GET | `/api/groups/:id/messages` | All messages (members only) |
| POST | `/api/groups/:id/messages` | Post a message (members only) |

### Admin (JWT + admin role)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Platform stats |
| GET | `/api/admin/users` | All users |
| DELETE | `/api/admin/users/:id` | Delete user + remove from groups |
| GET | `/api/admin/groups` | All groups |
| DELETE | `/api/admin/groups/:id` | Delete group + all its messages |

### Response format
Every endpoint returns:
```json
{ "success": true, "message": "...", "data": { ... } }
```

---

## 🛡 Business Rules & Edge Cases

| Scenario | Behavior |
|----------|----------|
| Join group already in | 409 "You are already a member of this group" |
| Non-member views group | 403 "You must join this group to view the message board" |
| Non-member posts message (API) | 403 "Only group members can post messages" |
| Empty/whitespace message | 400 "Message cannot be empty" |
| Empty group name or subject | 400 validation error |
| Duplicate email on register | 409 "An account with that email already exists" |
| Wrong login credentials | 401 generic message (doesn't reveal which field failed) |
| Invalid/non-existent ObjectId | 400/404 — never a server crash |
| Expired/missing token | 401 → frontend redirects to login |
| Admin deletes own account | 400 "You cannot delete your own admin account" |

---

## 🚀 Deployment on Render + MongoDB Atlas

### MongoDB Atlas
1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database user (username + password)
3. Whitelist `0.0.0.0/0` (all IPs) in Network Access
4. Copy the connection string → replace `<username>` and `<password>`

### Render
1. Push your code to GitHub (see commands below)
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Set the following:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
5. Add environment variables in Render dashboard:

| Variable | Value |
|----------|-------|
| `MONGO_URI` | Your Atlas connection string |
| `JWT_SECRET` | A long random string (use a password generator) |
| `PORT` | Leave blank (Render sets this automatically) |

6. Click **Deploy** — Render will build and start the service.
7. After deploy, run the seed script once locally (pointing to production Atlas URI).

### Commands to push to GitHub
```bash
cd group-study-system
git init
git add .
git commit -m "Initial commit: Group Study Management System"
git branch -M main
git remote add origin https://github.com/<your-username>/group-study-system.git
git push -u origin main
```

---

## 📸 Screenshots

> _Add screenshots here after running the application._

- [ ] Login page
- [ ] Student dashboard (group cards)
- [ ] Group message board
- [ ] Admin dashboard (stats + tables)

---

## 🔮 Future Improvements

The codebase is modular and clean, so the following features can be added without rewriting existing code:

- **Real-time messaging** — swap polling for WebSocket (Socket.IO) in `group.js` and add a Socket.IO server alongside Express
- **File uploads** — add Multer middleware and an AWS S3 integration for sharing study materials
- **Study session scheduling** — add a `Session` model and calendar UI component
- **Notifications** — add a `Notification` model; poll `/api/notifications` alongside messages
- **Search & tags** — add tag arrays to the `Group` model and a full-text search index in MongoDB
- **Pagination** — add `?page=` and `?limit=` query params to list endpoints
- **Email verification** — add Nodemailer + a `verified` flag on the `User` model
