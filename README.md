# Pocket Financial Advisor

Pocket Financial Advisor is a web application that provides personalized financial insights through AI-driven analysis and a natural language chat interface. It helps users optimize savings, investments, and retirement planning.

## Features

- Financial data input (assets, debts, expenses, insurance)
- Goal setting and tracking
- AI-driven insights via chat interface
- Visual dashboard with financial health metrics
- Secure authentication with multi-factor authentication

## Tech Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, Framer Motion
- **Backend:** Node.js (Next.js API routes), PostgreSQL with Prisma ORM
- **AI Integration:** Gemini 2.0 Pro API

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/pocket-financial-advisor.git
   cd pocket-financial-advisor
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/pocket_fa?schema=public"
   JWT_SECRET="your-super-secret-jwt-token"
   GEMINI_API_KEY="your-gemini-api-key"
   ```

4. Set up the database:
   ```
   npx prisma migrate dev
   ```

5. Start the development server:
   ```
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

- **Run linting:** `npm run lint`
- **Type checking:** `npm run typecheck`
- **Run tests:** `npm test`
- **Prisma Studio:** `npm run prisma:studio`

## Project Structure

```
├── components/       # React components
├── hooks/            # Custom React hooks
├── lib/              # Utility functions and libraries
├── pages/            # Next.js pages and API routes
├── prisma/           # Prisma schema and migrations
├── public/           # Static assets
├── styles/           # Global styles
└── utils/            # Helper functions
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.