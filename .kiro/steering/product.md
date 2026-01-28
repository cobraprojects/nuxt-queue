# Product Overview

**nuxt-queue** is a Nuxt module that provides background job queue functionality for Nuxt applications.

## Core Functionality

- Background job processing using Redis-backed queues
- Built on BullMQ for robust queue management
- Provides simple API for adding jobs and defining workers
- **Separate worker process** independent of web server lifecycle

## Key Components

- **Queues**: Redis-backed job queues using BullMQ
- **Workers**: Long-running processes that consume jobs from queues
- **Redis Integration**: Uses ioredis for Redis connection
- **CLI**: Separate command to run workers (`npx nuxt-queue worker`)
- **API**: HTTP endpoints for adding jobs and checking status

## Architecture

- **Web Server (Nitro)**: Handles HTTP requests, adds jobs to queue
- **Worker Process (CLI)**: Separate long-running process that processes jobs
- **Redis**: Message broker between web server and workers

## Use Cases

- Async task processing (emails, notifications, data processing)
- Background job scheduling
- Decoupled task execution in Nuxt applications
- Long-running tasks that shouldn't block HTTP requests
- Scalable job processing (run multiple worker processes)
