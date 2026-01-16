import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/tanstack-react-start";
import { getContacts, addContact, updateContact, deleteContact } from "~/server/functions";
import type { Contact } from "~/db/schema";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

export const Route = createFileRoute("/contacts")({
  component: ContactsPage,
});

function ContactsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isSignedIn, isLoaded, userId } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate({ to: "/" });
    }
  }, [isSignedIn, isLoaded, navigate]);

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["contacts", userId],
    queryFn: () => getContacts({ data: { userId: userId! } }),
    enabled: isSignedIn && !!userId,
  });

  const handleAdd = async (data: Omit<Contact, "id" | "userId" | "createdAt" | "updatedAt">) => {
    if (!userId) return;
    await addContact({ data: { userId, contact: data } });
    await queryClient.invalidateQueries({ queryKey: ["contacts", userId] });
    setModalOpen(false);
  };

  const handleUpdate = async (data: Contact) => {
    if (!userId) return;
    await updateContact({ data: { userId, contact: data } });
    await queryClient.invalidateQueries({ queryKey: ["contacts", userId] });
    setModalOpen(false);
    setEditingContact(null);
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;
    if (confirm("Supprimer ce contact ?")) {
      await deleteContact({ data: { userId, id } });
      await queryClient.invalidateQueries({ queryKey: ["contacts", userId] });
    }
  };

  const openAddModal = () => {
    setEditingContact(null);
    setModalOpen(true);
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setModalOpen(true);
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mes contacts</h1>
        <Button onClick={openAddModal}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau contact
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : contacts?.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>Aucun contact pour le moment.</p>
          <p className="text-sm mt-2">
            Clique sur "Nouveau contact" ou utilise l'assistant.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contacts?.map((contact) => (
            <div
              key={contact.id}
              className="group bg-card border border-border/50 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openEditModal(contact)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-semibold">
                      {(contact.firstName?.[0] || contact.lastName?.[0] || "?").toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">
                      {contact.firstName} {contact.lastName}
                    </p>
                    {contact.email && (
                      <p className="text-sm text-muted-foreground">{contact.email}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(contact.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/10 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {contact.linkedin && (
                <a
                  href={contact.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  LinkedIn
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingContact ? "Modifier le contact" : "Nouveau contact"}
            </DialogTitle>
          </DialogHeader>
          <ContactForm
            initialData={editingContact}
            onSubmit={editingContact ? handleUpdate : handleAdd}
            onCancel={() => {
              setModalOpen(false);
              setEditingContact(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContactForm({
  initialData,
  onSubmit,
  onCancel,
}: {
  initialData: Contact | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    email: initialData?.email || "",
    linkedin: initialData?.linkedin || "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initialData) {
        await onSubmit({
          ...initialData,
          firstName: formData.firstName || null,
          lastName: formData.lastName || null,
          email: formData.email || null,
          linkedin: formData.linkedin || null,
        });
      } else {
        await onSubmit({
          firstName: formData.firstName || null,
          lastName: formData.lastName || null,
          email: formData.email || null,
          linkedin: formData.linkedin || null,
          companyId: null,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Prénom</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            placeholder="Jean"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Nom</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            placeholder="Dupont"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="jean@example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="linkedin">LinkedIn</Label>
        <Input
          id="linkedin"
          type="url"
          value={formData.linkedin}
          onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
          placeholder="https://linkedin.com/in/..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Enregistrement..." : initialData ? "Enregistrer" : "Créer"}
        </Button>
      </div>
    </form>
  );
}
