import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { jobApplicationRepository, companyRepository, contactRepository } from "../../repositories";

export const createAddApplicationTool = (userId: string) =>
  tool(
    async ({ title, description, jobUrl, companyName, status, notes }) => {
      try {
        // Find company by name if provided
        let companyId: string | null = null;
        if (companyName) {
          const companies = await companyRepository.findAll(userId);
          const company = companies.find(
            (c) => c.name.toLowerCase() === companyName.toLowerCase()
          );
          if (company) {
            companyId = company.id;
          } else {
            // Create the company if it doesn't exist
            const newCompany = await companyRepository.create(userId, {
              name: companyName,
              description: null,
              website: null,
              linkedin: null,
              logo: null,
            });
            companyId = newCompany.id;
          }
        }

        const application = await jobApplicationRepository.create(userId, {
          title,
          description: description || null,
          jobUrl: jobUrl || null,
          companyId,
          contactId: null,
          status: status || "draft",
          appliedAt: status === "applied" ? new Date() : null,
          notes: notes || null,
        });

        return JSON.stringify({
          success: true,
          message: `Candidature "${title}"${companyName ? ` chez ${companyName}` : ""} créée avec succès`,
          application: {
            id: application.id,
            title: application.title,
            status: application.status,
          },
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          message: `Erreur lors de la création de la candidature: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
        });
      }
    },
    {
      name: "add_application",
      description: "Ajoute une nouvelle candidature/offre d'emploi. Utilise cet outil quand l'utilisateur veut ajouter une candidature, postuler à une offre, ou tracker une opportunité.",
      schema: z.object({
        title: z.string().describe("Titre du poste (ex: Développeur Full Stack)"),
        companyName: z.string().optional().describe("Nom de l'entreprise"),
        description: z.string().optional().describe("Description de l'offre"),
        jobUrl: z.string().url().optional().describe("URL de l'offre d'emploi"),
        status: z.enum(["draft", "applied", "interviewing", "offered", "rejected", "accepted"])
          .optional()
          .describe("Statut de la candidature (draft par défaut)"),
        notes: z.string().optional().describe("Notes personnelles sur la candidature"),
      }),
    }
  );

export const createListApplicationsTool = (userId: string) =>
  tool(
    async () => {
      try {
        const applications = await jobApplicationRepository.findAllWithRelations(userId);

        if (applications.length === 0) {
          return JSON.stringify({
            success: true,
            message: "Aucune candidature trouvée.",
            applications: [],
          });
        }

        return JSON.stringify({
          success: true,
          message: `${applications.length} candidature(s) trouvée(s).`,
          applications: applications.map((a) => ({
            id: a.id,
            title: a.title,
            company: a.company?.name || null,
            status: a.status,
          })),
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          message: `Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
        });
      }
    },
    {
      name: "list_applications",
      description: "Liste toutes les candidatures de l'utilisateur. Utilise cet outil quand l'utilisateur veut voir ses candidatures.",
      schema: z.object({}),
    }
  );

export const createUpdateApplicationTool = (userId: string) =>
  tool(
    async ({ applicationId, title, description, jobUrl, status, notes }) => {
      try {
        // Check if the application exists and belongs to the user
        const existing = await jobApplicationRepository.findById(userId, applicationId);
        if (!existing) {
          return JSON.stringify({
            success: false,
            message: "Candidature non trouvée.",
          });
        }

        const updateData: Record<string, any> = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (jobUrl !== undefined) updateData.jobUrl = jobUrl;
        if (status !== undefined) {
          updateData.status = status;
          if (status === "applied" && !existing.appliedAt) {
            updateData.appliedAt = new Date();
          }
        }
        if (notes !== undefined) updateData.notes = notes;

        const updated = await jobApplicationRepository.update(userId, applicationId, updateData);

        return JSON.stringify({
          success: true,
          message: `Candidature "${updated?.title}" mise à jour avec succès.`,
          application: {
            id: updated?.id,
            title: updated?.title,
            status: updated?.status,
          },
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          message: `Erreur lors de la mise à jour: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
        });
      }
    },
    {
      name: "update_application",
      description: "Met à jour une candidature existante. Utilise cet outil quand l'utilisateur veut modifier le statut, le titre, ou d'autres informations d'une candidature existante. Tu dois d'abord lister les candidatures pour obtenir l'ID.",
      schema: z.object({
        applicationId: z.string().describe("L'ID de la candidature à modifier (UUID)"),
        title: z.string().optional().describe("Nouveau titre du poste"),
        description: z.string().optional().describe("Nouvelle description"),
        jobUrl: z.string().url().optional().describe("Nouvelle URL de l'offre"),
        status: z.enum(["draft", "applied", "interviewing", "offered", "rejected", "accepted"])
          .optional()
          .describe("Nouveau statut de la candidature"),
        notes: z.string().optional().describe("Nouvelles notes"),
      }),
    }
  );
