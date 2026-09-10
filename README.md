# JD Ops Desk

A local-first Melbourne operations desk built for managing bookkeeping, BAS/IAS, payment runs, and client obligations with offline IndexedDB persistence.

## Features & Stack

- **Local-First & Offline Capable**: Data is stored locally in IndexedDB with snapshot import/export capabilities.
- **Melbourne Business Logic**: Workstream schedules, BAS/IAS tracking, supplier payment runs, and weekly bookkeeping cadences tuned for Melbourne timezone operation.
- **Tech Stack**:
  - [TypeScript](https://www.typescriptlang.org/)
  - [React 19](https://react.dev/) & [TanStack Router](https://tanstack.com/router)
  - [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
  - [Vite](https://vitejs.dev/) & [Tailwind CSS](https://tailwindcss.com/)

## Getting Started

### Prerequisites

- Node.js 22+
- npm

### Installation & Development

```bash
# Install dependencies
npm ci

# Start development server (runs on http://localhost:8080)
npm run dev
```

### Testing & Verification

```bash
# Run TypeScript type check
npm run typecheck

# Run unit tests
npm test
```
