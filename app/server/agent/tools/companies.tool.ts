import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { companyRepository } from "../../repositories";

export const createAddCompanyTool = (userId: string) =>
  tool(
    async ({ name, description, website, linkedin }) => {
      try {
        const company = await companyRepository.create(userId, {
          name,
          description: description || null,
          website: website || null,
          linkedin: linkedin || null,
          logo: null,
        });

        return JSON.stringify({
          success: true,
          message: `Entreprise "${name}" créée avec succès`,
          company: {
            id: company.id,
            name: company.name,
            website: company.website,
          },
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          message: `Erreur lors de la création de l'entreprise: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
        });
      }
    },
    {
      name: "add_company",
      description: "Ajoute une nouvelle entreprise dans la base de données. Utilise cet outil quand l'utilisateur veut ajouter ou créer une entreprise.",
      schema: z.object({
        name: z.string().describe("Nom de l'entreprise"),
        description: z.string().optional().describe("Description de l'entreprise"),
        website: z.string().url().optional().describe("Site web de l'entreprise"),
        linkedin: z.string().url().optional().describe("Page LinkedIn de l'entreprise"),
      }),
    }
  );

export const createListCompaniesTool = (userId: string) =>
  tool(
    async () => {
      try {
        const companies = await companyRepository.findAll(userId);

        if (companies.length === 0) {
          return JSON.stringify({
            success: true,
            message: "Aucune entreprise trouvée.",
            companies: [],
          });
        }

        return JSON.stringify({
          success: true,
          message: `${companies.length} entreprise(s) trouvée(s).`,
          companies: companies.map((c) => ({
            id: c.id,
            name: c.name,
            website: c.website,
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
      name: "list_companies",
      description: "Liste toutes les entreprises de l'utilisateur. Utilise cet outil quand l'utilisateur veut voir ses entreprises.",
      schema: z.object({}),
    }
  );
