# Tech Stack

## Framework & Runtime

- **Nuxt 4.x**: Vue.js meta-framework for building applications
- **TypeScript 5.9.x**: Primary language with strict typing
- **Node.js**: Runtime environment (ESM modules)

## Core Dependencies

- **@nuxt/kit**: Nuxt module development utilities
- **BullMQ**: Redis-based queue library for job processing
- **ioredis**: Redis client for Node.js
- **defu**: Deep object merging utility
- **citty**: CLI framework for building command-line tools
- **consola**: Elegant console logger
- **pathe**: Universal path utilities

## Development Tools

- **Vitest**: Testing framework
- **ESLint**: Linting with @nuxt/eslint-config
- **vue-tsc**: TypeScript type checking for Vue components
- **@nuxt/module-builder**: Module bundling and build tooling

## Build System

- **Module Type**: ESM (type: "module")
- **Build Tool**: @nuxt/module-builder
- **Output**: `dist/` directory with `.mjs` and `.d.mts` files
- **CLI Binary**: `dist/cli.mjs` (executable)

## Common Commands

```bash
# Development
npm run dev:prepare    # Generate type stubs and prepare module
npm run dev            # Start playground dev server
npm run dev:build      # Build playground

# Workers
npx nuxt-queuekit worker  # Start worker process (separate from web server)

# Testing & Quality
npm run test           # Run tests once
npm run test:watch     # Run tests in watch mode
npm run test:types     # Type check module and playground
npm run lint           # Run ESLint

# Build & Release
npm run prepack        # Build module for distribution
npm run release        # Lint, test, build, and publish
```

## Configuration

### Redis Connection

Configure via environment variables or module options:
- `NUXT_REDIS_HOST`: Redis host (default: 127.0.0.1)
- `NUXT_REDIS_PORT`: Redis port (default: 6379)
- `NUXT_REDIS_PASSWORD`: Redis password
- `NUXT_REDIS_USERNAME`: Redis username
- `NUXT_REDIS_DB`: Redis database number (default: 0)

### Module Configuration

Configure in `nuxt.config.ts`:
```typescript
export default defineNuxtConfig({
  modules: ['nuxt-queuekit'],
  queue: {
    redis: {
      host: '127.0.0.1',
      port: 6379,
      password: 'your-password',
      db: 0,
    }
  }
})
```

## Running Workers

Workers run as a **separate process** independent of the Nuxt web server:

```bash
# Terminal 1: Start Nuxt web server
npm run dev

# Terminal 2: Start worker process
npx nuxt-queuekit worker
```

### Worker CLI Options

```bash
npx nuxt-queuekit worker --cwd <path>         # Set working directory
npx nuxt-queuekit worker --concurrency <num>  # Set concurrent jobs (default: 5)
```

## API Usage

### Client-side (Vue components)

```typescript
// Use the client composable - returns reactive refs
const queue = useQueue('default')

// One-liner with real-time monitoring
const { progress, status, result, error } = await queue.add('SendEmail', { 
  to: 'user@example.com' 
})

// progress, status, result, error are reactive refs that update automatically
watch(progress, (value) => {
  console.log(`Progress: ${value}%`)
})
```

### Server-side (API routes, server utils)

```typescript
// Use the server composable - returns BullMQ Queue instance
const queue = useServerQueue('default')
await queue.add('job-name', { data: 'value' })
```

## Architecture

### Two-Process Model

1. **Web Server (Nitro)**
   - Handles HTTP requests
   - Adds jobs to Redis queue
   - Provides API endpoints

2. **Worker Process (CLI)**
   - Long-running separate process
   - Consumes jobs from Redis queue
   - Independent lifecycle from web server
   - Can run multiple instances for scaling
