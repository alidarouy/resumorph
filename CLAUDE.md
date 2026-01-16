# CLAUDE.md - Guide pour Claude Code

Ce fichier aide Claude Code à comprendre le projet et à fournir une assistance pertinente.

## Vue d'ensemble

Application de suivi de candidatures (Job Application Tracker) avec :
- Interface Kanban pour les candidatures
- Assistant IA conversationnel (LangChain + Gemini)
- Génération de CV PDF
- Authentification Clerk

## Stack technique

| Catégorie | Technologie |
|-----------|-------------|
| Framework | TanStack Start (React 19) |
| Routing | TanStack Router (file-based) |
| Data fetching | TanStack Query |
| ORM | Drizzle |
| BDD | PostgreSQL |
| Auth | Clerk |
| IA | LangChain.js + Gemini |
| Styling | TailwindCSS + shadcn/ui |
| PDF | @react-pdf/renderer |

## Commandes utiles

```bash
bun run dev        # Serveur de développement
bun run build      # Build production
bun run db:push    # Appliquer le schéma à la BDD
bun run db:studio  # Interface visuelle Drizzle
```

## Architecture clé

### Server Functions (TanStack Start)
Les appels serveur utilisent `createServerFn` :
```typescript
export const myFunction = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: InputType }): Promise<OutputType> => {
    // Logique serveur
  }
);
```

### Repository Pattern
Tous les accès BDD passent par `app/server/repositories/` :
- `contacts.repository.ts`
- `companies.repository.ts`
- `applications.repository.ts`
- `conversations.repository.ts`

Interface type :
```typescript
interface IRepository<T> {
  findAll(userId: string): Promise<T[]>;
  findById(userId: string, id: string): Promise<T | null>;
  create(userId: string, data: NewT): Promise<T>;
  update(userId: string, id: string, data: Partial<T>): Promise<T | null>;
  delete(userId: string, id: string): Promise<void>;
}
```

### Agent IA (LangChain)

**Configuration LLM** (`app/server/agent/llm.ts`) :
```typescript
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
export const llm = new ChatGoogleGenerativeAI({
  model: "gemini-3-flash-preview",
});
```

**Tools** (`app/server/agent/tools/`) :
Chaque tool est créé avec une factory qui reçoit le `userId` :
```typescript
export const createMyTool = (userId: string) =>
  tool(
    async (args) => { /* logique */ },
    {
      name: "tool_name",
      description: "Description pour le LLM",
      schema: z.object({ /* Zod schema */ }),
    }
  );
```

**Streaming** (`app/server/agent/stream.ts`) :
- Utilise un générateur async (`async function*`)
- Filtre les métadonnées de function calls de Gemini
- Retourne une `Response` avec `ReadableStream` (SSE)

### Schéma BDD (`app/db/schema.ts`)

Tables principales :
- `experiences` - Expériences professionnelles
- `skills` - Compétences
- `experience_skills` - Relation N:N
- `companies` - Entreprises
- `contacts` - Contacts
- `job_applications` - Candidatures
- `conversations` - Historique des chats
- `messages` - Messages des conversations

### Routes (`app/routes/`)

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/profile` | Gestion du profil et expériences |
| `/applications` | Kanban des candidatures |
| `/assistant` | Chat IA |
| `/contacts` | Liste des contacts |
| `/cv` | Génération PDF |

## Patterns importants

### Ajout d'un nouveau tool IA

1. Créer le fichier dans `app/server/agent/tools/`
2. Exporter depuis `tools/index.ts`
3. Ajouter à `createTools()` dans `tools/index.ts`

### Ajout d'une nouvelle entité

1. Ajouter la table dans `app/db/schema.ts`
2. Exécuter `bun run db:push`
3. Créer le repository dans `app/server/repositories/`
4. Exporter depuis `repositories/index.ts`
5. (Optionnel) Créer les tools IA correspondants

### Composants UI

Utilise shadcn/ui. Les composants sont dans `app/components/ui/`.
Pour ajouter un composant : copier depuis shadcn et adapter.

## Points d'attention

### Gemini et streaming
Gemini envoie les tool calls complets (pas en chunks). Le content peut contenir du JSON brut des function calls qu'il faut filtrer :
```typescript
if (text.includes('"type":"functionCall"')) continue;
```

### TanStack Start Server Functions
- Retourner `Response` pour le streaming SSE
- Les types sont inférés, mais typer explicitement pour la clarté

### Clerk Auth
Le `userId` est récupéré via `useAuth()` côté client et passé aux server functions.

## Tests manuels

1. **Assistant** : "Liste mes candidatures" → doit appeler `list_applications`
2. **Kanban** : Drag & drop une carte → doit mettre à jour le statut
3. **CV** : Cliquer "Télécharger PDF" → doit générer le PDF

## Dépannage

### "Erreur de streaming"
- Vérifier `GOOGLE_API_KEY` dans `.env`
- Vérifier les logs serveur pour l'erreur exacte

### Tables non trouvées
```bash
bun run db:push
```

### Types Drizzle non à jour
Redémarrer le serveur de dev après modification du schéma.
