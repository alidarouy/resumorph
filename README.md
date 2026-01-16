# Job Application Tracker

Application de suivi de candidatures avec assistant IA intégré.

## Stack Technique

- **Frontend**: React 19, TanStack Router, TanStack Query, TailwindCSS
- **Backend**: TanStack Start (server functions), Drizzle ORM
- **Base de données**: PostgreSQL
- **Auth**: Clerk
- **IA**: LangChain.js + Google Gemini (gemini-3-flash-preview)
- **PDF**: @react-pdf/renderer

## Prérequis

- Node.js >= 22.12.0
- Bun (recommandé) ou npm
- PostgreSQL
- Compte Clerk (auth)
- Clé API Google AI (Gemini)

## Installation

```bash
# Cloner le projet
git clone <repo-url>
cd sand

# Installer les dépendances
bun install

# Configurer les variables d'environnement
cp .env.example .env
```

## Variables d'environnement

Créer un fichier `.env` à la racine :

```env
# Base de données PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/jobtracker

# Clerk (authentification)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Google AI (Gemini)
GOOGLE_API_KEY=...
```

## Scripts

```bash
# Développement
bun run dev

# Build production
bun run build

# Lancer en production
bun run start

# Base de données
bun run db:push      # Appliquer le schéma
bun run db:generate  # Générer les migrations
bun run db:migrate   # Exécuter les migrations
bun run db:studio    # Interface Drizzle Studio
```

## Structure du projet

```
app/
├── components/          # Composants React
│   ├── ui/             # Composants UI (shadcn)
│   └── CVDocument.tsx  # Template PDF du CV
├── db/
│   ├── index.ts        # Client Drizzle
│   └── schema.ts       # Schéma de la BDD
├── routes/
│   ├── __root.tsx      # Layout racine
│   ├── index.tsx       # Page d'accueil
│   ├── applications.tsx # Kanban des candidatures
│   ├── assistant.tsx   # Chat avec l'assistant IA
│   ├── contacts.tsx    # Gestion des contacts
│   ├── cv.tsx          # Génération de CV
│   └── profile.tsx     # Profil utilisateur
├── server/
│   ├── agent/          # Agent IA LangChain
│   │   ├── agent.ts    # Logique de l'agent (non-streaming)
│   │   ├── stream.ts   # Streaming des réponses
│   │   ├── llm.ts      # Configuration LLM
│   │   ├── tools/      # Outils de l'agent
│   │   └── index.ts    # Server functions
│   ├── repositories/   # Couche d'accès aux données
│   └── functions.ts    # Server functions métier
└── lib/
    └── utils.ts        # Utilitaires (cn, etc.)
```

## Fonctionnalités

### Kanban des candidatures
- Drag & drop entre colonnes (Brouillon, Postulé, Entretien, etc.)
- Ajout/modification de candidatures
- Liaison avec entreprises et contacts

### Assistant IA
- Chat en streaming avec Gemini
- Gestion des contacts, entreprises et candidatures en langage naturel
- Contexte CV de l'utilisateur intégré
- Historique des conversations persisté

### Génération de CV
- Template PDF professionnel
- Export basé sur les expériences du profil

### Profil
- Gestion des expériences professionnelles
- Compétences associées aux expériences

## Architecture

### Repository Pattern
Les accès à la base de données passent par des repositories (`app/server/repositories/`) qui encapsulent les requêtes Drizzle.

### Agent IA
L'agent utilise LangChain avec des tools pour interagir avec les données :
- `add_contact`, `list_contacts`
- `add_company`, `list_companies`
- `add_application`, `list_applications`, `update_application`

Le streaming est géré via SSE pour afficher les réponses en temps réel.

### Server Functions
TanStack Start permet de définir des fonctions serveur appelables depuis le client via `createServerFn`.

## Licence

MIT
