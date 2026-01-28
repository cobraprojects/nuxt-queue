# Project Structure

## Root Layout

```
nuxt-queue/
├── src/                    # Module source code
│   ├── cli/                # CLI commands
│   ├── runtime/            # Runtime code
│   ├── module.ts           # Module entry
│   └── cli.ts              # CLI entry
├── playground/             # Development playground app
├── test/                   # Test files
├── dist/                   # Build output (generated)
└── .nuxt/                  # Nuxt build artifacts (generated)
```

## Source Directory (`src/`)

```
src/
├── module.ts               # Main module entry point
├── cli.ts                  # CLI entry point
├── cli/
│   ├── index.ts            # CLI main command
│   └── worker.ts           # Worker command implementation
└── runtime/
    ├── plugin.ts           # Client-side plugin
    └── server/
        ├── api/            # API endpoints
        │   └── queue/      # Queue management endpoints
        └── utils/          # Server utilities
            ├── queue.ts    # Core queue/worker functions
            ├── composables.ts  # useQueue composable
            └── defineWorker.ts # Worker definition helper
```

### Module Entry (`src/module.ts`)

- Defines module metadata and configuration
- Configures Redis connection settings
- Registers server utilities and API routes
- Uses `@nuxt/kit` utilities for module setup

### CLI (`src/cli/`)

- **`index.ts`**: Main CLI command definition
- **`worker.ts`**: Worker command that starts long-running worker process
- Loads Nuxt config to get Redis settings
- Independent of Nitro server lifecycle

### Runtime Structure

- **`runtime/plugin.ts`**: Client-side plugin providing `$queue` API
- **`runtime/server/api/`**: API endpoints for queue operations
  - `POST /api/queue/add`: Add jobs to queue
  - `GET /api/queue/[queueName]/[jobId]`: Get job status
- **`runtime/server/utils/`**: Server-side utilities
  - `queue.ts`: Core BullMQ queue and worker management
  - `composables.ts`: `useQueue()` and `useQueueConnection()` composables
  - `defineWorker.ts`: Helper for defining custom workers

## Playground (`playground/`)

Development environment for testing the module:
- Minimal Nuxt app that imports the module
- Uses workspace linking (npm workspaces)
- Configuration in `playground/nuxt.config.ts`
- Demo UI in `playground/app.vue`

## Test Directory (`test/`)

```
test/
├── basic.test.ts           # Basic module tests
└── fixtures/
    └── basic/              # Test fixture apps
```

## Key Conventions

### File Naming

- TypeScript files use `.ts` extension (transpiled to `.mjs` during build)
- Type definitions output as `.d.mts`
- Server-side code lives in `runtime/server/`
- API routes follow Nuxt's file-based routing
- CLI commands in `cli/` directory

### Queue & Worker Definitions

- Use `useQueue(name)` to get/create a queue instance in server code
- Workers run via CLI: `npx nuxt-queue worker`
- Default worker processes jobs on the 'default' queue
- Workers are separate processes, not Nitro plugins

### Import Aliases

- `#app`: Nuxt app composables and utilities
- `#imports`: Nitro imports
- Module uses ESM imports throughout

### TypeScript Configuration

- Root `tsconfig.json` extends `.nuxt/tsconfig.json`
- Playground has its own TypeScript configuration

## Process Architecture

### Development

```bash
# Terminal 1: Web server
npm run dev

# Terminal 2: Workers
npx nuxt-queue worker
```

### Production

```bash
# Process 1: Web server
npm run build && npm run start

# Process 2: Workers (can run multiple)
npx nuxt-queue worker
npx nuxt-queue worker --concurrency 10
```
