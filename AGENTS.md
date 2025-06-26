# Pocket Financial Advisor: Refactor and Enhancement Plan

## 1. Overview

This document outlines the development plan to address key issues in the Pocket Financial Advisor application. The plan is divided into three phases, prioritized to tackle the most critical items first: **Security & Critical Bug Fixes**, followed by **Core Functionality & UX Improvements**, and concluding with ongoing **Code Quality & Maintenance**.

---

## Phase 1: Security & Critical Bug Fixes (Highest Priority)

### Task 1.1: Secure Statement File Handling

* **Objective:** Prevent orphaned PDF files from persisting on the server after processing.
* **Affected Files:**
    * `pages/api/statement-upload.ts`
* **Implementation Plan:**
    1.  In the `processStatementInBackground` function, add a `finally` block to the `try...catch` statement.
    2.  Inside the `finally` block, add a call to `fs.promises.unlink(filePath)` to ensure the temporary PDF file is deleted regardless of whether the processing succeeds or fails.
    3.  Add logging to confirm file deletion or to catch any errors during the cleanup process.

### Task 1.2: Redact Personally Identifiable Information (PII)

* **Objective:** Minimize the storage of sensitive user data by redacting PII from the `parsedData` JSON object before it is saved to the database.
* **Affected Files:**
    * `pages/api/statement-upload.ts`
* **Implementation Plan:**
    1.  **Prompt Engineering:** Modify the Gemini prompt in `analyzeWithGemini` to explicitly instruct the model to redact personal information. Add the following instruction: *"IMPORTANT: For privacy, redact all personal names and use only the last 4 digits of any account numbers in the final JSON output."*
    2.  **Backend Verification:** After receiving the JSON from Gemini but *before* calling `prisma.statement.update`, implement a server-side function to manually scrub the `parsedData` object. This function should iterate through the object and remove or mask fields like `account_holder`. This acts as a reliable fallback.
    3.  **Database Encryption (Stretch Goal):** Research and consider implementing application-level encryption for the `parsedData` field to provide an additional layer of security.

### Task 1.3: Fix and Persist User Profile Data

* **Objective:** Ensure user age and retirement goals are correctly saved during onboarding and are used to provide context in all subsequent AI chat interactions.
* **Affected Files:**
    * `pages/profile/setup.tsx`
    * `pages/api/profile/index.ts`
    * `pages/api/chat/stream.ts`
    * `hooks/useAuth.tsx`
* **Implementation Plan:**
    1.  **Verify API:** Confirm that the `handleSubmit` function in `pages/profile/setup.tsx` correctly calls the `/api/profile` endpoint and that the `age` and `retirementAge` are persisted in the `Profile` table.
    2.  **Enrich Chat Context:** In `pages/api/chat/stream.ts`, modify the logic that builds the `systemPrompt`. Before creating the prompt, fetch the user's profile using `prisma.profile.findUnique({ where: { userId } })`.
    3.  **Update System Prompt:** If a profile exists, inject the user's age, retirement age, and risk tolerance directly into the system prompt. For example: *"The user is ${profile.age} years old, plans to retire at ${profile.retirementAge}, and has a '${profile.riskTolerance}' risk tolerance. Use this information to tailor your financial advice."*
    4.  **Update Auth Hook:** In `hooks/useAuth.tsx`, modify the `login` and `register` functions to also fetch and store the user's profile data in the `user` state object, making it available globally.

---

## Phase 2: Core Functionality & UX Improvements

### Task 2.1: Implement Real-Time Status Updates for Statement Processing

