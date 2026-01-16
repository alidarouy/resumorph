import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, lazy, Suspense } from "react";
import { useUser, useAuth } from "@clerk/tanstack-react-start";
import { getExperiences } from "~/server/functions";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { CVDocument, cvThemes, type CVTheme } from "~/components/CVDocument";

// PDFViewer doit être chargé uniquement côté client
const PDFViewerClient = lazy(() =>
  import("@react-pdf/renderer").then((mod) => ({ default: mod.PDFViewer }))
);

export const Route = createFileRoute("/cv")({
  component: CVPage,
});

function CVPage() {
  const navigate = useNavigate();
  const [isClient, setIsClient] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<CVTheme>("classic");
  const { isSignedIn, isLoaded, userId } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate({ to: "/" });
    }
  }, [isSignedIn, isLoaded, navigate]);

  const { data: experiences, isLoading: experiencesLoading } = useQuery({
    queryKey: ["experiences", userId],
    queryFn: () => getExperiences({ data: { userId: userId! } }),
    enabled: isSignedIn && !!userId,
  });

  if (!isLoaded || experiencesLoading || !user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!experiences || experiences.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">Aucune expérience à afficher.</p>
        <button
          onClick={() => navigate({ to: "/profile" })}
          className="text-primary hover:underline"
        >
          Ajouter des expériences
        </button>
      </div>
    );
  }

  const profile = {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress || "",
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    profilePicture: user.imageUrl,
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mon CV</h1>
        <PDFDownloadLink
          document={<CVDocument profile={profile} experiences={experiences} theme={selectedTheme} />}
          fileName={`CV_${profile.firstName}_${profile.lastName}.pdf`}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          {({ loading }) =>
            loading ? (
              "Génération..."
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Télécharger PDF
              </>
            )
          }
        </PDFDownloadLink>
      </div>

      {/* Theme selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Thème du CV
        </label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(cvThemes) as CVTheme[]).map((themeKey) => {
            const theme = cvThemes[themeKey];
            return (
              <button
                key={themeKey}
                onClick={() => setSelectedTheme(themeKey)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                  selectedTheme === themeKey
                    ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-2"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: theme.primary }}
                />
                <span className="text-sm">{theme.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-sm p-4">
        <div className="border rounded-lg overflow-hidden" style={{ height: "800px" }}>
          {isClient ? (
            <Suspense
              fallback={
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              }
            >
              <PDFViewerClient width="100%" height="100%" showToolbar={false}>
                <CVDocument profile={profile} experiences={experiences} theme={selectedTheme} />
              </PDFViewerClient>
            </Suspense>
          ) : (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Prévisualisation du CV. Cliquez sur "Télécharger PDF" pour obtenir le fichier.
      </p>
    </div>
  );
}
