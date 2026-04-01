## About this project

CalmAPI — production-ready modular REST API framework built with Node.js, Express, and MongoDB. Controller-Service-Model (CSM) architecture with auto-discovered modules. Built-in JWT auth, S3/MinIO file uploads, LRU caching, rate limiting, and structured error handling. Open-source developer tooling for CRUD-heavy backends.

## Tech stack

- Language: JavaScript (ES2022+), Node.js >=20
- Framework: Express 4.x
- Database: MongoDB via Mongoose 8.x ODM
- Auth: JWT (access + refresh tokens), bcrypt password hashing (cost 12)
- File uploads: AWS S3 / MinIO via `@aws-sdk/client-s3` + `multer`
- Caching: In-memory LRU (`CalmCache`) with TTL — not Redis
- Security: Helmet, express-rate-limit, CORS, input sanitization
- Logging: Pino + pino-http — not Winston or Morgan
- Linting: ESLint flat config — not TSLint
- Formatting: Prettier (semi, single quotes, no trailing comma, 2-space indent)
- Package manager: npm — not yarn or pnpm
- Container: Docker multi-stage Alpine build, non-root user, Tini

## Coding guidelines

### Critical rules — never violate

- Always `autoBind(this)` as last line in controller constructors — prevents `this` binding loss in Express handlers
- Always merge DTOs: `this.dto = { ...this.dto, ...moduleDTO }` — direct assignment overwrites parent defaults
- Always `Object.freeze(this)` at end of every DTO constructor — prevents mutation after creation
- Always `try { ... } catch (e) { next(e); }` in every controller method — no unhandled rejections
- Always extend parent classes: controllers → `CalmController`, services → `CalmService`
- Never query database directly in controllers — delegate to service methods
- Never expose `password`, `otp`, `otpExpiry`, `__v` in GetDTO
- Always remove undefined keys in UpdateDTO before freezing — enables partial updates

### Controller patterns

```javascript
// ✅ Correct constructor — merge DTOs, then autoBind
constructor(service) {
    super(service);
    this.dto = { ...this.dto, ...moduleDTO };
    autoBind(this);
}

// ✅ Override parent method — custom logic + super call
async insert(req, res, next) {
    try {
        req.body.createdBy = req.user._id;
        return super.insert(req, res, next);
    } catch (e) { next(e); }
}

// ✅ Custom method — same try/catch pattern
async getFeatured(req, res, next) {
    try {
        const items = await this.service.getFeatured(req.query.limit);
        res.sendCalmResponse(items.map(x => new this.dto.GetDTO(x)));
    } catch (e) { next(e); }
}

// ✅ Export singleton instance — not the class
module.exports = new ModuleController(moduleService);
```

### DTO patterns

```javascript
// GetDTO — whitelist exposed fields only
class GetDTO {
  constructor({ ...props }) {
    this._id = props._id;
    this.name = props.name;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
    Object.freeze(this);
  }
}

// UpdateDTO — remove undefined for partial updates
class UpdateDTO {
  constructor({ ...props }) {
    this.name = props.name;
    this.updatedBy = props.updatedBy;
    Object.keys(this).forEach(key => {
      if (this[key] === undefined) delete this[key];
    });
    Object.freeze(this);
  }
}

module.exports = { GetDTO, InsertDTO, UpdateDTO };
```

### Service rules

- Extend `CalmService`, define `populateFields` array for auto-population on `getAll()`/`get()`
- Pagination hard-capped at 100 items — never override server-side
- Use `.lean()` for read-only queries — skips Mongoose hydration for performance
- Put custom queries in service methods — controllers only call service methods

### Model rules

- Wrap `mongoose.model()` in try-catch inside `initSchema()` — handles hot-reload re-registration
- Use `select: false` on sensitive fields (passwords, OTPs) — excluded from queries by default
- Add indexes on frequently queried fields — compound indexes for multi-field filters
- Use `schema.pre('save')` for derived fields (slugs, hashes) — not controller logic
- Use `mongoose-unique-validator` plugin — turns duplicate key errors into validation errors

### Route rules

```javascript
// ✅ Specific routes BEFORE parameterized — Express matches first
router.get('/featured', Controller.getFeatured);
router.get('/:id', Controller.get);

// ✅ Public routes first, then auth middleware, then protected
router.get('/', Controller.getAll);
router.get('/:id', Controller.get);
router.use(AuthController.checkLogin);
router.post('/', Controller.insert);
router.put('/:id', Controller.update);
router.delete('/:id', Controller.delete);
```

- Use `AuthController.optionalCheckLogin` when auth is optional but `req.user` is useful

### Error handling

- Use `CalmError` for business errors — not raw `Error` or `throw new Error()`
- Types: `NOT_FOUND_ERROR` (404), `VALIDATION_ERROR` (422), `UNAUTHORIZED_ERROR` (401), `PERMISSION_DENIED_ERROR` (403), `CONFLICT_ERROR` (409), `BAD_REQUEST` (400), `RATE_LIMIT_ERROR` (429)
- Custom: `new CalmError('CUSTOM_ERROR', 'message', statusCode, { field: 'detail' })`

### Response format

- Always `res.sendCalmResponse(data, options)` — never `res.json()` directly
- Single: `res.sendCalmResponse(new this.dto.GetDTO(item))`
- List: `res.sendCalmResponse(items.map(x => new this.dto.GetDTO(x)), { totalCount })`
- Delete: `res.sendCalmResponse(data, { deleted: true })`

