# Quality Assurance

## Must rules to follow
- never use any as a type
- always remove unused imports

## Pre-Completion Checklist

Before finishing any task, you MUST run the following checks:

### 1. Type Checking

```bash
npm run test:types
```

This runs TypeScript type checking for both the module and playground. All type errors must be resolved.

### 2. Linting

```bash
npm run lint
```

This runs ESLint to check code style and catch potential issues. All linting errors must be fixed.

### 3. Tests (when applicable)

```bash
npm run test
```

Run tests to ensure functionality hasn't broken. All tests must pass.

## Why This Matters

- **Type Safety**: TypeScript errors can cause runtime issues and poor developer experience
- **Code Quality**: ESLint catches common mistakes and enforces consistent style
- **Reliability**: Tests ensure features work as expected

## Common Issues

### Type Errors

- Missing type annotations
- Incorrect type assertions
- Nullable values not handled properly
- Missing imports

### Linting Errors

- Unused variables (prefix with `_` if intentional)
- Trailing spaces
- Using `any` type (provide specific types)
- Unsafe function types

## Quick Fixes

Most linting issues can be auto-fixed:

```bash
npm run lint -- --fix
```

## Integration

These checks are also run in CI/CD pipelines, so fixing them locally saves time and prevents failed builds.
