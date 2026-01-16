import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useUser, useAuth } from "@clerk/tanstack-react-start";
import {
  getJobApplications,
  getCompanies,
  getContacts,
  addJobApplication,
  updateJobApplication,
  updateJobApplicationStatus,
  deleteJobApplication,
  addCompany,
  addContact,
  type JobApplicationWithRelations,
} from "~/server/functions";
import type { Company, Contact, JobApplication } from "~/db/schema";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

export const Route = createFileRoute("/applications")({
  component: ApplicationsPage,
});

// Kanban column definitions
const COLUMNS = [
  { id: "draft", label: "Brouillon" },
  { id: "applied", label: "Candidature envoyée" },
  { id: "interviewing", label: "En entretien" },
  { id: "offered", label: "Offre reçue" },
  { id: "rejected", label: "Refusée" },
  { id: "accepted", label: "Acceptée" },
] as const;

type ColumnId = (typeof COLUMNS)[number]["id"];

function ApplicationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isSignedIn, isLoaded, userId } = useAuth();
  const { user } = useUser();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<JobApplicationWithRelations | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null);
  const [recentlyDropped, setRecentlyDropped] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate({ to: "/" });
    }
  }, [isSignedIn, isLoaded, navigate]);

  const { data: applications, isLoading } = useQuery({
    queryKey: ["applications", userId],
    queryFn: () => getJobApplications({ data: { userId: userId! } }),
    enabled: isSignedIn && !!userId,
  });

  const { data: companies } = useQuery({
    queryKey: ["companies", userId],
    queryFn: () => getCompanies({ data: { userId: userId! } }),
    enabled: isSignedIn && !!userId,
  });

  const { data: contacts } = useQuery({
    queryKey: ["contacts", userId],
    queryFn: () => getContacts({ data: { userId: userId! } }),
    enabled: isSignedIn && !!userId,
  });

  const handleDragStart = (e: React.DragEvent, id: string, element: HTMLElement) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    // Create a custom drag image
    const dragImage = element.cloneNode(true) as HTMLElement;
    dragImage.style.transform = "rotate(3deg) scale(1.05)";
    dragImage.style.boxShadow = "0 10px 40px rgba(0,0,0,0.2)";
    dragImage.style.position = "absolute";
    dragImage.style.top = "-1000px";
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, element.offsetWidth / 2, 20);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleDragOver = (e: React.DragEvent, columnId: ColumnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if leaving the column entirely (not entering a child element)
    const relatedTarget = e.relatedTarget as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;
    if (!currentTarget.contains(relatedTarget)) {
      setDragOverColumn(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: ColumnId) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedId || !userId) return;

    // Find the current status of the dragged application
    const app = applications?.find((a) => a.id === draggedId);
    if (app?.status === newStatus) {
      setDraggedId(null);
      return; // No change needed
    }

    const droppedId = draggedId;
    setDraggedId(null);

    // Optimistic update - immediately update the UI
    queryClient.setQueryData(
      ["applications", userId],
      (old: JobApplicationWithRelations[] | undefined) => {
        if (!old) return old;
        return old.map((a) =>
          a.id === droppedId ? { ...a, status: newStatus } : a
        );
      }
    );

    // Trigger drop animation
    setRecentlyDropped(droppedId);
    setTimeout(() => setRecentlyDropped(null), 700);

    // Then update the server in the background
    try {
      await updateJobApplicationStatus({
        data: { userId, id: droppedId, status: newStatus },
      });
    } catch {
      // Revert on error
      queryClient.invalidateQueries({ queryKey: ["applications", userId] });
    }
  };

  const handleAddApplication = async (data: Omit<JobApplication, "id" | "userId" | "createdAt" | "updatedAt">) => {
    if (!userId) return;
    await addJobApplication({ data: { userId, application: data } });
    await queryClient.invalidateQueries({ queryKey: ["applications", userId] });
    setModalOpen(false);
    setEditingApplication(null);
  };

  const handleUpdateApplication = async (data: JobApplication) => {
    if (!userId) return;
    await updateJobApplication({ data: { userId, application: data } });
    await queryClient.invalidateQueries({ queryKey: ["applications", userId] });
    setModalOpen(false);
    setEditingApplication(null);
  };

  const handleDeleteApplication = async (id: string) => {
    if (!userId) return;
    if (confirm("Supprimer cette candidature ?")) {
      await deleteJobApplication({ data: { userId, id } });
      await queryClient.invalidateQueries({ queryKey: ["applications", userId] });
    }
  };

  const openAddModal = () => {
    setEditingApplication(null);
    setModalOpen(true);
  };

  const openEditModal = (app: JobApplicationWithRelations) => {
    setEditingApplication(app);
    setModalOpen(true);
  };

  if (!isLoaded || !isSignedIn || !user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getApplicationsByStatus = (status: ColumnId) =>
    applications?.filter((app) => app.status === status) || [];

  return (
    <div className="fixed inset-0 top-[73px] px-6 py-6 bg-gradient-to-br from-background to-muted/20 flex flex-col overflow-x-hidden overflow-y-auto">
      <div className="flex justify-between items-center mb-6 max-w-7xl mx-auto w-full relative z-10">
        <div>
          <h1 className="text-2xl font-bold">Mes candidatures</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {applications?.length || 0} candidature{(applications?.length || 0) > 1 ? "s" : ""} au total
          </p>
        </div>
        <Button onClick={openAddModal} size="lg">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle candidature
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="flex gap-5 overflow-x-auto pb-4 flex-1 justify-center px-2">
          {COLUMNS.map((column) => {
            const count = getApplicationsByStatus(column.id).length;
            const isOver = dragOverColumn === column.id && draggedId !== null;
            return (
              <div
                key={column.id}
                className={`flex-shrink-0 w-80 rounded-xl border shadow-sm flex flex-col transition-all duration-200 origin-top ${
                  isOver
                    ? "bg-primary/5 border-primary shadow-xl shadow-primary/20 scale-[1.04]"
                    : "bg-card/50 backdrop-blur-sm border-border/50"
                }`}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <div className={`flex items-center justify-between p-4 border-b transition-colors duration-200 ${
                  isOver ? "border-primary/30" : "border-border/50"
                }`}>
                  <h3 className="font-semibold">{column.label}</h3>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors duration-200 ${
                    isOver
                      ? "bg-primary/20 text-primary"
                      : count > 0
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}>
                    {count}
                  </span>
                </div>
                <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                  {getApplicationsByStatus(column.id).map((app) => (
                    <ApplicationCard
                      key={app.id}
                      application={app}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onClick={() => openEditModal(app)}
                      onDelete={() => handleDeleteApplication(app.id)}
                      isDragging={draggedId === app.id}
                      isDropped={recentlyDropped === app.id}
                    />
                  ))}
                  {count === 0 && (
                    <div className={`text-center py-8 text-sm transition-colors duration-200 ${
                      isOver ? "text-primary" : "text-muted-foreground"
                    }`}>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors duration-200 ${
                        isOver ? "bg-primary/20" : "bg-muted/50"
                      }`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      {isOver ? "Déposer ici" : "Aucune candidature"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingApplication ? "Modifier la candidature" : "Nouvelle candidature"}
            </DialogTitle>
          </DialogHeader>
          <ApplicationForm
            initialData={editingApplication}
            companies={companies || []}
            contacts={contacts || []}
            onSubmit={editingApplication ? handleUpdateApplication : handleAddApplication}
            onCancel={() => setModalOpen(false)}
            userId={userId}
            onCompanyAdded={() => queryClient.invalidateQueries({ queryKey: ["companies", userId] })}
            onContactAdded={() => queryClient.invalidateQueries({ queryKey: ["contacts", userId] })}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApplicationCard({
  application,
  onDragStart,
  onDragEnd,
  onClick,
  onDelete,
  isDragging,
  isDropped,
}: {
  application: JobApplicationWithRelations;
  onDragStart: (e: React.DragEvent, id: string, element: HTMLElement) => void;
  onDragEnd: () => void;
  onClick: () => void;
  onDelete: () => void;
  isDragging: boolean;
  isDropped: boolean;
}) {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    onDragStart(e, application.id, e.currentTarget);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`group cursor-grab active:cursor-grabbing bg-card hover:bg-card/80 rounded-lg border shadow-sm hover:shadow-md p-4 transition-all duration-200 ease-out ${
        isDragging
          ? "opacity-40 scale-95 rotate-2 shadow-lg border-primary/30"
          : isDropped
            ? "animate-drop-in border-primary ring-2 ring-primary/30 scale-[1.02]"
            : "border-border/50 hover:scale-[1.02] hover:-translate-y-0.5"
      }`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm leading-tight">{application.title}</h4>
          {application.company && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-primary">
                  {application.company.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{application.company.name}</p>
            </div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/10 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {(application.contact || application.appliedAt) && (
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
          {application.contact && (
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="truncate">{application.contact.firstName} {application.contact.lastName}</span>
            </div>
          )}
          {application.appliedAt && (
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{new Date(application.appliedAt).toLocaleDateString("fr-FR")}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ApplicationForm({
  initialData,
  companies,
  contacts,
  onSubmit,
  onCancel,
  userId,
  onCompanyAdded,
  onContactAdded,
}: {
  initialData: JobApplicationWithRelations | null;
  companies: Company[];
  contacts: Contact[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  userId: string;
  onCompanyAdded: () => void;
  onContactAdded: () => void;
}) {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    jobUrl: initialData?.jobUrl || "",
    companyId: initialData?.companyId || "",
    contactId: initialData?.contactId || "",
    status: initialData?.status || "draft",
    notes: initialData?.notes || "",
  });

  const [showNewCompany, setShowNewCompany] = useState(false);
  const [showNewContact, setShowNewContact] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newContactData, setNewContactData] = useState({ firstName: "", lastName: "", email: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initialData) {
        await onSubmit({
          ...initialData,
          ...formData,
          companyId: formData.companyId || null,
          contactId: formData.contactId || null,
        });
      } else {
        await onSubmit({
          ...formData,
          companyId: formData.companyId || null,
          contactId: formData.contactId || null,
          appliedAt: formData.status === "applied" ? new Date() : null,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) return;
    const company = await addCompany({
      data: { userId, company: { name: newCompanyName.trim(), description: null, logo: null, linkedin: null, website: null } },
    });
    setFormData({ ...formData, companyId: company.id });
    setNewCompanyName("");
    setShowNewCompany(false);
    onCompanyAdded();
  };

  const handleAddContact = async () => {
    if (!newContactData.firstName.trim() && !newContactData.lastName.trim()) return;
    const contact = await addContact({
      data: {
        userId,
        contact: {
          firstName: newContactData.firstName.trim() || null,
          lastName: newContactData.lastName.trim() || null,
          email: newContactData.email.trim() || null,
          linkedin: null,
          companyId: formData.companyId || null,
        },
      },
    });
    setFormData({ ...formData, contactId: contact.id });
    setNewContactData({ firstName: "", lastName: "", email: "" });
    setShowNewContact(false);
    onContactAdded();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Titre du poste *</Label>
        <Input
          id="title"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Ex: Développeur Full Stack"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="jobUrl">URL de l'offre</Label>
        <Input
          id="jobUrl"
          type="url"
          value={formData.jobUrl}
          onChange={(e) => setFormData({ ...formData, jobUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Entreprise</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowNewCompany(!showNewCompany)}
          >
            {showNewCompany ? "Annuler" : "+ Nouvelle"}
          </Button>
        </div>
        {showNewCompany ? (
          <div className="flex gap-2">
            <Input
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              placeholder="Nom de l'entreprise"
            />
            <Button type="button" onClick={handleAddCompany}>
              Ajouter
            </Button>
          </div>
        ) : (
          <select
            value={formData.companyId}
            onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="">Sélectionner une entreprise</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Contact</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowNewContact(!showNewContact)}
          >
            {showNewContact ? "Annuler" : "+ Nouveau"}
          </Button>
        </div>
        {showNewContact ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={newContactData.firstName}
                onChange={(e) => setNewContactData({ ...newContactData, firstName: e.target.value })}
                placeholder="Prénom"
              />
              <Input
                value={newContactData.lastName}
                onChange={(e) => setNewContactData({ ...newContactData, lastName: e.target.value })}
                placeholder="Nom"
              />
            </div>
            <div className="flex gap-2">
              <Input
                type="email"
                value={newContactData.email}
                onChange={(e) => setNewContactData({ ...newContactData, email: e.target.value })}
                placeholder="Email"
              />
              <Button type="button" onClick={handleAddContact}>
                Ajouter
              </Button>
            </div>
          </div>
        ) : (
          <select
            value={formData.contactId}
            onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="">Sélectionner un contact</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.firstName} {contact.lastName} {contact.email && `(${contact.email})`}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Statut</Label>
        <select
          id="status"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          {COLUMNS.map((col) => (
            <option key={col.id} value={col.id}>
              {col.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description de l'offre</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          placeholder="Copiez ici la description de l'offre..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes personnelles</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          placeholder="Vos notes sur cette candidature..."
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
