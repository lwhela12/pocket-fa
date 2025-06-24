# Pocket Financial Advisor - Development Guide

## Project Overview
This is a financial advisor app targeted at young professionals (25-45) that provides personalized financial insights through AI-driven analysis and a natural language chat interface. It helps users optimize savings, investments, and retirement planning.

## Technology Stack
- **Frontend:** React/Next.js with TypeScript, Tailwind CSS, Framer Motion, shadcn/ui
- **Backend:** Node.js with Express, PostgreSQL with Prisma ORM
- **Statement Analyzer:** See [docs/STATEMENT_ANALYZER.md](docs/STATEMENT_ANALYZER.md)
- **AI Integration:** Gemini 2.0 Pro API for document analysis and financial insights

## Build & Test Commands
- **Install Dependencies:** `npm install`
- **Start Development Server:** `npm run dev`
- **Build for Production:** `npm run build`
- **Run Tests:** `npm test`
- **Run Single Test:** `npm test -- -t "test name"`
- **Lint Code:** `npm run lint`
- **Type Check:** `npm run typecheck`
- **End-to-End Tests:** `npm run cypress`

## Code Style Guidelines
- **Naming Conventions:** camelCase for variables/functions, PascalCase for components, UPPER_SNAKE_CASE for constants
- **File Structure:** Components in `/components`, pages in `/pages`, API in `/app/api`
- **State Management:** Zustand for global state, React Query for server state
- **Error Handling:** Try/catch blocks with user-friendly messages, structured error logging
- **Types:** Strict TypeScript, avoid `any` type, use interfaces for complex objects
- **Styling:** Follow design system in the documentation (colors, spacing, typography)
- **Accessibility:** WCAG 2.1 compliant, screen reader compatible, keyboard navigation
- **Testing:** Unit tests for financial calculations, integration tests for API endpoints

## Git Workflow
- **Branches:** Use prefixes like `feature/`, `fix/`, `refactor/`
- **Commits:** Descriptive messages, frequent small commits
- **PRs:** Required with code reviews before merging

## Security Standards
- **Authentication:** MFA via SMS or authenticator apps, Argon2 for password hashing
- **Encryption:** AES-256 for data at rest, HTTPS/TLS 1.3 for data in transit
- **Sessions:** Short-lived JWT tokens (30 min), refresh tokens for 7 days
- **Compliance:** GDPR and CCPA standards for user data

## UI Design Principles
- **Colors:** Primary #2196F3, Secondary #00CC00, Error #D32F2F, Neutral #E0E0E0
- **Typography:** 16px base size, 1.5 line height, Roboto font
- **Spacing:** 8px grid system for margins and padding
- **Responsiveness:** Mobile-first approach with breakpoints at 768px and 1024px