* **Objective:** Replace the inefficient client-side polling on the `/analyzer` page with a real-time, push-based system using Server-Sent Events (SSE).
* **Implementation Plan:**
    1.  **Create SSE Endpoint:** Create a new API route at `pages/api/statements/status.ts`. This endpoint will be responsible for holding open a connection to the client.
    2.  **Event Emitter:** Implement a simple in-memory event emitter (or a more robust solution like Redis pub/sub for scalability) that can be accessed by both the `statement-upload` and `statements/status` APIs.
    3.  **Server-Side Push:** In `pages/api/statement-upload.ts`, after `processStatementInBackground` completes, use the event emitter to broadcast a message with the `statementId` and the final `status` ('COMPLETED' or 'FAILED').
    4.  **Client-Side Subscription:** In `pages/analyzer.tsx`, remove the `useEffect` hook that uses `setInterval`. Instead, use the `EventSource` API to connect to `/api/statements/status`.
    5.  **Dynamic UI Update:** In the `onmessage` handler for the EventSource, update the local state of the `statements` array with the new status for the specific `statementId` received from the server. This will cause React to re-render the updated status dynamically.

### Task 2.2: Redesign Chat as a Side Panel

* **Objective:** Improve the chat UX by converting the floating modal into a permanent, collapsible side panel and adding suggested questions to guide users.
* **Affected Files:**
    * `components/layout/DashboardLayout.tsx`
    * `components/dashboard/ChatInterface.tsx`
    * `lib/financial-assistant-context.tsx`
* **Implementation Plan:**
    1.  **Update Layout:** Modify `DashboardLayout.tsx` to use a CSS grid or flexbox layout that includes a main content area and a right-hand sidebar for the chat.
    2.  **Move Chat Component:** Relocate the `<ChatInterface />` component from its floating position into the new sidebar.
    3.  **Manage State:** The open/closed state of the sidebar should be managed globally in the `FinancialAssistantProvider`. Add a function like `toggleChat()` to the context.
    4.  **Add Toggle Button:** Add a button to the `Navbar` to call `toggleChat()`. The button's icon should change based on the chat's open/closed state.
    5.  **Implement Suggested Questions:** In `ChatInterface.tsx`, define an array of starter questions. Render these as clickable buttons or "chips" within the chat UI. When a user clicks one, it should populate the input field and trigger the `handleSendMessage` function.

### Task 2.3: Enhance Statement Parsing for Fees

* **Objective:** Explicitly identify and extract data on financial fees during the statement parsing process.
* **Affected Files:**
    * `pages/api/statement-upload.ts`
    * `prisma/schema.prisma` (Optional but Recommended)
* **Implementation Plan:**
    1.  **Update Prompt & Schema:** In the `analyzeWithGemini` function, add a `fees_summary` object to the example JSON schema in the prompt.
        ```json
        "fees_summary": {
          "total_fees": "number",
          "management_fees": "number | null",
          "transaction_fees": "number | null"
        }
        ```
    2.  **Add Instruction:** Add a new instruction to the prompt: *"You MUST carefully scan the document for any mention of fees, including management fees, administrative fees, or transaction costs. Sum them up and populate the `fees_summary` object. If no fees are found, return 0 for `total_fees`."*
    3.  **Update Database (Optional):** To enable easier querying and display, consider adding a `totalFees` field of type `Float` to the `Statement` model in `prisma/schema.prisma`. Populate this field from `parsedData.fees_summary.total_fees` when the statement is updated.

---

## Phase 3: Code Quality & Maintenance (Ongoing)

### Task 3.1: Systematically Eliminate Type and Lint Errors

* **Objective:** Achieve a fully type-safe and lint-compliant codebase by methodically refactoring files to remove `any` types and TypeScript ignores.
* **Affected Files:** Primarily `pages/**/*.tsx`, `components/**/*.tsx`, `hooks/useAuth.tsx`.
* **Implementation Plan:**
    1.  **Configure Stricter Rules:** In `.eslintrc.json`, change the rule for `@typescript-eslint/no-explicit-any` from `"warn"` to `"error"`.
    2.  **Create a Tracking List:** Generate a list of all files containing `// @ts-nocheck`, `// @ts-expect-error`, or using the `any` type.
    3.  **Refactor Incrementally:** Tackle one file at a time, starting with the simplest. For each file:
        * Define and export proper TypeScript `type` or `interface` for all props, state, and API payloads.
        * Remove any TypeScript "ignore" comments.
        * Fix all resulting errors until the file is compliant.
    4.  **Final Goal:** Once all files are clean, set `ignoreBuildErrors: false` in `next.config.js` and ensure the project builds successfully.
