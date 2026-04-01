# calmapi

> Generated with [CalmAPI](https://calmapi.dev) — production-ready REST API framework.

## Getting Started

```bash
# Install dependencies
npm install

# Configure environment
# Edit .env with your MongoDB URI and secrets

# Start the server
npm start
```

The API runs at `http://localhost:5001` by default.

## Project Structure

```
src/
├── config.js           ← JWT secrets, custom settings
├── utils/              ← Your utility functions
├── plugins/            ← S3Upload + your custom plugins
└── modules/            ← Each folder = auto-discovered REST module
    ├── auth/           ← Authentication (login, register, JWT, OTP)
    ├── user/           ← User management
    ├── post/           ← Example CRUD module
    └── media/          ← File uploads (S3/MinIO)

system/                 ← Framework core (works out of the box)
```

## Adding a Module

```bash
calmapi generate module product
```

Creates `src/modules/product/` with controller, service, model, routes, DTO, and settings — all auto-wired.

## API Endpoints

### Auth

| Method | Endpoint                           | Auth | Description         |
| ------ | ---------------------------------- | ---- | ------------------- |
| POST   | `/api/auth/register`               | No   | Register a new user |
| POST   | `/api/auth/login`                  | No   | Login               |
| POST   | `/api/auth/refresh-token`          | No   | Refresh JWT         |
| DELETE | `/api/auth/logout`                 | Yes  | Logout              |
| POST   | `/api/auth/change-password`        | Yes  | Change password     |
| GET    | `/api/auth/profile`                | Yes  | Get profile         |
| PUT    | `/api/auth/profile`                | Yes  | Update profile      |
| POST   | `/api/auth/request-password-reset` | No   | Request OTP         |
| POST   | `/api/auth/password-reset`         | No   | Reset with OTP      |

### Posts (example CRUD)

| Method | Endpoint         | Auth | Description                  |
| ------ | ---------------- | ---- | ---------------------------- |
| GET    | `/api/posts`     | Yes  | List (paginated, searchable) |
| GET    | `/api/posts/:id` | Yes  | Get one                      |
| POST   | `/api/posts`     | Yes  | Create                       |
| PUT    | `/api/posts/:id` | Yes  | Update (owner only)          |
| DELETE | `/api/posts/:id` | Yes  | Delete (owner only)          |

### Query Parameters (all list endpoints)

```
?skip=0&limit=10                    Pagination
?sortBy[createdAt]=-1               Sort (1 = asc, -1 = desc)
?search=keyword                     Full-text search
?from=2025-01-01&to=2025-12-31     Date range filter
?title=Hello                        Field filter
```

## Environment Variables

See `.env` for all available settings. Key ones:

| Variable               | Description                                  | Default   |
| ---------------------- | -------------------------------------------- | --------- |
| `PORT`                 | Server port                                  | `5001`    |
| `MONGODB_URI`          | MongoDB connection string                    | —         |
| `JWT_SECRET`           | JWT signing key (required in prod)           | —         |
| `REFRESH_TOKEN_SECRET` | Refresh token signing key (required in prod) | —         |
| `ALLOWED_ORIGINS`      | CORS allowed origins (comma-separated)       | allow all |

## Docker

```bash
docker compose up          # dev with MongoDB
docker build -t my-api .   # production image
```

## Module Architecture

Each module follows the same pattern:

- **model.js** — Mongoose schema definition
- **service.js** — Business logic (extends `CalmService` for free CRUD)
- **controller.js** — HTTP handlers (extends `CalmController` for free endpoints)
- **dto.js** — Data Transfer Objects (shape input/output, strip sensitive fields)
- **route.js** — Express routes
- **settings.js** — Module config (custom route paths, etc.)

Override `populateFields`, `filterableFields`, `searchableFields`, and `ownerField` in your service to customize behavior without writing query logic.
