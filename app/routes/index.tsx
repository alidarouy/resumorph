import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SignIn, useAuth } from "@clerk/tanstack-react-start";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate({ to: "/profile" });
    }
  }, [isSignedIn, isLoaded, navigate]);

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">CV Generator</h1>
        <p className="text-gray-600">
          Créez votre CV professionnel en quelques minutes
        </p>
      </div>

      <div className="flex justify-center">
        <SignIn
          routing="hash"
          afterSignInUrl="/profile"
          afterSignUpUrl="/profile"
        />
      </div>

      <div className="mt-12 grid md:grid-cols-3 gap-4 text-center">
        <FeatureCard
          title="Simple"
          description="Ajoutez vos expériences en quelques clics"
        />
        <FeatureCard
          title="Élégant"
          description="Un design professionnel et moderne"
        />
        <FeatureCard
          title="PDF"
          description="Téléchargez votre CV en PDF"
        />
      </div>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
