import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useUser, useAuth } from "@clerk/tanstack-react-start";
import { getExperiences, addExperience, updateExperience, deleteExperience, type ExperienceWithSkills } from "~/server/functions";
import type { Experience } from "~/db/schema";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

type ExperienceInput = Omit<Experience, "id" | "userId" | "createdAt" | "updatedAt">;

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isSignedIn, isLoaded, userId } = useAuth();
  const { user } = useUser();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<ExperienceWithSkills | null>(null);

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

  const handleAddExperience = async (data: ExperienceInput, skillNames: string[]) => {
    if (!userId) return;
    await addExperience({ data: { userId, experience: data, skillNames } });
    await queryClient.invalidateQueries({ queryKey: ["experiences", userId] });
    setModalOpen(false);
    setEditingExperience(null);
  };

  const handleUpdateExperience = async (data: ExperienceInput, skillNames: string[]) => {
    if (!userId || !editingExperience) return;
    await updateExperience({
      data: {
        userId,
        experience: { ...editingExperience, ...data },
        skillNames,
      },
    });
    await queryClient.invalidateQueries({ queryKey: ["experiences", userId] });
    setModalOpen(false);
    setEditingExperience(null);
  };

  const handleDeleteExperience = async (id: string) => {
    if (!userId) return;
    if (confirm("Supprimer cette expérience ?")) {
      await deleteExperience({ data: { userId, id } });
      await queryClient.invalidateQueries({ queryKey: ["experiences", userId] });
    }
  };

  const openAddModal = () => {
    setEditingExperience(null);
    setModalOpen(true);
  };

  const openEditModal = (exp: ExperienceWithSkills) => {
    setEditingExperience(exp);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingExperience(null);
  };

  if (!isLoaded || !isSignedIn || !user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with profile and Generate CV button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {user.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.fullName || "Profile"}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
                  {user.firstName?.[0] || "U"}
                  {user.lastName?.[0] || ""}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">
                  {user.fullName || "Utilisateur"}
                </h1>
                <p className="text-muted-foreground">{user.primaryEmailAddress?.emailAddress}</p>
              </div>
            </div>
            <Button asChild disabled={!experiences || experiences.length === 0}>
              <Link to="/cv">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Générer mon CV
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Experiences section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Expériences professionnelles</CardTitle>
          <Button size="sm" onClick={openAddModal}>
            + Ajouter
          </Button>
        </CardHeader>
        <CardContent>
          {experiencesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : experiences && experiences.length > 0 ? (
            <div className="space-y-4">
              {experiences.map((exp) => (
                <ExperienceCard
                  key={exp.id}
                  experience={exp}
                  onEdit={() => openEditModal(exp)}
                  onDelete={() => handleDeleteExperience(exp.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Aucune expérience ajoutée.</p>
              <p className="text-sm mt-2">
                Cliquez sur "+ Ajouter" pour ajouter vos expériences.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingExperience ? "Modifier l'expérience" : "Ajouter une expérience"}
            </DialogTitle>
          </DialogHeader>
          <ExperienceForm
            initialData={editingExperience}
            onSubmit={editingExperience ? handleUpdateExperience : handleAddExperience}
            onCancel={closeModal}
            existingSkills={Array.from(
              new Set(experiences?.flatMap(exp => exp.skills?.map(s => s.name) || []) || [])
            )}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExperienceForm({
  initialData,
  onSubmit,
  onCancel,
  existingSkills = [],
}: {
  initialData?: ExperienceWithSkills | null;
  onSubmit: (data: ExperienceInput, skillNames: string[]) => void;
  onCancel: () => void;
  existingSkills?: string[];
}) {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    company: initialData?.company || "",
    location: initialData?.location || "",
    startDate: initialData?.startDate || "",
    endDate: initialData?.endDate || "",
    current: initialData?.current || false,
    description: initialData?.description || "",
  });
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>(initialData?.skills?.map(s => s.name) || []);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filter suggestions based on input
  const suggestions = skillInput.trim()
    ? existingSkills.filter(
        s =>
          s.toLowerCase().includes(skillInput.toLowerCase()) &&
          !skills.some(existing => existing.toLowerCase() === s.toLowerCase())
      )
    : [];

  const handleAddSkill = (skillName?: string) => {
    const skill = (skillName || skillInput).trim();
    if (skill && !skills.some(s => s.toLowerCase() === skill.toLowerCase())) {
      setSkills([...skills, skill]);
      setSkillInput("");
      setShowSuggestions(false);
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        title: formData.title,
        company: formData.company,
        location: formData.location || null,
        startDate: formData.startDate,
        endDate: formData.current ? null : formData.endDate || null,
        current: formData.current,
        description: formData.description || null,
      }, skills);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <Label htmlFor="company">Entreprise *</Label>
          <Input
            id="company"
            required
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            placeholder="Ex: Google"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Lieu</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Ex: Paris, France"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startDate">Date de début *</Label>
          <Input
            id="startDate"
            type="month"
            required
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">Date de fin</Label>
          <Input
            id="endDate"
            type="month"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            disabled={formData.current}
          />
        </div>
        <div className="flex items-center space-x-2 pt-6">
          <Checkbox
            id="current"
            checked={formData.current}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, current: checked as boolean, endDate: "" })
            }
          />
          <Label htmlFor="current" className="cursor-pointer">Poste actuel</Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={8}
          placeholder="Décrivez vos responsabilités et réalisations..."
        />
      </div>

      <div className="space-y-2">
        <Label>Compétences</Label>
        <div className="relative">
          <div className="flex gap-2">
            <Input
              value={skillInput}
              onChange={(e) => {
                setSkillInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                // Delay to allow click on suggestion
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSkill();
                }
              }}
              placeholder="Ex: React, TypeScript, Python..."
            />
            <Button type="button" variant="outline" onClick={() => handleAddSkill()}>
              +
            </Button>
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                  onClick={() => handleAddSkill(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {skills.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => handleRemoveSkill(skill)}
              >
                {skill}
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Enregistrement..." : initialData ? "Enregistrer" : "Ajouter"}
        </Button>
      </div>
    </form>
  );
}

function ExperienceCard({
  experience,
  onEdit,
  onDelete,
}: {
  experience: ExperienceWithSkills;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const formatDate = (date: string) => {
    const [year, month] = date.split("-");
    const months = [
      "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
      "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  return (
    <div className="border-l-2 border-primary pl-4 py-2 group hover:bg-muted/50 rounded-r-lg transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex-1 cursor-pointer" onClick={onEdit}>
          <h3 className="font-semibold">{experience.title}</h3>
          <p className="text-primary font-medium">{experience.company}</p>
          <p className="text-sm text-muted-foreground">
            {formatDate(experience.startDate)} -{" "}
            {experience.current ? "Présent" : experience.endDate ? formatDate(experience.endDate) : ""}
            {experience.location && ` · ${experience.location}`}
          </p>
          {experience.description && (
            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">
              {experience.description}
            </p>
          )}
          {experience.skills && experience.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {experience.skills.map((skill) => (
                <Badge key={skill.id} variant="outline" className="text-xs">
                  {skill.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" onClick={onEdit} title="Modifier">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} title="Supprimer" className="text-destructive hover:text-destructive">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}

