import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { contactRepository } from "../../repositories";

export const createAddContactTool = (userId: string) =>
  tool(
    async ({ firstName, lastName, email, linkedin }) => {
      try {
        const contact = await contactRepository.create(userId, {
          firstName: firstName || null,
          lastName: lastName || null,
          email: email || null,
          linkedin: linkedin || null,
        });

        return JSON.stringify({
          success: true,
          message: `Contact créé avec succès: ${firstName || ""} ${lastName || ""}`.trim(),
          contact: {
            id: contact.id,
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
          },
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          message: `Erreur lors de la création du contact: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
        });
      }
    },
    {
      name: "add_contact",
      description: "Ajoute un nouveau contact dans la base de données. Utilise cet outil quand l'utilisateur veut ajouter ou créer un contact.",
      schema: z.object({
        firstName: z.string().optional().describe("Prénom du contact"),
        lastName: z.string().optional().describe("Nom de famille du contact"),
        email: z.string().email().optional().describe("Adresse email du contact"),
        linkedin: z.string().url().optional().describe("URL du profil LinkedIn du contact"),
      }),
    }
  );

export const createListContactsTool = (userId: string) =>
  tool(
    async () => {
      try {
        const contacts = await contactRepository.findAll(userId);

        if (contacts.length === 0) {
          return JSON.stringify({
            success: true,
            message: "Aucun contact trouvé.",
            contacts: [],
          });
        }

        return JSON.stringify({
          success: true,
          message: `${contacts.length} contact(s) trouvé(s).`,
          contacts: contacts.map((c) => ({
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email,
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
      name: "list_contacts",
      description: "Liste tous les contacts de l'utilisateur. Utilise cet outil quand l'utilisateur veut voir ses contacts.",
      schema: z.object({}),
    }
  );
