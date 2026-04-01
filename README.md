# CalmAPI

### Production-ready modular REST API generator using Node.js and MongoDB

![Calm API](https://repository-images.githubusercontent.com/352502404/d0e11c00-dce4-11eb-80de-9959e403a244)

[![npm version](https://badge.fury.io/js/calmapi.svg)](https://badge.fury.io/js/calmapi)
[![DeepScan grade](https://deepscan.io/api/teams/12352/projects/18169/branches/439384/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=12352&pid=18169&bid=439384)

Scaffold a fully working backend with auth, CRUD, file uploads, logging, and security defaults in under a minute. CalmAPI gives you code you own and can extend without hidden framework magic.

## Why CalmAPI?

- Controller, Service, Model architecture with DTO support
- JWT auth with refresh tokens and password reset via OTP
- Built-in User, Auth, Media, and sample Post modules
- CRUD with pagination, filtering, sorting, search, and date range queries
- File uploads with AWS S3 and MinIO support, including presigned uploads
- Structured error handling, rate limiting, Helmet, CORS, and input sanitization
- Docker-ready setup with health checks, graceful shutdown, and structured logging
- CLI module generator with automatic route discovery

## Quick Start

```bash
# Install globally
npm i -g calmapi

# Create a new project
calmapi

# Run it
cd my-project
npm start
```

Default server: `http://localhost:5001`

Included out of the box:

- Auth endpoints for register, login, logout, refresh token, password reset, and profile
- Post CRUD endpoints with pagination and query support
- Media upload endpoints for direct and presigned uploads
- Health check endpoint at `GET /health`

## Generate Modules

```bash
calmapi generate module product
```

Generated module structure:

```text
src/modules/product/
  product.controller.js
  product.service.js
  product.model.js
  product.route.js
  product.dto.js
  product.settings.js
```

Routes are auto-discovered, so the new CRUD endpoints work immediately:

```text
GET    /api/products
GET    /api/products/:id
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
```

Valid naming examples:

```bash
calmapi generate module product
calmapi generate module products
calmapi generate module productMeta
calmapi generate module ProductMeta
calmapi generate module product-meta
calmapi generate module test-series --force
```

## Built-In Features

- Production-ready project structure with `src/` for app code and `system/` for framework internals
- Base CRUD service and controller classes for fast module development
- Searchable and filterable list endpoints with safe field control
- Ownership checks, ID validation, and consistent API error responses
- Pino logging with readable development output
- `.env` support and configurable app settings
- Presigned upload flow, graceful shutdown, health checks, and security middleware included

## Project Structure

```text
my-project/
├── index.js
├── .env
├── package.json
├── Dockerfile
├── docker-compose.yml
├── src/
│   ├── config.js
│   ├── utils/
│   ├── plugins/
│   └── modules/
│       ├── auth/
│       ├── user/
│       ├── post/
│       └── media/
└── system/
  ├── core/
  ├── middleware.js
  ├── server.js
  ├── database.js
  └── routes/
```

Your app code lives in `src/`. The `system/` folder contains the reusable framework core, including the CRUD base classes, routing layer, middleware stack, cache, and response/error utilities.

Example query patterns:

```text
GET /api/posts?skip=0&limit=10
GET /api/posts?search=node&sortBy[createdAt]=-1
GET /api/posts?title=Hello&from=2025-01-01&to=2025-12-31
```

## Docker

```bash
docker compose up
```

For production:

```bash
docker build -t my-api .
docker run -p 5001:5001 --env-file .env my-api
```

## Contributors

- [Sunil Kr. Samanta](https://github.com/sunilksamanta)
- [Rajdip Mondal](https://github.com/RajdipM)

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Credits

[Thiago Pacheco](https://github.com/pachecoio) for the architectural inspiration.

## License

[MIT](LICENSE)