### Naming conventions

- Files: kebab-case (`post.controller.js`) — not camelCase or PascalCase
- Classes: PascalCase (`PostController`, `PostService`)
- Variables/methods: camelCase (`postService`, `getAll`)
- Mongoose models: lowercase singular (`'post'`, `'user'`) — not plural
- Module folders: lowercase singular matching the model name

### Security

- Never log PII (emails, passwords, tokens) — use user IDs only
- Passwords auto-hashed via bcrypt in pre-save hooks — never hash manually in controllers
- OTP comparison uses `crypto.timingSafeEqual` — prevents timing attacks
- Input sanitizer strips `$` operators and `__proto__` — do not disable
- Rate limits: 500 req/15min global, 10 req/15min on auth endpoints

### Performance

- Add indexes: `schema.index({ field: 1 })` for single, `schema.index({ a: 1, b: 1 })` for compound
- Use `.lean()` for read-only queries — returns plain objects, not Mongoose documents
- Select only needed fields: `.select('name email')` — reduces transfer size
- Always paginate: `?skip=0&limit=10` (max 100 enforced by CalmService)

## Project structure

```
src/
  config.js          JWT secrets, expiry, port overrides
  modules/           Feature modules (auto-discovered, 6 files each)
    auth/            Login, register, password reset, token refresh
    user/            User CRUD, password management, profiles
    post/            Example content module (CRUD + slugs)
    media/           S3/MinIO uploads, presigned URLs
  plugins/           Reusable integrations (S3Upload)
  utils/             Shared helpers (slugify)
system/
  core/              CalmController, CalmService, CalmDTO, CalmError, CalmCache, CalmResponse
  routes/            Auto-discovery router (api.js) + health check (health.js)
  middleware.js      Security, logging, CORS, rate limiting, error normalization
  server.js          Express app + middleware stack
  database.js        MongoDB connection with 5-retry exponential backoff
  config.js          Base config merged with src/config.js
  utils/             CLI output (cli.js), Pino logger (logger.js)
```

### Module convention (6 files required per module)

```
module-name/
  module-name.model.js       Mongoose schema + indexes + hooks
  module-name.service.js     Business logic extending CalmService
  module-name.controller.js  HTTP handlers extending CalmController
  module-name.dto.js         GetDTO, InsertDTO, UpdateDTO classes
  module-name.route.js       Express router with auth middleware
  module-name.settings.js    { moduleRoute: 'custom-path' } or empty {}
```

- Auto-discovered from `src/modules/` — no manual registration
- Route defaults to pluralized name (`post` → `/api/posts`), override via `moduleRoute`
- Generate with: `calmapi generate module modulename`

### Essential imports

```javascript
// Controller
const { CalmController } = require('../../../system/core/CalmController');
const autoBind = require('auto-bind');
// Service
const { CalmService } = require('../../../system/core/CalmService');
// Model
const mongoose = require('mongoose');
const { Schema } = mongoose;
// Errors
const { CalmError } = require('../../../system/core/CalmError');
```

## Build & test

- Install: `npm install`
- Dev: `npm start` (requires `.env` — copy `.env.sample`)
- Lint: `npm run lint` — fix before committing
- Lint fix: `npm run lint:fix`
- Format: `npm run format`
- Format check: `npm run format:check`
- Docker build: `docker build -t calmapi .`
- Docker run: `docker run -p 5001:5001 --env-file .env calmapi`
- Health: `GET /health` — DB, memory, CPU status

### Environment variables

- `MONGODB_URI` — required
- `JWT_SECRET`, `REFRESH_TOKEN_SECRET` — required in production
- `JWT_EXPIRY=900`, `REFRESH_TOKEN_EXPIRY=604800` — seconds
- `ALLOWED_ORIGINS` — comma-separated CORS origins
- `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`, `BUCKET_NAME`, `REGION` — S3/MinIO
- `S3_ENDPOINT` — MinIO only
- `PORT=5001`, `NODE_ENV=development`, `LOG_LEVEL=info`

### Built-in API endpoints

- `POST /api/auth/login` — email + password login
- `POST /api/auth/register` — new user registration
- `POST /api/auth/refresh-token` — rotate JWT pair
- `POST /api/auth/request-password-reset` — generate OTP
- `POST /api/auth/password-reset` — reset via OTP
- `DELETE /api/auth/logout` — invalidate token (auth)
- `POST /api/auth/change-password` — change password (auth)
- `GET /api/auth/profile` — current user (auth)
- `PUT /api/auth/profile` — update profile (auth)
- `POST /api/media` — upload file (auth, multipart)
- `POST /api/media/presigned-upload` — S3 presigned upload URL
- `POST /api/media/presigned-download/:id` — S3 presigned download URL
- `DELETE /api/media/:id` — delete from S3 + DB (auth)

### Query parameters (all list endpoints)

- Pagination: `?skip=0&limit=10` (max 100)
- Sorting: `?sortBy[field]=1` (1=asc, -1=desc; default: createdAt desc)
- Filters: `?status=active&category=tech`
- Range: `?price[$gte]=100&price[$lte]=1000`

### Debugging

- Check startup module table for loaded/skipped/failed modules
- `"Cannot read property 'getAll' of undefined"` → forgot `autoBind(this)`
- `"DTO is not a constructor"` → check exports: `module.exports = { GetDTO, InsertDTO, UpdateDTO }`
- Routes not matching → check route order (specific before `/:id`) and middleware order
