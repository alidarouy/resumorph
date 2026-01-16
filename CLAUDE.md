# CLAUDE.md - Guide for Claude Code

This file helps Claude Code understand the project and provide relevant assistance.

## Important Rules

- **All code and files must be in English** (variable names, comments, documentation, commits)
- Only user-facing UI text can be in French

## Overview

Job Application Tracker with:
- Kanban board for applications
- AI conversational assistant (LangChain + Gemini)
- PDF CV generation
- Clerk authentication

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | TanStack Start (React 19) |
| Routing | TanStack Router (file-based) |
| Data fetching | TanStack Query |
| ORM | Drizzle |
| Database | PostgreSQL |
| Auth | Clerk |
| AI | LangChain.js + Gemini |
| Styling | TailwindCSS + shadcn/ui |
| PDF | @react-pdf/renderer |

## Useful Commands

```bash
bun run dev        # Development server
bun run build      # Production build
bun run db:push    # Apply schema to database
bun run db:studio  # Drizzle visual interface
```

## Key Architecture

### Server Functions (TanStack Start)
Server calls use `createServerFn`:
```typescript
export const myFunction = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: InputType }): Promise<OutputType> => {
    // Server logic
  }
);
```

### Repository Pattern
All database access goes through `app/server/repositories/`:
- `contacts.repository.ts`
- `companies.repository.ts`
- `applications.repository.ts`
- `conversations.repository.ts`

Type interface:
```typescript
interface IRepository<T> {
  findAll(userId: string): Promise<T[]>;
  findById(userId: string, id: string): Promise<T | null>;
  create(userId: string, data: NewT): Promise<T>;
  update(userId: string, id: string, data: Partial<T>): Promise<T | null>;
  delete(userId: string, id: string): Promise<void>;
}
```

### AI Agent (LangChain)

**LLM Configuration** (`app/server/agent/llm.ts`):
```typescript
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
export const llm = new ChatGoogleGenerativeAI({
  model: "gemini-3-flash-preview",
});
```

**Tools** (`app/server/agent/tools/`):
Each tool is created with a factory that receives the `userId`:
```typescript
export const createMyTool = (userId: string) =>
  tool(
    async (args) => { /* logic */ },
    {
      name: "tool_name",
      description: "Description for the LLM",
      schema: z.object({ /* Zod schema */ }),
    }
  );
```

**Streaming** (`app/server/agent/stream.ts`):
- Uses async generator (`async function*`)
- Filters Gemini function call metadata
- Returns a `Response` with `ReadableStream` (SSE)

### Database Schema (`app/db/schema.ts`)

Main tables:
- `experiences` - Professional experiences
- `skills` - Skills
- `experience_skills` - N:N relationship
- `companies` - Companies
- `contacts` - Contacts
- `job_applications` - Job applications
- `conversations` - Chat history
- `messages` - Conversation messages

### Routes (`app/routes/`)

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/profile` | Profile and experiences management |
| `/applications` | Applications Kanban board |
| `/assistant` | AI Chat |
| `/contacts` | Contacts list |
| `/cv` | PDF generation |

## Important Patterns

### Adding a new AI tool

1. Create file in `app/server/agent/tools/`
2. Export from `tools/index.ts`
3. Add to `createTools()` in `tools/index.ts`

### Adding a new entity

1. Add table in `app/db/schema.ts`
2. Run `bun run db:push`
3. Create repository in `app/server/repositories/`
4. Export from `repositories/index.ts`
5. (Optional) Create corresponding AI tools

### UI Components

Uses shadcn/ui. Components are in `app/components/ui/`.
To add a component: copy from shadcn and adapt.

## Development Best Practices

- **Minimal changes**: Focus on the specific issue and make the smallest possible changes
- **Readable code**: Write clear, understandable code that is easy to review
- **Semantic commits**: Follow conventional commit format (`feat:`, `fix:`, `docs:`, `test:`, `chore:`)
- **Verify before commit**: Always run `bun run build` to check the code compiles

## Important Notes

### Gemini and streaming
Gemini sends complete tool calls (not in chunks). Content may contain raw JSON from function calls that must be filtered:
```typescript
if (text.includes('"type":"functionCall"')) continue;
```

### TanStack Start Server Functions
- Return `Response` for SSE streaming
- Types are inferred, but type explicitly for clarity

### Clerk Auth
The `userId` is retrieved via `useAuth()` on client side and passed to server functions.

## Manual Tests

1. **Assistant**: "List my applications" → should call `list_applications`
2. **Kanban**: Drag & drop a card → should update status
3. **CV**: Click "Download PDF" → should generate PDF

## Troubleshooting

### "Streaming error"
- Check `GOOGLE_API_KEY` in `.env`
- Check server logs for exact error

### Tables not found
```bash
bun run db:push
```

### Drizzle types not up to date
Restart dev server after schema modification.
