# Statement Analyzer — Architecture & Flow

This document describes the end‑to‑end Statement Analyzer core flow: uploading PDF statements, parsing via LLM, listing and viewing details, and conducting AI‑powered review.

## 1. Overview & Core UX

- **Page:** `/analyzer` (Statement Analyzer dashboard)
- **Steps:**
  1. Upload one or more PDF statements.
  2. Each upload creates a `Statement` record & triggers AI parsing.
  3. Statement list shows status (`UPLOADING` → `PROCESSING` → `COMPLETED`/`FAILED`).
  4. View parsed details or click “Review with AI” for single‑statement analysis.
  5. In chat, statements can also be reviewed collectively when no specific statement is selected.

## 2. Data Model (`prisma/schema.prisma`)

```prisma
model Statement {
  id               String   @id @default(uuid())
  userId           String
  fileName         String
  filePath         String
  status           StatementStatus
  brokerageCompany String?
  parsedData       Json?
  error            String?
  createdAt        DateTime @default(now())
}
```

## 3. API Endpoints

### 3.1 Upload & Parse

`POST /api/statement-upload`
- Accepts `{ filename: string, file: base64PDF }`.
- Saves PDF to `/public/statements`, records `Statement`, calls LLM parser, updates parsed data.
See implementation in `pages/api/statement-upload.ts`.

### 3.2 List Statements

`GET /api/statements` → returns `Statement[]` ordered newest first.
See `pages/api/statements/index.ts`.

### 3.3 Get Statement Detail

`GET /api/statements/:id` → returns one `Statement` including `parsedData`.
See `pages/api/statements/[id].ts`.

## 4. LLM Chat Integration

`POST /api/chat/stream`
- When `statementId` is provided, inject a single‑statement system prompt with parsed data.
- Otherwise, aggregate all completed statements into a holistic prompt.
Refer to `pages/api/chat/stream.ts` for prompt construction.

## 5. UI Components

- **Analyzer Page:** `pages/analyzer.tsx` (statement list, upload button).
- **Upload Modal:** `components/dashboard/StatementUploadModal.tsx` (PDF chooser & submit).
- **Detail View:** `pages/dashboard/statements/[id].tsx` (parsed JSON summary).
- **Review with AI:** invokes chat context (`openChat('statement', id)`).

## 6. Error Handling & Edge Cases

- Client & server validate only PDFs (10 MB limit in UI).
- LLM parse failures set `status: FAILED` with error in DB.
- Chat endpoint returns user‑friendly messages if statements are missing or unprocessed.

## 7. Testing & Validation

- Add unit tests for `analyzeWithGemini()` error paths.
- E2E test for upload → processing → view → chat review.

## 8. Future Enhancements

- Batch uploads / drag‑and‑drop multiple files.
- Pagination & filtering of statement history.
- Detailed UI for upload progress and retry on failures.