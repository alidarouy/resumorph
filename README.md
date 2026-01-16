# Resumorph

Job application tracker with integrated AI assistant.

## Tech Stack

- **Frontend**: React 19, TanStack Router, TanStack Query, TailwindCSS
- **Backend**: TanStack Start (server functions), Drizzle ORM
- **Database**: PostgreSQL
- **Auth**: Clerk
- **AI**: LangChain.js + Google Gemini (gemini-3-flash-preview)
- **PDF**: @react-pdf/renderer

## Prerequisites

- Node.js >= 22.12.0
- Bun (recommended) or npm
- PostgreSQL
- Clerk account (auth)
- Google AI API key (Gemini)

## Installation

```bash
# Clone the project
git clone https://github.com/alidarouy/resumorph.git
cd resumorph

# Install dependencies
bun install

# Configure environment variables
cp .env.example .env
```

## Environment Variables

Create a `.env` file at the root:

```env
# PostgreSQL Database
DATABASE_URL=postgresql://user:password@localhost:5432/jobtracker

# Clerk (authentication)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Google AI (Gemini)
GOOGLE_API_KEY=...
```

## Scripts

```bash
# Development
bun run dev

# Production build
bun run build

# Run in production
bun run start

# Database
bun run db:push      # Apply schema
bun run db:generate  # Generate migrations
bun run db:migrate   # Run migrations
bun run db:studio    # Drizzle Studio interface
```

## Project Structure

```
app/
├── components/          # React components
│   ├── ui/             # UI components (shadcn)
│   └── CVDocument.tsx  # PDF CV template
├── db/
│   ├── index.ts        # Drizzle client
│   └── schema.ts       # Database schema
├── routes/
│   ├── __root.tsx      # Root layout
│   ├── index.tsx       # Home page
│   ├── applications.tsx # Applications Kanban
│   ├── assistant.tsx   # AI chat
│   ├── contacts.tsx    # Contacts management
│   ├── cv.tsx          # CV generation
│   └── profile.tsx     # User profile
├── server/
│   ├── agent/          # LangChain AI agent
│   │   ├── agent.ts    # Agent logic (non-streaming)
│   │   ├── stream.ts   # Response streaming
│   │   ├── llm.ts      # LLM configuration
│   │   ├── tools/      # Agent tools
│   │   └── index.ts    # Server functions
│   ├── repositories/   # Data access layer
│   └── functions.ts    # Business server functions
└── lib/
    └── utils.ts        # Utilities (cn, etc.)
```

## Features

### Applications Kanban
- Drag & drop between columns (Draft, Applied, Interview, etc.)
- Add/edit applications
- Link with companies and contacts

### AI Assistant
- Streaming chat with Gemini
- Natural language management of contacts, companies and applications
- User CV context integrated
- Persisted conversation history

### CV Generation
- Professional PDF template
- Export based on profile experiences

### Profile
- Professional experiences management
- Skills associated with experiences

## Architecture

### Repository Pattern
Database access goes through repositories (`app/server/repositories/`) that encapsulate Drizzle queries.

### AI Agent
The agent uses LangChain with tools to interact with data:
- `add_contact`, `list_contacts`
- `add_company`, `list_companies`
- `add_application`, `list_applications`, `update_application`

Streaming is handled via SSE to display responses in real-time.

### Server Functions
TanStack Start allows defining server functions callable from the client via `createServerFn`.

## License

MIT
