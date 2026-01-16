import { type ReactNode } from "react";
import {
  createRootRoute,
  Link,
  Outlet,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider, SignedIn, SignedOut, UserButton } from "@clerk/tanstack-react-start";
import appStyles from "~/styles.css?url";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CV Generator" },
    ],
    links: [
      { rel: "icon", href: "/favicon.svg" },
      { rel: "stylesheet", href: appStyles },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

function NotFound() {
  return (
    <div className="text-center py-16">
      <h1 className="text-4xl font-bold text-foreground mb-4">404</h1>
      <p className="text-xl text-muted-foreground mb-8">Page non trouvée</p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-4 rounded-lg transition-colors"
      >
        Retour à l'accueil
      </Link>
    </div>
  );
}

function RootComponent() {
  return (
    <ClerkProvider>
      <html lang="fr">
        <head>
          <HeadContent />
        </head>
        <body className="min-h-screen bg-background font-sans">
          <QueryClientProvider client={queryClient}>
            <RootLayout />
          </QueryClientProvider>
          <Scripts />
        </body>
      </html>
    </ClerkProvider>
  );
}

function RootLayout() {
  return (
    <>
      <nav className="bg-card border-b border-border shadow-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-xl font-bold text-primary">
              CV Generator
            </Link>
            <div className="flex gap-4 items-center">
              <SignedIn>
                <Link
                  to="/assistant"
                  className="text-muted-foreground hover:text-foreground [&.active]:text-primary [&.active]:font-medium transition-colors"
                >
                  Assistant
                </Link>
                <Link
                  to="/applications"
                  className="text-muted-foreground hover:text-foreground [&.active]:text-primary [&.active]:font-medium transition-colors"
                >
                  Candidatures
                </Link>
                <Link
                  to="/contacts"
                  className="text-muted-foreground hover:text-foreground [&.active]:text-primary [&.active]:font-medium transition-colors"
                >
                  Contacts
                </Link>
                <Link
                  to="/profile"
                  className="text-muted-foreground hover:text-foreground [&.active]:text-primary [&.active]:font-medium transition-colors"
                >
                  Profil
                </Link>
                <Link
                  to="/cv"
                  className="text-muted-foreground hover:text-foreground [&.active]:text-primary [&.active]:font-medium transition-colors"
                >
                  Mon CV
                </Link>
                <UserButton />
              </SignedIn>
              <SignedOut>
                <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  Accueil
                </Link>
              </SignedOut>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </>
  );
}
